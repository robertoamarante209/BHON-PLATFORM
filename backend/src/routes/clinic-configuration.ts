import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { Prisma, UserRole } from "../lib/prisma-types.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireTenant } from "../lib/middleware.js";
import { normalizeAvailability } from "../domain/availability.js";
import { canManageClinicConfiguration, canReadAvailability, canReadProtocols, normalizeProtocolInput } from "../domain/clinic-configuration.js";

const forbidden = (reply: FastifyReply) => reply.code(403).send({ error: "Você não possui permissão para configurar a clínica.", code: "PERMISSION_REQUIRED" });
const conflict = (reply: FastifyReply) => reply.code(409).send({ error: "Esta configuração foi alterada por outra pessoa. Recarregue e tente novamente.", code: "VERSION_CONFLICT" });
const availabilityRoles = [UserRole.OWNER, UserRole.MANAGER, UserRole.DENTIST];
function allow(check: (user: NonNullable<FastifyRequest["user"]>) => boolean) {
  return async (request: FastifyRequest, reply: FastifyReply) => { if (!request.user || !check(request.user)) return forbidden(reply); };
}

export async function clinicConfigurationRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireTenant);

  app.get<{ Querystring: { professionalId?: string } }>("/settings/availability", { preHandler: allow(canReadAvailability) }, async (request, reply) => {
    const professionalId = request.query.professionalId || null;
    if (professionalId) {
      const professional = await prisma.user.findFirst({ where: { id: professionalId, tenantId: request.tenantId!, status: "ACTIVE", deletedAt: null, role: { in: availabilityRoles } }, select: { id: true } });
      if (!professional) return reply.code(404).send({ error: "Profissional ativo não encontrado nesta clínica.", code: "PROFESSIONAL_NOT_FOUND" });
    }
    const record = await prisma.clinicAvailability.findUnique({ where: { tenantId_scopeKey: { tenantId: request.tenantId!, scopeKey: professionalId ? `professional:${professionalId}` : "clinic" } } });
    return reply.send(record ? { professionalId, intervals: record.intervals, version: record.version } : null);
  });

  app.put<{ Querystring: { professionalId?: string }; Body: { intervals: unknown; version: number } }>("/settings/availability", { preHandler: allow(canManageClinicConfiguration) }, async (request, reply) => {
    const tenantId = request.tenantId!; const professionalId = request.query.professionalId || null;
    let intervals; try { intervals = normalizeAvailability(request.body?.intervals); } catch (error) { return reply.code(400).send({ error: (error as Error).message, code: "INVALID_AVAILABILITY" }); }
    if (!Number.isInteger(request.body?.version) || request.body.version < 0) return reply.code(400).send({ error: "Versão da disponibilidade inválida.", code: "INVALID_VERSION" });
    if (professionalId) {
      const professional = await prisma.user.findFirst({ where: { id: professionalId, tenantId, status: "ACTIVE", deletedAt: null, role: { in: availabilityRoles } }, select: { id: true } });
      if (!professional) return reply.code(404).send({ error: "Profissional ativo não encontrado nesta clínica.", code: "PROFESSIONAL_NOT_FOUND" });
    }
    const scopeKey = professionalId ? `professional:${professionalId}` : "clinic";
    try {
      const saved = await prisma.$transaction(async (tx) => {
        let value;
        if (request.body.version === 0) value = await tx.clinicAvailability.create({ data: { tenantId, professionalId, scopeKey, intervals, version: 1 } });
        else {
          const updated = await tx.clinicAvailability.updateMany({ where: { tenantId, scopeKey, version: request.body.version }, data: { intervals, version: { increment: 1 } } });
          if (updated.count !== 1) throw Object.assign(new Error("conflict"), { code: "VERSION_CONFLICT" });
          value = await tx.clinicAvailability.findUniqueOrThrow({ where: { tenantId_scopeKey: { tenantId, scopeKey } } });
        }
        await tx.auditLog.create({ data: { tenantId, actorUserId: request.user!.id, action: "AVAILABILITY_SAVED", resource: "ClinicAvailability", resourceId: value.id, metadata: { professionalId, version: value.version } } });
        return value;
      });
      return reply.send({ professionalId, intervals: saved.intervals, version: saved.version });
    } catch (error) {
      if ((error as { code?: string }).code === "VERSION_CONFLICT" || (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) return conflict(reply);
      throw error;
    }
  });

  app.get("/settings/protocols", { preHandler: allow(canReadProtocols) }, async (request) => prisma.clinicProtocol.findMany({ where: { tenantId: request.tenantId! }, orderBy: [{ isActive: "desc" }, { title: "asc" }] }));

  app.post<{ Body: { title?: unknown; description?: unknown; steps?: unknown; isActive?: unknown } }>("/settings/protocols", { preHandler: allow(canManageClinicConfiguration) }, async (request, reply) => {
    let input; try { input = normalizeProtocolInput(request.body); } catch (error) { return reply.code(400).send({ error: (error as Error).message, code: "INVALID_PROTOCOL" }); }
    const created = await prisma.$transaction(async (tx) => {
      const value = await tx.clinicProtocol.create({ data: { tenantId: request.tenantId!, ...input } });
      await tx.auditLog.create({ data: { tenantId: request.tenantId!, actorUserId: request.user!.id, action: "PROTOCOL_CREATED", resource: "ClinicProtocol", resourceId: value.id } }); return value;
    });
    return reply.code(201).send(created);
  });

  app.patch<{ Params: { id: string }; Body: { title?: unknown; description?: unknown; steps?: unknown; isActive?: unknown; version: number } }>("/settings/protocols/:id", { preHandler: allow(canManageClinicConfiguration) }, async (request, reply) => {
    let input; try { input = normalizeProtocolInput(request.body); } catch (error) { return reply.code(400).send({ error: (error as Error).message, code: "INVALID_PROTOCOL" }); }
    if (!Number.isInteger(request.body.version) || request.body.version < 1) return reply.code(400).send({ error: "Versão do protocolo inválida.", code: "INVALID_VERSION" });
    try {
      const saved = await prisma.$transaction(async (tx) => {
        const updated = await tx.clinicProtocol.updateMany({ where: { id: request.params.id, tenantId: request.tenantId!, version: request.body.version }, data: { ...input, version: { increment: 1 } } });
        if (updated.count !== 1) {
          const exists = await tx.clinicProtocol.findFirst({ where: { id: request.params.id, tenantId: request.tenantId! }, select: { id: true } });
          if (!exists) throw Object.assign(new Error("not found"), { code: "NOT_FOUND" });
          throw Object.assign(new Error("conflict"), { code: "VERSION_CONFLICT" });
        }
        const value = await tx.clinicProtocol.findFirstOrThrow({ where: { id: request.params.id, tenantId: request.tenantId! } });
        await tx.auditLog.create({ data: { tenantId: request.tenantId!, actorUserId: request.user!.id, action: "PROTOCOL_UPDATED", resource: "ClinicProtocol", resourceId: value.id, metadata: { version: value.version, isActive: value.isActive } } }); return value;
      }); return reply.send(saved);
    } catch (error) {
      if ((error as { code?: string }).code === "VERSION_CONFLICT") return conflict(reply);
      if ((error as { code?: string }).code === "NOT_FOUND") return reply.code(404).send({ error: "Protocolo não encontrado.", code: "PROTOCOL_NOT_FOUND" });
      throw error;
    }
  });
}
