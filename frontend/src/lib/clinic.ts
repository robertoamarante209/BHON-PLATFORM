import type { Appointment, AppointmentStatus, Budget, FollowUp, FollowUpCategory, FollowUpStatus, Opportunity, OpportunityStatus, Patient, PatientStatus, Payment, QuoteStatus, Room, TimelineEvent, Treatment, TreatmentStatus } from '../types';
import { apiRequest } from './api';

export const appointmentTransitions: Record<AppointmentStatus, readonly AppointmentStatus[]> = {
  CONFIRMADO: ['NA_RECEPCAO', 'CANCELADO', 'FALTA', 'ENCAIXE'],
  AGUARDANDO_CONFIRMACAO: ['CONFIRMADO', 'NA_RECEPCAO', 'CANCELADO', 'FALTA'],
  NA_RECEPCAO: ['EM_ATENDIMENTO', 'ATRASADO', 'CANCELADO', 'FALTA'],
  EM_ATENDIMENTO: ['CONCLUIDO', 'ATRASADO', 'CANCELADO'],
  ATRASADO: ['NA_RECEPCAO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO', 'FALTA'],
  ENCAIXE: ['NA_RECEPCAO', 'EM_ATENDIMENTO', 'CONCLUIDO', 'CANCELADO', 'FALTA'],
  FALTA: ['CONFIRMADO', 'CANCELADO'],
  CANCELADO: ['CONFIRMADO', 'ENCAIXE'],
  CONCLUIDO: [],
};

export const opportunityTransitions: Record<OpportunityStatus, readonly OpportunityStatus[]> = {
  NEW_CONTACT: ['TRIAGEM', 'PERDIDO'], TRIAGEM: ['AVALIACAO', 'PERDIDO'], AVALIACAO: ['PLANO_APRESENTADO', 'PERDIDO'],
  PLANO_APRESENTADO: ['ORCAMENTO', 'NEGOCIACAO', 'PERDIDO'], ORCAMENTO: ['NEGOCIACAO', 'CONVERTIDO', 'PERDIDO'],
  NEGOCIACAO: ['ORCAMENTO', 'CONVERTIDO', 'PERDIDO'], CONVERTIDO: [], PERDIDO: ['TRIAGEM'],
};

export type Pagination = { page: number; limit: number; total: number; totalPages: number };
export type ProfessionalOption = { id: string; name: string; specialty?: string; role: string };

type PatientListResponse = { data: Patient[]; pagination: Pagination };
type SchedulingResourcesResponse = { rooms: Room[]; professionals: ProfessionalOption[] };
type ApiAppointment = Omit<Appointment, 'patientName' | 'patientRecordNumber' | 'professionalName' | 'roomName' | 'time' | 'treatmentName'> & {
  patient: { id: string; name: string; recordNumber: string; phone?: string | null };
  professional: { id: string; name: string; specialty?: string | null };
  room: { id: string; name: string };
  treatment?: { id: string; name: string } | null;
};

type ApiTreatment = Omit<Treatment, 'patientName' | 'patientRecordNumber' | 'responsibleUserName' | 'totalValue' | 'stages'> & {
  totalValue?: string | number | null;
  responsibleUser?: { id: string; name: string } | null;
  stages: Treatment['stages'];
};

type ApiQuote = {
  id: string; tenantId: string; patientId: string; createdById?: string | null; title: string; status: Budget['status'];
  totalAmount: string | number; discountAmount: string | number; finalAmount: string | number; paymentMethod?: string | null;
  sentAt?: string | null; expiresAt?: string | null; acceptedAt?: string | null; createdAt: string; updatedAt: string;
  items: Array<{ id: string; quoteId: string; description: string; quantity: number; unitPrice: string | number; totalPrice: string | number }>;
};

type ApiTreatmentListItem = ApiTreatment & {
  patient: { id: string; name: string; recordNumber: string };
  appointments: Array<{ scheduledAt: string }>;
};

type ApiBudgetListItem = ApiQuote & {
  patient: { id: string; name: string; recordNumber: string };
  createdBy?: { id: string; name: string } | null;
};

export type BudgetMetrics = {
  totalInNegotiation: number;
  noResponseCount: number;
  approvedCount: number;
  rejectedCount: number;
  conversionRate: number | null;
};

type ApiPayment = Omit<Payment, 'patientName' | 'patientRecordNumber' | 'referenceDescription' | 'amount'> & { amount: string | number };
type ApiFollowUp = Omit<FollowUp, 'patientName' | 'patientPhone' | 'patientRecordNumber' | 'responsibleUserName'> & { responsibleUser?: { id: string; name: string } | null };
type ApiFollowUpListItem = ApiFollowUp & {
  patient: { id: string; name: string; phone?: string | null; recordNumber: string };
};
type ApiOpportunityListItem = Omit<Opportunity, 'patientName' | 'patientPhone' | 'assignedToName' | 'potentialValue'> & {
  potentialValue?: string | number | null;
  patient: { id: string; name: string; phone?: string | null; recordNumber: string };
  assignedTo?: { id: string; name: string } | null;
  treatmentTitle?: string | null;
};
type ApiTimeline = Omit<TimelineEvent, 'actorUserName' | 'description'> & { description?: string | null; actorUser?: { id: string; name: string } | null };

type ApiPatientDossier = Patient & {
  treatments: ApiTreatment[];
  appointments: ApiAppointment[];
  quotes: ApiQuote[];
  payments: ApiPayment[];
  followUps: ApiFollowUp[];
  timelineEvents: ApiTimeline[];
};

export type PatientDossier = {
  patient: Patient;
  treatments: Treatment[];
  appointments: Appointment[];
  budgets: Budget[];
  payments: Payment[];
  followUps: FollowUp[];
  timelineEvents: TimelineEvent[];
};

export type CreatePatientInput = {
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  allergies?: string;
  observations?: string;
  source?: string;
};

export type CreateAppointmentInput = {
  patientId: string;
  professionalId: string;
  roomId: string;
  scheduledAt: string;
  durationMinutes: number;
  procedureName: string;
  notes?: string;
};

function mapAppointment(value: ApiAppointment): Appointment {
  const scheduledAt = new Date(value.scheduledAt);
  return {
    ...value,
    patientName: value.patient.name,
    patientRecordNumber: value.patient.recordNumber,
    professionalName: value.professional.name,
    roomName: value.room.name,
    treatmentName: value.treatment?.name,
    time: scheduledAt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

export function listPatients(input: { search?: string; status?: PatientStatus; page?: number; limit?: number } = {}, signal?: AbortSignal) {
  const query = new URLSearchParams();
  if (input.search) query.set('search', input.search);
  if (input.status) query.set('status', input.status);
  query.set('page', String(input.page || 1));
  query.set('limit', String(input.limit || 20));
  return apiRequest<PatientListResponse>(`/api/patients?${query}`, { signal });
}

export function createPatient(input: CreatePatientInput) {
  return apiRequest<Patient>('/api/patients', { method: 'POST', body: JSON.stringify(input) });
}

export async function getPatientDossier(id: string, signal?: AbortSignal): Promise<PatientDossier> {
  const value = await apiRequest<ApiPatientDossier>(`/api/patients/${encodeURIComponent(id)}`, { signal });
  const lastAppointmentAt = value.appointments[0]?.scheduledAt;
  const activeTreatment = value.treatments.find((treatment) => treatment.status === 'ACTIVE');
  const nextFollowUp = value.followUps.find((followUp) => ['PENDENTE', 'EM_ANDAMENTO', 'ADIADO'].includes(followUp.status));
  const patient: Patient = {
    id: value.id,
    tenantId: value.tenantId,
    recordNumber: value.recordNumber,
    name: value.name,
    cpf: value.cpf,
    phone: value.phone,
    email: value.email,
    birthDate: value.birthDate,
    status: value.status,
    source: value.source,
    externalRef: value.externalRef,
    allergies: value.allergies,
    observations: value.observations,
    createdAt: value.createdAt,
    lastAppointmentAt,
    currentTreatment: activeTreatment?.name,
    responsibleName: activeTreatment?.responsibleUser?.name,
    nextAction: nextFollowUp?.nextAction || nextFollowUp?.reason,
  };
  return {
    patient,
    appointments: value.appointments.map(mapAppointment),
    treatments: value.treatments.map((treatment) => ({
      ...treatment,
      patientName: value.name,
      patientRecordNumber: value.recordNumber,
      responsibleUserName: treatment.responsibleUser?.name,
      totalValue: treatment.totalValue == null ? undefined : Number(treatment.totalValue),
    })),
    budgets: value.quotes.map((quote) => ({
      id: quote.id,
      tenantId: quote.tenantId,
      patientId: quote.patientId,
      patientName: value.name,
      patientRecordNumber: value.recordNumber,
      createdById: quote.createdById || undefined,
      treatmentTitle: quote.title,
      status: quote.status,
      totalAmount: Number(quote.totalAmount),
      discountAmount: Number(quote.discountAmount),
      finalAmount: Number(quote.finalAmount),
      paymentMethod: quote.paymentMethod || undefined,
      items: quote.items.map((item) => ({ ...item, unitPrice: Number(item.unitPrice), totalPrice: Number(item.totalPrice) })),
      sentAt: quote.sentAt || undefined,
      expiresAt: quote.expiresAt || undefined,
      acceptedAt: quote.acceptedAt || undefined,
      createdAt: quote.createdAt,
      daysInactive: Math.max(0, Math.floor((Date.now() - new Date(quote.updatedAt).getTime()) / 86_400_000)),
    })),
    payments: value.payments.map((payment) => ({
      ...payment,
      patientName: value.name,
      patientRecordNumber: value.recordNumber,
      referenceDescription: payment.category || payment.referenceType,
      category: payment.category || 'GERAL',
      amount: Number(payment.amount),
    })),
    followUps: value.followUps.map((followUp) => ({
      ...followUp,
      patientName: value.name,
      patientPhone: value.phone,
      patientRecordNumber: value.recordNumber,
      responsibleUserName: followUp.responsibleUser?.name,
    })),
    timelineEvents: value.timelineEvents.map((event) => ({
      ...event,
      description: event.description || '',
      actorUserName: event.actorUser?.name,
    })),
  };
}

export async function listAppointments(date: string, signal?: AbortSignal): Promise<Appointment[]> {
  const values = await apiRequest<ApiAppointment[]>(`/api/appointments?date=${encodeURIComponent(date)}`, { signal });
  return values.map(mapAppointment);
}

export function getSchedulingResources(signal?: AbortSignal) {
  return apiRequest<SchedulingResourcesResponse>('/api/scheduling-resources', { signal });
}

export async function createAppointment(input: CreateAppointmentInput): Promise<Appointment> {
  return mapAppointment(await apiRequest<ApiAppointment>('/api/appointments', { method: 'POST', body: JSON.stringify(input) }));
}

export function updateAppointmentStatus(id: string, status: AppointmentStatus, delayMinutes?: number) {
  return apiRequest(`/api/appointments/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, delayMinutes }),
  });
}

export function rescheduleAppointment(id: string, input: { scheduledAt: string; roomId?: string; professionalId?: string; durationMinutes?: number }) {
  return apiRequest(`/api/appointments/${encodeURIComponent(id)}/reschedule`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function listTreatments(input: { search?: string; status?: TreatmentStatus; page?: number; limit?: number } = {}, signal?: AbortSignal) {
  const query = new URLSearchParams();
  if (input.search) query.set('search', input.search);
  if (input.status) query.set('status', input.status);
  query.set('page', String(input.page || 1));
  query.set('limit', String(input.limit || 20));
  const response = await apiRequest<{ data: ApiTreatmentListItem[]; pagination: Pagination }>(`/api/treatments?${query}`, { signal });
  return {
    ...response,
    data: response.data.map((treatment): Treatment => ({
      ...treatment,
      patientName: treatment.patient.name,
      patientRecordNumber: treatment.patient.recordNumber,
      responsibleUserName: treatment.responsibleUser?.name,
      totalValue: treatment.totalValue == null ? undefined : Number(treatment.totalValue),
      lastAppointmentAt: treatment.appointments[0]?.scheduledAt,
      currentStageTitle: treatment.stages.find((stage) => !['COMPLETED', 'CANCELLED'].includes(stage.status))?.title,
    })),
  };
}

export function updateTreatmentStatus(id: string, status: TreatmentStatus, reason?: string) {
  return apiRequest(`/api/treatments/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, reason }),
  });
}

export function updateTreatmentStageStatus(id: string, status: Treatment['stages'][number]['status']) {
  return apiRequest(`/api/treatment-stages/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

function mapBudget(quote: ApiBudgetListItem): Budget {
  return {
    id: quote.id,
    tenantId: quote.tenantId,
    patientId: quote.patientId,
    patientName: quote.patient.name,
    patientRecordNumber: quote.patient.recordNumber,
    createdById: quote.createdById || undefined,
    createdByName: quote.createdBy?.name,
    treatmentTitle: quote.title,
    status: quote.status,
    totalAmount: Number(quote.totalAmount),
    discountAmount: Number(quote.discountAmount),
    finalAmount: Number(quote.finalAmount),
    paymentMethod: quote.paymentMethod || undefined,
    items: quote.items.map((item) => ({ ...item, quantity: Number(item.quantity), unitPrice: Number(item.unitPrice), totalPrice: Number(item.totalPrice) })),
    sentAt: quote.sentAt || undefined,
    expiresAt: quote.expiresAt || undefined,
    acceptedAt: quote.acceptedAt || undefined,
    createdAt: quote.createdAt,
    daysInactive: Math.max(0, Math.floor((Date.now() - new Date(quote.updatedAt).getTime()) / 86_400_000)),
  };
}

export async function listBudgets(input: { search?: string; status?: QuoteStatus; page?: number; limit?: number } = {}, signal?: AbortSignal) {
  const query = new URLSearchParams();
  if (input.search) query.set('search', input.search);
  if (input.status) query.set('status', input.status);
  query.set('page', String(input.page || 1));
  query.set('limit', String(input.limit || 20));
  const response = await apiRequest<{ data: ApiBudgetListItem[]; pagination: Pagination; metrics: BudgetMetrics }>(`/api/budgets?${query}`, { signal });
  return { ...response, data: response.data.map(mapBudget) };
}

export function approveBudget(id: string) {
  return apiRequest(`/api/budgets/${encodeURIComponent(id)}/approve`, { method: 'POST' });
}

export type OpportunityMetrics = { activePotential: number; counts: Record<OpportunityStatus, number> };

export async function listOpportunities(input: { search?: string; status?: OpportunityStatus; page?: number; limit?: number } = {}, signal?: AbortSignal) {
  const query = new URLSearchParams();
  if (input.search) query.set('search', input.search);
  if (input.status) query.set('status', input.status);
  query.set('page', String(input.page || 1));
  query.set('limit', String(input.limit || 20));
  const response = await apiRequest<{ data: ApiOpportunityListItem[]; pagination: Pagination; metrics: OpportunityMetrics }>(`/api/opportunities?${query}`, { signal });
  return {
    ...response,
    data: response.data.map((opportunity): Opportunity => ({
      ...opportunity,
      patientName: opportunity.patient.name,
      patientPhone: opportunity.patient.phone || undefined,
      assignedToName: opportunity.assignedTo?.name,
      potentialValue: opportunity.potentialValue == null ? undefined : Number(opportunity.potentialValue),
      treatmentTitle: opportunity.treatmentTitle || undefined,
    })),
  };
}

export function updateOpportunityStatus(id: string, status: OpportunityStatus, input: { nextStep?: string; reason?: string } = {}) {
  return apiRequest(`/api/opportunities/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status, ...input }),
  });
}

export type FollowUpMetrics = { pendingToday: number; categoryCounts: Record<FollowUpCategory, number> };
export type FollowUpAssignee = { id: string; name: string; role: string };
export type FollowUpAction =
  | { action: 'COMPLETE'; notes: string; outcome: 'CONTACTED' | 'RESCHEDULED' | 'RECOVERED' | 'NO_RESPONSE' | 'NOT_INTERESTED' }
  | { action: 'POSTPONE'; newDeadline: string; notes?: string }
  | { action: 'REASSIGN'; assigneeId: string; notes?: string }
  | { action: 'LOG_CONTACT'; notes: string; outcome?: 'CONTACTED' | 'RESCHEDULED' | 'RECOVERED' | 'NO_RESPONSE' | 'NOT_INTERESTED' };

export async function listFollowUps(input: { search?: string; category?: FollowUpCategory; status?: FollowUpStatus; focus?: string; page?: number; limit?: number } = {}, signal?: AbortSignal) {
  const query = new URLSearchParams();
  if (input.search) query.set('search', input.search);
  if (input.category) query.set('category', input.category);
  if (input.status) query.set('status', input.status);
  if (input.focus) query.set('focus', input.focus);
  query.set('page', String(input.page || 1));
  query.set('limit', String(input.limit || 20));
  const response = await apiRequest<{ data: ApiFollowUpListItem[]; pagination: Pagination; metrics: FollowUpMetrics; assignees: FollowUpAssignee[] }>(`/api/follow-ups?${query}`, { signal });
  return {
    ...response,
    data: response.data.map((followUp): FollowUp => ({
      ...followUp,
      patientName: followUp.patient.name,
      patientPhone: followUp.patient.phone || undefined,
      patientRecordNumber: followUp.patient.recordNumber,
      responsibleUserName: followUp.responsibleUser?.name,
    })),
  };
}

export function executeFollowUpAction(id: string, input: FollowUpAction) {
  return apiRequest(`/api/recovery/follow-ups/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}
