import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireTenant, requireRole } from "../lib/middleware.js";
import { AppointmentStatus, PatientStatus, QuoteStatus, TreatmentStatus, OpportunityStatus, FollowUpStatus, PaymentStatus, StageStatus } from "../lib/prisma-types.js";
import { intervalsOverlap, isAppointmentTransitionAllowed, parseAppointmentDuration } from "../domain/scheduling.js";
import { isStageTransitionAllowed, isTreatmentTransitionAllowed, treatmentProgress, type StageState, type TreatmentState } from "../domain/treatment.js";
import { zonedCalendarDayRange, zonedDayRange } from "../domain/time.js";

const CLINIC_READ_ROLES = ["OWNER", "ADMIN", "MANAGER", "DENTIST", "RECEPTIONIST", "FINANCIAL", "VIEWER"] as const;
const CLINIC_WRITE_ROLES = ["OWNER", "ADMIN", "MANAGER", "RECEPTIONIST"] as const;
const CLINIC_MANAGEMENT_ROLES = ["OWNER", "ADMIN", "MANAGER"] as const;

type SchedulingClient = Pick<typeof prisma, "appointment">;

async function findSchedulingConflict(
  client: SchedulingClient,
  input: {
    tenantId: string;
    professionalId: string;
    roomId: string;
    scheduledAt: Date;
    durationMinutes: number;
    excludeAppointmentId?: string;
  },
) {
  const endsAt = new Date(input.scheduledAt.getTime() + input.durationMinutes * 60_000);
  const earliestRelevantStart = new Date(input.scheduledAt.getTime() - 480 * 60_000);
  const candidates = await client.appointment.findMany({
    where: {
      tenantId: input.tenantId,
      ...(input.excludeAppointmentId ? { id: { not: input.excludeAppointmentId } } : {}),
      status: { notIn: [AppointmentStatus.CANCELADO, AppointmentStatus.FALTA] },
      scheduledAt: { gte: earliestRelevantStart, lt: endsAt },
      OR: [{ roomId: input.roomId }, { professionalId: input.professionalId }],
    },
    select: { id: true, roomId: true, professionalId: true, scheduledAt: true, durationMinutes: true },
  });

  return candidates.find((candidate) => intervalsOverlap(
    candidate.scheduledAt,
    candidate.durationMinutes,
    input.scheduledAt,
    input.durationMinutes,
  )) || null;
}

async function validateAppointmentRelations(tenantId: string, body: any) {
  const [patient, professional, room, treatment] = await Promise.all([
    prisma.patient.findFirst({ where: { id: body.patientId, tenantId, deletedAt: null }, select: { id: true } }),
    prisma.user.findFirst({ where: { id: body.professionalId, tenantId, deletedAt: null, status: "ACTIVE" }, select: { id: true, role: true } }),
    prisma.room.findFirst({ where: { id: body.roomId, tenantId, isActive: true }, select: { id: true } }),
    body.treatmentId ? prisma.treatment.findFirst({ where: { id: body.treatmentId, tenantId, deletedAt: null }, select: { id: true } }) : null,
  ]);
  if (!patient) return "Paciente não pertence à clínica.";
  if (!professional) return "Profissional não pertence à clínica ou está inativo.";
  if (!room) return "Consultório não pertence à clínica ou está inativo.";
  if (!treatment && body.treatmentId) return "Tratamento não pertence à clínica.";
  if (body.treatmentStageId) {
    const stage = await prisma.treatmentStage.findFirst({
      where: { id: body.treatmentStageId, tenantId, ...(body.treatmentId ? { treatmentId: body.treatmentId } : {}) },
      select: { id: true },
    });
    if (!stage) return "Etapa do tratamento inválida para esta clínica.";
  }
  return null;
}

export async function clinicalRoutes(app: FastifyInstance) {
  // Todas as rotas clínicas exigem autenticação e contexto de tenant
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireTenant);

  // ============================================================
  // 1. VISÃO GERAL (COMMAND SURFACE - EXCEÇÕES E OPERAÇÃO DO DIA)
  // ============================================================
  app.get("/overview", { preHandler: requireRole(CLINIC_READ_ROLES) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;

    const { start: todayStart, end: todayEnd } = zonedDayRange(new Date(), process.env.BHON_TIME_ZONE || "America/Sao_Paulo");

    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Consulta em paralelo para máxima performance
    const [
      faltasHoje,
      orcamentosSemResposta,
      tratamentosSemProximaEtapa,
      posOpPendentes,
      agendamentosHoje,
      totalPacientesAtivos,
      totalTratamentosAtivos
    ] = await Promise.all([
      // 1. Exceção Crítica: Faltas de hoje
      prisma.appointment.findMany({
        where: {
          tenantId,
          status: AppointmentStatus.FALTA,
          scheduledAt: { gte: todayStart, lt: todayEnd }
        },
        include: { patient: true },
        take: 5
      }),

      // 2. Exceção de Atenção: Orçamentos sem resposta há > 3 dias
      prisma.quote.findMany({
        where: {
          tenantId,
          status: QuoteStatus.SENT,
          createdAt: { lte: threeDaysAgo }
        },
        include: { patient: true },
        take: 10
      }),

      // 3. Exceção de Acompanhamento: Tratamentos ativos sem próxima etapa agendada
      prisma.treatment.findMany({
        where: {
          tenantId,
          status: TreatmentStatus.ACTIVE
        },
        include: { patient: true },
        take: 10
      }),

      // 4. Protocolo: Pós-operatórios pendentes
      prisma.followUp.findMany({
        where: {
          tenantId,
          category: "POS_OPERATORIO",
          status: FollowUpStatus.PENDENTE
        },
        include: { patient: true },
        take: 5
      }),

      // 5. Agendamentos de hoje agrupados por status
      prisma.appointment.findMany({
        where: {
          tenantId,
          scheduledAt: { gte: todayStart, lt: todayEnd }
        },
        select: { status: true, delayMinutes: true }
      }),

      // 6. Contagens operacionais
      prisma.patient.count({ where: { tenantId, deletedAt: null } }),
      prisma.treatment.count({ where: { tenantId, status: TreatmentStatus.ACTIVE } })
    ]);

    // Cálculo das métricas da operação de hoje
    const totalHoje = agendamentosHoje.length;
    const concluidosHoje = agendamentosHoje.filter((a: any) => a.status === AppointmentStatus.CONCLUIDO).length;
    const emAtendimentoHoje = agendamentosHoje.filter((a: any) => a.status === AppointmentStatus.EM_ATENDIMENTO).length;
    const aguardandoHoje = agendamentosHoje.filter((a: any) => a.status === AppointmentStatus.NA_RECEPCAO).length;
    const faltasHojeCount = agendamentosHoje.filter((a: any) => a.status === AppointmentStatus.FALTA).length;

    const valorRetidoOrcamentos = orcamentosSemResposta.reduce((acc: number, q: any) => acc + Number(q.totalAmount || 0), 0);

    return reply.send({
      exceptions: {
        faltas: {
          count: faltasHoje.length,
          items: faltasHoje
        },
        orcamentosParados: {
          count: orcamentosSemResposta.length,
          valorTotal: valorRetidoOrcamentos,
          items: orcamentosSemResposta
        },
        tratamentosSemAgendamento: {
          count: tratamentosSemProximaEtapa.length,
          items: tratamentosSemProximaEtapa
        },
        posOpChecagem: {
          count: posOpPendentes.length,
          items: posOpPendentes
        }
      },
      todayOperation: {
        total: totalHoje,
        concluidos: concluidosHoje,
        emAtendimento: emAtendimentoHoje,
        aguardandoRecepcao: aguardandoHoje,
        faltas: faltasHojeCount,
        taxaComparecimento: totalHoje > 0 ? Math.round(((concluidosHoje + emAtendimentoHoje) / totalHoje) * 100) : 100
      },
      totals: {
        pacientesAtivos: totalPacientesAtivos,
        tratamentosAtivos: totalTratamentosAtivos
      }
    });
  });

  // ============================================================
  // 2. PACIENTES (CRUD, BUSCA, PAGINAÇÃO, DOSSIÊ COMPLETO)
  // ============================================================
  app.get("/patients", {
    preHandler: requireRole(CLINIC_READ_ROLES),
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
          search: { type: "string", maxLength: 120 },
          status: { type: "string", enum: Object.values(PatientStatus) },
          page: { type: "integer", minimum: 1 },
          limit: { type: "integer", minimum: 1, maximum: 50 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const query = request.query as { search?: string; status?: string; page?: string; limit?: string };
    
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {
      tenantId,
      deletedAt: null
    };

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: "insensitive" } },
        { recordNumber: { contains: term, mode: "insensitive" } },
        { cpf: { contains: term } },
        { phone: { contains: term } }
      ];
    }

    if (query.status) {
      where.status = query.status;
    }

    const [total, patients] = await Promise.all([
      prisma.patient.count({ where }),
      prisma.patient.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: "desc" },
        include: {
          treatments: {
            where: { status: TreatmentStatus.ACTIVE },
            take: 1,
            select: {
              name: true,
              responsibleUser: { select: { name: true } },
            }
          },
          appointments: {
            orderBy: { scheduledAt: "desc" },
            take: 1,
            select: { scheduledAt: true, procedureName: true, status: true }
          },
          followUps: {
            where: { status: { in: [FollowUpStatus.PENDENTE, FollowUpStatus.EM_ANDAMENTO, FollowUpStatus.ADIADO] } },
            orderBy: { deadlineAt: "asc" },
            take: 1,
            select: { nextAction: true, reason: true },
          }
        }
      })
    ]);

    return reply.send({
      data: patients.map((p: any) => ({
        id: p.id,
        tenantId: p.tenantId,
        recordNumber: p.recordNumber,
        name: p.name,
        cpf: p.cpf,
        phone: p.phone,
        email: p.email,
        status: p.status,
        allergies: p.allergies,
        currentTreatment: p.treatments[0]?.name || "Nenhum ativo",
        lastAppointmentAt: p.appointments[0]?.scheduledAt || null,
        responsibleName: p.treatments[0]?.responsibleUser?.name || null,
        nextAction: p.followUps[0]?.nextAction || p.followUps[0]?.reason || null,
        createdAt: p.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  });

  app.post("/patients", {
    preHandler: requireRole(CLINIC_WRITE_ROLES),
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["name"],
        properties: {
          name: { type: "string", minLength: 2, maxLength: 160 },
          cpf: { type: "string", maxLength: 20 },
          phone: { type: "string", maxLength: 30 },
          email: { type: "string", maxLength: 320 },
          birthDate: { type: "string", format: "date" },
          allergies: { type: "string", maxLength: 2_000 },
          observations: { type: "string", maxLength: 5_000 },
          source: { type: "string", maxLength: 120 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const user = request.user!;
    const body = request.body as any;

    if (!body.name || body.name.trim().length < 2) {
      return reply.code(400).send({ error: "Nome do paciente é obrigatório." });
    }

    if (body.birthDate && Number.isNaN(new Date(body.birthDate).getTime())) {
      return reply.code(400).send({ error: "Data de nascimento inválida." });
    }

    const patient = await prisma.$transaction(async (tx: any) => {
      const tenant = await tx.tenant.update({
        where: { id: tenantId },
        data: { patientRecordSequence: { increment: 1 } },
        select: { patientRecordSequence: true },
      });
      const recordNumber = `#${String(tenant.patientRecordSequence).padStart(5, "0")}`;
      const created = await tx.patient.create({
        data: { tenantId, recordNumber, name: body.name.trim(), cpf: body.cpf?.trim() || null,
          phone: body.phone?.trim() || null, email: body.email?.trim().toLowerCase() || null,
          birthDate: body.birthDate ? new Date(body.birthDate) : null, allergies: body.allergies || null,
          observations: body.observations || null, source: body.source || "Recepção", status: "ACTIVE" },
      });
      await tx.timelineEvent.create({ data: { tenantId, patientId: created.id, actorUserId: user.id, type: "PATIENT_CREATED", description: `Prontuário ${recordNumber} aberto por ${user.name}.` } });
      await tx.auditLog.create({ data: { tenantId, actorUserId: user.id, action: "CREATE", resource: "Patient", resourceId: created.id, metadata: { recordNumber, name: created.name } } });
      return created;
    });

    return reply.code(201).send(patient);
  });

  app.patch<{ Params: { id: string } }>("/patients/:id", {
    preHandler: requireRole(CLINIC_WRITE_ROLES),
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        minProperties: 1,
        properties: {
          name: { type: "string", minLength: 2, maxLength: 160 },
          cpf: { anyOf: [{ type: "string", maxLength: 20 }, { type: "null" }] },
          phone: { anyOf: [{ type: "string", maxLength: 30 }, { type: "null" }] },
          email: { anyOf: [{ type: "string", maxLength: 320 }, { type: "null" }] },
          birthDate: { anyOf: [{ type: "string", format: "date" }, { type: "null" }] },
          allergies: { anyOf: [{ type: "string", maxLength: 2_000 }, { type: "null" }] },
          observations: { anyOf: [{ type: "string", maxLength: 5_000 }, { type: "null" }] },
          source: { anyOf: [{ type: "string", maxLength: 120 }, { type: "null" }] },
          status: { type: "string", enum: Object.values(PatientStatus) },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const actor = request.user!;
    const current = await prisma.patient.findFirst({
      where: { id: request.params.id, tenantId, deletedAt: null },
      select: { id: true, name: true, status: true },
    });
    if (!current) return reply.code(404).send({ error: "Paciente não encontrado.", code: "PATIENT_NOT_FOUND" });

    const body = request.body as {
      name?: string;
      cpf?: string | null;
      phone?: string | null;
      email?: string | null;
      birthDate?: string | null;
      allergies?: string | null;
      observations?: string | null;
      source?: string | null;
      status?: PatientStatus;
    };
    const cleanOptional = (value: string | null) => value?.trim() || null;
    const updated = await prisma.$transaction(async (tx) => {
      const patient = await tx.patient.update({
        where: { id: current.id },
        data: {
          ...(body.name !== undefined ? { name: body.name.trim() } : {}),
          ...(body.cpf !== undefined ? { cpf: cleanOptional(body.cpf) } : {}),
          ...(body.phone !== undefined ? { phone: cleanOptional(body.phone) } : {}),
          ...(body.email !== undefined ? { email: body.email?.trim().toLowerCase() || null } : {}),
          ...(body.birthDate !== undefined ? { birthDate: body.birthDate ? new Date(body.birthDate) : null } : {}),
          ...(body.allergies !== undefined ? { allergies: cleanOptional(body.allergies) } : {}),
          ...(body.observations !== undefined ? { observations: cleanOptional(body.observations) } : {}),
          ...(body.source !== undefined ? { source: cleanOptional(body.source) } : {}),
          ...(body.status !== undefined ? { status: body.status } : {}),
        },
      });
      await tx.timelineEvent.create({
        data: {
          tenantId,
          patientId: patient.id,
          actorUserId: actor.id,
          type: "PATIENT_UPDATED",
          description: "Dados cadastrais do paciente atualizados.",
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: actor.id,
          action: "UPDATE",
          resource: "Patient",
          resourceId: patient.id,
          metadata: { previousName: current.name, name: patient.name, previousStatus: current.status, status: patient.status },
        },
      });
      return patient;
    });

    return reply.send(updated);
  });

  app.get<{ Params: { id: string } }>("/patients/:id", { preHandler: requireRole(CLINIC_READ_ROLES) }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params;

    const patient = await prisma.patient.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        treatments: {
          include: { stages: true, responsibleUser: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" }
        },
        appointments: {
          include: {
            room: true,
            professional: {
              select: {
                id: true,
                tenantId: true,
                name: true,
                email: true,
                role: true,
                status: true,
                specialty: true,
                cro: true,
                phone: true,
                avatarUrl: true,
                workloadHours: true,
                currentRoomId: true,
                lastLoginAt: true,
                createdAt: true,
                updatedAt: true,
                deletedAt: true,
              },
            },
          },
          orderBy: { scheduledAt: "desc" },
          take: 20
        },
        quotes: {
          include: { items: true },
          orderBy: { createdAt: "desc" }
        },
        payments: {
          orderBy: { dueDate: "desc" }
        },
        followUps: {
          include: { responsibleUser: { select: { id: true, name: true } } },
          orderBy: { deadlineAt: "asc" }
        },
        timelineEvents: {
          include: { actorUser: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 30
        }
      }
    });

    if (!patient) {
      return reply.code(404).send({ error: "Paciente não encontrado." });
    }

    return reply.send(patient);
  });

  // ============================================================
  // 3. AGENDA (MATRIZ DE HORÁRIOS + SALAS + WORKFLOWS DE STATUS)
  // ============================================================
  app.get("/scheduling-resources", { preHandler: requireRole(CLINIC_READ_ROLES) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const [rooms, professionals] = await Promise.all([
      prisma.room.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, tenantId: true, name: true, orderIndex: true, isActive: true, description: true },
        orderBy: [{ orderIndex: "asc" }, { name: "asc" }],
      }),
      prisma.user.findMany({
        where: { tenantId, status: "ACTIVE", deletedAt: null, role: { in: ["OWNER", "DENTIST"] } },
        select: { id: true, name: true, specialty: true, role: true },
        orderBy: { name: "asc" },
      }),
    ]);
    return reply.send({ rooms, professionals });
  });

  app.get("/appointments", {
    preHandler: requireRole(CLINIC_READ_ROLES),
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
          date: { type: "string", format: "date" },
          roomId: { type: "string", minLength: 1, maxLength: 100 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const query = request.query as { date?: string; roomId?: string };

    const timeZone = process.env.BHON_TIME_ZONE || "America/Sao_Paulo";
    const dayRange = query.date ? zonedCalendarDayRange(query.date, timeZone) : zonedDayRange(new Date(), timeZone);
    if (!dayRange) return reply.code(400).send({ error: "Data da agenda inválida.", code: "INVALID_CALENDAR_DATE" });

    const where: any = {
      tenantId,
      scheduledAt: { gte: dayRange.start, lt: dayRange.end }
    };

    if (query.roomId) {
      where.roomId = query.roomId;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        patient: { select: { id: true, name: true, recordNumber: true, phone: true } },
        professional: { select: { id: true, name: true, specialty: true } },
        room: { select: { id: true, name: true } },
        treatment: { select: { id: true, name: true } }
      },
      orderBy: { scheduledAt: "asc" }
    });

    return reply.send(appointments);
  });

  app.post("/appointments", {
    preHandler: requireRole(CLINIC_WRITE_ROLES),
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["patientId", "professionalId", "roomId", "scheduledAt", "procedureName"],
        properties: {
          patientId: { type: "string", minLength: 1, maxLength: 100 },
          professionalId: { type: "string", minLength: 1, maxLength: 100 },
          roomId: { type: "string", minLength: 1, maxLength: 100 },
          treatmentId: { type: "string", minLength: 1, maxLength: 100 },
          treatmentStageId: { type: "string", minLength: 1, maxLength: 100 },
          scheduledAt: { type: "string", format: "date-time" },
          durationMinutes: { type: "integer", minimum: 5, maximum: 480 },
          procedureName: { type: "string", minLength: 2, maxLength: 240 },
          notes: { type: "string", maxLength: 5_000 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const user = request.user!;
    const body = request.body as any;

    const professionalId = body.professionalId || body.doctorId;
    body.professionalId = professionalId;
    if (!body.patientId || !professionalId || !body.roomId || !body.scheduledAt) {
      return reply.code(400).send({ error: "Campos obrigatórios ausentes para agendamento." });
    }

    const scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) return reply.code(400).send({ error: "Data e hora do agendamento são inválidas." });
    if (scheduledAt.getTime() < Date.now() - 5 * 60_000) return reply.code(400).send({ error: "Não é possível criar um agendamento no passado.", code: "PAST_APPOINTMENT" });
    const durationMinutes = parseAppointmentDuration(body.durationMinutes);
    if (!durationMinutes) return reply.code(400).send({ error: "A duração deve estar entre 5 e 480 minutos.", code: "INVALID_DURATION" });
    const relationError = await validateAppointmentRelations(tenantId, body);
    if (relationError) return reply.code(400).send({ error: relationError });

    const appointment = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;
      const conflict = await findSchedulingConflict(tx, {
        tenantId,
        professionalId,
        roomId: body.roomId,
        scheduledAt,
        durationMinutes,
      });
      if (conflict) return null;

      const created = await tx.appointment.create({
        data: {
          tenantId,
          patientId: body.patientId,
          professionalId,
          roomId: body.roomId,
          treatmentId: body.treatmentId || null,
          scheduledAt,
          durationMinutes,
          procedureName: body.procedureName.trim(),
          treatmentStageId: body.treatmentStageId || null,
          status: AppointmentStatus.CONFIRMADO,
          notes: body.notes?.trim() || null,
        },
        include: {
          patient: { select: { id: true, name: true, recordNumber: true, phone: true } },
          room: { select: { id: true, name: true } },
          professional: { select: { id: true, name: true, specialty: true } },
          treatment: { select: { id: true, name: true } },
        },
      });

      await tx.timelineEvent.create({
        data: {
          tenantId,
          patientId: body.patientId,
          actorUserId: user.id,
          type: "APPOINTMENT_SCHEDULED",
          description: `Agendado para ${scheduledAt.toLocaleDateString("pt-BR")} às ${scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} (${created.procedureName}).`
        }
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: user.id,
          action: "CREATE",
          resource: "Appointment",
          resourceId: created.id,
          metadata: { patientId: body.patientId, scheduledAt }
        }
      });
      return created;
    });

    if (!appointment) {
      return reply.code(409).send({
        error: "O profissional ou o consultório já possui atendimento nesse intervalo.",
        code: "SCHEDULE_CONFLICT",
      });
    }

    return reply.code(201).send(appointment);
  });

  app.patch<{ Params: { id: string } }>("/appointments/:id/reschedule", {
    preHandler: requireRole(CLINIC_WRITE_ROLES),
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["scheduledAt"],
        properties: {
          scheduledAt: { type: "string", format: "date-time" },
          roomId: { type: "string", minLength: 1, maxLength: 100 },
          professionalId: { type: "string", minLength: 1, maxLength: 100 },
          durationMinutes: { type: "integer", minimum: 5, maximum: 480 },
          notes: { type: "string", maxLength: 5_000 },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const actor = request.user!;
    const body = request.body as { scheduledAt: string; roomId?: string; professionalId?: string; durationMinutes?: number; notes?: string };
    const current = await prisma.appointment.findFirst({ where: { id: request.params.id, tenantId } });
    if (!current) return reply.code(404).send({ error: "Agendamento não encontrado.", code: "APPOINTMENT_NOT_FOUND" });
    if (current.status === AppointmentStatus.CONCLUIDO) {
      return reply.code(409).send({ error: "Um atendimento concluído não pode ser reagendado.", code: "APPOINTMENT_COMPLETED" });
    }

    const scheduledAt = new Date(body.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() < Date.now() - 5 * 60_000) {
      return reply.code(400).send({ error: "Informe uma data futura válida.", code: "INVALID_RESCHEDULE_DATE" });
    }
    const durationMinutes = parseAppointmentDuration(body.durationMinutes ?? current.durationMinutes);
    if (!durationMinutes) return reply.code(400).send({ error: "A duração deve estar entre 5 e 480 minutos.", code: "INVALID_DURATION" });
    const roomId = body.roomId || current.roomId;
    const professionalId = body.professionalId || current.professionalId;
    const relationError = await validateAppointmentRelations(tenantId, {
      patientId: current.patientId,
      professionalId,
      roomId,
      treatmentId: current.treatmentId,
      treatmentStageId: current.treatmentStageId,
    });
    if (relationError) return reply.code(400).send({ error: relationError });

    const updated = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${tenantId}))`;
      const conflict = await findSchedulingConflict(tx, {
        tenantId,
        professionalId,
        roomId,
        scheduledAt,
        durationMinutes,
        excludeAppointmentId: current.id,
      });
      if (conflict) return null;
      const appointment = await tx.appointment.update({
        where: { id: current.id },
        data: { scheduledAt, roomId, professionalId, durationMinutes, notes: body.notes?.trim() || current.notes },
        include: {
          patient: { select: { id: true, name: true, recordNumber: true, phone: true } },
          room: { select: { id: true, name: true } },
          professional: { select: { id: true, name: true, specialty: true } },
          treatment: { select: { id: true, name: true } },
        },
      });
      await tx.timelineEvent.create({
        data: {
          tenantId,
          patientId: current.patientId,
          actorUserId: actor.id,
          type: "APPOINTMENT_RESCHEDULED",
          description: `Consulta reagendada para ${scheduledAt.toLocaleString("pt-BR")}.`,
          metadata: { appointmentId: current.id, previousScheduledAt: current.scheduledAt },
        },
      });
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: actor.id,
          action: "RESCHEDULE",
          resource: "Appointment",
          resourceId: current.id,
          metadata: { from: current.scheduledAt, to: scheduledAt, previousRoomId: current.roomId, roomId },
        },
      });
      return appointment;
    });
    if (!updated) return reply.code(409).send({ error: "O profissional ou o consultório já possui atendimento nesse intervalo.", code: "SCHEDULE_CONFLICT" });
    return reply.send(updated);
  });

  // WORKFLOW CRÍTICO CRUZADO DE STATUS DO AGENDAMENTO
  app.patch<{ Params: { id: string } }>("/appointments/:id/status", {
    preHandler: requireRole(CLINIC_WRITE_ROLES),
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["status"],
        properties: {
          status: { type: "string", enum: Object.values(AppointmentStatus) },
          delayMinutes: { type: "integer", minimum: 0, maximum: 480 },
          notes: { type: "string", maxLength: 5_000 },
        },
      },
    },
  }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const user = request.user!;
    const { id } = request.params;
    const body = request.body as { status: AppointmentStatus; delayMinutes?: number; notes?: string };

    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const appointment = await tx.appointment.findFirst({
        where: { id, tenantId },
        include: {
          patient: { select: { id: true, name: true } },
          professional: { select: { id: true, name: true } },
          treatment: true,
        },
      });
      if (!appointment) return { kind: "NOT_FOUND" as const };
      if (!isAppointmentTransitionAllowed(appointment.status, body.status)) {
        return { kind: "INVALID_TRANSITION" as const, from: appointment.status };
      }

      const updated = await tx.appointment.update({
        where: { id },
        data: {
          status: body.status,
          delayMinutes: body.delayMinutes ?? appointment.delayMinutes,
          notes: body.notes !== undefined ? body.notes.trim() || null : appointment.notes,
        },
      });

      if (body.status === AppointmentStatus.FALTA) {
        await tx.followUp.create({
          data: {
            tenantId,
            patientId: appointment.patientId,
            appointmentId: appointment.id,
            responsibleUserId: appointment.professionalId,
            category: "CONFIRMACAO",
            reason: `Paciente faltou sem aviso prévio na sessão de ${appointment.procedureName}.`,
            priority: "HIGH",
            status: FollowUpStatus.PENDENTE,
            deadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            notes: "Reagendar consulta com urgência para não comprometer o tratamento.",
          },
        });
        await tx.timelineEvent.create({
          data: {
            tenantId,
            patientId: appointment.patientId,
            actorUserId: user.id,
            type: "APPOINTMENT_MISSED",
            description: `FALTA registrada no atendimento de ${appointment.procedureName}. Acompanhamento gerado.`,
          },
        });
        await tx.notification.create({
          data: {
            tenantId,
            userId: user.id,
            type: "MISSED_APPOINTMENT",
            title: `Falta de Paciente: ${appointment.patient.name}`,
            message: `O paciente faltou à consulta com ${appointment.professional.name}. Um acompanhamento foi colocado na fila.`,
            priority: "HIGH",
          },
        });
      }

      if (body.status === AppointmentStatus.CONCLUIDO) {
        await tx.timelineEvent.create({
          data: {
            tenantId,
            patientId: appointment.patientId,
            actorUserId: user.id,
            type: "APPOINTMENT_COMPLETED",
            description: `Atendimento de ${appointment.procedureName} concluído com sucesso.`,
          },
        });
        if (appointment.treatment) {
          const newCompleted = Math.min(appointment.treatment.stagesCount, appointment.treatment.completedStagesCount + 1);
          const newProgress = Math.min(100, Math.round((newCompleted / Math.max(1, appointment.treatment.stagesCount)) * 100));
          await tx.treatment.update({
            where: { id: appointment.treatment.id },
            data: {
              completedStagesCount: newCompleted,
              progressPercent: newProgress,
              status: newProgress >= 100 ? TreatmentStatus.COMPLETED : TreatmentStatus.ACTIVE,
            },
          });
        }
      }

      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: user.id,
          action: "UPDATE_STATUS",
          resource: "Appointment",
          resourceId: appointment.id,
          metadata: { from: appointment.status, to: body.status },
        },
      });
      return { kind: "UPDATED" as const, appointment: updated };
    });

    if (result.kind === "NOT_FOUND") return reply.code(404).send({ error: "Agendamento não encontrado.", code: "APPOINTMENT_NOT_FOUND" });
    if (result.kind === "INVALID_TRANSITION") {
      return reply.code(409).send({ error: `Transição de agenda inválida: ${result.from} → ${body.status}.`, code: "INVALID_STATUS_TRANSITION" });
    }
    return reply.send(result.appointment);
  });

  // ============================================================
  // 4. TRATAMENTOS E ETAPAS CLÍNICAS
  // ============================================================
  app.get("/treatments", {
    preHandler: requireRole(CLINIC_READ_ROLES),
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
          search: { type: "string", maxLength: 120 },
          status: { type: "string", enum: Object.values(TreatmentStatus) },
          page: { type: "integer", minimum: 1, maximum: 100000, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const query = request.query as { search?: string; status?: TreatmentStatus; page?: number; limit?: number };
    const page = query.page || 1;
    const limit = query.limit || 20;
    const search = query.search?.trim();
    const where = {
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(search ? {
        OR: [
          { name: { contains: search, mode: "insensitive" as const } },
          { patient: { name: { contains: search, mode: "insensitive" as const } } },
          { patient: { recordNumber: { contains: search, mode: "insensitive" as const } } },
        ],
      } : {}),
    };

    const [data, total] = await Promise.all([
      prisma.treatment.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, recordNumber: true } },
          responsibleUser: { select: { id: true, name: true } },
          stages: { orderBy: { stageNumber: "asc" } },
          appointments: { orderBy: { scheduledAt: "desc" }, take: 1, select: { scheduledAt: true } },
        },
        orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.treatment.count({ where }),
    ]);

    return reply.send({ data, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } });
  });

  app.patch<{ Params: { id: string } }>("/treatments/:id/status", {
    preHandler: requireRole(CLINIC_MANAGEMENT_ROLES),
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["status"],
        properties: {
          status: { type: "string", enum: Object.values(TreatmentStatus) },
          reason: { type: "string", minLength: 3, maxLength: 500 },
        },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const user = request.user!;
    const body = request.body as { status: TreatmentStatus; reason?: string };

    const result = await prisma.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${request.params.id}))`;
      const treatment = await tx.treatment.findFirst({ where: { id: request.params.id, tenantId, deletedAt: null } });
      if (!treatment) return { kind: "NOT_FOUND" as const };
      if (treatment.status === body.status) return { kind: "UNCHANGED" as const, treatment };
      if (!isTreatmentTransitionAllowed(treatment.status as TreatmentState, body.status as TreatmentState)) {
        return { kind: "INVALID_TRANSITION" as const, from: treatment.status };
      }
      if ((body.status === TreatmentStatus.CANCELLED || body.status === TreatmentStatus.ABANDONED) && !body.reason?.trim()) {
        return { kind: "REASON_REQUIRED" as const };
      }

      const treatmentUpdated = await tx.treatment.update({
        where: { id: treatment.id },
        data: {
          status: body.status,
          ...(body.status === TreatmentStatus.COMPLETED ? { completedAt: new Date(), progressPercent: 100 } : {}),
          ...(body.status === TreatmentStatus.ACTIVE && treatment.status === TreatmentStatus.ABANDONED ? { completedAt: null } : {}),
        },
      });
      await tx.timelineEvent.create({ data: {
        tenantId, patientId: treatment.patientId, actorUserId: user.id, type: "TREATMENT_STATUS_CHANGED",
        description: `Tratamento alterado de ${treatment.status} para ${body.status}.${body.reason ? ` Motivo: ${body.reason.trim()}` : ""}`,
      } });
      await tx.auditLog.create({ data: {
        tenantId, actorUserId: user.id, action: "CHANGE_STATUS", resource: "Treatment", resourceId: treatment.id,
        metadata: { from: treatment.status, to: body.status, reason: body.reason?.trim() || null },
      } });
      return { kind: "UPDATED" as const, treatment: treatmentUpdated };
    });

    if (result.kind === "NOT_FOUND") return reply.code(404).send({ error: "Tratamento não encontrado.", code: "TREATMENT_NOT_FOUND" });
    if (result.kind === "INVALID_TRANSITION") return reply.code(409).send({ error: `Transição inválida: ${result.from} → ${body.status}.`, code: "INVALID_STATUS_TRANSITION" });
    if (result.kind === "REASON_REQUIRED") return reply.code(400).send({ error: "Informe o motivo para encerrar ou abandonar o tratamento.", code: "REASON_REQUIRED" });
    return reply.send(result.treatment);
  });

  app.patch<{ Params: { id: string } }>("/treatment-stages/:id/status", {
    preHandler: requireRole(CLINIC_WRITE_ROLES),
    schema: {
      body: {
        type: "object",
        additionalProperties: false,
        required: ["status"],
        properties: { status: { type: "string", enum: Object.values(StageStatus) } },
      },
    },
  }, async (request, reply) => {
    const tenantId = request.tenantId!;
    const user = request.user!;
    const body = request.body as { status: StageStatus };
    const initial = await prisma.treatmentStage.findFirst({ where: { id: request.params.id, tenantId }, select: { treatmentId: true } });
    if (!initial) return reply.code(404).send({ error: "Etapa não encontrada.", code: "TREATMENT_STAGE_NOT_FOUND" });

    const result = await prisma.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${initial.treatmentId}))`;
      const stage = await tx.treatmentStage.findFirst({ where: { id: request.params.id, tenantId }, include: { treatment: true } });
      if (!stage) return { kind: "NOT_FOUND" as const };
      if (stage.status !== body.status && !isStageTransitionAllowed(stage.status as StageState, body.status as StageState)) {
        return { kind: "INVALID_TRANSITION" as const, from: stage.status };
      }
      const updatedStage = stage.status === body.status ? stage : await tx.treatmentStage.update({
        where: { id: stage.id },
        data: { status: body.status, completedDate: body.status === StageStatus.COMPLETED ? new Date() : null },
      });
      const stages = await tx.treatmentStage.findMany({ where: { tenantId, treatmentId: stage.treatmentId }, select: { status: true, plannedDate: true } });
      const progress = treatmentProgress(stages as Array<{ status: StageState }>);
      const nextStage = stages
        .filter((item: any) => ![StageStatus.COMPLETED, StageStatus.CANCELLED].includes(item.status) && item.plannedDate)
        .sort((a: any, b: any) => a.plannedDate.getTime() - b.plannedDate.getTime())[0];
      const treatmentStatus = progress.stagesCount > 0 && progress.completedStagesCount === progress.stagesCount
        ? TreatmentStatus.COMPLETED
        : body.status === StageStatus.IN_PROGRESS ? TreatmentStatus.IN_PROGRESS : stage.treatment.status;
      const treatment = await tx.treatment.update({
        where: { id: stage.treatmentId },
        data: { ...progress, status: treatmentStatus, nextStageDate: nextStage?.plannedDate || null,
          ...(treatmentStatus === TreatmentStatus.COMPLETED ? { completedAt: new Date() } : {}) },
      });
      await tx.timelineEvent.create({ data: {
        tenantId, patientId: stage.treatment.patientId, actorUserId: user.id, type: "TREATMENT_STAGE_STATUS_CHANGED",
        description: `Etapa ${stage.stageNumber} (${stage.title}) alterada de ${stage.status} para ${body.status}.`,
      } });
      await tx.auditLog.create({ data: {
        tenantId, actorUserId: user.id, action: "CHANGE_STAGE_STATUS", resource: "TreatmentStage", resourceId: stage.id,
        metadata: { treatmentId: stage.treatmentId, from: stage.status, to: body.status, progressPercent: progress.progressPercent },
      } });
      return { kind: "UPDATED" as const, stage: updatedStage, treatment };
    });

    if (result.kind === "NOT_FOUND") return reply.code(404).send({ error: "Etapa não encontrada.", code: "TREATMENT_STAGE_NOT_FOUND" });
    if (result.kind === "INVALID_TRANSITION") return reply.code(409).send({ error: `Transição de etapa inválida: ${result.from} → ${body.status}.`, code: "INVALID_STAGE_TRANSITION" });
    return reply.send({ stage: result.stage, treatment: result.treatment });
  });

  // ============================================================
  // 5. ORÇAMENTOS (CRIAÇÃO, ITENS E APROVAÇÃO TRANSACIONAL)
  // ============================================================
  app.get("/budgets", {
    preHandler: requireRole(CLINIC_READ_ROLES),
    schema: {
      querystring: {
        type: "object",
        additionalProperties: false,
        properties: {
          search: { type: "string", maxLength: 120 },
          status: { type: "string", enum: Object.values(QuoteStatus) },
          page: { type: "integer", minimum: 1, maximum: 100000, default: 1 },
          limit: { type: "integer", minimum: 1, maximum: 100, default: 20 },
        },
      },
    },
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const query = request.query as { search?: string; status?: QuoteStatus; page?: number; limit?: number };
    const page = query.page || 1;
    const limit = query.limit || 20;
    const search = query.search?.trim();
    const where = {
      tenantId,
      deletedAt: null,
      ...(query.status ? { status: query.status } : {}),
      ...(search ? {
        OR: [
          { title: { contains: search, mode: "insensitive" as const } },
          { patient: { name: { contains: search, mode: "insensitive" as const } } },
          { patient: { recordNumber: { contains: search, mode: "insensitive" as const } } },
        ],
      } : {}),
    };
    const activeStatuses = [QuoteStatus.SENT, QuoteStatus.VIEWED, QuoteStatus.NEGOTIATING];
    const [data, total, activeAggregate, noResponseCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: {
          patient: { select: { id: true, name: true, recordNumber: true } },
          createdBy: { select: { id: true, name: true } },
          items: { orderBy: { createdAt: "asc" } },
        },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.quote.count({ where }),
      prisma.quote.aggregate({ where: { tenantId, deletedAt: null, status: { in: activeStatuses } }, _sum: { finalAmount: true } }),
      prisma.quote.count({ where: { tenantId, deletedAt: null, status: QuoteStatus.NO_RESPONSE } }),
      prisma.quote.count({ where: { tenantId, deletedAt: null, status: QuoteStatus.ACCEPTED } }),
      prisma.quote.count({ where: { tenantId, deletedAt: null, status: QuoteStatus.REJECTED } }),
    ]);
    const decidedCount = approvedCount + rejectedCount;
    return reply.send({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      metrics: {
        totalInNegotiation: Number(activeAggregate._sum.finalAmount || 0),
        noResponseCount,
        approvedCount,
        rejectedCount,
        conversionRate: decidedCount === 0 ? null : Math.round((approvedCount / decidedCount) * 100),
      },
    });
  });

  // WORKFLOW CRÍTICO: APROVAÇÃO DE ORÇAMENTO EM UMA TRANSAÇÃO ATÔMICA
  app.post<{ Params: { id: string } }>("/budgets/:id/approve", { preHandler: requireRole(CLINIC_MANAGEMENT_ROLES) }, async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const user = request.user!;
    const { id } = request.params;

    // O lock e todas as verificações ficam na mesma transação para impedir aprovação dupla.
    const result = await prisma.$transaction(async (tx: any) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${id}))`;
      const quote = await tx.quote.findFirst({
        where: { id, tenantId, deletedAt: null },
        include: { patient: true, items: true },
      });
      if (!quote) return { kind: "NOT_FOUND" as const };
      if (quote.status === QuoteStatus.ACCEPTED) return { kind: "ALREADY_APPROVED" as const };
      if ([QuoteStatus.REJECTED, QuoteStatus.EXPIRED].includes(quote.status)) {
        return { kind: "INVALID_STATUS" as const, status: quote.status };
      }
      const activeTreatment = await tx.treatment.findFirst({
        where: {
          tenantId,
          patientId: quote.patientId,
          status: { in: [TreatmentStatus.ACTIVE, TreatmentStatus.SCHEDULED, TreatmentStatus.IN_PROGRESS, TreatmentStatus.PAUSED, TreatmentStatus.RISK_OF_ABANDONMENT] },
          deletedAt: null,
        },
      });
      if (activeTreatment) return { kind: "ACTIVE_TREATMENT_EXISTS" as const };

      // 1. Atualiza o Orçamento para APROVADO (ACCEPTED)
      const updatedQuote = await tx.quote.update({
        where: { id },
        data: {
          status: QuoteStatus.ACCEPTED,
          acceptedAt: new Date()
        }
      });

      // 2. Converte somente a oportunidade aberta mais recente do paciente.
      const opportunity = await tx.opportunity.findFirst({
        where: {
          tenantId,
          patientId: quote.patientId,
          status: { in: [OpportunityStatus.NEW_CONTACT, OpportunityStatus.TRIAGEM, OpportunityStatus.AVALIACAO, OpportunityStatus.PLANO_APRESENTADO, OpportunityStatus.ORCAMENTO, OpportunityStatus.NEGOCIACAO] },
          deletedAt: null,
        },
        orderBy: { updatedAt: "desc" },
      });
      if (opportunity) await tx.opportunity.update({ where: { id: opportunity.id }, data: { status: OpportunityStatus.CONVERTIDO } });

      // 3. Cria ou ativa o Tratamento
      const treatment = await tx.treatment.create({
        data: {
          tenantId,
          patientId: quote.patientId,
          responsibleUserId: user.id,
          name: quote.title,
          totalValue: quote.finalAmount,
          status: TreatmentStatus.ACTIVE,
          stagesCount: quote.items.length || 1,
          completedStagesCount: 0,
          progressPercent: 0,
          startedAt: new Date(),
          stages: {
            create: quote.items.map((item: any, index: number) => ({
              tenantId,
              stageNumber: index + 1,
              title: item.description,
              status: "PENDING"
            }))
          }
        }
      });

      // 4. Cria o recebível e o lançamento financeiro correspondente.
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 15);
      const payment = await tx.payment.create({
        data: { tenantId, patientId: quote.patientId, quoteId: quote.id, treatmentId: treatment.id, referenceType: "TREATMENT", category: "TRATAMENTO_ODONTOLOGICO", amount: quote.finalAmount, dueDate, status: PaymentStatus.PENDENTE, paymentMethod: quote.paymentMethod || null }
      });
      await tx.financialTransaction.create({
        data: { tenantId, paymentId: payment.id, patientId: quote.patientId, treatmentId: treatment.id, type: "RECEITA", category: "TRATAMENTO_ODONTOLOGICO", description: `Recebível do orçamento ${quote.id}`, amount: quote.finalAmount, dueDate, status: PaymentStatus.PENDENTE }
      });

      // 5. Registra na Linha do Tempo do Paciente
      await tx.timelineEvent.create({
        data: {
          tenantId,
          patientId: quote.patientId,
          actorUserId: user.id,
          type: "BUDGET_APPROVED",
          description: `Orçamento aprovado (R$ ${Number(quote.finalAmount).toFixed(2)}). Tratamento ativado e recebível gerado no Financeiro.`
        }
      });

      // 6. Registra na Trilha de Auditoria
      await tx.auditLog.create({
        data: {
          tenantId,
          actorUserId: user.id,
          action: "APPROVE",
          resource: "Quote",
          resourceId: quote.id,
          metadata: { amount: quote.finalAmount, treatmentId: treatment.id, paymentId: payment.id }
        }
      });

      return { kind: "APPROVED" as const, quote: updatedQuote, treatment, payment };
    });

    if (result.kind === "NOT_FOUND") return reply.code(404).send({ error: "Orçamento não encontrado.", code: "QUOTE_NOT_FOUND" });
    if (result.kind === "ALREADY_APPROVED") return reply.code(409).send({ error: "Este orçamento já foi aprovado.", code: "QUOTE_ALREADY_APPROVED" });
    if (result.kind === "INVALID_STATUS") return reply.code(409).send({ error: `Orçamento ${result.status} não pode ser aprovado.`, code: "INVALID_QUOTE_STATUS" });
    if (result.kind === "ACTIVE_TREATMENT_EXISTS") return reply.code(409).send({ error: "O paciente já possui um tratamento em andamento. Revise-o antes de aprovar outro orçamento.", code: "ACTIVE_TREATMENT_EXISTS" });

    return reply.send({
      success: true,
      message: "Orçamento aprovado e integrado com sucesso à clínica.",
      data: { quote: result.quote, treatment: result.treatment, payment: result.payment }
    });
  });

  // ============================================================
  // 5. BUSCA GLOBAL (PACIENTES, PRONTUÁRIOS, AGENDAS, TRATAMENTOS)
  // ============================================================
  app.get("/search", { preHandler: requireRole(CLINIC_READ_ROLES) }, async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const query = request.query as { q?: string };

    if (!query.q || query.q.trim().length < 2) {
      return reply.send([]);
    }

    const term = query.q.trim();

    const [patients, treatments, quotes, appointments, followUps, opportunities] = await Promise.all([
      prisma.patient.findMany({
        where: {
          tenantId,
          deletedAt: null,
          OR: [
            { name: { contains: term, mode: "insensitive" } },
            { recordNumber: { contains: term, mode: "insensitive" } },
            { phone: { contains: term } }
          ]
        },
        take: 5
      }),
      prisma.treatment.findMany({
        where: {
          tenantId,
          name: { contains: term, mode: "insensitive" }
        },
        include: { patient: { select: { name: true } } },
        take: 5
      }),
      prisma.quote.findMany({ where: { tenantId, title: { contains: term, mode: "insensitive" } }, include: { patient: { select: { name: true } } }, take: 5 }),
      prisma.appointment.findMany({ where: { tenantId, OR: [{ procedureName: { contains: term, mode: "insensitive" } }, { patient: { name: { contains: term, mode: "insensitive" } } }] }, include: { patient: { select: { name: true, recordNumber: true } } }, take: 5, orderBy: { scheduledAt: "desc" } }),
      prisma.followUp.findMany({ where: { tenantId, OR: [{ reason: { contains: term, mode: "insensitive" } }, { patient: { name: { contains: term, mode: "insensitive" } } }] }, include: { patient: { select: { name: true, recordNumber: true } } }, take: 5, orderBy: { deadlineAt: "asc" } }),
      prisma.opportunity.findMany({ where: { tenantId, OR: [{ nextStep: { contains: term, mode: "insensitive" } }, { patient: { name: { contains: term, mode: "insensitive" } } }] }, include: { patient: { select: { name: true, recordNumber: true } } }, take: 5, orderBy: { updatedAt: "desc" } })
    ]);

    const results = [
      ...patients.map((p: any) => ({
        type: "PACIENTE",
        id: p.id,
        title: p.name,
        subtitle: `Prontuário ${p.recordNumber} • ${p.phone || "Sem telefone"}`,
        link: `/clinic/patients/${p.id}`,
        badge: p.status
      })),
      ...treatments.map((t: any) => ({
        type: "TRATAMENTO",
        id: t.id,
        title: t.name,
        subtitle: `Paciente: ${t.patient.name} • Progresso: ${t.progressPercent}%`,
        link: `/clinic/treatments`,
        badge: t.status
      })),
      ...quotes.map((q: any) => ({ type: "ORCAMENTO", id: q.id, title: q.title, subtitle: `Paciente: ${q.patient.name} • R$ ${Number(q.finalAmount).toFixed(2)}`, link: `/clinic/budgets`, badge: q.status })),
      ...appointments.map((a: any) => ({ type: "AGENDA", id: a.id, title: a.patient.name, subtitle: `${a.patient.recordNumber} • ${a.procedureName}`, link: `/clinic/agenda`, badge: a.status })),
      ...followUps.map((f: any) => ({ type: "AGENDA", id: f.id, title: f.patient.name, subtitle: `${f.patient.recordNumber} • ${f.reason}`, link: `/clinic/follow-ups`, badge: f.status })),
      ...opportunities.map((o: any) => ({ type: "AGENDA", id: o.id, title: o.patient.name, subtitle: `${o.patient.recordNumber} • ${o.nextStep || "Oportunidade"}`, link: `/clinic/opportunities`, badge: o.status }))
    ];

    return reply.send(results);
  });
}
