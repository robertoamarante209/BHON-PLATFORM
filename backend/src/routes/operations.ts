import type { FastifyInstance } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, requireTenant } from "../lib/middleware.js";
import { AppointmentStatus } from "../lib/prisma-types.js";
import { intervalsOverlap, parseAppointmentDuration } from "../domain/scheduling.js";
import { planAppointmentReminders } from "../domain/appointment-reminders.js";
import { buildSecretaryReply } from "../domain/secretary.js";

const READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "DENTIST", "RECEPTIONIST", "FINANCIAL", "VIEWER"] as const;
const WRITE_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;
const SECRETARY_OPERATE_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTIONIST"] as const;
export const PLATFORM_INTEGRATION_ROLES = ["PLATFORM_OWNER"] as const;
export const CLINIC_INTEGRATION_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;
const TICKET_STATUSES = ["OPEN", "IN_PROGRESS", "WAITING", "RESOLVED"] as const;
const TICKET_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

type SecretarySchedulingAction = "SCHEDULE" | "SAME_DAY_FIT" | "RESCHEDULE" | "CANCEL";

async function secretarySchedulingConflict(client: any, input: { tenantId: string; professionalId: string; roomId: string; scheduledAt: Date; durationMinutes: number; excludeAppointmentId?: string }) {
  const endsAt = new Date(input.scheduledAt.getTime() + input.durationMinutes * 60_000);
  const candidates = await client.appointment.findMany({
    where: {
      tenantId: input.tenantId,
      ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
      status: { notIn: [AppointmentStatus.CANCELADO, AppointmentStatus.FALTA] },
      scheduledAt: { gte: new Date(input.scheduledAt.getTime() - 480 * 60_000), lt: endsAt },
      OR: [{ roomId: input.roomId }, { professionalId: input.professionalId }],
    },
    select: { scheduledAt: true, durationMinutes: true },
  });
  return candidates.some((candidate: { scheduledAt: Date; durationMinutes: number }) => intervalsOverlap(candidate.scheduledAt, candidate.durationMinutes, input.scheduledAt, input.durationMinutes));
}

async function validateSecretarySchedule(tenantId: string, input: { patientId: string; professionalId: string; roomId: string }) {
  const [patient, professional, room] = await Promise.all([
    prisma.patient.findFirst({ where: { id: input.patientId, tenantId, deletedAt: null, status: "ACTIVE" }, select: { id: true, name: true } }),
    prisma.user.findFirst({ where: { id: input.professionalId, tenantId, deletedAt: null, status: "ACTIVE" }, select: { id: true } }),
    prisma.room.findFirst({ where: { id: input.roomId, tenantId, isActive: true }, select: { id: true } }),
  ]);
  if (!patient) return { error: "Paciente não encontrado ou inativo." };
  if (!professional) return { error: "Profissional indisponível para este agendamento." };
  if (!room) return { error: "Ambiente indisponível para este agendamento." };
  return { patient };
}

export async function operationsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireTenant);

  app.get("/support/tickets", { preHandler: requireRole([...READ_ROLES, ...PLATFORM_INTEGRATION_ROLES]) }, async (request, reply) => {
    const isPlatformOwner = request.user!.role === "PLATFORM_OWNER";
    const tickets = await prisma.supportTicket.findMany({
      where: isPlatformOwner ? {} : { tenantId: request.tenantId! },
      include: {
        tenant: { select: { id: true, name: true } },
        openedByUser: { select: { id: true, name: true } },
        assignedToUser: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    return reply.send(tickets);
  });

  app.post<{ Body: { title?: string; description?: string; priority?: typeof TICKET_PRIORITIES[number] } }>("/support/tickets", {
    preHandler: requireRole(READ_ROLES),
    schema: { body: { type: "object", additionalProperties: false, required: ["title", "description"], properties: {
      title: { type: "string", minLength: 5, maxLength: 160 }, description: { type: "string", minLength: 10, maxLength: 4000 },
      priority: { type: "string", enum: TICKET_PRIORITIES },
    } } },
  }, async (request, reply) => {
    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.supportTicket.create({ data: {
        tenantId: request.tenantId!, openedByUserId: request.user!.id, title: request.body.title!.trim(),
        description: request.body.description!.trim(), priority: request.body.priority || "MEDIUM",
      } });
      await tx.auditLog.create({ data: { tenantId: request.tenantId!, actorUserId: request.user!.id, action: "SUPPORT_TICKET_OPENED", resource: "SupportTicket", resourceId: created.id } });
      return created;
    });
    return reply.code(201).send(ticket);
  });

  app.patch<{ Params: { id: string }; Body: { status?: typeof TICKET_STATUSES[number] } }>("/support/tickets/:id", {
    preHandler: requireRole(PLATFORM_INTEGRATION_ROLES),
    schema: { body: { type: "object", additionalProperties: false, required: ["status"], properties: { status: { type: "string", enum: TICKET_STATUSES } } } },
  }, async (request, reply) => {
    const existing = await prisma.supportTicket.findUnique({ where: { id: request.params.id }, select: { id: true, tenantId: true, openedByUserId: true, title: true } });
    if (!existing) return reply.code(404).send({ error: "Chamado não encontrado.", code: "SUPPORT_TICKET_NOT_FOUND" });
    const status = request.body.status!;
    const ticket = await prisma.$transaction(async (tx) => {
      const updated = await tx.supportTicket.update({ where: { id: existing.id }, data: {
        status, assignedToUserId: request.user!.id, resolvedAt: status === "RESOLVED" ? new Date() : null,
      } });
      await tx.auditLog.create({ data: { tenantId: existing.tenantId, actorUserId: request.user!.id, action: "SUPPORT_TICKET_STATUS_CHANGED", resource: "SupportTicket", resourceId: existing.id, metadata: { status } } });
      if (status === "RESOLVED") await tx.notification.create({ data: {
        tenantId: existing.tenantId, userId: existing.openedByUserId, type: "SUPPORT_TICKET_RESOLVED", priority: "MEDIUM",
        title: "Chamado concluído", message: `O suporte concluiu o chamado: ${existing.title}.`, link: "/clinic/support",
      } });
      return updated;
    });
    return reply.send(ticket);
  });

  app.get("/secretary/conversations", { preHandler: requireRole(READ_ROLES) }, async (request, reply) => {
    const conversations = await prisma.secretaryConversation.findMany({
      where: { tenantId: request.tenantId! },
      include: {
        patient: { select: { id: true, name: true, recordNumber: true } },
        messages: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { lastMessageAt: "desc" },
      take: 100,
    });
    return reply.send(conversations);
  });

  app.get<{ Params: { id: string } }>("/secretary/conversations/:id", {
    preHandler: requireRole(READ_ROLES),
    schema: { params: { type: "object", additionalProperties: false, required: ["id"], properties: { id: { type: "string", minLength: 1, maxLength: 100 } } } },
  }, async (request, reply) => {
    const conversation = await prisma.secretaryConversation.findFirst({
      where: { id: request.params.id, tenantId: request.tenantId! },
      include: { patient: { select: { id: true, name: true, recordNumber: true } }, messages: { orderBy: { createdAt: "asc" }, take: 200 } },
    });
    if (!conversation) return reply.code(404).send({ error: "Conversa não encontrada.", code: "SECRETARY_CONVERSATION_NOT_FOUND" });
    return reply.send(conversation);
  });

  app.post<{ Body: { patientId?: string; contactName?: string; contactPhone: string } }>("/secretary/conversations", {
    preHandler: requireRole(SECRETARY_OPERATE_ROLES),
    schema: { body: { type: "object", additionalProperties: false, required: ["contactPhone"], properties: {
      patientId: { type: "string", minLength: 1, maxLength: 100 }, contactName: { type: "string", minLength: 2, maxLength: 160 }, contactPhone: { type: "string", minLength: 8, maxLength: 30 },
    } } },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const contactPhone = request.body.contactPhone.trim();
    const patient = request.body.patientId
      ? await prisma.patient.findFirst({ where: { id: request.body.patientId, tenantId, deletedAt: null }, select: { id: true, name: true, phone: true } })
      : await prisma.patient.findFirst({ where: { tenantId, phone: contactPhone, deletedAt: null }, select: { id: true, name: true, phone: true } });
    if (request.body.patientId && !patient) return reply.code(404).send({ error: "Paciente não encontrado.", code: "PATIENT_NOT_FOUND" });
    const conversation = await prisma.secretaryConversation.create({ data: {
      tenantId, patientId: patient?.id || null, contactPhone: patient?.phone || contactPhone,
      contactName: request.body.contactName?.trim() || patient?.name || null,
    } });
    await prisma.auditLog.create({ data: { tenantId, actorUserId: request.user!.id, action: "SECRETARY_CONVERSATION_OPENED", resource: "SecretaryConversation", resourceId: conversation.id } });
    return reply.code(201).send(conversation);
  });

  app.post<{ Params: { id: string }; Body: { content: string; channel?: "DASHBOARD" | "WHATSAPP" } }>("/secretary/conversations/:id/messages", {
    preHandler: requireRole(SECRETARY_OPERATE_ROLES),
    schema: {
      params: { type: "object", additionalProperties: false, required: ["id"], properties: { id: { type: "string", minLength: 1, maxLength: 100 } } },
      body: { type: "object", additionalProperties: false, required: ["content"], properties: { content: { type: "string", minLength: 1, maxLength: 2_000 }, channel: { type: "string", enum: ["DASHBOARD", "WHATSAPP"] } } },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const conversation = await prisma.secretaryConversation.findFirst({
      where: { id: request.params.id, tenantId }, include: { patient: { select: { id: true, name: true } } },
    });
    if (!conversation) return reply.code(404).send({ error: "Conversa não encontrada.", code: "SECRETARY_CONVERSATION_NOT_FOUND" });
    const response = buildSecretaryReply({ clinicName: request.tenant!.name, patientName: conversation.patient?.name || conversation.contactName, message: request.body.content });
    const channel = request.body.channel || "DASHBOARD";
    const result = await prisma.$transaction(async (tx) => {
      await tx.secretaryMessage.create({ data: { conversationId: conversation.id, direction: "INBOUND", channel, content: request.body.content.trim(), intent: response.intent } });
      let actionStatus: string | undefined;
      if (response.intent === "CONFIRM_APPOINTMENT" && conversation.patientId) {
        const appointment = await tx.appointment.findFirst({
          where: { tenantId, patientId: conversation.patientId, status: "AGUARDANDO_CONFIRMACAO", scheduledAt: { gte: new Date() } },
          orderBy: { scheduledAt: "asc" },
          select: { id: true, scheduledAt: true, procedureName: true },
        });
        if (appointment) {
          await tx.appointment.update({ where: { id: appointment.id }, data: { status: "CONFIRMADO" } });
          await tx.notificationOutbox.updateMany({ where: { tenantId, templateKey: `APPOINTMENT_CONFIRMATION:${appointment.id}`, status: "PENDING" }, data: { status: "CANCELLED" } });
          await tx.timelineEvent.create({ data: { tenantId, patientId: conversation.patientId, actorUserId: request.user!.id, type: "APPOINTMENT_CONFIRMED_BY_SECRETARY", description: `Consulta de ${appointment.procedureName} confirmada pela Secretária Sarah.` } });
          actionStatus = "CONFIRMED";
        } else actionStatus = "NO_PENDING_APPOINTMENT";
      }
      const outbound = await tx.secretaryMessage.create({ data: { conversationId: conversation.id, direction: "OUTBOUND", channel, content: response.message, intent: response.intent, action: response.intent === "CONFIRM_APPOINTMENT" ? "CONFIRM_APPOINTMENT" : null, actionStatus: actionStatus || null } });
      const updated = await tx.secretaryConversation.update({ where: { id: conversation.id }, data: { status: response.status, lastIntent: response.intent, lastMessageAt: new Date() } });
      await tx.auditLog.create({ data: { tenantId, actorUserId: request.user!.id, action: "SECRETARY_MESSAGE_PROCESSED", resource: "SecretaryConversation", resourceId: conversation.id, metadata: { intent: response.intent, channel, actionStatus } } });
      return { conversation: updated, reply: outbound, actionStatus };
    });
    return reply.code(201).send(result);
  });

  app.post<{ Params: { id: string }; Body: { action: SecretarySchedulingAction; appointmentId?: string; scheduledAt?: string; professionalId?: string; roomId?: string; durationMinutes?: number; procedureName?: string } }>("/secretary/conversations/:id/actions", {
    preHandler: requireRole(SECRETARY_OPERATE_ROLES),
    schema: {
      params: { type: "object", additionalProperties: false, required: ["id"], properties: { id: { type: "string", minLength: 1, maxLength: 100 } } },
      body: { type: "object", additionalProperties: false, required: ["action"], properties: {
        action: { type: "string", enum: ["SCHEDULE", "SAME_DAY_FIT", "RESCHEDULE", "CANCEL"] }, appointmentId: { type: "string", minLength: 1, maxLength: 100 }, scheduledAt: { type: "string", format: "date-time" }, professionalId: { type: "string", minLength: 1, maxLength: 100 }, roomId: { type: "string", minLength: 1, maxLength: 100 }, durationMinutes: { type: "integer", minimum: 5, maximum: 480 }, procedureName: { type: "string", minLength: 2, maxLength: 160 },
      } },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const body = request.body;
    const conversation = await prisma.secretaryConversation.findFirst({ where: { id: request.params.id, tenantId }, select: { id: true, patientId: true, contactName: true } });
    if (!conversation) return reply.code(404).send({ error: "Conversa não encontrada.", code: "SECRETARY_CONVERSATION_NOT_FOUND" });
    if (!conversation.patientId) return reply.code(409).send({ error: "Vincule o paciente antes de alterar a agenda.", code: "SECRETARY_PATIENT_REQUIRED" });
    const patientId = conversation.patientId;

    if (body.action === "CANCEL") {
      if (!body.appointmentId) return reply.code(400).send({ error: "Informe o agendamento a cancelar.", code: "APPOINTMENT_REQUIRED" });
      const appointment = await prisma.appointment.findFirst({ where: { id: body.appointmentId, tenantId, patientId } });
      if (!appointment) return reply.code(404).send({ error: "Agendamento não encontrado.", code: "APPOINTMENT_NOT_FOUND" });
      const cancelled = await prisma.$transaction(async (tx) => {
        const updated = await tx.appointment.update({ where: { id: appointment.id }, data: { status: "CANCELADO" } });
        await tx.notificationOutbox.updateMany({ where: { tenantId, templateKey: { in: [`APPOINTMENT_CONFIRMATION:${appointment.id}`, `APPOINTMENT_REMINDER_PATIENT_24H:${appointment.id}`, `APPOINTMENT_REMINDER_PROFESSIONAL_1H:${appointment.id}`] }, status: "PENDING" }, data: { status: "CANCELLED" } });
        await tx.secretaryMessage.create({ data: { conversationId: conversation.id, direction: "SYSTEM", content: "Agendamento cancelado pela Secretária Sarah após solicitação do paciente.", action: "CANCEL", actionStatus: "COMPLETED", metadata: { appointmentId: appointment.id } } });
        return updated;
      });
      return reply.send(cancelled);
    }

    if (!body.scheduledAt || !body.professionalId || !body.roomId) return reply.code(400).send({ error: "Informe data, profissional e ambiente antes de confirmar a agenda.", code: "SCHEDULING_DETAILS_REQUIRED" });
    const scheduledAt = new Date(body.scheduledAt);
    const durationMinutes = parseAppointmentDuration(body.durationMinutes ?? 30);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() - 5 * 60_000 || !durationMinutes) return reply.code(400).send({ error: "Informe uma data futura e duração válidas.", code: "INVALID_SCHEDULING_DETAILS" });
    const relations = await validateSecretarySchedule(tenantId, { patientId, professionalId: body.professionalId, roomId: body.roomId });
    if (relations.error) return reply.code(400).send({ error: relations.error, code: "SCHEDULING_RELATION_INVALID" });

    const appointment = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;
      const existing = body.action === "RESCHEDULE" && body.appointmentId
        ? await tx.appointment.findFirst({ where: { id: body.appointmentId, tenantId, patientId } })
        : null;
      if (body.action === "RESCHEDULE" && !existing) return { kind: "NOT_FOUND" as const };
      const conflict = await secretarySchedulingConflict(tx, { tenantId, professionalId: body.professionalId!, roomId: body.roomId!, scheduledAt, durationMinutes, ...(existing ? { excludeAppointmentId: existing.id } : {}) });
      if (conflict) return { kind: "CONFLICT" as const };
      const saved = existing
        ? await tx.appointment.update({ where: { id: existing.id }, data: { scheduledAt, professionalId: body.professionalId!, roomId: body.roomId!, durationMinutes } })
        : await tx.appointment.create({ data: { tenantId, patientId, professionalId: body.professionalId!, roomId: body.roomId!, scheduledAt, durationMinutes, procedureName: body.procedureName?.trim() || "Consulta", status: body.action === "SAME_DAY_FIT" ? "ENCAIXE" : "AGUARDANDO_CONFIRMACAO" } });
      if (!existing) {
        const reminders = planAppointmentReminders(saved.id, scheduledAt);
        if (reminders.length) await tx.notificationOutbox.createMany({ data: reminders.map((reminder) => ({ tenantId, channel: reminder.channel, templateKey: reminder.templateKey, scheduledFor: reminder.scheduledFor })) });
      }
      await tx.timelineEvent.create({ data: { tenantId, patientId, actorUserId: request.user!.id, type: existing ? "APPOINTMENT_RESCHEDULED_BY_SECRETARY" : "APPOINTMENT_SCHEDULED_BY_SECRETARY", description: existing ? "Consulta reagendada pela Secretária Sarah após validação de agenda." : "Consulta criada pela Secretária Sarah após validação de agenda.", metadata: { appointmentId: saved.id, action: body.action } } });
      await tx.secretaryMessage.create({ data: { conversationId: conversation.id, direction: "SYSTEM", content: existing ? "Novo horário confirmado sem conflito de sala ou profissional." : "Horário confirmado sem conflito de sala ou profissional.", action: body.action, actionStatus: "COMPLETED", metadata: { appointmentId: saved.id } } });
      return { kind: "SUCCESS" as const, appointment: saved };
    });
    if (appointment.kind === "NOT_FOUND") return reply.code(404).send({ error: "Agendamento não encontrado.", code: "APPOINTMENT_NOT_FOUND" });
    if (appointment.kind === "CONFLICT") return reply.code(409).send({ error: "Este horário conflita com a agenda do profissional ou do ambiente.", code: "SCHEDULE_CONFLICT" });
    return reply.code(body.action === "RESCHEDULE" ? 200 : 201).send(appointment.appointment);
  });

  app.get<{ Querystring: { search?: string } }>("/inventory", {
    preHandler: requireRole(READ_ROLES),
    schema: { querystring: { type: "object", additionalProperties: false, properties: { search: { type: "string", maxLength: 120 } } } },
  }, async (request, reply) => {
    const search = request.query.search?.trim();
    const items = await prisma.inventoryItem.findMany({
      where: {
        tenantId: request.tenantId!, isActive: true,
        ...(search ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { sku: { contains: search, mode: "insensitive" } }] } : {}),
      },
      orderBy: [{ name: "asc" }],
      include: { movements: { take: 5, orderBy: { createdAt: "desc" } } },
    });
    return reply.send(items);
  });

  app.post<{ Body: { name: string; sku?: string; category?: string; unit?: string; currentStock?: number; minimumStock?: number; unitCost?: number } }>("/inventory", {
    preHandler: requireRole(WRITE_ROLES),
    schema: { body: { type: "object", additionalProperties: false, required: ["name"], properties: {
      name: { type: "string", minLength: 2, maxLength: 120 }, sku: { type: "string", maxLength: 80 },
      category: { type: "string", maxLength: 80 }, unit: { type: "string", minLength: 1, maxLength: 20 },
      currentStock: { type: "number", minimum: 0 }, minimumStock: { type: "number", minimum: 0 }, unitCost: { type: "number", minimum: 0 },
    } } },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const sku = request.body.sku?.trim() || null;
    if (sku && await prisma.inventoryItem.findFirst({ where: { tenantId, sku }, select: { id: true } })) {
      return reply.code(409).send({ error: "Já existe um item com este código.", code: "INVENTORY_SKU_CONFLICT" });
    }
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.inventoryItem.create({ data: {
        tenantId, name: request.body.name.trim(), sku, category: request.body.category?.trim() || null,
        unit: request.body.unit?.trim() || "un", currentStock: request.body.currentStock || 0,
        minimumStock: request.body.minimumStock || 0, unitCost: request.body.unitCost ?? null,
      } });
      await tx.auditLog.create({ data: { tenantId, actorUserId: request.user!.id, action: "INVENTORY_ITEM_CREATED", resource: "InventoryItem", resourceId: created.id } });
      return created;
    });
    return reply.code(201).send(item);
  });

  app.post<{ Params: { id: string }; Body: { type: "ENTRY" | "EXIT"; quantity: number; reason?: string } }>("/inventory/:id/movements", {
    preHandler: requireRole(WRITE_ROLES),
    schema: {
      params: { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 1, maxLength: 100 } } },
      body: { type: "object", additionalProperties: false, required: ["type", "quantity"], properties: {
        type: { type: "string", enum: ["ENTRY", "EXIT"] }, quantity: { type: "number", exclusiveMinimum: 0 }, reason: { type: "string", maxLength: 500 },
      } },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const current = await prisma.inventoryItem.findFirst({ where: { id: request.params.id, tenantId, isActive: true } });
    if (!current) return reply.code(404).send({ error: "Item de estoque não encontrado.", code: "INVENTORY_ITEM_NOT_FOUND" });
    const delta = request.body.type === "ENTRY" ? request.body.quantity : -request.body.quantity;
    if (Number(current.currentStock) + delta < 0) return reply.code(409).send({ error: "A saída excede o saldo disponível.", code: "INSUFFICIENT_STOCK" });

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({ where: { id: current.id }, data: { currentStock: { increment: delta } } });
      await tx.inventoryMovement.create({ data: { tenantId, itemId: current.id, type: request.body.type, quantity: request.body.quantity, reason: request.body.reason?.trim() || null, actorUserId: request.user!.id } });
      await tx.auditLog.create({ data: { tenantId, actorUserId: request.user!.id, action: `INVENTORY_${request.body.type}`, resource: "InventoryItem", resourceId: current.id, metadata: { quantity: request.body.quantity } } });
      return updated;
    });
    return reply.send(item);
  });

  app.get("/documents", { preHandler: requireRole(READ_ROLES) }, async (request, reply) => {
    const documents = await prisma.clinicDocument.findMany({
      where: { tenantId: request.tenantId! }, orderBy: { createdAt: "desc" },
      include: { patient: { select: { id: true, name: true, recordNumber: true } } },
    });
    return reply.send(documents);
  });

  app.post<{ Body: { title: string; category: string; fileName: string; url: string; mimeType?: string; patientId?: string } }>("/documents", {
    preHandler: requireRole(WRITE_ROLES),
    schema: { body: { type: "object", additionalProperties: false, required: ["title", "category", "fileName", "url"], properties: {
      title: { type: "string", minLength: 2, maxLength: 160 }, category: { type: "string", minLength: 2, maxLength: 80 },
      fileName: { type: "string", minLength: 1, maxLength: 255 }, url: { type: "string", minLength: 8, maxLength: 2000 },
      mimeType: { type: "string", maxLength: 120 }, patientId: { type: "string", maxLength: 100 },
    } } },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    let parsedUrl: URL;
    try { parsedUrl = new URL(request.body.url); } catch { return reply.code(400).send({ error: "Informe um endereço válido para o documento.", code: "INVALID_DOCUMENT_URL" }); }
    if (!['https:', 'http:'].includes(parsedUrl.protocol)) return reply.code(400).send({ error: "O documento deve usar um endereço HTTP seguro.", code: "INVALID_DOCUMENT_URL" });
    if (request.body.patientId && !await prisma.patient.findFirst({ where: { id: request.body.patientId, tenantId, deletedAt: null }, select: { id: true } })) {
      return reply.code(404).send({ error: "Paciente não encontrado.", code: "PATIENT_NOT_FOUND" });
    }
    const document = await prisma.clinicDocument.create({ data: {
      tenantId, patientId: request.body.patientId || null, title: request.body.title.trim(), category: request.body.category.trim(),
      fileName: request.body.fileName.trim(), url: parsedUrl.toString(), mimeType: request.body.mimeType?.trim() || null, createdById: request.user!.id,
    } });
    return reply.code(201).send(document);
  });

  app.get("/integrations", { preHandler: requireRole([...CLINIC_INTEGRATION_ROLES, ...PLATFORM_INTEGRATION_ROLES]) }, async (request, reply) => {
    const configured = await prisma.integrationConnection.findMany({ where: { tenantId: request.tenantId! }, orderBy: { provider: "asc" } });
    const byProvider = new Map(configured.map((item) => [item.provider, item]));
    return reply.send(["WHATSAPP", "GOOGLE_CALENDAR", "NFE"].map((provider) => byProvider.get(provider) || { provider, status: "NOT_CONFIGURED", displayName: null, configuration: null }));
  });

  app.put<{ Params: { provider: string }; Body: { displayName?: string; accountLabel?: string; clinicPhone?: string } }>("/integrations/:provider", {
    preHandler: requireRole([...CLINIC_INTEGRATION_ROLES, ...PLATFORM_INTEGRATION_ROLES]),
    schema: {
      params: { type: "object", required: ["provider"], properties: { provider: { type: "string", enum: ["WHATSAPP", "GOOGLE_CALENDAR", "NFE"] } } },
      body: { type: "object", additionalProperties: false, minProperties: 1, properties: {
        displayName: { type: "string", maxLength: 100 }, accountLabel: { type: "string", maxLength: 160 }, clinicPhone: { type: "string", maxLength: 30 },
      } },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const { displayName, ...configuration } = request.body;
    const connection = await prisma.integrationConnection.upsert({
      where: { tenantId_provider: { tenantId, provider: request.params.provider } },
      create: { tenantId, provider: request.params.provider, displayName: displayName?.trim() || null, status: "PENDING", configuration },
      update: { displayName: displayName?.trim() || null, status: "PENDING", configuration },
    });
    await prisma.auditLog.create({ data: { tenantId, actorUserId: request.user!.id, action: "INTEGRATION_CONFIGURED", resource: "IntegrationConnection", resourceId: connection.id, metadata: { provider: connection.provider } } });
    return reply.send(connection);
  });
}
