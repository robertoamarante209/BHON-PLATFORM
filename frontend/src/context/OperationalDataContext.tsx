import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Patient,
  Appointment,
  AppointmentStatus,
  Treatment,
  Opportunity,
  OpportunityStatus,
  FollowUp,
  Budget,
  Payment,
  TeamMember,
  Notification,
  AuditLog,
  PlatformClinic,
  PlatformInvoice,
  SupportTicket,
  TimelineEvent,
  Room
} from '../types';
import {
  initialPatients,
  initialAppointments,
  initialTreatments,
  initialOpportunities,
  initialFollowUps,
  initialBudgets,
  initialPayments,
  initialTeamMembers,
  initialNotifications,
  initialAuditLogs,
  initialPlatformInvoices,
  initialSupportTickets,
  initialRooms,
  initialClinics
} from '../data/initialData';
import { useAuth } from './AuthContext';

interface GlobalSearchResult {
  type: 'PACIENTE' | 'PRONTUARIO' | 'AGENDA' | 'TRATAMENTO' | 'ORCAMENTO';
  id: string;
  title: string;
  subtitle: string;
  link: string;
  badge?: string;
}

interface OperationalDataContextType {
  // Clínico
  rooms: Room[];
  patients: Patient[];
  appointments: Appointment[];
  treatments: Treatment[];
  opportunities: Opportunity[];
  followUps: FollowUp[];
  budgets: Budget[];
  payments: Payment[];
  teamMembers: TeamMember[];
  notifications: Notification[];
  auditLogs: AuditLog[];
  timelineEvents: TimelineEvent[];

  // Ações Clínicas Interconectadas
  updateAppointmentStatus: (id: string, newStatus: AppointmentStatus, delayMinutes?: number, notes?: string) => void;
  rescheduleAppointment: (id: string, newDate: string, newTime: string, newRoomId: string) => void;
  createAppointment: (data: Omit<Appointment, 'id' | 'tenantId'>) => void;
  addPatient: (data: Omit<Patient, 'id' | 'tenantId' | 'createdAt'>) => Patient;
  updatePatient: (id: string, data: Partial<Patient>) => void;
  approveBudget: (budgetId: string) => void;
  recordPayment: (paymentId: string, paidAt?: string, method?: string) => void;
  completeFollowUp: (followUpId: string, notes?: string) => void;
  postponeFollowUp: (followUpId: string, newDeadline: string) => void;
  advanceOpportunityStage: (oppId: string, newStage: OpportunityStatus) => void;
  markNotificationRead: (id: string) => void;
  markAllNotificationsRead: () => void;
  
  // Platform Owner
  platformClinics: PlatformClinic[];
  platformInvoices: PlatformInvoice[];
  supportTickets: SupportTicket[];
  toggleClinicStatus: (clinicId: string, newStatus: PlatformClinic['status']) => void;
  updateTicketStatus: (ticketId: string, newStatus: SupportTicket['status']) => void;
  markPlatformInvoicePaid: (invoiceId: string) => void;

  // Busca Global
  globalSearch: (query: string) => GlobalSearchResult[];
}

const OperationalDataContext = createContext<OperationalDataContextType | undefined>(undefined);

export const OperationalDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentClinic, currentUser } = useAuth();

  // Estados com persistência local
  const [rooms] = useState<Room[]>(initialRooms);
  
  const [patients, setPatients] = useState<Patient[]>(() => {
    const saved = localStorage.getItem('bhon_patients');
    return saved ? JSON.parse(saved) : initialPatients;
  });

  const [appointments, setAppointments] = useState<Appointment[]>(() => {
    const saved = localStorage.getItem('bhon_appointments');
    return saved ? JSON.parse(saved) : initialAppointments;
  });

  const [treatments, setTreatments] = useState<Treatment[]>(() => {
    const saved = localStorage.getItem('bhon_treatments');
    return saved ? JSON.parse(saved) : initialTreatments;
  });

  const [opportunities, setOpportunities] = useState<Opportunity[]>(() => {
    const saved = localStorage.getItem('bhon_opportunities');
    return saved ? JSON.parse(saved) : initialOpportunities;
  });

  const [followUps, setFollowUps] = useState<FollowUp[]>(() => {
    const saved = localStorage.getItem('bhon_follow_ups');
    return saved ? JSON.parse(saved) : initialFollowUps;
  });

  const [budgets, setBudgets] = useState<Budget[]>(() => {
    const saved = localStorage.getItem('bhon_budgets');
    return saved ? JSON.parse(saved) : initialBudgets;
  });

  const [payments, setPayments] = useState<Payment[]>(() => {
    const saved = localStorage.getItem('bhon_payments');
    return saved ? JSON.parse(saved) : initialPayments;
  });

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>(() => {
    const saved = localStorage.getItem('bhon_team');
    return saved ? JSON.parse(saved) : initialTeamMembers;
  });

  const [notifications, setNotifications] = useState<Notification[]>(() => {
    const saved = localStorage.getItem('bhon_notifications');
    return saved ? JSON.parse(saved) : initialNotifications;
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('bhon_audit');
    return saved ? JSON.parse(saved) : initialAuditLogs;
  });

  const [timelineEvents, setTimelineEvents] = useState<TimelineEvent[]>(() => {
    const saved = localStorage.getItem('bhon_timeline');
    return saved ? JSON.parse(saved) : [];
  });

  // Estados da Plataforma
  const [platformClinics, setPlatformClinics] = useState<PlatformClinic[]>(() => {
    const saved = localStorage.getItem('bhon_p_clinics');
    if (saved) return JSON.parse(saved);
    return initialClinics.map(c => ({
      id: c.id,
      name: c.name,
      ownerName: c.id === 'clinic-1' ? 'Dr. Roberto Carlos Fagundes' : 'Dra. Alvorada',
      ownerEmail: c.email,
      planName: c.planCode === 'CLINIC_ENTERPRISE' ? 'BHON Enterprise' : (c.planCode === 'CLINIC_PRO' ? 'BHON Clinic Pro' : 'BHON Clinic Starter'),
      status: c.status === 'ACTIVE' ? 'ATIVA' : (c.status === 'PAYMENT_PENDING' ? 'PAGAMENTO_PENDENTE' : (c.status === 'TEST' ? 'TESTE' : 'SUSPENSA')),
      usersCount: c.id === 'clinic-1' ? 5 : 8,
      patientsCount: c.id === 'clinic-1' ? 840 : 1420,
      lastActivityAt: 'Há 4 minutos',
      nextBillingDate: '2026-10-05',
      mrr: c.planCode === 'CLINIC_ENTERPRISE' ? 2490 : (c.planCode === 'CLINIC_PRO' ? 1290 : 690),
      createdAt: c.createdAt,
    }));
  });

  const [platformInvoices, setPlatformInvoices] = useState<PlatformInvoice[]>(() => {
    const saved = localStorage.getItem('bhon_p_invoices');
    return saved ? JSON.parse(saved) : initialPlatformInvoices;
  });

  const [supportTickets, setSupportTickets] = useState<SupportTicket[]>(() => {
    const saved = localStorage.getItem('bhon_p_tickets');
    return saved ? JSON.parse(saved) : initialSupportTickets;
  });

  // Sincronização automática com localStorage
  useEffect(() => { localStorage.setItem('bhon_patients', JSON.stringify(patients)); }, [patients]);
  useEffect(() => { localStorage.setItem('bhon_appointments', JSON.stringify(appointments)); }, [appointments]);
  useEffect(() => { localStorage.setItem('bhon_treatments', JSON.stringify(treatments)); }, [treatments]);
  useEffect(() => { localStorage.setItem('bhon_opportunities', JSON.stringify(opportunities)); }, [opportunities]);
  useEffect(() => { localStorage.setItem('bhon_follow_ups', JSON.stringify(followUps)); }, [followUps]);
  useEffect(() => { localStorage.setItem('bhon_budgets', JSON.stringify(budgets)); }, [budgets]);
  useEffect(() => { localStorage.setItem('bhon_payments', JSON.stringify(payments)); }, [payments]);
  useEffect(() => { localStorage.setItem('bhon_team', JSON.stringify(teamMembers)); }, [teamMembers]);
  useEffect(() => { localStorage.setItem('bhon_notifications', JSON.stringify(notifications)); }, [notifications]);
  useEffect(() => { localStorage.setItem('bhon_audit', JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem('bhon_timeline', JSON.stringify(timelineEvents)); }, [timelineEvents]);
  useEffect(() => { localStorage.setItem('bhon_p_clinics', JSON.stringify(platformClinics)); }, [platformClinics]);
  useEffect(() => { localStorage.setItem('bhon_p_invoices', JSON.stringify(platformInvoices)); }, [platformInvoices]);
  useEffect(() => { localStorage.setItem('bhon_p_tickets', JSON.stringify(supportTickets)); }, [supportTickets]);

  // Função auxiliar de log de auditoria
  const logAudit = (action: string, resource: string, resourceId: string, metadata?: any) => {
    const newLog: AuditLog = {
      id: `aud-${Date.now()}`,
      tenantId: currentClinic.id,
      actorUserId: currentUser.id,
      actorUserName: `${currentUser.name} (${currentUser.role})`,
      action,
      resource,
      resourceId,
      metadata,
      createdAt: new Date().toISOString(),
    };
    setAuditLogs(prev => [newLog, ...prev]);
  };

  // Função auxiliar para eventos de linha do tempo
  const logTimeline = (patientId: string, type: string, description: string, metadata?: any) => {
    const event: TimelineEvent = {
      id: `time-${Date.now()}`,
      tenantId: currentClinic.id,
      patientId,
      actorUserId: currentUser.id,
      actorUserName: currentUser.name,
      type,
      description,
      metadata,
      createdAt: new Date().toISOString(),
    };
    setTimelineEvents(prev => [event, ...prev]);
  };

  // ============================================================
  // WORKFLOW CRÍTICO: TRANSIÇÃO DE STATUS DA AGENDA
  // ============================================================
  const updateAppointmentStatus = (
    id: string,
    newStatus: AppointmentStatus,
    delayMinutes: number = 0,
    notes?: string
  ) => {
    const targetApt = appointments.find(a => a.id === id);
    if (!targetApt) return;

    const oldStatus = targetApt.status;

    // 1. Atualizar agendamento
    setAppointments(prev =>
      prev.map(apt => {
        if (apt.id === id) {
          return {
            ...apt,
            status: newStatus,
            delayMinutes: newStatus === 'ATRASADO' ? (delayMinutes || 15) : 0,
            notes: notes ? (apt.notes ? `${apt.notes} | ${notes}` : notes) : apt.notes,
          };
        }
        return apt;
      })
    );

    // 2. Se mudou para FALTA:
    if (newStatus === 'FALTA' && oldStatus !== 'FALTA') {
      // Cria follow-up imediato na fila operacional
      const newFollowUp: FollowUp = {
        id: `fol-${Date.now()}`,
        tenantId: currentClinic.id,
        patientId: targetApt.patientId,
        patientName: targetApt.patientName,
        patientRecordNumber: targetApt.patientRecordNumber,
        responsibleUserId: currentUser.id,
        responsibleUserName: currentUser.name,
        category: 'RETORNO',
        reason: `Falta não justificada na consulta das ${targetApt.time} (${targetApt.procedureName})`,
        priority: 'HIGH',
        status: 'PENDENTE',
        deadlineAt: new Date(Date.now() + 6 * 3600 * 1000).toISOString(),
        nextAction: 'Ligar para o paciente para entender o motivo e reagendar',
        createdAt: new Date().toISOString(),
      };
      setFollowUps(prev => [newFollowUp, ...prev]);

      // Cria notificação operacional
      const newNotif: Notification = {
        id: `not-${Date.now()}`,
        tenantId: currentClinic.id,
        userId: targetApt.professionalId,
        type: 'MISSED_APPOINTMENT',
        title: `Falta de Paciente: ${targetApt.patientName}`,
        message: `Consulta das ${targetApt.time} marcada como falta. Follow-up gerado para a recepção.`,
        link: '/clinic/agenda',
        read: false,
        priority: 'HIGH',
        createdAt: new Date().toISOString(),
      };
      setNotifications(prev => [newNotif, ...prev]);

      // Linha do tempo do paciente
      logTimeline(
        targetApt.patientId,
        'APPOINTMENT_MISSED',
        `Paciente faltou na consulta das ${targetApt.time} com ${targetApt.professionalName}. Fila de exceção aberta.`
      );
    }

    // 3. Se mudou para CONCLUÍDO:
    if (newStatus === 'CONCLUIDO' && oldStatus !== 'CONCLUIDO') {
      logTimeline(
        targetApt.patientId,
        'APPOINTMENT_COMPLETED',
        `Atendimento das ${targetApt.time} concluído: ${targetApt.procedureName} pelo ${targetApt.professionalName}.`
      );

      // Atualiza tratamento se vinculado
      if (targetApt.treatmentId) {
        setTreatments(prev =>
          prev.map(t => {
            if (t.id === targetApt.treatmentId) {
              const newCompleted = t.completedStagesCount + 1;
              const newPercent = Math.min(100, Math.round((newCompleted / Math.max(1, t.stagesCount)) * 100));
              return {
                ...t,
                completedStagesCount: newCompleted,
                progressPercent: newPercent,
                lastAppointmentAt: new Date().toISOString(),
              };
            }
            return t;
          })
        );
      }
    }

    // 4. Se mudou para EM_ATENDIMENTO:
    if (newStatus === 'EM_ATENDIMENTO') {
      logTimeline(
        targetApt.patientId,
        'APPOINTMENT_IN_PROGRESS',
        `Paciente chamado para o ${targetApt.roomName} por ${targetApt.professionalName}.`
      );
    }

    // Auditoria
    logAudit('APPOINTMENT_STATUS_CHANGE', 'Appointment', id, {
      patient: targetApt.patientName,
      previousStatus: oldStatus,
      newStatus,
      delayMinutes,
    });
  };

  // Reagendar consulta
  const rescheduleAppointment = (id: string, newDate: string, newTime: string, newRoomId: string) => {
    const room = rooms.find(r => r.id === newRoomId);
    setAppointments(prev =>
      prev.map(apt => {
        if (apt.id === id) {
          const updated: Appointment = {
            ...apt,
            time: newTime,
            scheduledAt: `${newDate}T${newTime}:00Z`,
            roomId: newRoomId,
            roomName: room ? room.name : apt.roomName,
            status: 'CONFIRMADO',
            delayMinutes: 0,
            notes: apt.notes ? `${apt.notes} | Reagendado` : 'Reagendado',
          };
          logTimeline(
            apt.patientId,
            'APPOINTMENT_RESCHEDULED',
            `Consulta reagendada para ${newTime} no ${room?.name || 'consultório'}.`
          );
          logAudit('APPOINTMENT_RESCHEDULED', 'Appointment', id, { newDate, newTime, newRoom: room?.name });
          return updated;
        }
        return apt;
      })
    );
  };

  const createAppointment = (data: Omit<Appointment, 'id' | 'tenantId'>) => {
    const newApt: Appointment = {
      ...data,
      id: `apt-${Date.now()}`,
      tenantId: currentClinic.id,
    };
    setAppointments(prev => [...prev, newApt]);
    logTimeline(data.patientId, 'APPOINTMENT_CREATED', `Nova consulta agendada para ${data.time}: ${data.procedureName}.`);
    logAudit('APPOINTMENT_CREATED', 'Appointment', newApt.id, { patient: data.patientName, time: data.time });
  };

  // ============================================================
  // WORKFLOW CRÍTICO: CADASTRO E ATUALIZAÇÃO DE PACIENTES
  // ============================================================
  const addPatient = (data: Omit<Patient, 'id' | 'tenantId' | 'createdAt'>): Patient => {
    const newPatient: Patient = {
      ...data,
      id: `pat-${Date.now()}`,
      tenantId: currentClinic.id,
      createdAt: new Date().toISOString(),
    };
    setPatients(prev => [newPatient, ...prev]);
    logTimeline(newPatient.id, 'PATIENT_CREATED', `Prontuário ${newPatient.recordNumber} aberto para ${newPatient.name}.`);
    logAudit('PATIENT_CREATED', 'Patient', newPatient.id, { recordNumber: newPatient.recordNumber, name: newPatient.name });
    return newPatient;
  };

  const updatePatient = (id: string, data: Partial<Patient>) => {
    setPatients(prev =>
      prev.map(p => {
        if (p.id === id) {
          const updated = { ...p, ...data };
          logAudit('PATIENT_UPDATED', 'Patient', id, data);
          return updated;
        }
        return p;
      })
    );
  };

  // ============================================================
  // WORKFLOW CRÍTICO: APROVAÇÃO DE ORÇAMENTO
  // Dispara conversão de oportunidade, ativação de tratamento,
  // lançamento no financeiro da clínica e trilha de auditoria.
  // ============================================================
  const approveBudget = (budgetId: string) => {
    const targetBudget = budgets.find(b => b.id === budgetId);
    if (!targetBudget) return;

    // 1. Atualiza o orçamento para ACCEPTED
    setBudgets(prev =>
      prev.map(b => (b.id === budgetId ? { ...b, status: 'ACCEPTED', acceptedAt: new Date().toISOString() } : b))
    );

    // 2. Transiciona a oportunidade correspondente para CONVERTIDO
    setOpportunities(prev =>
      prev.map(opp => {
        if (opp.patientId === targetBudget.patientId) {
          return {
            ...opp,
            status: 'CONVERTIDO',
            nextStep: 'Orçamento aprovado. Iniciar execução clínica do plano.',
          };
        }
        return opp;
      })
    );

    // 3. Atualiza ou gera o tratamento como ATIVO
    const existingTreatment = treatments.find(t => t.patientId === targetBudget.patientId);
    if (existingTreatment) {
      setTreatments(prev =>
        prev.map(t => (t.id === existingTreatment.id ? { ...t, status: 'ACTIVE', totalValue: targetBudget.finalAmount } : t))
      );
    } else {
      const newTreatment: Treatment = {
        id: `treat-${Date.now()}`,
        tenantId: currentClinic.id,
        patientId: targetBudget.patientId,
        patientName: targetBudget.patientName,
        patientRecordNumber: targetBudget.patientRecordNumber,
        responsibleUserId: currentUser.id,
        responsibleUserName: currentUser.name,
        name: targetBudget.treatmentTitle,
        totalValue: targetBudget.finalAmount,
        status: 'ACTIVE',
        progressPercent: 10,
        stagesCount: 3,
        completedStagesCount: 0,
        currentStageTitle: 'Fase Inicial: Preparo e Planejamento',
        startedAt: new Date().toISOString(),
        stages: [
          {
            id: `st-${Date.now()}-1`,
            tenantId: currentClinic.id,
            treatmentId: `treat-${Date.now()}`,
            stageNumber: 1,
            title: 'Sessão 1: Início Clínico e Moldagem',
            status: 'SCHEDULED',
            plannedDate: new Date().toISOString(),
          }
        ]
      };
      setTreatments(prev => [newTreatment, ...prev]);
    }

    // 4. Lança o pagamento a receber no financeiro da clínica
    const newPayment: Payment = {
      id: `pay-${Date.now()}`,
      tenantId: currentClinic.id,
      patientId: targetBudget.patientId,
      patientName: targetBudget.patientName,
      patientRecordNumber: targetBudget.patientRecordNumber,
      quoteId: targetBudget.id,
      referenceType: 'TREATMENT',
      referenceDescription: `Entrada - ${targetBudget.treatmentTitle}`,
      category: 'Procedimentos Clínicos',
      amount: targetBudget.finalAmount * 0.5,
      dueDate: new Date().toISOString().split('T')[0],
      status: 'PENDENTE',
      paymentMethod: targetBudget.paymentMethod || 'PIX',
    };
    setPayments(prev => [newPayment, ...prev]);

    // 5. Linha do tempo e Auditoria
    logTimeline(
      targetBudget.patientId,
      'BUDGET_APPROVED',
      `Orçamento no valor de R$ ${targetBudget.finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} aprovado. Tratamento ativado e oportunidade convertida.`
    );
    logAudit('BUDGET_APPROVED', 'Quote', budgetId, {
      patient: targetBudget.patientName,
      amount: targetBudget.finalAmount,
    });
  };

  // ============================================================
  // WORKFLOW CRÍTICO: BAIXA DE PAGAMENTO CLÍNICO
  // ============================================================
  const recordPayment = (paymentId: string, paidAt?: string, method?: string) => {
    const targetPayment = payments.find(p => p.id === paymentId);
    if (!targetPayment) return;

    setPayments(prev =>
      prev.map(p => {
        if (p.id === paymentId) {
          return {
            ...p,
            status: 'PAGO',
            paidAt: paidAt || new Date().toISOString(),
            paymentMethod: method || p.paymentMethod || 'PIX',
          };
        }
        return p;
      })
    );

    logTimeline(
      targetPayment.patientId,
      'PAYMENT_RECEIVED',
      `Pagamento de R$ ${targetPayment.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebido (${targetPayment.referenceDescription}).`
    );
    logAudit('PAYMENT_SETTLED', 'Payment', paymentId, { amount: targetPayment.amount, patient: targetPayment.patientName });
  };

  // Follow-up actions
  const completeFollowUp = (followUpId: string, notes?: string) => {
    const fol = followUps.find(f => f.id === followUpId);
    if (!fol) return;

    setFollowUps(prev =>
      prev.map(f => (f.id === followUpId ? { ...f, status: 'CONCLUIDO', notes: notes || f.notes } : f))
    );
    logTimeline(fol.patientId, 'FOLLOW_UP_COMPLETED', `Acompanhamento concluído: ${fol.reason}.`);
    logAudit('FOLLOW_UP_COMPLETED', 'FollowUp', followUpId, { notes });
  };

  const postponeFollowUp = (followUpId: string, newDeadline: string) => {
    setFollowUps(prev =>
      prev.map(f => (f.id === followUpId ? { ...f, status: 'ADIADO', deadlineAt: newDeadline } : f))
    );
    logAudit('FOLLOW_UP_POSTPONED', 'FollowUp', followUpId, { newDeadline });
  };

  const advanceOpportunityStage = (oppId: string, newStage: OpportunityStatus) => {
    setOpportunities(prev =>
      prev.map(opp => (opp.id === oppId ? { ...opp, status: newStage } : opp))
    );
    logAudit('OPPORTUNITY_STAGE_CHANGED', 'Opportunity', oppId, { newStage });
  };

  const markNotificationRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllNotificationsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // ============================================================
  // AÇÕES DO MANTENEDOR DA PLATAFORMA (PLATFORM OWNER)
  // ============================================================
  const toggleClinicStatus = (clinicId: string, newStatus: PlatformClinic['status']) => {
    setPlatformClinics(prev =>
      prev.map(c => (c.id === clinicId ? { ...c, status: newStatus } : c))
    );
    logAudit('PLATFORM_CLINIC_STATUS_CHANGED', 'PlatformClinic', clinicId, { newStatus });
  };

  const updateTicketStatus = (ticketId: string, newStatus: SupportTicket['status']) => {
    setSupportTickets(prev =>
      prev.map(t => (t.id === ticketId ? { ...t, status: newStatus, resolvedAt: newStatus === 'RESOLVED' ? new Date().toISOString() : undefined } : t))
    );
    logAudit('SUPPORT_TICKET_STATUS_CHANGED', 'SupportTicket', ticketId, { newStatus });
  };

  const markPlatformInvoicePaid = (invoiceId: string) => {
    setPlatformInvoices(prev =>
      prev.map(inv => (inv.id === invoiceId ? { ...inv, status: 'PAGO', paidAt: new Date().toISOString() } : inv))
    );
    logAudit('PLATFORM_INVOICE_PAID', 'PlatformInvoice', invoiceId, {});
  };

  // ============================================================
  // BUSCA GLOBAL
  // ============================================================
  const globalSearch = (query: string): GlobalSearchResult[] => {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();
    const results: GlobalSearchResult[] = [];

    // Pacientes e Prontuários
    patients.forEach(p => {
      if (p.name.toLowerCase().includes(q) || p.recordNumber.toLowerCase().includes(q) || p.phone?.includes(q)) {
        results.push({
          type: 'PACIENTE',
          id: p.id,
          title: p.name,
          subtitle: `Prontuário ${p.recordNumber} • Contato: ${p.phone || 'N/A'} • ${p.currentTreatment || 'Sem tratamento ativo'}`,
          link: `/clinic/patients/${p.id}`,
          badge: p.status,
        });
      }
    });

    // Consultas da Agenda
    appointments.forEach(apt => {
      if (apt.patientName.toLowerCase().includes(q) || apt.procedureName.toLowerCase().includes(q)) {
        results.push({
          type: 'AGENDA',
          id: apt.id,
          title: `${apt.time} - ${apt.patientName}`,
          subtitle: `${apt.procedureName} • ${apt.roomName} • ${apt.professionalName}`,
          link: '/clinic/agenda',
          badge: apt.status,
        });
      }
    });

    // Tratamentos
    treatments.forEach(t => {
      if (t.name.toLowerCase().includes(q) || t.patientName.toLowerCase().includes(q)) {
        results.push({
          type: 'TRATAMENTO',
          id: t.id,
          title: t.name,
          subtitle: `Paciente: ${t.patientName} (${t.patientRecordNumber}) • Progresso: ${t.progressPercent}%`,
          link: '/clinic/treatments',
          badge: t.status,
        });
      }
    });

    // Orçamentos
    budgets.forEach(b => {
      if (b.patientName.toLowerCase().includes(q) || b.treatmentTitle.toLowerCase().includes(q)) {
        results.push({
          type: 'ORCAMENTO',
          id: b.id,
          title: `R$ ${b.finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} - ${b.treatmentTitle}`,
          subtitle: `Paciente: ${b.patientName} (${b.patientRecordNumber})`,
          link: '/clinic/budgets',
          badge: b.status,
        });
      }
    });

    return results.slice(0, 8);
  };

  return (
    <OperationalDataContext.Provider
      value={{
        rooms,
        patients,
        appointments,
        treatments,
        opportunities,
        followUps,
        budgets,
        payments,
        teamMembers,
        notifications,
        auditLogs,
        timelineEvents,
        updateAppointmentStatus,
        rescheduleAppointment,
        createAppointment,
        addPatient,
        updatePatient,
        approveBudget,
        recordPayment,
        completeFollowUp,
        postponeFollowUp,
        advanceOpportunityStage,
        markNotificationRead,
        markAllNotificationsRead,
        platformClinics,
        platformInvoices,
        supportTickets,
        toggleClinicStatus,
        updateTicketStatus,
        markPlatformInvoicePaid,
        globalSearch,
      }}
    >
      {children}
    </OperationalDataContext.Provider>
  );
};

export const useOperationalData = () => {
  const context = useContext(OperationalDataContext);
  if (!context) {
    throw new Error('useOperationalData deve ser utilizado dentro de um OperationalDataProvider');
  }
  return context;
};
