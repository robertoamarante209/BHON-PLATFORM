import type { Appointment, AppointmentStatus, Budget, FollowUp, Patient, PatientStatus, Payment, Room, TimelineEvent, Treatment } from '../types';
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

type ApiPayment = Omit<Payment, 'patientName' | 'patientRecordNumber' | 'referenceDescription' | 'amount'> & { amount: string | number };
type ApiFollowUp = Omit<FollowUp, 'patientName' | 'patientPhone' | 'patientRecordNumber' | 'responsibleUserName'> & { responsibleUser?: { id: string; name: string } | null };
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

