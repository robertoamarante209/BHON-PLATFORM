import { apiRequest } from './api';

export type TenantLifecycleStatus = 'ACTIVE' | 'SUSPENDED';

export type ProvisionClinicInput = {
  name: string;
  email: string;
  phone?: string;
  planCode?: string;
  ownerName: string;
  ownerLogin: string;
  temporaryPassword: string;
};

export function provisionClinic(input: ProvisionClinicInput) {
  return apiRequest<{ id: string; name: string; status: string }>('/tenants', {
    method: 'POST', body: JSON.stringify(input),
  });
}

export function updateClinicLifecycle(clinicId: string, status: TenantLifecycleStatus) {
  return apiRequest<{ id: string; status: TenantLifecycleStatus }>(`/tenants/${encodeURIComponent(clinicId)}/status`, {
    method: 'PATCH', body: JSON.stringify({ status }),
  });
}
