import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, requireTenant } from "../lib/middleware.js";

const CLINIC_READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "DENTIST", "RECEPTIONIST", "FINANCIAL", "VIEWER"] as const;
const MANAGEMENT_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;
const CONTACT_STATUSES = ["NOT_INFORMED", "ALLOWED", "REFUSED"] as const;
const PRIVACY_REQUEST_STATUSES = ["OPEN", "IN_PROGRESS", "COMPLETED", "REJECTED"] as const;
const PRIVACY_INCIDENT_STATUSES = ["OPEN", "INVESTIGATING", "CONTAINED", "CLOSED"] as const;

type ContactStatus = (typeof CONTACT_STATUSES)[number];

function isContactStatus(value: unknown): value is ContactStatus {
  return typeof value === "string" && (CONTACT_STATUSES as readonly string[]).includes(value);
}

function isAllowedTransition(current: string, next: string, transitions: Record<string, readonly string[]>) {
  return transitions[current]?.includes(next) ?? false;
}

const REQUEST_TRANSITIONS: Record<string, readonly string[]> = {
  OPEN: ["IN_PROGRESS", "COMPLETED", "REJECTED"],
  IN_PROGRESS: ["COMPLETED", "REJECTED"],
};

const INCIDENT_TRANSITIONS: Record<string, readonly string[]> = {
  OPEN: ["INVESTIGATING", "CONTAINED"],
  INVESTIGATING: ["CONTAINED", "CLOSED"],
  CONTAINED: ["CLOSED"],
};

export async function privacyRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireTenant);

  app.get<{ Params: { id: string } }>("/patients/:id/contact-preferences", {
    preHandler: requireRole(CLINIC_READ_ROLES),
  }, async (request, reply) => {
    const patient = await prisma.patient.findFirst({
      where: { id: request.params.id, tenantId: request.tenantId!, deletedAt: null },
      select: { id: true },
    });
    if (!patient) return reply.code(404).send({ error: "Paciente não encontrado.", code: "PATIENT_NOT_FOUND" });

    const preference = await prisma.patientContactPreference.findUnique({ where: { patientId: patient.id } });
    return reply.send(preference ?? {
      patientId: patient.id,
      whatsapp: "NOT_INFORMED",
      phone: "NOT_INFORMED",
      email: "NOT_INFORMED",
      source: null,
      recordedAt: null,
    });
  });

  app.patch<{ Params: { id: string }; Body: { whatsapp?: ContactStatus; phone?: ContactStatus; email?: ContactStatus; source?: string } }>("/patients/:id/contact-preferences", {
    preHandler: requireRole(MANAGEMENT_ROLES),
    schema: {
      params: { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 1, maxLength: 100 } } },
      body: {
        type: "object", additionalProperties: false, minProperties: 1,
        properties: {
          whatsapp: { type: "string", enum: CONTACT_STATUSES },
          phone: { type: "string", enum: CONTACT_STATUSES },
          email: { type: "string", enum: CONTACT_STATUSES },
          source: { type: "string", minLength: 2, maxLength: 80 },
        },
      },
    },
  }, async (request, reply) => {
    const patient = await prisma.patient.findFirst({
      where: { id: request.params.id, tenantId: request.tenantId!, deletedAt: null },
      select: { id: true },
    });
    if (!patient) return reply.code(404).send({ error: "Paciente não encontrado.", code: "PATIENT_NOT_FOUND" });

    const values = request.body;
    if ([values.whatsapp, values.phone, values.email].some((value) => value !== undefined && !isContactStatus(value))) {
      return reply.code(400).send({ error: "Preferência de contato inválida.", code: "CONTACT_PREFERENCE_INVALID" });
    }
    const fields = Object.keys(values);
    const preference = await prisma.$transaction(async (tx) => {
      const updated = await tx.patientContactPreference.upsert({
        where: { patientId: patient.id },
        create: {
          tenantId: request.tenantId!, patientId: patient.id,
          whatsapp: values.whatsapp ?? "NOT_INFORMED",
          phone: values.phone ?? "NOT_INFORMED",
          email: values.email ?? "NOT_INFORMED",
          source: values.source?.trim() || null,
          recordedByUserId: request.user!.id,
        },
        update: {
          ...(values.whatsapp !== undefined ? { whatsapp: values.whatsapp } : {}),
          ...(values.phone !== undefined ? { phone: values.phone } : {}),
          ...(values.email !== undefined ? { email: values.email } : {}),
          ...(values.source !== undefined ? { source: values.source.trim() || null } : {}),
          recordedAt: new Date(), recordedByUserId: request.user!.id,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId: request.tenantId!, actorUserId: request.user!.id,
          action: "CONTACT_PREFERENCES_UPDATED", resource: "PatientContactPreference", resourceId: updated.id,
          metadata: { fields },
        },
      });
      return updated;
    });
    return reply.send(preference);
  });

  app.get("/privacy-requests", { preHandler: requireRole(MANAGEMENT_ROLES) }, async (request) => {
    return prisma.privacyRequest.findMany({
      where: { tenantId: request.tenantId! },
      orderBy: { createdAt: "desc" },
      select: { id: true, patientId: true, type: true, status: true, summary: true, dueAt: true, createdAt: true, updatedAt: true },
    });
  });

  app.post<{ Body: { type: "ACCESS" | "CORRECTION" | "EXPORT" | "DELETION" | "OTHER"; summary: string; patientId?: string; dueAt?: string } }>("/privacy-requests", {
    preHandler: requireRole(MANAGEMENT_ROLES),
    schema: { body: { type: "object", additionalProperties: false, required: ["type", "summary"], properties: {
      type: { type: "string", enum: ["ACCESS", "CORRECTION", "EXPORT", "DELETION", "OTHER"] }, summary: { type: "string", minLength: 3, maxLength: 500 },
      patientId: { type: "string", minLength: 1, maxLength: 100 }, dueAt: { type: "string", format: "date-time" },
    } } },
  }, async (request, reply) => {
    if (request.body.patientId) {
      const patient = await prisma.patient.findFirst({ where: { id: request.body.patientId, tenantId: request.tenantId!, deletedAt: null }, select: { id: true } });
      if (!patient) return reply.code(404).send({ error: "Paciente não encontrado.", code: "PATIENT_NOT_FOUND" });
    }
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.privacyRequest.create({ data: { tenantId: request.tenantId!, patientId: request.body.patientId ?? null, type: request.body.type, summary: request.body.summary.trim(), dueAt: request.body.dueAt ? new Date(request.body.dueAt) : null, createdByUserId: request.user!.id } });
      await tx.auditLog.create({ data: { tenantId: request.tenantId!, actorUserId: request.user!.id, action: "PRIVACY_REQUEST_CREATED", resource: "PrivacyRequest", resourceId: created.id } });
      return created;
    });
    return reply.code(201).send(item);
  });

  app.patch<{ Params: { id: string }; Body: { status: "OPEN" | "IN_PROGRESS" | "COMPLETED" | "REJECTED" } }>("/privacy-requests/:id", {
    preHandler: requireRole(MANAGEMENT_ROLES),
    schema: { body: { type: "object", additionalProperties: false, required: ["status"], properties: { status: { type: "string", enum: PRIVACY_REQUEST_STATUSES } } } },
  }, async (request, reply) => {
    const item = await prisma.privacyRequest.findFirst({ where: { id: request.params.id, tenantId: request.tenantId! }, select: { id: true, status: true } });
    if (!item) return reply.code(404).send({ error: "Solicitação não encontrada.", code: "PRIVACY_REQUEST_NOT_FOUND" });
    if (!isAllowedTransition(item.status, request.body.status, REQUEST_TRANSITIONS)) {
      return reply.code(409).send({ error: "Essa alteração de status não é permitida.", code: "PRIVACY_REQUEST_TRANSITION_INVALID" });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.privacyRequest.update({ where: { id: item.id }, data: { status: request.body.status } });
      await tx.auditLog.create({ data: { tenantId: request.tenantId!, actorUserId: request.user!.id, action: "PRIVACY_REQUEST_STATUS_UPDATED", resource: "PrivacyRequest", resourceId: item.id, metadata: { status: request.body.status } } });
      return result;
    });
    return reply.send(updated);
  });

  app.get("/privacy-incidents", { preHandler: requireRole(MANAGEMENT_ROLES) }, async (request) => {
    return prisma.privacyIncident.findMany({ where: { tenantId: request.tenantId! }, orderBy: { createdAt: "desc" }, select: { id: true, status: true, systemArea: true, impactLevel: true, summary: true, actionsTaken: true, createdAt: true, updatedAt: true } });
  });

  app.post<{ Body: { systemArea: string; impactLevel: string; summary: string; actionsTaken?: string } }>("/privacy-incidents", {
    preHandler: requireRole(MANAGEMENT_ROLES),
    schema: { body: { type: "object", additionalProperties: false, required: ["systemArea", "impactLevel", "summary"], properties: {
      systemArea: { type: "string", minLength: 2, maxLength: 80 }, impactLevel: { type: "string", minLength: 2, maxLength: 30 }, summary: { type: "string", minLength: 3, maxLength: 500 }, actionsTaken: { type: "string", maxLength: 500 },
    } } },
  }, async (request, reply) => {
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.privacyIncident.create({ data: { tenantId: request.tenantId!, systemArea: request.body.systemArea.trim(), impactLevel: request.body.impactLevel.trim(), summary: request.body.summary.trim(), actionsTaken: request.body.actionsTaken?.trim() || null, createdByUserId: request.user!.id } });
      await tx.auditLog.create({ data: { tenantId: request.tenantId!, actorUserId: request.user!.id, action: "PRIVACY_INCIDENT_CREATED", resource: "PrivacyIncident", resourceId: created.id } });
      return created;
    });
    return reply.code(201).send(item);
  });

  app.patch<{ Params: { id: string }; Body: { status: "OPEN" | "INVESTIGATING" | "CONTAINED" | "CLOSED"; actionsTaken?: string } }>("/privacy-incidents/:id", {
    preHandler: requireRole(MANAGEMENT_ROLES),
    schema: { body: { type: "object", additionalProperties: false, required: ["status"], properties: { status: { type: "string", enum: PRIVACY_INCIDENT_STATUSES }, actionsTaken: { type: "string", maxLength: 500 } } } },
  }, async (request, reply) => {
    const item = await prisma.privacyIncident.findFirst({ where: { id: request.params.id, tenantId: request.tenantId! }, select: { id: true, status: true } });
    if (!item) return reply.code(404).send({ error: "Registro não encontrado.", code: "PRIVACY_INCIDENT_NOT_FOUND" });
    if (!isAllowedTransition(item.status, request.body.status, INCIDENT_TRANSITIONS)) {
      return reply.code(409).send({ error: "Essa alteração de status não é permitida.", code: "PRIVACY_INCIDENT_TRANSITION_INVALID" });
    }
    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.privacyIncident.update({ where: { id: item.id }, data: { status: request.body.status, ...(request.body.actionsTaken !== undefined ? { actionsTaken: request.body.actionsTaken.trim() || null } : {}) } });
      await tx.auditLog.create({ data: { tenantId: request.tenantId!, actorUserId: request.user!.id, action: "PRIVACY_INCIDENT_STATUS_UPDATED", resource: "PrivacyIncident", resourceId: item.id, metadata: { status: request.body.status } } });
      return result;
    });
    return reply.send(updated);
  });
}
