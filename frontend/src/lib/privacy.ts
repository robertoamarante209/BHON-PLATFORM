import { apiRequest } from './api';

export type ContactPreferenceStatus = 'NOT_INFORMED' | 'ALLOWED' | 'REFUSED';
export type ContactPreferences = { patientId: string; whatsapp: ContactPreferenceStatus; phone: ContactPreferenceStatus; email: ContactPreferenceStatus; source: string | null; recordedAt: string | null };
export type PrivacyRequest = { id: string; patientId: string | null; type: string; status: string; summary: string; dueAt: string | null; createdAt: string };
export type PrivacyIncident = { id: string; status: string; systemArea: string; impactLevel: string; summary: string; actionsTaken: string | null; createdAt: string };

export const getContactPreferences = (patientId: string, signal?: AbortSignal) => apiRequest<ContactPreferences>(`/api/patients/${patientId}/contact-preferences`, { signal });
export const saveContactPreferences = (patientId: string, input: Partial<Pick<ContactPreferences, 'whatsapp' | 'phone' | 'email' | 'source'>>) => apiRequest<ContactPreferences>(`/api/patients/${patientId}/contact-preferences`, { method: 'PATCH', body: JSON.stringify(input) });
export const listPrivacyRequests = () => apiRequest<PrivacyRequest[]>('/api/privacy-requests');
export const createPrivacyRequest = (input: { type: string; summary: string; patientId?: string; dueAt?: string }) => apiRequest<PrivacyRequest>('/api/privacy-requests', { method: 'POST', body: JSON.stringify(input) });
export const updatePrivacyRequest = (id: string, status: string) => apiRequest<PrivacyRequest>(`/api/privacy-requests/${id}`, { method: 'PATCH', body: JSON.stringify({ status }) });
export const listPrivacyIncidents = () => apiRequest<PrivacyIncident[]>('/api/privacy-incidents');
export const createPrivacyIncident = (input: { systemArea: string; impactLevel: string; summary: string; actionsTaken?: string }) => apiRequest<PrivacyIncident>('/api/privacy-incidents', { method: 'POST', body: JSON.stringify(input) });
export const updatePrivacyIncident = (id: string, status: string, actionsTaken?: string) => apiRequest<PrivacyIncident>(`/api/privacy-incidents/${id}`, { method: 'PATCH', body: JSON.stringify({ status, ...(actionsTaken !== undefined ? { actionsTaken } : {}) }) });
