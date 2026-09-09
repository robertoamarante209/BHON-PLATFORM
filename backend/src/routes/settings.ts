import type { FastifyInstance } from "fastify";
import { AppointmentStatus, QuoteStatus, TreatmentStatus, UserRole, UserStatus } from "../lib/prisma-types.js";
import { indicatorPeriodRange, percentage, type IndicatorPeriod } from "../domain/indicators.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, requireTenant } from "../lib/middleware.js";

const CLINIC_READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "DENTIST", "RECEPTIONIST", "FINANCIAL", "VIEWER"] as const;
const SETTINGS_WRITE_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;
const PRODUCTIVE_ROLES = [UserRole.OWNER, UserRole.MANAGER, UserRole.DENTIST];

function countsByStatus(rows: Array<{ status: string; _count: { _all: number } }>) {
  return Object.fromEntries(rows.map((row) => [row.status, row._count._all])) as Record<string, number>;
}

export async function settingsRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireTenant);

  app.get("/settings", { preHandler: requireRole(CLINIC_READ_ROLES) }, async (request, reply) => {
    const tenant = request.tenant!;
    const rooms = await prisma.room.findMany({
      where: { tenantId: request.tenantId! },
      orderBy: [{ orderIndex: "asc" }, { name: "asc" }],
    });

    return reply.send({
      clinic: {
        id: tenant.id,
        name: tenant.name,
        tradeName: tenant.tradeName,
        slug: tenant.slug,
        email: tenant.email,
        phone: tenant.phone,
        status: tenant.status,
        planCode: tenant.planCode,
        createdAt: tenant.createdAt,
        activeRoomsCount: rooms.filter((room) => room.isActive).length,
      },
      rooms,
    });
  });

  app.post<{ Body: { name: string; description?: string; orderIndex?: number } }>("/rooms", {
    preHandler: requireRole(SETTINGS_WRITE_ROLES),
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100 },
          description: { type: "string", maxLength: 500 },
          orderIndex: { type: "integer", minimum: 1, maximum: 999 },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const user = request.user!;
    const name = request.body.name.trim();
    const duplicate = await prisma.room.findFirst({
      where: { tenantId, name: { equals: name, mode: "insensitive" } },
      select: { id: true },
    });
    if (duplicate) return reply.code(409).send({ error: "Já existe um ambiente com esse nome.", code: "ROOM_NAME_CONFLICT" });

    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.room.create({
        data: {
          tenantId,
          name,
          description: request.body.description?.trim() || null,
          orderIndex: request.body.orderIndex || 1,
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: user.id,
          action: "ROOM_CREATED",
          resource: "Room",
          resourceId: created.id,
          metadata: { name: created.name },
        },
      });
      return created;
    });

    return reply.code(201).send(room);
  });

  app.patch<{ Params: { id: string }; Body: { name?: string; description?: string | null; orderIndex?: number; isActive?: boolean } }>("/rooms/:id", {
    preHandler: requireRole(SETTINGS_WRITE_ROLES),
    schema: {
      params: { type: "object", required: ["id"], properties: { id: { type: "string", minLength: 1, maxLength: 100 } } },
      body: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          name: { type: "string", minLength: 2, maxLength: 100 },
          description: { anyOf: [{ type: "string", maxLength: 500 }, { type: "null" }] },
          orderIndex: { type: "integer", minimum: 1, maximum: 999 },
          isActive: { type: "boolean" },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const user = request.user!;
    const current = await prisma.room.findFirst({ where: { id: request.params.id, tenantId } });
    if (!current) return reply.code(404).send({ error: "Ambiente não encontrado.", code: "ROOM_NOT_FOUND" });

    const name = request.body.name?.trim();
    if (name && name.toLocaleLowerCase("pt-BR") !== current.name.toLocaleLowerCase("pt-BR")) {
      const duplicate = await prisma.room.findFirst({
        where: { tenantId, id: { not: current.id }, name: { equals: name, mode: "insensitive" } },
        select: { id: true },
      });
      if (duplicate) return reply.code(409).send({ error: "Já existe um ambiente com esse nome.", code: "ROOM_NAME_CONFLICT" });
    }

    const room = await prisma.$transaction(async (tx) => {
      const updated = await tx.room.update({
        where: { id: current.id },
        data: {
          ...(name ? { name } : {}),
          ...(request.body.description !== undefined ? { description: request.body.description?.trim() || null } : {}),
          ...(request.body.orderIndex !== undefined ? { orderIndex: request.body.orderIndex } : {}),
          ...(request.body.isActive !== undefined ? { isActive: request.body.isActive } : {}),
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: user.id,
          action: "ROOM_UPDATED",
          resource: "Room",
          resourceId: updated.id,
          metadata: { fields: Object.keys(request.body) },
        },
      });
      return updated;
    });

    return reply.send(room);
  });

  app.get<{ Querystring: { period?: IndicatorPeriod } }>("/indicators", {
    preHandler: requireRole(CLINIC_READ_ROLES),
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: { period: { type: "string", enum: ["TODAY", "WEEK", "MONTH"] } },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const period = request.query.period || "MONTH";
    const { start, end } = indicatorPeriodRange(new Date(), period, process.env.BHON_TIME_ZONE || "America/Sao_Paulo");
    const dateRange = { gte: start, lt: end };

    const [appointmentRows, quoteRows, acceptedQuotes, treatmentRows, activeTreatments, receipts, activeRoomsCount, professionals] = await Promise.all([
      prisma.appointment.groupBy({ by: ["status"], where: { tenantId, scheduledAt: dateRange }, _count: { _all: true } }),
      prisma.quote.groupBy({ by: ["status"], where: { tenantId, deletedAt: null, createdAt: dateRange }, _count: { _all: true } }),
      prisma.quote.aggregate({ where: { tenantId, deletedAt: null, status: QuoteStatus.ACCEPTED, acceptedAt: dateRange }, _avg: { finalAmount: true } }),
      prisma.treatment.groupBy({ by: ["status"], where: { tenantId, deletedAt: null, updatedAt: dateRange }, _count: { _all: true } }),
      prisma.treatment.count({ where: { tenantId, deletedAt: null, status: { in: [TreatmentStatus.ACTIVE, TreatmentStatus.IN_PROGRESS, TreatmentStatus.SCHEDULED] } } }),
      prisma.paymentReceipt.aggregate({ where: { tenantId, paidAt: dateRange }, _sum: { amount: true } }),
      prisma.room.count({ where: { tenantId, isActive: true } }),
      prisma.user.findMany({
        where: { tenantId, deletedAt: null, status: UserStatus.ACTIVE, role: { in: PRODUCTIVE_ROLES } },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          specialty: true,
          appointmentsAsDoctor: {
            where: { scheduledAt: dateRange },
            select: { status: true, durationMinutes: true },
          },
        },
      }),
    ]);

    const appointments = countsByStatus(appointmentRows);
    const quotes = countsByStatus(quoteRows);
    const treatments = countsByStatus(treatmentRows);
    const completed = appointments[AppointmentStatus.CONCLUIDO] || 0;
    const noShows = appointments[AppointmentStatus.FALTA] || 0;
    const accepted = quotes[QuoteStatus.ACCEPTED] || 0;
    const closedQuotes = accepted + (quotes[QuoteStatus.REJECTED] || 0) + (quotes[QuoteStatus.EXPIRED] || 0) + (quotes[QuoteStatus.NO_RESPONSE] || 0);
    const abandoned = treatments[TreatmentStatus.ABANDONED] || 0;
    const completedTreatments = treatments[TreatmentStatus.COMPLETED] || 0;
    const scheduledMinutes = professionals.reduce((total, professional) => total + professional.appointmentsAsDoctor
      .filter((appointment) => appointment.status !== AppointmentStatus.CANCELADO)
      .reduce((sum, appointment) => sum + appointment.durationMinutes, 0), 0);

    return reply.send({
      period,
      range: { start, end },
      metrics: {
        attendanceRate: percentage(completed, completed + noShows),
        roomOccupancyRate: null,
        roomOccupancyReason: "Configure os horários de funcionamento para calcular a capacidade disponível.",
        quoteConversionRate: percentage(accepted, closedQuotes),
        abandonmentRate: percentage(abandoned, abandoned + completedTreatments),
        averageTicket: acceptedQuotes._avg.finalAmount == null ? null : Number(acceptedQuotes._avg.finalAmount),
        activeTreatments,
        receivedRevenue: Number(receipts._sum.amount || 0),
        scheduledMinutes,
        activeRoomsCount,
      },
      productivity: professionals.map((professional) => {
        const finished = professional.appointmentsAsDoctor.filter((appointment) => appointment.status === AppointmentStatus.CONCLUIDO).length;
        const missed = professional.appointmentsAsDoctor.filter((appointment) => appointment.status === AppointmentStatus.FALTA).length;
        return {
          id: professional.id,
          name: professional.name,
          specialty: professional.specialty,
          scheduledCount: professional.appointmentsAsDoctor.filter((appointment) => appointment.status !== AppointmentStatus.CANCELADO).length,
          completedCount: finished,
          noShowCount: missed,
          scheduledMinutes: professional.appointmentsAsDoctor
            .filter((appointment) => appointment.status !== AppointmentStatus.CANCELADO)
            .reduce((sum, appointment) => sum + appointment.durationMinutes, 0),
          attendanceRate: percentage(finished, finished + missed),
        };
      }),
    });
  });
}
