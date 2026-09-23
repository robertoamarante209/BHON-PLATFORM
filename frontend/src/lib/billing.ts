import { apiRequest } from './api';

export type TrialSignupInput = {
  clinicName: string; ownerName: string; ownerEmail: string; username: string; password: string; phone: string;
  billingCycle: 'MONTHLY' | 'ANNUAL'; termsVersion: string; privacyVersion: string; acceptedTerms: boolean; acceptedPrivacy: boolean;
};

export const startTrial = (input: TrialSignupInput) => apiRequest<{ id: string; next: 'CHECKOUT' }>('/public/trials', { method: 'POST', body: JSON.stringify(input) });
export const startCheckout = (id: string) => apiRequest<{ checkoutUrl: string }>(`/public/trials/${encodeURIComponent(id)}/checkout`, { method: 'POST' });
