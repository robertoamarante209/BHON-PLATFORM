import type { FastifyInstance } from "fastify";
import { AppointmentStatus, UserRole, UserStatus } from "../lib/prisma-types.js";
import { zonedDayRange } from "../domain/time.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireRole, requireTenant } from "../lib/middleware.js";

const TEAM_READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "DENTIST", "RECEPTIONIST", "FINANCIAL", "VIEWER"] as const;
const ROLE_LABELS: Record<string, string> = {
  OWNER: "Proprietário", ADMIN: "Administrador", MANAGER: "Gestor", DENTIST: "Cirurgião-dentista",
  RECEPTIONIST: "Recepção", FINANCIAL: "Financeiro", VIEWER: "Consulta",
};

export async function teamRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireTenant);

  app.get<{ Querystring: { search?: string; role?: string; status?: string; page?: string; limit?: string } }>("/team", {
    preHandler: requireRole(TEAM_READ_ROLES),
    schema: {
      querystring: {
        type: "object", additionalProperties: false,
        properties: {
          search: { type: "string", maxLength: 100 },
          role: { type: "string", enum: Object.values(UserRole).filter((role) => role !== UserRole.PLATFORM_OWNER) },
          status: { type: "string", enum: Object.values(UserStatus) },
          page: { type: "string", pattern: "^[1-9][0-9]*$" }, limit: { type: "string", pattern: "^[1-9][0-9]*$" },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const page = Math.max(1, Number(request.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(request.query.limit) || 20));
    const search = request.query.search?.trim();
    const { start, end } = zonedDayRange(new Date(), process.env.BHON_TIME_ZONE || "America/Sao_Paulo");
    const where = {
      tenantId, deletedAt: null,
      ...(request.query.role ? { role: request.query.role as UserRole } : { role: { not: UserRole.PLATFORM_OWNER } }),
      ...(request.query.status ? { status: request.query.status as UserStatus } : {}),
      ...(search ? { OR: [
        { name: { contains: search, mode: "insensitive" as const } },
        { email: { contains: search, mode: "insensitive" as const } },
        { specialty: { contains: search, mode: "insensitive" as const } },
        { cro: { contains: search, mode: "insensitive" as const } },
      ] } : {}),
    };

    const teamScope = { tenantId, deletedAt: null, role: { not: UserRole.PLATFORM_OWNER } };
    const [users, total, activeCount, inAttendanceCount, todayAppointmentsCount, workload] = await Promise.all([
      prisma.user.findMany({
        where, skip: (page - 1) * limit, take: limit, orderBy: [{ status: "asc" }, { name: "asc" }],
        select: {
          id: true, name: true, email: true, role: true, status: true, specialty: true, cro: true, phone: true,
          workloadHours: true, lastLoginAt: true,
          appointmentsAsDoctor: {
            where: { scheduledAt: { gte: start, lt: end }, status: { not: AppointmentStatus.CANCELADO } },
            select: { status: true, room: { select: { name: true } } }, orderBy: { scheduledAt: "asc" },
          },
        },
      }),
      prisma.user.count({ where }),
      prisma.user.count({ where: { ...teamScope, status: UserStatus.ACTIVE } }),
      prisma.user.count({ where: { ...teamScope, status: UserStatus.ACTIVE, appointmentsAsDoctor: { some: { scheduledAt: { gte: start, lt: end }, status: AppointmentStatus.EM_ATENDIMENTO } } } }),
      prisma.appointment.count({ where: { tenantId, scheduledAt: { gte: start, lt: end }, status: { not: AppointmentStatus.CANCELADO } } }),
      prisma.user.aggregate({ where: { ...teamScope, status: UserStatus.ACTIVE }, _avg: { workloadHours: true } }),
    ]);

    const data = users.map((user) => {
      const current = user.appointmentsAsDoctor.find((appointment) => appointment.status === AppointmentStatus.EM_ATENDIMENTO);
      return {
        id: user.id, name: user.name, email: user.email, role: user.role, roleLabel: ROLE_LABELS[user.role] || user.role,
        specialty: user.specialty, cro: user.cro, phone: user.phone, workloadHours: user.workloadHours == null ? null : Number(user.workloadHours),
        lastLoginAt: user.lastLoginAt,
        todayAppointmentsCount: user.appointmentsAsDoctor.length,
        completedAppointmentsCount: user.appointmentsAsDoctor.filter((appointment) => appointment.status === AppointmentStatus.CONCLUIDO).length,
        currentRoomName: current?.room.name || null,
        status: user.status !== UserStatus.ACTIVE ? "INDISPONIVEL" : current ? "EM_ATENDIMENTO" : "ATIVO",
      };
    });
    return reply.send({
      data,
      pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
      metrics: {
        activeCount,
        inAttendanceCount,
        todayAppointmentsCount,
        averageWorkloadHours: workload._avg.workloadHours == null ? null : Number(workload._avg.workloadHours),
      },
    });
  });
}

