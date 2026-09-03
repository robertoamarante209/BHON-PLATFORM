export type UserRole =
  | 'PLATFORM_OWNER'
  | 'OWNER'
  | 'ADMIN'
  | 'MANAGER'
  | 'DENTIST'
  | 'RECEPTIONIST'
  | 'FINANCIAL'
  | 'VIEWER';

export type UserStatus = 'ACTIVE' | 'INACTIVE' | 'BLOCKED';

export interface User {
  id: string;
  tenantId: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  specialty?: string;
  cro?: string;
  phone?: string;
  avatarUrl?: string;
  workloadHours?: number;
  currentRoomId?: string;
  lastLoginAt?: string;
}

export type TenantStatus = 'ACTIVE' | 'TEST' | 'PAYMENT_PENDING' | 'SUSPENDED' | 'CANCELLED';

export interface Tenant {
  id: string;
  name: string;
  tradeName?: string;
  slug: string;
  email: string;
  phone?: string;
  status: TenantStatus;
  planCode: string;
  createdAt: string;
  activeRoomsCount: number;
}

export interface Room {
  id: string;
  tenantId: string;
  name: string;
  orderIndex: number;
  isActive: boolean;
  description?: string;
}

export type PatientStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';

export interface Patient {
  id: string;
  tenantId: string;
  recordNumber: string; // Ex: #03945
  name: string;
  cpf?: string;
  phone?: string;
  email?: string;
  birthDate?: string;
  status: PatientStatus;
  source?: string;
  externalRef?: string;
  allergies?: string;
  observations?: string;
  createdAt: string;
  lastAppointmentAt?: string;
  currentTreatment?: string;
  responsibleName?: string;
  nextAction?: string;
}

export type AppointmentStatus =
  | 'CONFIRMADO'
  | 'AGUARDANDO_CONFIRMACAO'
  | 'NA_RECEPCAO'
  | 'EM_ATENDIMENTO'
  | 'CONCLUIDO'
  | 'ATRASADO'
  | 'FALTA'
  | 'CANCELADO'
  | 'ENCAIXE';

export interface Appointment {
  id: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  patientRecordNumber: string;
  professionalId: string;
  professionalName: string;
  roomId: string;
  roomName: string;
  treatmentId?: string;
  treatmentName?: string;
  treatmentStageId?: string;
  treatmentStageTitle?: string;
  scheduledAt: string; // ISO string
  time: string; // HH:mm format
  durationMinutes: number;
  procedureName: string;
  status: AppointmentStatus;
  delayMinutes: number;
  notes?: string;
}

export type TreatmentStatus =
  | 'LEAD'
  | 'QUOTED'
  | 'PENDING'
  | 'ACTIVE'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'PAUSED'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'ABANDONED'
  | 'RISK_OF_ABANDONMENT';

export interface TreatmentStage {
  id: string;
  tenantId: string;
  treatmentId: string;
  stageNumber: number;
  title: string;
  description?: string;
  status: 'PENDING' | 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  plannedDate?: string;
  completedDate?: string;
}

export interface Treatment {
  id: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  patientRecordNumber: string;
  responsibleUserId?: string;
  responsibleUserName?: string;
  name: string;
  description?: string;
  totalValue?: number;
  status: TreatmentStatus;
  progressPercent: number;
  stagesCount: number;
  completedStagesCount: number;
  currentStageTitle?: string;
  nextStageDate?: string;
  startedAt?: string;
  completedAt?: string;
  lastAppointmentAt?: string;
  stages: TreatmentStage[];
}

export type OpportunityStatus =
  | 'NEW_CONTACT'
  | 'TRIAGEM'
  | 'AVALIACAO'
  | 'PLANO_APRESENTADO'
  | 'ORCAMENTO'
  | 'NEGOCIACAO'
  | 'CONVERTIDO'
  | 'PERDIDO';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Opportunity {
  id: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  assignedToId?: string;
  assignedToName?: string;
  source?: string;
  treatmentTitle?: string;
  potentialValue?: number;
  status: OpportunityStatus;
  priority: Priority;
  daysInactive: number;
  nextStep?: string;
  lastContactAt?: string;
  createdAt: string;
}

export type FollowUpCategory =
  | 'POS_OPERATORIO'
  | 'CONFIRMACAO'
  | 'RETORNO'
  | 'ORCAMENTO'
  | 'TRATAMENTO'
  | 'REATIVACAO'
  | 'PENDENCIA_CLINICA';

export type FollowUpStatus = 'PENDENTE' | 'EM_ANDAMENTO' | 'CONCLUIDO' | 'ADIADO' | 'CANCELADO';

export interface FollowUp {
  id: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  patientPhone?: string;
  patientRecordNumber?: string;
  appointmentId?: string;
  responsibleUserId?: string;
  responsibleUserName?: string;
  category: FollowUpCategory;
  reason: string;
  priority: Priority;
  status: FollowUpStatus;
  deadlineAt: string;
  lastContactAt?: string;
  nextAction?: string;
  notes?: string;
  createdAt: string;
}

export type QuoteStatus =
  | 'DRAFT'
  | 'SENT'
  | 'VIEWED'
  | 'NEGOTIATING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'EXPIRED'
  | 'NO_RESPONSE';

export interface BudgetItem {
  id: string;
  quoteId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Budget {
  id: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  patientRecordNumber: string;
  createdById?: string;
  createdByName?: string;
  treatmentTitle: string;
  status: QuoteStatus;
  totalAmount: number;
  discountAmount: number;
  finalAmount: number;
  paymentMethod?: string;
  items: BudgetItem[];
  sentAt?: string;
  expiresAt?: string;
  acceptedAt?: string;
  createdAt: string;
  daysInactive: number;
}

export type PaymentStatus = 'PAGO' | 'PENDENTE' | 'ATRASADO' | 'PARCIAL' | 'CANCELADO';

export interface Payment {
  id: string;
  tenantId: string;
  patientId: string;
  patientName: string;
  patientRecordNumber: string;
  quoteId?: string;
  treatmentId?: string;
  referenceType: string;
  referenceDescription: string;
  category: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  paymentMethod?: string;
  status: PaymentStatus;
  notes?: string;
}

export interface FinancialTransaction {
  id: string;
  tenantId: string;
  type: 'RECEITA' | 'DESPESA';
  category: string;
  description: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: PaymentStatus;
}

export interface TeamMember {
  id: string;
  name: string;
  role: UserRole;
  roleLabel: string;
  specialty?: string;
  cro?: string;
  phone?: string;
  todayAppointmentsCount: number;
  completedAppointmentsCount: number;
  currentRoomName?: string;
  status: 'ATIVO' | 'EM_ATENDIMENTO' | 'DISPONIVEL' | 'PAUSA' | 'INDISPONIVEL';
  workloadHours: number;
}

export interface Notification {
  id: string;
  tenantId: string;
  userId: string;
  type: 'MISSED_APPOINTMENT' | 'OVERDUE_FOLLOWUP' | 'INACTIVE_BUDGET' | 'OVERDUE_PAYMENT' | 'TREATMENT_RISK' | 'OPERATIONAL_EXCEPTION';
  title: string;
  message: string;
  link?: string;
  read: boolean;
  priority: Priority;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  actorUserId?: string;
  actorUserName?: string;
  action: string;
  resource: string;
  resourceId?: string;
  metadata?: any;
  createdAt: string;
}

export interface TimelineEvent {
  id: string;
  tenantId: string;
  patientId: string;
  actorUserId?: string;
  actorUserName?: string;
  type: string;
  description: string;
  metadata?: any;
  createdAt: string;
}

// Modelos do Mantenedor da Plataforma BHON (Platform Owner)
export interface PlatformClinic {
  id: string;
  name: string;
  ownerName: string;
  ownerEmail: string;
  planName: string;
  status: 'ATIVA' | 'TESTE' | 'PAGAMENTO_PENDENTE' | 'SUSPENSA' | 'CANCELADA';
  usersCount: number;
  patientsCount: number;
  lastActivityAt: string;
  nextBillingDate: string;
  mrr: number;
  createdAt: string;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  code: string;
  maxProfessionals: number;
  maxRooms: number;
  monthlyPrice: number;
  annualPrice: number;
  features: string[];
  isActive: boolean;
}

export interface PlatformInvoice {
  id: string;
  clinicId: string;
  clinicName: string;
  planName: string;
  invoiceNumber: string;
  amount: number;
  dueDate: string;
  paidAt?: string;
  status: 'PAGO' | 'PENDENTE' | 'ATRASADO' | 'CANCELADO';
  paymentMethod?: string;
  lastPaymentDate?: string;
  nextBillingDate: string;
}

export interface SupportTicket {
  id: string;
  clinicId: string;
  clinicName: string;
  openedByUserId: string;
  openedByUserName: string;
  title: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED';
  assignedToUserId?: string;
  assignedToUserName?: string;
  createdAt: string;
  resolvedAt?: string;
}
