import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import type { ContactConsent, Prisma, RecoverySequence } from "../lib/prisma-types.js";
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
  isOutboundEligible,
  revokeConsent,
  sortRecoveryItems,
  type RecoveryItem,
} from "../domain/recovery.js";

const RECOVERY_READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "DENTIST", "RECEPTIONIST", "FINANCIAL", "VIEWER"] as const;
const RECOVERY_ACTION_ROLES = ["OWNER", "ADMIN", "MANAGER", "DENTIST", "RECEPTIONIST"] as const;
const SARAH_ACTION_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTIONIST"] as const;
const CONSENT_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;
// A closed catalog deliberately rejects all free-form additions, including clinical
// information that a keyword blacklist cannot reliably recognize.
const DRAFT_TEMPLATES = [
  { id: "CONTINUE", text: "Olá! Aqui é Sarah, assistente virtual da clínica. Podemos ajudar com seu próximo atendimento? Se preferir, solicite atendimento humano ou responda SAIR." },
  { id: "RESCHEDULE", text: "Olá! Aqui é Sarah, assistente virtual da clínica. Gostaria de conversar com nossa equipe para encontrar um novo horário? Se preferir, solicite atendimento humano ou responda SAIR." },
  { id: "FINAL_INVITATION", text: "Olá! Aqui é Sarah, assistente virtual da clínica. Nossa equipe está disponível quando desejar conversar. Se preferir, solicite atendimento humano ou responda SAIR." },
] as const;

function consentForEligibility(consent: ContactConsent | null) {
  // The persistence model has no authorization field. Only this explicit capture
  // path's source marker, policy version and timestamp constitute authorization.
  if (!consent || !consent.source.startsWith("EXPLICIT:") || !consent.policyVersion ||
      consent.channel !== "WHATSAPP" || consent.purpose !== "RECOVERY") return null;
  return { channel: "WHATSAPP" as const, authorization: "EXPLICIT" as const,
    status: consent.revokedAt ? "REVOKED" as const : consent.status };
}

function sequenceForEligibility(sequence: RecoverySequence | null) {
  return sequence?.status === "ACTIVE" && !sequence.endedAt && !sequence.handoffAt
    ? { status: "ACTIVE" as const, scheduledAction: "OUTREACH" as const }
    : { status: "ENDED" as const, scheduledAction: null };
}

function canDraft(consent: ContactConsent | null, sequence: RecoverySequence | null, stage: string) {
  return stage !== "HUMAN_HANDOFF" && stage !== "ENDED" &&
    isOutboundEligible(consentForEligibility(consent), sequenceForEligibility(sequence));
}

const consentWhere = (tenantId: string, patientId: string) => ({ tenantId, patientId, channel: "WHATSAPP", purpose: "RECOVERY" });
const notFound = (reply: FastifyReply) => reply.code(404).send({ error: "Oportunidade não encontrada.", code: "RECOVERY_NOT_FOUND" });

async function lockPatient(tx: Prisma.TransactionClient, tenantId: string, patientId: string) {
  // All consent and lifecycle writers lock the same patient before reading state.
  // This serializes opt-out, capture, review and handoff across opportunities.
  await tx.$queryRaw`SELECT id FROM patients WHERE tenant_id = ${tenantId} AND id = ${patientId} FOR UPDATE`;
}

async function registerSarahRoutes(app: FastifyInstance) {
  app.get("/recovery/opportunities", { preHandler: requireRole(RECOVERY_READ_ROLES) }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const opportunities = await prisma.recoveryOpportunity.findMany({
      where: { tenantId },
      select: { id: true, patientId: true, sourceType: true, sourceId: true, priorityScore: true,
        estimatedValue: true, stage: true, nextActionAt: true, closedReason: true },
      orderBy: [{ priorityScore: "desc" }, { nextActionAt: "asc" }, { id: "asc" }],
    });
    const data = await Promise.all(opportunities.map(async (opportunity) => {
      const { id: opportunityId, patientId } = opportunity;
      const [patient, consent, sequences, events] = await Promise.all([
        prisma.patient.findFirst({ where: { tenantId, id: patientId }, select: { id: true, name: true, phone: true } }),
        prisma.contactConsent.findFirst({ where: consentWhere(tenantId, patientId), orderBy: [{ capturedAt: "desc" }, { id: "desc" }] }),
        prisma.recoverySequence.findMany({ where: { tenantId, patientId, opportunityId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }] }),
        prisma.communicationEvent.findMany({ where: { tenantId, patientId, opportunityId },
          select: { id: true, sequenceId: true, channel: true, direction: true, kind: true, contentRedacted: true, actorType: true, occurredAt: true },
          orderBy: [{ occurredAt: "desc" }, { id: "desc" }] }),
      ]);
      const activeSequence = sequences.find((sequence) => sequence.status === "ACTIVE") ?? null;
      return { ...opportunity, estimatedValue: asMoney(opportunity.estimatedValue), patient,
        consentStatus: consent?.status ?? "MISSING", outboundEligible: canDraft(consent, activeSequence, opportunity.stage),
        activeSequence: activeSequence && { id: activeSequence.id, step: activeSequence.step, status: activeSequence.status, scheduledAt: activeSequence.scheduledAt },
        events };
    }));
    return reply.send({ data, draftTemplates: DRAFT_TEMPLATES });
  });

  app.post<{ Body: { patientId: string; channel: "WHATSAPP"; purpose: "RECOVERY"; explicit: true; source: string; policyVersion: string } }>(
    "/recovery/consents", {
      preHandler: requireRole(CONSENT_ROLES),
      schema: { body: { type: "object", additionalProperties: false,
        required: ["patientId", "channel", "purpose", "explicit", "source", "policyVersion"],
        properties: {
          patientId: { type: "string", minLength: 1, maxLength: 100 }, channel: { const: "WHATSAPP" },
          purpose: { const: "RECOVERY" }, explicit: { const: true },
          source: { type: "string", enum: ["SIGNED_FORM", "IN_PERSON", "WHATSAPP", "PHONE"] },
          policyVersion: { type: "string", minLength: 1, maxLength: 64, pattern: "^[a-zA-Z0-9._-]+$" },
        } } },
    }, async (request, reply) => {
      const tenantId = request.tenantId!;
      const { patientId, source, policyVersion } = request.body;
      const data = await prisma.$transaction(async (tx) => {
        await lockPatient(tx, tenantId, patientId);
        const patient = await tx.patient.findFirst({ where: { tenantId, id: patientId, deletedAt: null }, select: { id: true } });
        if (!patient) return null;
        const now = new Date();
        await tx.contactConsent.updateMany({ where: { ...consentWhere(tenantId, patientId), status: "ACTIVE" },
          data: { status: "REVOKED", revokedAt: now, revocationSource: "SUPERSEDED_EXPLICIT_CAPTURE" } });
        return tx.contactConsent.create({ data: { tenantId, patientId, channel: "WHATSAPP", purpose: "RECOVERY",
          status: "ACTIVE", capturedAt: now, source: `EXPLICIT:${source};actor=${request.user!.id}`, policyVersion } });
      });
      if (!data) return reply.code(404).send({ error: "Paciente não encontrado.", code: "PATIENT_NOT_FOUND" });
      return reply.code(201).send({ success: true, data });
    },
  );

  app.post<{ Params: { id: string }; Body: { text: string; reviewed: true } }>("/recovery/:id/drafts", {
    preHandler: requireRole(SARAH_ACTION_ROLES),
    schema: { body: { type: "object", additionalProperties: false, required: ["text", "reviewed"], properties: {
      text: { type: "string", minLength: 1, maxLength: 2_000 }, reviewed: { const: true },
    } } },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const id = request.params.id;
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.recoveryOpportunity.findFirst({ where: { tenantId, id }, select: { patientId: true } });
      if (!existing) return { kind: "NOT_FOUND" as const };
      await lockPatient(tx, tenantId, existing.patientId);
      const opportunity = await tx.recoveryOpportunity.findFirst({ where: { tenantId, id } });
      if (!opportunity) return { kind: "NOT_FOUND" as const };
      if (!DRAFT_TEMPLATES.some((template) => template.text === request.body.text)) return { kind: "UNSAFE" as const };
      const consent = await tx.contactConsent.findFirst({ where: consentWhere(tenantId, opportunity.patientId), orderBy: [{ capturedAt: "desc" }, { id: "desc" }] });
      const sequence = await tx.recoverySequence.findFirst({ where: { tenantId, patientId: opportunity.patientId, opportunityId: id, status: "ACTIVE" } });
      if (!canDraft(consent, sequence, opportunity.stage)) return { kind: "INELIGIBLE" as const };
      const event = await tx.communicationEvent.create({ data: {
        tenantId, patientId: opportunity.patientId, opportunityId: id, sequenceId: sequence!.id,
        channel: "WHATSAPP", direction: "INTERNAL", kind: "DRAFT_REVIEWED", contentRedacted: "[REVIEWED_COMMERCIAL_DRAFT]",
        actorType: "USER", actorId: request.user!.id,
      } });
      return { kind: "CREATED" as const, event };
    });
    if (result.kind === "NOT_FOUND") return notFound(reply);
    if (result.kind === "UNSAFE") return reply.code(400).send({ error: "Selecione um texto comercial aprovado.", code: "UNSAFE_COMMERCIAL_TEXT" });
    if (result.kind === "INELIGIBLE") return reply.code(409).send({ error: "Consentimento explícito e sequência ativa são obrigatórios.", code: "OUTBOUND_INELIGIBLE" });
    return reply.code(201).send({ success: true, data: { id: result.event.id, text: request.body.text, kind: result.event.kind, occurredAt: result.event.occurredAt } });
  });

  for (const action of ["handoff", "opt-out"] as const) {
    app.post<{ Params: { id: string } }>(`/recovery/:id/${action}`, { preHandler: requireRole(SARAH_ACTION_ROLES) }, async (request, reply) => {
      const tenantId = request.tenantId!;
      const id = request.params.id;
      const data = await prisma.$transaction(async (tx) => {
        const existing = await tx.recoveryOpportunity.findFirst({ where: { tenantId, id }, select: { patientId: true } });
        if (!existing) return null;
        await lockPatient(tx, tenantId, existing.patientId);
        const opportunity = await tx.recoveryOpportunity.findFirst({ where: { tenantId, id } });
        if (!opportunity) return null;
        const patientId = opportunity.patientId;
        const selection = { id: true, stage: true, closedReason: true, nextActionAt: true } as const;
        const alreadyHandedOff = action === "handoff" &&
          (opportunity.stage === "HUMAN_HANDOFF" || opportunity.closedReason === "CONSENT_REVOKED");
        if (!alreadyHandedOff) {
          const now = new Date();
          const sequenceFilter = { tenantId, patientId, ...(action === "handoff" ? { opportunityId: id } : {}), status: { in: ["ACTIVE", "PAUSED"] as ("ACTIVE" | "PAUSED")[] } };
          const sequence = await tx.recoverySequence.findFirst({ where: { ...sequenceFilter, opportunityId: id }, orderBy: { createdAt: "desc" } });
          if (action === "opt-out") {
            const transition = revokeConsent(sequenceForEligibility(sequence));
            const revokedConsents = await tx.contactConsent.updateMany({ where: { tenantId, patientId, channel: "WHATSAPP", status: "ACTIVE" },
              data: { status: "REVOKED", revokedAt: now, revocationSource: `USER:${request.user!.id}` } });
            const endedSequences = await tx.recoverySequence.updateMany({ where: sequenceFilter, data: { status: transition.status, endedAt: now, scheduledAt: transition.nextScheduledAction } });
            await tx.recoveryOpportunity.updateMany({ where: { tenantId, patientId }, data: { stage: "ENDED", closedReason: transition.reason, nextActionAt: null } });
            if (revokedConsents.count === 0 && endedSequences.count === 0) {
              return tx.recoveryOpportunity.findFirst({ where: { tenantId, id }, select: selection });
            }
          } else {
            await tx.recoverySequence.updateMany({ where: sequenceFilter, data: { status: "ENDED", endedAt: now, handoffAt: now, scheduledAt: null } });
            await tx.recoveryOpportunity.updateMany({ where: { tenantId, id, patientId }, data: { stage: "HUMAN_HANDOFF", closedReason: "HUMAN_REQUEST", nextActionAt: null } });
          }
          await tx.communicationEvent.create({ data: { tenantId, patientId, opportunityId: id, sequenceId: sequence?.id ?? null,
            channel: "WHATSAPP", direction: "INTERNAL", kind: action === "handoff" ? "HANDOFF" : "OPT_OUT",
            actorType: "USER", actorId: request.user!.id } });
        }
        return tx.recoveryOpportunity.findFirst({ where: { tenantId, id }, select: selection });
      });
      if (!data) return notFound(reply);
      return reply.send({ success: true, data });
    });
  }
}
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
  await registerSarahRoutes(app);

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
