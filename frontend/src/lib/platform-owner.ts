import { apiRequest } from './api';
import { PlatformClinic, PlatformInvoice, SubscriptionPlan, SupportTicket } from '../types';

type TenantResponse = {
  id: string; name: string; email: string; phone: string | null; status: 'ACTIVE' | 'TEST' | 'PAYMENT_PENDING' | 'SUSPENDED' | 'CANCELLED'; planCode: string; createdAt: string; updatedAt: string;
  users: Array<{ id: string; name: string; email: string; phone: string | null }>;
  _count: { users: number; patients: number };
  subscriptions: Array<{ status: string; billingCycle: string; amount: number | string; renewalDate: string; plan: { name: string } }>;
  platformInvoices: Array<{ id: string; invoiceNumber: string; amount: number | string; dueDate: string; paidAt: string | null; status: 'PAGO' | 'PENDENTE' | 'ATRASADO' | 'CANCELADO'; paymentMethod: string | null; subscription: { plan: { name: string }; renewalDate: string } }>;
  integrationConnections: Array<{ provider: string; status: string; updatedAt: string }>;
};

type TicketResponse = {
  id: string; tenantId: string; openedByUserId: string; assignedToUserId: string | null; title: string; description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED'; createdAt: string; resolvedAt: string | null;
  tenant: { id: string; name: string }; openedByUser: { id: string; name: string }; assignedToUser: { id: string; name: string } | null;
};

const platformStatus: Record<TenantResponse['status'], PlatformClinic['status']> = {
  ACTIVE: 'ATIVA', TEST: 'TESTE', PAYMENT_PENDING: 'PAGAMENTO_PENDENTE', SUSPENDED: 'SUSPENSA', CANCELLED: 'CANCELADA',
};

const dateLabel = (value: string | null | undefined) => value ? new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)) : '—';

export type PlatformConnection = { clinicId: string; clinicName: string; clinicPhone?: string; ownerPhone?: string; status: string; updatedAt?: string };

export const loadPlatformOwnerData = async (): Promise<{ clinics: PlatformClinic[]; invoices: PlatformInvoice[]; connections: PlatformConnection[] }> => {
  const tenants = await apiRequest<TenantResponse[]>('/tenants');
  const invoices: PlatformInvoice[] = [];
  const connections: PlatformConnection[] = [];
  const clinics = tenants.map((tenant) => {
    const owner = tenant.users[0];
    const subscription = tenant.subscriptions[0];
    const whatsapp = tenant.integrationConnections.find((connection) => connection.provider === 'WHATSAPP');
    tenant.platformInvoices.forEach((invoice) => invoices.push({
      id: invoice.id, clinicId: tenant.id, clinicName: tenant.name, planName: invoice.subscription.plan.name,
      invoiceNumber: invoice.invoiceNumber, amount: Number(invoice.amount), dueDate: dateLabel(invoice.dueDate),
      paidAt: invoice.paidAt || undefined, status: invoice.status, paymentMethod: invoice.paymentMethod || undefined,
      lastPaymentDate: dateLabel(invoice.paidAt), nextBillingDate: dateLabel(invoice.subscription.renewalDate),
    }));
    connections.push({ clinicId: tenant.id, clinicName: tenant.name, clinicPhone: tenant.phone || undefined, ownerPhone: owner?.phone || undefined, status: whatsapp?.status || 'NOT_CONFIGURED', updatedAt: whatsapp?.updatedAt });
    return {
      id: tenant.id, name: tenant.name, ownerName: owner?.name || 'Responsável não definido', ownerEmail: owner?.email || tenant.email,
      planName: subscription?.plan.name || tenant.planCode, status: platformStatus[tenant.status], usersCount: tenant._count.users,
      patientsCount: tenant._count.patients, lastActivityAt: dateLabel(tenant.updatedAt), nextBillingDate: dateLabel(subscription?.renewalDate),
      mrr: subscription ? Number(subscription.amount) : 0, createdAt: tenant.createdAt,
      secretaryStatus: whatsapp?.status || 'NOT_CONFIGURED', clinicPhone: tenant.phone || undefined, ownerPhone: owner?.phone || undefined,
    };
  });
  return { clinics, invoices, connections };
};

export const loadPlatformTickets = async (): Promise<SupportTicket[]> => {
  const tickets = await apiRequest<TicketResponse[]>('/api/support/tickets');
  return tickets.map((ticket) => ({
    id: ticket.id, clinicId: ticket.tenantId, clinicName: ticket.tenant.name, openedByUserId: ticket.openedByUserId,
    openedByUserName: ticket.openedByUser.name, title: ticket.title, description: ticket.description,
    priority: ticket.priority === 'URGENT' ? 'CRITICAL' : ticket.priority, status: ticket.status,
    assignedToUserId: ticket.assignedToUserId || undefined, assignedToUserName: ticket.assignedToUser?.name,
    createdAt: ticket.createdAt, resolvedAt: ticket.resolvedAt || undefined,
  }));
};

export const updatePlatformTicket = (ticketId: string, status: SupportTicket['status']) =>
  apiRequest<unknown>(`/api/support/tickets/${encodeURIComponent(ticketId)}`, { method: 'PATCH', body: JSON.stringify({ status }) });

export const loadSubscriptionPlans = () => apiRequest<SubscriptionPlan[]>('/subscription-plans');
