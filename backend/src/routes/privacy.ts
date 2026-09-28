import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, requireTenant } from "../lib/middleware.js";

const CLINIC_READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "DENTIST", "RECEPTIONIST", "FINANCIAL", "VIEWER"] as const;
const MANAGEMENT_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;
const CONTACT_STATUSES = ["NOT_INFORMED", "ALLOWED", "REFUSED"] as const;

type ContactStatus = (typeof CONTACT_STATUSES)[number];

function isContactStatus(value: unknown): value is ContactStatus {
  return typeof value === "string" && (CONTACT_STATUSES as readonly string[]).includes(value);
}

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
}
