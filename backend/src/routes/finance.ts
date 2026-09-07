import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { PaymentStatus } from "../lib/prisma-types.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, requireTenant } from "../lib/middleware.js";
import { effectivePaymentStatus, moneyToCents, outstandingCents, receiptResult } from "../domain/finance.js";

const FINANCE_READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "FINANCIAL", "VIEWER"] as const;
const FINANCE_WRITE_ROLES = ["OWNER", "ADMIN", "MANAGER", "FINANCIAL"] as const;
const PAYMENT_METHODS = ["PIX", "CARTAO_CREDITO", "CARTAO_DEBITO", "DINHEIRO", "TRANSFERENCIA", "BOLETO", "OUTRO"] as const;

function todayInClinicTimeZone() {
  const timeZone = process.env.BHON_TIME_ZONE || "America/Sao_Paulo";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return new Date(`${value.year}-${value.month}-${value.day}T00:00:00.000Z`);
}

function statusFilter(status: string | undefined, today: Date) {
  if (status === "ATRASADO") {
    return {
      OR: [
        { status: PaymentStatus.ATRASADO },
        { status: { in: [PaymentStatus.PENDENTE, PaymentStatus.PARCIAL] }, dueDate: { lt: today } },
      ],
    };
  }
  if (status === "PENDENTE") return { status: PaymentStatus.PENDENTE, dueDate: { gte: today } };
  if (status === "PARCIAL") return { status: PaymentStatus.PARCIAL, dueDate: { gte: today } };
  if (status && status !== "ALL") return { status };
  return {};
}

const paymentInclude = {
  patient: { select: { id: true, name: true, recordNumber: true } },
  quote: { select: { id: true, title: true } },
  treatment: { select: { id: true, name: true } },
  receipts: {
    orderBy: { paidAt: "desc" as const },
    take: 1,
    include: { receivedBy: { select: { id: true, name: true } } },
  },
};

function serializePayment(payment: any, today: Date) {
  const amount = Number(payment.amount);
  const paidAmount = Number(payment.paidAmount);
  const totalCents = Math.round(amount * 100);
  const paidCents = Math.round(paidAmount * 100);
  return {
    ...payment,
    amount,
    paidAmount,
    outstandingAmount: outstandingCents(totalCents, paidCents) / 100,
    recordedStatus: payment.status,
    status: effectivePaymentStatus({
      status: payment.status,
      totalCents,
      paidCents,
      dueDate: payment.dueDate,
      today,
    }),
    referenceDescription: payment.treatment?.name || payment.quote?.title || payment.category || payment.referenceType,
    lastReceipt: payment.receipts[0] || null,
    receipts: undefined,
  };
}

export async function financeRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireTenant);

  app.get<{
    Querystring: { search?: string; status?: string; focus?: string; page?: string; limit?: string };
  }>("/finance/payments", {
    preHandler: requireRole(FINANCE_READ_ROLES),
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
          search: { type: "string", maxLength: 100 },
          status: { type: "string", enum: ["ALL", "PAGO", "PENDENTE", "ATRASADO", "PARCIAL", "CANCELADO"] },
          focus: { type: "string", maxLength: 80 },
          page: { type: "string", pattern: "^[1-9][0-9]*$" },
          limit: { type: "string", pattern: "^[1-9][0-9]*$" },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 20));
    const search = request.query.search?.trim();
    const today = todayInClinicTimeZone();
    const where: any = {
      tenantId,
      ...statusFilter(request.query.status, today),
      ...(search ? {
        AND: [{
          OR: [
            { patient: { is: { name: { contains: search, mode: "insensitive" } } } },
            { patient: { is: { recordNumber: { contains: search, mode: "insensitive" } } } },
            { category: { contains: search, mode: "insensitive" } },
            { quote: { is: { title: { contains: search, mode: "insensitive" } } } },
            { treatment: { is: { name: { contains: search, mode: "insensitive" } } } },
          ],
        }],
      } : {}),
    };

    const activeWhere = { tenantId, status: { not: PaymentStatus.CANCELADO } };
    const overdueWhere = {
      tenantId,
      status: { notIn: [PaymentStatus.PAGO, PaymentStatus.CANCELADO] },
      dueDate: { lt: today },
    };

    const [payments, total, allAmounts, activeCount, overdueAmounts, negotiation, focused] = await Promise.all([
      prisma.payment.findMany({ where, include: paymentInclude, orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }], skip: (page - 1) * limit, take: limit }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({ where: activeWhere, _sum: { amount: true, paidAmount: true } }),
      prisma.payment.count({ where: activeWhere }),
      prisma.payment.aggregate({ where: overdueWhere, _sum: { amount: true, paidAmount: true } }),
      prisma.quote.aggregate({ where: { tenantId, status: { in: ["SENT", "NEGOTIATING"] } }, _sum: { finalAmount: true } }),
      request.query.focus ? prisma.payment.findFirst({ where: { id: request.query.focus, tenantId }, include: paymentInclude }) : null,
    ]);

    if (focused && !payments.some((payment) => payment.id === focused.id)) {
      payments.unshift(focused);
      if (payments.length > limit) payments.pop();
    }

    const totalAmount = Number(allAmounts._sum.amount || 0);
    const receivedAmount = Number(allAmounts._sum.paidAmount || 0);
    const overdueAmount = Math.max(0, Number(overdueAmounts._sum.amount || 0) - Number(overdueAmounts._sum.paidAmount || 0));

    return reply.send({
      data: payments.map((payment) => serializePayment(payment, today)),
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      metrics: {
        receivedAmount,
        outstandingAmount: Math.max(0, totalAmount - receivedAmount),
        overdueAmount,
        projectedRevenue: totalAmount,
        negotiationAmount: Number(negotiation._sum.finalAmount || 0),
        averageTicket: activeCount ? totalAmount / activeCount : null,
      },
    });
  });

  app.post<{
    Params: { id: string };
    Body: { amount?: number; method: string; paidAt?: string; notes?: string };
  }>("/finance/payments/:id/pay", {
    preHandler: requireRole(FINANCE_WRITE_ROLES),
    schema: {
      params: { type: "object", additionalProperties: false, required: ["id"], properties: { id: { type: "string", minLength: 1, maxLength: 80 } } },
      body: {
        type: "object",
        additionalProperties: false,
        required: ["method"],
        properties: {
          amount: { type: "number", exclusiveMinimum: 0, maximum: 9999999999.99 },
          method: { type: "string", enum: [...PAYMENT_METHODS] },
          paidAt: { type: "string", format: "date-time" },
          notes: { type: "string", maxLength: 500 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string }; Body: { amount?: number; method: string; paidAt?: string; notes?: string } }>, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const user = request.user!;
    const { id } = request.params;
    const paidAt = request.body.paidAt ? new Date(request.body.paidAt) : new Date();
    const now = Date.now();
    if (!Number.isFinite(paidAt.getTime()) || paidAt.getTime() > now + 5 * 60_000 || paidAt.getTime() < now - 366 * 86_400_000) {
      return reply.code(400).send({ error: "Data de recebimento inválida.", code: "INVALID_PAID_AT" });
    }

    const result = await prisma.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const payment = await tx.payment.findFirst({ where: { id, tenantId }, include: { patient: { select: { name: true } } } });
      if (!payment) return { kind: "NOT_FOUND" as const };
      if (payment.status === PaymentStatus.CANCELADO) return { kind: "CANCELLED" as const };

      const totalCents = Math.round(Number(payment.amount) * 100);
      const paidCents = Math.round(Number(payment.paidAmount) * 100);
      const receiptCents = request.body.amount == null ? outstandingCents(totalCents, paidCents) : moneyToCents(request.body.amount);
      const next = receiptResult(totalCents, paidCents, receiptCents);
      if (!next.valid) return { kind: next.reason };

      const amount = receiptCents / 100;
      const receipt = await tx.paymentReceipt.create({
        data: { tenantId, paymentId: payment.id, receivedById: user.id, amount, method: request.body.method, paidAt, notes: request.body.notes?.trim() || null },
      });
      const completedAt = next.status === "PAGO" ? paidAt : null;
      const updatedPayment = await tx.payment.update({
        where: { id: payment.id },
        data: { paidAmount: next.nextPaidCents / 100, status: next.status, paidAt: completedAt, paymentMethod: request.body.method },
      });
      await tx.financialTransaction.upsert({
        where: { paymentId: payment.id },
        update: { status: next.status, paidAt: completedAt },
        create: {
          tenantId,
          paymentId: payment.id,
          patientId: payment.patientId,
          treatmentId: payment.treatmentId,
          type: "RECEITA",
          category: payment.category || "TRATAMENTO_ODONTOLOGICO",
          description: `Recebível do pagamento ${payment.id}`,
          amount: payment.amount,
          dueDate: payment.dueDate,
          paidAt: completedAt,
          status: next.status,
        },
      });
      await tx.timelineEvent.create({
        data: {
          tenantId,
          patientId: payment.patientId,
          actorUserId: user.id,
          type: "PAYMENT_RECEIVED",
          description: `Recebimento de R$ ${amount.toFixed(2)} registrado (${request.body.method}). Saldo: R$ ${(next.outstandingCents / 100).toFixed(2)}.`,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: user.id,
          action: next.status === "PAGO" ? "PAYMENT_SETTLED" : "PAYMENT_PARTIALLY_SETTLED",
          resource: "Payment",
          resourceId: payment.id,
          metadata: { receiptId: receipt.id, amount, method: request.body.method, paidAt: paidAt.toISOString(), outstandingAmount: next.outstandingCents / 100 },
        },
      });
      return { kind: "OK" as const, payment: updatedPayment, receipt, outstandingAmount: next.outstandingCents / 100 };
    });

    if (result.kind === "NOT_FOUND") return reply.code(404).send({ error: "Recebível não encontrado.", code: "PAYMENT_NOT_FOUND" });
    if (result.kind === "CANCELLED") return reply.code(409).send({ error: "Recebível cancelado não pode ser liquidado.", code: "PAYMENT_CANCELLED" });
    if (result.kind === "INVALID_AMOUNT") return reply.code(400).send({ error: "Informe um valor de recebimento válido.", code: "INVALID_AMOUNT" });
    if (result.kind === "AMOUNT_EXCEEDS_OUTSTANDING") return reply.code(409).send({ error: "O valor informado supera o saldo do recebível.", code: "AMOUNT_EXCEEDS_OUTSTANDING" });
    return reply.send({ success: true, data: result });
  });
}

