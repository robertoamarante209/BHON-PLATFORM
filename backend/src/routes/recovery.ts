import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  FollowUpStatus,
  OpportunityStatus,
  PaymentStatus,
  QuoteStatus,
  TreatmentStatus,
} from "../lib/prisma-types.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, requireTenant } from "../lib/middleware.js";
import {
  appendNote,
  asMoney,
  daysSince,
  financialExposure,
  sortRecoveryItems,
  type RecoveryItem,
} from "../domain/recovery.js";

const RECOVERY_READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "DENTIST", "RECEPTIONIST", "FINANCIAL", "VIEWER"] as const;
const RECOVERY_ACTION_ROLES = ["OWNER", "ADMIN", "MANAGER", "DENTIST", "RECEPTIONIST"] as const;
const OPEN_FOLLOW_UP_STATUSES = [FollowUpStatus.PENDENTE, FollowUpStatus.EM_ANDAMENTO, FollowUpStatus.ADIADO];
const OPEN_OPPORTUNITY_STATUSES = [
  OpportunityStatus.NEW_CONTACT,
  OpportunityStatus.TRIAGEM,
  OpportunityStatus.AVALIACAO,
  OpportunityStatus.PLANO_APRESENTADO,
  OpportunityStatus.ORCAMENTO,
  OpportunityStatus.NEGOCIACAO,
];

type FollowUpActionBody = {
  action: "COMPLETE" | "POSTPONE" | "REASSIGN" | "LOG_CONTACT";
  newDeadline?: string;
  assigneeId?: string;
  notes?: string;
  outcome?: "CONTACTED" | "RESCHEDULED" | "RECOVERED" | "NO_RESPONSE" | "NOT_INTERESTED";
};

function startOfToday(): Date {
  const value = new Date();
  value.setHours(0, 0, 0, 0);
  return value;
}

export async function recoveryRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireTenant);

  app.get(
    "/recovery",
    { preHandler: requireRole(RECOVERY_READ_ROLES) },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = request.tenantId!;
      const today = startOfToday();
      const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000);
      const fifteenDaysAgo = new Date(Date.now() - 15 * 86_400_000);

      const [followUps, quotes, opportunities, treatments, payments, assignees] = await Promise.all([
        prisma.followUp.findMany({
          where: { tenantId, status: { in: OPEN_FOLLOW_UP_STATUSES } },
          select: {
            id: true,
            category: true,
            reason: true,
            priority: true,
            status: true,
            deadlineAt: true,
            nextAction: true,
            createdAt: true,
            patient: { select: { id: true, name: true, recordNumber: true, phone: true } },
            responsibleUser: { select: { id: true, name: true } },
          },
          orderBy: [{ deadlineAt: "asc" }, { createdAt: "asc" }],
          take: 50,
        }),
        prisma.quote.findMany({
          where: {
            tenantId,
            deletedAt: null,
            status: { in: [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.NEGOTIATING, QuoteStatus.NO_RESPONSE] },
            updatedAt: { lte: threeDaysAgo },
          },
          select: {
            id: true,
            title: true,
            status: true,
            finalAmount: true,
            sentAt: true,
            updatedAt: true,
            patient: { select: { id: true, name: true, recordNumber: true, phone: true } },
            createdBy: { select: { id: true, name: true } },
          },
          orderBy: { updatedAt: "asc" },
          take: 25,
        }),
        prisma.opportunity.findMany({
          where: {
            tenantId,
            deletedAt: null,
            status: { in: OPEN_OPPORTUNITY_STATUSES },
            OR: [{ daysInactive: { gte: 3 } }, { updatedAt: { lte: threeDaysAgo } }],
          },
          select: {
            id: true,
            type: true,
            status: true,
            priority: true,
            potentialValue: true,
            daysInactive: true,
            nextStep: true,
            updatedAt: true,
            patient: { select: { id: true, name: true, recordNumber: true, phone: true } },
            assignedTo: { select: { id: true, name: true } },
          },
          orderBy: [{ priority: "desc" }, { updatedAt: "asc" }],
          take: 25,
        }),
        prisma.treatment.findMany({
          where: {
            tenantId,
            deletedAt: null,
            OR: [
              { status: TreatmentStatus.RISK_OF_ABANDONMENT },
              {
                status: { in: [TreatmentStatus.ACTIVE, TreatmentStatus.IN_PROGRESS] },
                nextStageDate: null,
                updatedAt: { lte: fifteenDaysAgo },
              },
            ],
          },
          select: {
            id: true,
            name: true,
            status: true,
            totalValue: true,
            nextStageDate: true,
            updatedAt: true,
            patient: { select: { id: true, name: true, recordNumber: true, phone: true } },
            responsibleUser: { select: { id: true, name: true } },
          },
          orderBy: { updatedAt: "asc" },
          take: 25,
        }),
        prisma.payment.findMany({
          where: {
            tenantId,
            status: { in: [PaymentStatus.PENDENTE, PaymentStatus.PARCIAL] },
            dueDate: { lt: today },
          },
          select: {
            id: true,
            amount: true,
            dueDate: true,
            status: true,
            createdAt: true,
            patient: { select: { id: true, name: true, recordNumber: true, phone: true } },
          },
          orderBy: { dueDate: "asc" },
          take: 25,
        }),
        prisma.user.findMany({
          where: {
            tenantId,
            status: "ACTIVE",
            deletedAt: null,
            role: { in: ["OWNER", "ADMIN", "MANAGER", "DENTIST", "RECEPTIONIST"] },
          },
          select: { id: true, name: true, role: true },
          orderBy: { name: "asc" },
        }),
      ]);

      const items: RecoveryItem[] = [
        ...followUps.map((followUp) => ({
          id: `FOLLOW_UP:${followUp.id}`,
          source: "FOLLOW_UP" as const,
          sourceId: followUp.id,
          priority: followUp.deadlineAt < today ? "URGENT" as const : followUp.priority,
          signal: followUp.deadlineAt < today ? "Acompanhamento atrasado" : "Acompanhamento pendente",
          reason: followUp.reason,
          patient: followUp.patient,
          valueAtRisk: null,
          responsible: followUp.responsibleUser,
          detectedAt: followUp.createdAt.toISOString(),
          deadline: followUp.deadlineAt.toISOString(),
          ageDays: daysSince(followUp.createdAt),
          nextAction: followUp.nextAction || "Registrar contato com o paciente",
          state: followUp.status,
          availableActions: ["LOG_CONTACT", "COMPLETE", "POSTPONE", "REASSIGN", "OPEN"] as RecoveryItem["availableActions"],
          href: `/clinic/follow-ups?focus=${followUp.id}`,
        })),
        ...quotes.map((quote) => {
          const detectedAt = quote.sentAt || quote.updatedAt;
          return {
            id: `QUOTE:${quote.id}`,
            source: "QUOTE" as const,
            sourceId: quote.id,
            priority: quote.finalAmount.toNumber() >= 5_000 ? "HIGH" as const : "MEDIUM" as const,
            signal: "Orçamento sem avanço",
            reason: `${quote.title} está sem atualização há ${daysSince(quote.updatedAt)} dias`,
            patient: quote.patient,
            valueAtRisk: asMoney(quote.finalAmount),
            responsible: quote.createdBy,
            detectedAt: detectedAt.toISOString(),
            deadline: null,
            ageDays: daysSince(quote.updatedAt),
            nextAction: "Retomar a negociação e registrar o resultado",
            state: quote.status,
            availableActions: ["OPEN"] as RecoveryItem["availableActions"],
            href: `/clinic/budgets?focus=${quote.id}`,
          };
        }),
        ...opportunities.map((opportunity) => ({
          id: `OPPORTUNITY:${opportunity.id}`,
          source: "OPPORTUNITY" as const,
          sourceId: opportunity.id,
          priority: opportunity.priority,
          signal: "Oportunidade parada",
          reason: `${opportunity.type.replaceAll("_", " ")} sem avanço operacional`,
          patient: opportunity.patient,
          valueAtRisk: asMoney(opportunity.potentialValue),
          responsible: opportunity.assignedTo,
          detectedAt: opportunity.updatedAt.toISOString(),
          deadline: null,
          ageDays: Math.max(opportunity.daysInactive, daysSince(opportunity.updatedAt)),
          nextAction: opportunity.nextStep || "Definir e executar o próximo passo",
          state: opportunity.status,
          availableActions: ["OPEN"] as RecoveryItem["availableActions"],
          href: `/clinic/opportunities?focus=${opportunity.id}`,
        })),
        ...treatments.map((treatment) => ({
          id: `TREATMENT:${treatment.id}`,
          source: "TREATMENT" as const,
          sourceId: treatment.id,
          priority: treatment.status === TreatmentStatus.RISK_OF_ABANDONMENT ? "URGENT" as const : "HIGH" as const,
          signal: "Tratamento sem próxima etapa",
          reason: `${treatment.name} precisa de continuidade clínica`,
          patient: treatment.patient,
          valueAtRisk: asMoney(treatment.totalValue),
          responsible: treatment.responsibleUser,
          detectedAt: treatment.updatedAt.toISOString(),
          deadline: treatment.nextStageDate?.toISOString() || null,
          ageDays: daysSince(treatment.updatedAt),
          nextAction: "Agendar a próxima etapa do tratamento",
          state: treatment.status,
          availableActions: ["OPEN"] as RecoveryItem["availableActions"],
          href: `/clinic/treatments?focus=${treatment.id}`,
        })),
        ...payments.map((payment) => ({
          id: `PAYMENT:${payment.id}`,
          source: "PAYMENT" as const,
          sourceId: payment.id,
          priority: daysSince(payment.dueDate) >= 15 ? "URGENT" as const : "HIGH" as const,
          signal: "Pagamento em atraso",
          reason: `Recebível vencido há ${daysSince(payment.dueDate)} dias`,
          patient: payment.patient,
          valueAtRisk: asMoney(payment.amount),
          responsible: null,
          detectedAt: payment.createdAt.toISOString(),
          deadline: payment.dueDate.toISOString(),
          ageDays: daysSince(payment.dueDate),
          nextAction: "Contatar o paciente e regularizar o recebível",
          state: payment.status,
          availableActions: ["OPEN"] as RecoveryItem["availableActions"],
          href: `/clinic/finance?focus=${payment.id}`,
        })),
      ];

      const queue = sortRecoveryItems(items);
      const inactiveQuoteValue = quotes.reduce((sum, quote) => sum + quote.finalAmount.toNumber(), 0);
      const overdueReceivables = payments.reduce((sum, payment) => sum + payment.amount.toNumber(), 0);

      return reply.send({
        generatedAt: new Date().toISOString(),
        metrics: {
          actionsRequiringAttention: queue.length,
          overdueActions: followUps.filter((followUp) => followUp.deadlineAt < today).length,
          inactiveBudgets: quotes.length,
          stalledOpportunities: opportunities.length,
          treatmentsAtRisk: treatments.length,
          overduePayments: payments.length,
          inactiveQuoteValue,
          overdueReceivables,
          financialExposure: financialExposure(inactiveQuoteValue, overdueReceivables),
        },
        assignees,
        items: queue,
      });
    },
  );

  app.patch<{ Params: { id: string }; Body: FollowUpActionBody }>(
    "/recovery/follow-ups/:id",
    {
      preHandler: requireRole(RECOVERY_ACTION_ROLES),
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["action"],
          properties: {
            action: { type: "string", enum: ["COMPLETE", "POSTPONE", "REASSIGN", "LOG_CONTACT"] },
            newDeadline: { type: "string", format: "date-time" },
            assigneeId: { type: "string", minLength: 1, maxLength: 100 },
            notes: { type: "string", maxLength: 2_000 },
            outcome: { type: "string", enum: ["CONTACTED", "RESCHEDULED", "RECOVERED", "NO_RESPONSE", "NOT_INTERESTED"] },
          },
        },
      },
    },
    async (request, reply) => {
      const tenantId = request.tenantId!;
      const actor = request.user!;
      const { id } = request.params;
      const body = request.body;

      const followUp = await prisma.followUp.findFirst({
        where: { id, tenantId },
        include: { patient: { select: { id: true, name: true } } },
      });
      if (!followUp) return reply.code(404).send({ error: "Acompanhamento não encontrado.", code: "FOLLOW_UP_NOT_FOUND" });
      if (followUp.status === FollowUpStatus.CONCLUIDO || followUp.status === FollowUpStatus.CANCELADO) {
        return reply.code(409).send({ error: "Este acompanhamento já está encerrado.", code: "FOLLOW_UP_CLOSED" });
      }
      if ((body.action === "COMPLETE" || body.action === "LOG_CONTACT") && (body.notes?.trim().length || 0) < 3) {
        return reply.code(400).send({ error: "Descreva o contato realizado.", code: "CONTACT_NOTES_REQUIRED" });
      }
      if (body.action === "COMPLETE" && !body.outcome) {
        return reply.code(400).send({ error: "Selecione o desfecho do acompanhamento.", code: "OUTCOME_REQUIRED" });
      }

      let assignee: { id: string; name: string } | null = null;
      if (body.action === "REASSIGN") {
        if (!body.assigneeId) return reply.code(400).send({ error: "Selecione o novo responsável.", code: "ASSIGNEE_REQUIRED" });
        assignee = await prisma.user.findFirst({
          where: { id: body.assigneeId, tenantId, status: "ACTIVE", deletedAt: null },
          select: { id: true, name: true },
        });
        if (!assignee) return reply.code(404).send({ error: "Responsável não encontrado nesta clínica.", code: "ASSIGNEE_NOT_FOUND" });
      }

      let postponedUntil: Date | null = null;
      if (body.action === "POSTPONE") {
        postponedUntil = body.newDeadline ? new Date(body.newDeadline) : null;
        if (!postponedUntil || Number.isNaN(postponedUntil.getTime()) || postponedUntil <= new Date()) {
          return reply.code(400).send({ error: "Informe um novo prazo futuro.", code: "INVALID_DEADLINE" });
        }
      }

      const result = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
        const lockedFollowUp = await tx.followUp.findFirst({
          where: { id, tenantId },
          include: { patient: { select: { id: true, name: true } } },
        });
        if (!lockedFollowUp) return { kind: "NOT_FOUND" as const };
        if (lockedFollowUp.status === FollowUpStatus.CONCLUIDO || lockedFollowUp.status === FollowUpStatus.CANCELADO) {
          return { kind: "CLOSED" as const };
        }
        const now = new Date();
        const nextNotes = appendNote(lockedFollowUp.notes, body.notes);
        const updated = await tx.followUp.update({
          where: { id },
          data:
            body.action === "COMPLETE"
              ? { status: FollowUpStatus.CONCLUIDO, lastContactAt: now, notes: nextNotes }
              : body.action === "POSTPONE"
                ? { status: FollowUpStatus.ADIADO, deadlineAt: postponedUntil!, notes: nextNotes }
                : body.action === "REASSIGN"
                  ? { responsibleUserId: assignee!.id, notes: nextNotes }
                  : { status: FollowUpStatus.EM_ANDAMENTO, lastContactAt: now, notes: nextNotes },
          include: {
            patient: { select: { id: true, name: true, recordNumber: true, phone: true } },
            responsibleUser: { select: { id: true, name: true } },
          },
        });

        if (body.action === "COMPLETE" || body.action === "LOG_CONTACT") {
          const opportunity = await tx.opportunity.findFirst({
            where: { tenantId, patientId: lockedFollowUp.patientId, status: { in: OPEN_OPPORTUNITY_STATUSES }, deletedAt: null },
            orderBy: { updatedAt: "desc" },
            select: { id: true },
          });
          if (opportunity) {
            await tx.opportunity.update({
              where: { id: opportunity.id },
              data: {
                lastContactAt: now,
                daysInactive: 0,
                ...(body.outcome ? { nextStep: `Resultado do contato: ${body.outcome}` } : {}),
              },
            });
          }
        }

        const actionLabels: Record<FollowUpActionBody["action"], string> = {
          COMPLETE: "Acompanhamento concluído",
          POSTPONE: `Acompanhamento adiado para ${postponedUntil?.toISOString()}`,
          REASSIGN: `Acompanhamento reatribuído para ${assignee?.name}`,
          LOG_CONTACT: "Contato com o paciente registrado",
        };
        await tx.timelineEvent.create({
          data: {
            tenantId,
            patientId: lockedFollowUp.patientId,
            actorUserId: actor.id,
            type: `FOLLOW_UP_${body.action}`,
            description: `${actionLabels[body.action]}. ${body.notes?.trim() || ""}`.trim(),
            metadata: { followUpId: id, outcome: body.outcome || null },
          },
        });
        await tx.auditLog.create({
          data: {
            tenantId,
            actorUserId: actor.id,
            action: body.action,
            resource: "FollowUp",
            resourceId: id,
            metadata: {
              previousStatus: lockedFollowUp.status,
              newStatus: updated.status,
              previousAssigneeId: lockedFollowUp.responsibleUserId,
              newAssigneeId: updated.responsibleUserId,
              previousDeadline: lockedFollowUp.deadlineAt,
              newDeadline: updated.deadlineAt,
              outcome: body.outcome || null,
            },
          },
        });
        if (body.action === "REASSIGN" && assignee) {
          await tx.notification.create({
            data: {
              tenantId,
              userId: assignee.id,
              type: "FOLLOW_UP_ASSIGNED",
              title: `Novo acompanhamento: ${lockedFollowUp.patient.name}`,
              message: lockedFollowUp.reason,
              link: `/clinic/follow-ups?focus=${id}`,
              priority: lockedFollowUp.priority,
            },
          });
        }
        return { kind: "UPDATED" as const, data: updated };
      });

      if (result.kind === "NOT_FOUND") return reply.code(404).send({ error: "Acompanhamento não encontrado.", code: "FOLLOW_UP_NOT_FOUND" });
      if (result.kind === "CLOSED") return reply.code(409).send({ error: "Este acompanhamento já foi encerrado.", code: "FOLLOW_UP_CLOSED" });
      return reply.send({ success: true, data: result.data });
    },
  );
}
