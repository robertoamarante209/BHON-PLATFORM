import { apiRequest } from './api';

export type InventoryItem = {
  id: string; name: string; sku?: string | null; category?: string | null; unit: string;
  currentStock: string | number; minimumStock: string | number; unitCost?: string | number | null;
};
export type ClinicDocument = {
  id: string; title: string; category: string; fileName: string; url: string; mimeType?: string | null; createdAt: string;
  patient?: { id: string; name: string; recordNumber: string } | null;
};
export type IntegrationConnection = {
  id?: string; provider: 'WHATSAPP' | 'GOOGLE_CALENDAR' | 'NFE'; displayName?: string | null;
  status: 'NOT_CONFIGURED' | 'PENDING' | 'CONNECTED' | 'ERROR' | 'DISABLED'; configuration?: Record<string, string> | null;
};

export const listInventory = (signal?: AbortSignal) => apiRequest<InventoryItem[]>('/api/inventory', { signal });
export const createInventoryItem = (input: { name: string; sku?: string; category?: string; unit?: string; currentStock?: number; minimumStock?: number; unitCost?: number }) =>
  apiRequest<InventoryItem>('/api/inventory', { method: 'POST', body: JSON.stringify(input) });
export const moveInventory = (id: string, input: { type: 'ENTRY' | 'EXIT'; quantity: number; reason?: string }) =>
  apiRequest<InventoryItem>(`/api/inventory/${encodeURIComponent(id)}/movements`, { method: 'POST', body: JSON.stringify(input) });

export const listDocuments = (signal?: AbortSignal) => apiRequest<ClinicDocument[]>('/api/documents', { signal });
export const createDocument = (input: { title: string; category: string; fileName: string; url: string; mimeType?: string; patientId?: string }) =>
  apiRequest<ClinicDocument>('/api/documents', { method: 'POST', body: JSON.stringify(input) });

export const listIntegrations = (signal?: AbortSignal) => apiRequest<IntegrationConnection[]>('/api/integrations', { signal });
export const configureIntegration = (provider: IntegrationConnection['provider'], input: { displayName?: string; accountLabel?: string; clinicPhone?: string }) =>
  apiRequest<IntegrationConnection>(`/api/integrations/${provider}`, { method: 'PUT', body: JSON.stringify(input) });
