import { apiRequest } from './api';

export type ClinicTicket = { id: string; title: string; description: string; priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'; status: 'OPEN' | 'IN_PROGRESS' | 'WAITING' | 'RESOLVED'; createdAt: string };
export const listSupportTickets = () => apiRequest<ClinicTicket[]>('/api/support/tickets');
export const createSupportTicket = (input: Pick<ClinicTicket, 'title' | 'description' | 'priority'>) => apiRequest<ClinicTicket>('/api/support/tickets', { method: 'POST', body: JSON.stringify(input) });
