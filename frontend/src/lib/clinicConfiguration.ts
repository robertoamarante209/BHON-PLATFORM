import { apiRequest } from './api';
import type { User } from '../types';

export type AvailabilityInterval = { dayOfWeek: number; start: string; end: string };
export type Availability = { professionalId: string | null; intervals: AvailabilityInterval[]; version: number };
export type Protocol = { id: string; title: string; description: string | null; steps: string[]; isActive: boolean; version: number };
export type ProtocolInput = Pick<Protocol, 'title' | 'description' | 'steps' | 'isActive'> & { version?: number };

export function canManageClinicConfiguration(user: Pick<User, 'role' | 'permissions'>) {
  return user.role === 'OWNER' || user.role === 'PLATFORM_OWNER' || (user.role === 'MANAGER' && !Array.isArray(user.permissions)) || (Array.isArray(user.permissions) && user.permissions.includes('team.manage'));
}
export const getAvailability = (professionalId?: string, signal?: AbortSignal) => apiRequest<Availability | null>(`/api/settings/availability${professionalId ? `?professionalId=${encodeURIComponent(professionalId)}` : ''}`, { signal });
export const getAvailabilityProfessionals = (signal?: AbortSignal) => apiRequest<Array<{ id: string; name: string }>>('/api/settings/availability/professionals', { signal });
export const saveAvailability = (value: Availability) => apiRequest<Availability>(`/api/settings/availability${value.professionalId ? `?professionalId=${encodeURIComponent(value.professionalId)}` : ''}`, { method: 'PUT', body: JSON.stringify({ intervals: value.intervals, version: value.version }) });
export const getProtocols = (signal?: AbortSignal) => apiRequest<Protocol[]>('/api/settings/protocols', { signal });
export const createProtocol = (value: ProtocolInput) => apiRequest<Protocol>('/api/settings/protocols', { method: 'POST', body: JSON.stringify(value) });
export const updateProtocol = (id: string, value: ProtocolInput) => apiRequest<Protocol>(`/api/settings/protocols/${id}`, { method: 'PATCH', body: JSON.stringify(value) });
