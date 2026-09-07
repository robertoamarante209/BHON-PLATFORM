import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { inactivityDays, isOpportunityTransitionAllowed, type OpportunityState } from "../domain/opportunity.js";
import { prisma } from "../lib/prisma.js";
import { FollowUpCategory, FollowUpStatus, OpportunityStatus } from "../lib/prisma-types.js";
import { requireAuth, requireRole, requireTenant } from "../lib/middleware.js";

const READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "DENTIST", "RECEPTIONIST", "FINANCIAL", "VIEWER"] as const;
const OPPORTUNITY_WRITE_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTIONIST"] as const;
const ASSIGNEE_ROLES = ["OWNER", "ADMIN", "MANAGER", "DENTIST", "RECEPTIONIST"] as const;
const OPEN_OPPORTUNITY_STATUSES: OpportunityStatus[] = [
  OpportunityStatus.NEW_CONTACT,
  OpportunityStatus.TRIAGEM,
  OpportunityStatus.AVALIACAO,
  OpportunityStatus.PLANO_APRESENTADO,
  OpportunityStatus.ORCAMENTO,
  OpportunityStatus.NEGOCIACAO,
];
const OPEN_FOLLOW_UP_STATUSES: FollowUpStatus[] = [FollowUpStatus.PENDENTE, FollowUpStatus.EM_ANDAMENTO, FollowUpStatus.ADIADO];

export async function workflowRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireTenant);

  app.get("/opportunities", {
    preHandler: requireRole(READ_ROLES),
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
          search: { type: "string", maxLength: 120 },
          status: { type: "string", enum: Object.values(OpportunityStatus) },
          page: { type: "integer", minimum: 1, maximum: 100000, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const query = request.query as { search?: string; status?: OpportunityStatus; page?: number; limit?: number };
    const page = query.page || 1;
    const limit = query.limit || 20;
    const search = query.search?.trim();
    const where = {
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(search ? {
        OR: [
          { patient: { name: { contains: search, mode: "insensitive" as const } } },
          { patient: { recordNumber: { contains: search, mode: "insensitive" as const } } },
          { source: { contains: search, mode: "insensitive" as const } },
          { nextStep: { contains: search, mode: "insensitive" as const } },
        ],
      } : {}),
    };

    const [rows, total, stageGroups] = await Promise.all([
      prisma.opportunity.findMany({
        where,
        include: {
          patient: {
            select: {
              id: true, name: true, phone: true, recordNumber: true,
              quotes: { where: { deletedAt: null }, orderBy: { updatedAt: "desc" }, take: 1, select: { title: true } },
            },
          },
          assignedTo: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: "desc" }, { updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.opportunity.count({ where }),
      prisma.opportunity.groupBy({
        by: ["status"],
        where: { tenantId, deletedAt: null },
        _count: { _all: true },
        _sum: { potentialValue: true },
      }),
    ]);

    const counts = Object.fromEntries(Object.values(OpportunityStatus).map((status) => [status, 0]));
    let activePotential = 0;
    for (const group of stageGroups) {
      counts[group.status] = group._count._all;
      if (OPEN_OPPORTUNITY_STATUSES.includes(group.status)) activePotential += Number(group._sum.potentialValue || 0);
    }
    const data = rows.map((opportunity) => ({
      ...opportunity,
      treatmentTitle: opportunity.patient.quotes[0]?.title || null,
      daysInactive: inactivityDays(opportunity.lastContactAt, opportunity.updatedAt),
      patient: { ...opportunity.patient, quotes: undefined },
    }));

    return reply.send({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      metrics: { activePotential, counts },
    });
  });

  app.patch<{ Params: { id: string } }>("/opportunities/:id/status", {
    preHandler: requireRole(OPPORTUNITY_WRITE_ROLES),
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["status"],
        properties: {
          status: { type: "string", enum: Object.values(OpportunityStatus) },
          nextStep: { type: "string", maxLength: 500 },
          reason: { type: "string", maxLength: 500 },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const actor = request.user!;
    const body = request.body as { status: OpportunityStatus; nextStep?: string; reason?: string };
    if (body.status === OpportunityStatus.CONVERTIDO) {
      return reply.code(409).send({ error: "Converta a oportunidade aprovando seu orçamento para manter tratamento e financeiro consistentes.", code: "APPROVE_QUOTE_REQUIRED" });
    }
    if (body.status === OpportunityStatus.PERDIDO && (body.reason?.trim().length || 0) < 3) {
      return reply.code(400).send({ error: "Informe o motivo da perda da oportunidade.", code: "REASON_REQUIRED" });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${request.params.id}))`;
      const opportunity = await tx.opportunity.findFirst({ where: { id: request.params.id, tenantId, deletedAt: null } });
      if (!opportunity) return { kind: "NOT_FOUND" as const };
      if (opportunity.status === body.status) return { kind: "UNCHANGED" as const, opportunity };
      if (!isOpportunityTransitionAllowed(opportunity.status as OpportunityState, body.status as OpportunityState)) {
        return { kind: "INVALID_TRANSITION" as const, from: opportunity.status };
      }
      const updated = await tx.opportunity.update({
        where: { id: opportunity.id },
        data: {
          status: body.status,
          nextStep: body.status === OpportunityStatus.PERDIDO
            ? `Oportunidade perdida: ${body.reason!.trim()}`
            : body.nextStep?.trim() || opportunity.nextStep,
        },
      });
      await tx.timelineEvent.create({ data: {
        tenantId, patientId: opportunity.patientId, actorUserId: actor.id, type: "OPPORTUNITY_STATUS_CHANGED",
        description: `Oportunidade alterada de ${opportunity.status} para ${body.status}.${body.reason ? ` Motivo: ${body.reason.trim()}` : ""}`,
      } });
      await tx.auditLog.create({ data: {
        tenantId, actorUserId: actor.id, action: "CHANGE_STATUS", resource: "Opportunity", resourceId: opportunity.id,
        metadata: { from: opportunity.status, to: body.status, reason: body.reason?.trim() || null, nextStep: updated.nextStep },
      } });
      return { kind: "UPDATED" as const, opportunity: updated };
    });

    if (result.kind === "NOT_FOUND") return reply.code(404).send({ error: "Oportunidade não encontrada.", code: "OPPORTUNITY_NOT_FOUND" });
    if (result.kind === "INVALID_TRANSITION") return reply.code(409).send({ error: `Transição inválida: ${result.from} → ${body.status}.`, code: "INVALID_STATUS_TRANSITION" });
    return reply.send(result.opportunity);
  });

  app.get("/follow-ups", {
    preHandler: requireRole(READ_ROLES),
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
          search: { type: "string", maxLength: 120 },
          category: { type: "string", enum: Object.values(FollowUpCategory) },
          status: { type: "string", enum: Object.values(FollowUpStatus) },
          focus: { type: "string", minLength: 1, maxLength: 100 },
          page: { type: "integer", minimum: 1, maximum: 100000, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const query = request.query as { search?: string; category?: FollowUpCategory; status?: FollowUpStatus; focus?: string; page?: number; limit?: number };
    const page = query.page || 1;
    const limit = query.limit || 20;
    const search = query.search?.trim();
    const where = {
      tenantId,
      ...(query.focus ? { id: query.focus } : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(search ? {
        OR: [
          { reason: { contains: search, mode: "insensitive" as const } },
          { nextAction: { contains: search, mode: "insensitive" as const } },
          { patient: { name: { contains: search, mode: "insensitive" as const } } },
          { patient: { recordNumber: { contains: search, mode: "insensitive" as const } } },
        ],
      } : {}),
    };
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const [data, total, pendingToday, categoryGroups, assignees] = await Promise.all([
      prisma.followUp.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, phone: true, recordNumber: true } },
          responsibleUser: { select: { id: true, name: true } },
        },
        orderBy: [{ priority: "desc" }, { deadlineAt: "asc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.followUp.count({ where }),
      prisma.followUp.count({ where: { tenantId, status: { in: OPEN_FOLLOW_UP_STATUSES }, deadlineAt: { lte: todayEnd } } }),
      prisma.followUp.groupBy({ by: ["category"], where: { tenantId, status: { in: OPEN_FOLLOW_UP_STATUSES } }, _count: { _all: true } }),
      prisma.user.findMany({
        where: { tenantId, status: "ACTIVE", deletedAt: null, role: { in: [...ASSIGNEE_ROLES] } },
        select: { id: true, name: true, role: true },
        orderBy: { name: "asc" },
      }),
    ]);
    const categoryCounts = Object.fromEntries(Object.values(FollowUpCategory).map((category) => [category, 0]));
    for (const group of categoryGroups) categoryCounts[group.category] = group._count._all;
    return reply.send({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      metrics: { pendingToday, categoryCounts },
      assignees,
    });
  });
}
