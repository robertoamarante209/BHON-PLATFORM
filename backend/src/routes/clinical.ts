import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import { requireAuth, requireTenant } from "../lib/middleware.js";
import { AppointmentStatus, QuoteStatus, TreatmentStatus, OpportunityStatus, FollowUpStatus, PaymentStatus } from "../lib/prisma-types.js";

export async function clinicalRoutes(app: FastifyInstance) {
  // Todas as rotas clínicas exigem autenticação e contexto de tenant
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireTenant);

  // ============================================================
  // 1. VISÃO GERAL (COMMAND SURFACE - EXCEÇÕES E OPERAÇÃO DO DIA)
  // ============================================================
  app.get("/overview", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

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
          scheduledAt: { gte: todayStart, lte: todayEnd }
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
          scheduledAt: { gte: todayStart, lte: todayEnd }
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
  app.get("/patients", async (request: FastifyRequest, reply: FastifyReply) => {
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
            select: { name: true }
          },
          appointments: {
            orderBy: { scheduledAt: "desc" },
            take: 1,
            select: { scheduledAt: true, procedureName: true, status: true }
          }
        }
      })
    ]);

    return reply.send({
      data: patients.map((p: any) => ({
        id: p.id,
        recordNumber: p.recordNumber,
        name: p.name,
        cpf: p.cpf,
        phone: p.phone,
        email: p.email,
        status: p.status,
        allergies: p.allergies,
        currentTreatment: p.treatments[0]?.name || "Nenhum ativo",
        lastAppointment: p.appointments[0]?.scheduledAt || null,
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

  app.post("/patients", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const user = request.user!;
    const body = request.body as any;

    if (!body.name || body.name.trim().length < 2) {
      return reply.code(400).send({ error: "Nome do paciente é obrigatório." });
    }

    // Gera número sequencial de prontuário
    const count = await prisma.patient.count({ where: { tenantId } });
    const recordNumber = `#${String(count + 1).padStart(5, "0")}`;

    const patient = await prisma.patient.create({
      data: {
        tenantId,
        recordNumber,
        name: body.name.trim(),
        cpf: body.cpf?.trim() || null,
        phone: body.phone?.trim() || null,
        email: body.email?.trim().toLowerCase() || null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        allergies: body.allergies || null,
        observations: body.observations || null,
        source: body.source || "Recepção",
        status: "ACTIVE"
      }
    });

    // Registra na linha do tempo e auditoria
    await Promise.all([
      prisma.timelineEvent.create({
        data: {
          tenantId,
          patientId: patient.id,
          actorUserId: user.id,
          type: "PATIENT_CREATED",
          description: `Prontuário ${recordNumber} aberto por ${user.name}.`
        }
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          actorUserId: user.id,
          action: "CREATE",
          resource: "Patient",
          resourceId: patient.id,
          metadata: { recordNumber, name: patient.name }
        }
      })
    ]);

    return reply.code(201).send(patient);
  });

  app.get("/patients/:id", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const { id } = request.params;

    const patient = await prisma.patient.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        treatments: {
          include: { stages: true },
          orderBy: { createdAt: "desc" }
        },
        appointments: {
          include: { room: true, professional: true },
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
          orderBy: { deadlineAt: "asc" }
        },
        timelineEvents: {
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
  app.get("/appointments", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const query = request.query as { date?: string; roomId?: string };

    const targetDate = query.date ? new Date(query.date) : new Date();
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const where: any = {
      tenantId,
      scheduledAt: { gte: startOfDay, lte: endOfDay }
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

  app.post("/appointments", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const user = request.user!;
    const body = request.body as any;

    const professionalId = body.professionalId || body.doctorId;
    if (!body.patientId || !professionalId || !body.roomId || !body.scheduledAt) {
      return reply.code(400).send({ error: "Campos obrigatórios ausentes para agendamento." });
    }

    const scheduledAt = new Date(body.scheduledAt);

    const appointment = await prisma.appointment.create({
      data: {
        tenantId,
        patientId: body.patientId,
        professionalId,
        roomId: body.roomId,
        treatmentId: body.treatmentId || null,
        scheduledAt,
        durationMinutes: Number(body.durationMinutes) || 45,
        procedureName: body.procedureName || "Consulta de Rotina",
        status: AppointmentStatus.CONFIRMADO,
        notes: body.notes || null
      },
      include: {
        patient: true,
        room: true,
        professional: true
      }
    });

    await Promise.all([
      prisma.timelineEvent.create({
        data: {
          tenantId,
          patientId: body.patientId,
          actorUserId: user.id,
          type: "APPOINTMENT_SCHEDULED",
          description: `Agendado para ${scheduledAt.toLocaleDateString("pt-BR")} às ${scheduledAt.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })} (${appointment.procedureName}).`
        }
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          actorUserId: user.id,
          action: "CREATE",
          resource: "Appointment",
          resourceId: appointment.id,
          metadata: { patientId: body.patientId, scheduledAt }
        }
      })
    ]);

    return reply.code(201).send(appointment);
  });

  // WORKFLOW CRÍTICO CRUZADO DE STATUS DO AGENDAMENTO
  app.patch("/appointments/:id/status", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const user = request.user!;
    const { id } = request.params;
    const body = request.body as { status: AppointmentStatus; delayMinutes?: number; notes?: string };

    const appointment = await prisma.appointment.findFirst({
      where: { id, tenantId },
      include: { patient: true, professional: true, treatment: true }
    });

    if (!appointment) {
      return reply.code(404).send({ error: "Agendamento não encontrado." });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status: body.status,
        delayMinutes: body.delayMinutes ?? appointment.delayMinutes,
        notes: body.notes !== undefined ? body.notes : appointment.notes
      }
    });

    // REAÇÃO CRUZADA: Se o paciente FALTAR
    if (body.status === AppointmentStatus.FALTA) {
      // 1. Gera Acompanhamento de reativação/confirmação
      await prisma.followUp.create({
        data: {
          tenantId,
          patientId: appointment.patientId,
          appointmentId: appointment.id,
          responsibleUserId: appointment.professionalId,
          category: "CONFIRMACAO",
          reason: `Paciente faltou sem aviso prévio na sessão de ${appointment.procedureName}.`,
          priority: "HIGH",
          status: FollowUpStatus.PENDENTE,
          deadlineAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Contatar em 24h
          notes: "Reagendar consulta com urgência para não comprometer o tratamento."
        }
      });

      // 2. Registra na Linha do Tempo do Paciente
      await prisma.timelineEvent.create({
        data: {
          tenantId,
          patientId: appointment.patientId,
          actorUserId: user.id,
          type: "APPOINTMENT_MISSED",
          description: `FALTA registrada no atendimento de ${appointment.procedureName}. Acompanhamento gerado.`
        }
      });

      // 3. Notificação Operacional
      await prisma.notification.create({
        data: {
          tenantId,
          userId: user.id,
          type: "MISSED_APPOINTMENT",
          title: `Falta de Paciente: ${appointment.patient.name}`,
          message: `O paciente faltou à consulta com ${appointment.professional.name}. Um acompanhamento foi colocado na fila.`,
          priority: "HIGH"
        }
      });
    }

    // REAÇÃO CRUZADA: Se o atendimento for CONCLUÍDO
    if (body.status === AppointmentStatus.CONCLUIDO) {
      await prisma.timelineEvent.create({
        data: {
          tenantId,
          patientId: appointment.patientId,
          actorUserId: user.id,
          type: "APPOINTMENT_COMPLETED",
          description: `Atendimento de ${appointment.procedureName} concluído com sucesso.`
        }
      });

      // Se houver tratamento vinculado, avança as etapas
      if (appointment.treatmentId) {
        const treatment = await prisma.treatment.findUnique({
          where: { id: appointment.treatmentId }
        });
        if (treatment) {
          const newCompleted = treatment.completedStagesCount + 1;
          const newProgress = Math.min(100, Math.round((newCompleted / Math.max(1, treatment.stagesCount)) * 100));
          await prisma.treatment.update({
            where: { id: treatment.id },
            data: {
              completedStagesCount: newCompleted,
              progressPercent: newProgress,
              status: newProgress >= 100 ? TreatmentStatus.COMPLETED : TreatmentStatus.ACTIVE
            }
          });
        }
      }
    }

    // Auditoria
    await prisma.auditLog.create({
      data: {
        tenantId,
        actorUserId: user.id,
        action: "UPDATE_STATUS",
        resource: "Appointment",
        resourceId: appointment.id,
        metadata: { from: appointment.status, to: body.status }
      }
    });

    return reply.send(updated);
  });

  // ============================================================
  // 4. ORÇAMENTOS (CRIAÇÃO, ITENS E APROVAÇÃO TRANSACIONAL)
  // ============================================================
  app.get("/budgets", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const quotes = await prisma.quote.findMany({
      where: { tenantId },
      include: {
        patient: { select: { id: true, name: true, recordNumber: true } },
        items: true
      },
      orderBy: { createdAt: "desc" }
    });
    return reply.send(quotes);
  });

  // WORKFLOW CRÍTICO: APROVAÇÃO DE ORÇAMENTO EM UMA TRANSAÇÃO ATÔMICA
  app.post("/budgets/:id/approve", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const user = request.user!;
    const { id } = request.params;

    const quote = await prisma.quote.findFirst({
      where: { id, tenantId },
      include: { patient: true, items: true }
    });

    if (!quote) {
      return reply.code(404).send({ error: "Orçamento não encontrado." });
    }

    // Executa atomicamente todas as atualizações cruzadas
    const result = await prisma.$transaction(async (tx: any) => {
      // 1. Atualiza o Orçamento para APROVADO (ACCEPTED)
      const updatedQuote = await tx.quote.update({
        where: { id },
        data: {
          status: QuoteStatus.ACCEPTED,
          acceptedAt: new Date()
        }
      });

      // 2. Converte qualquer oportunidade em aberto para CONVERTIDO
      await tx.opportunity.updateMany({
        where: { tenantId, patientId: quote.patientId, status: { not: OpportunityStatus.CONVERTIDO } },
        data: { status: OpportunityStatus.CONVERTIDO }
      });

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

      // 4. Cria conta a receber no Financeiro da Clínica
      const payment = await tx.payment.create({
        data: {
          tenantId,
          patientId: quote.patientId,
          quoteId: quote.id,
          treatmentId: treatment.id,
          category: "TRATAMENTO_ODONTOLOGICO",
          amount: quote.finalAmount,
          dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Vencimento padrão em 15 dias
          status: PaymentStatus.PENDENTE,
          paymentMethod: quote.paymentMethod || "CARTAO_CREDITO"
        }
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

      return { quote: updatedQuote, treatment, payment };
    });

    return reply.send({
      success: true,
      message: "Orçamento aprovado e integrado com sucesso à clínica.",
      data: result
    });
  });

  // ============================================================
  // 5. FINANCEIRO DA CLÍNICA (RECEBÍVEIS E LIQUIDAÇÃO)
  // ============================================================
  app.get("/finance/payments", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const payments = await prisma.payment.findMany({
      where: { tenantId },
      include: {
        patient: { select: { id: true, name: true, recordNumber: true } }
      },
      orderBy: { dueDate: "asc" }
    });
    return reply.send(payments);
  });

  app.post("/finance/payments/:id/pay", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const user = request.user!;
    const { id } = request.params;
    const body = (request.body || {}) as { method?: string };

    const payment = await prisma.payment.findFirst({
      where: { id, tenantId },
      include: { patient: true }
    });

    if (!payment) {
      return reply.code(404).send({ error: "Recebível não encontrado." });
    }

    const updated = await prisma.payment.update({
      where: { id },
      data: {
        status: PaymentStatus.PAGO,
        paidAt: new Date(),
        paymentMethod: body.method || payment.paymentMethod || "PIX"
      }
    });

    // Registra na Linha do Tempo e Auditoria
    await Promise.all([
      prisma.timelineEvent.create({
        data: {
          tenantId,
          patientId: payment.patientId,
          actorUserId: user.id,
          type: "PAYMENT_RECEIVED",
          description: `Pagamento de R$ ${Number(payment.amount).toFixed(2)} liquidado (${payment.paymentMethod || "PIX"}).`
        }
      }),
      prisma.auditLog.create({
        data: {
          tenantId,
          actorUserId: user.id,
          action: "PAY",
          resource: "Payment",
          resourceId: payment.id,
          metadata: { amount: payment.amount }
        }
      })
    ]);

    return reply.send(updated);
  });

  // ============================================================
  // 6. BUSCA GLOBAL (PACIENTES, PRONTUÁRIOS, AGENDAS, TRATAMENTOS)
  // ============================================================
  app.get("/search", async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = request.tenantId!;
    const query = request.query as { q?: string };

    if (!query.q || query.q.trim().length < 2) {
      return reply.send([]);
    }

    const term = query.q.trim();

    const [patients, treatments, quotes] = await Promise.all([
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
      prisma.quote.findMany({
        where: {
          tenantId,
          title: { contains: term, mode: "insensitive" }
        },
        include: { patient: { select: { name: true } } },
        take: 5
      })
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
      ...quotes.map((q: any) => ({
        type: "ORCAMENTO",
        id: q.id,
        title: q.title,
        subtitle: `Paciente: ${q.patient.name} • R$ ${Number(q.finalAmount).toFixed(2)}`,
        link: `/clinic/budgets`,
        badge: q.status
      }))
    ];

    return reply.send(results);
  });
}
