import { apiRequest } from './api';

export type ActivationStepKey = 'PROFILE' | 'PATIENTS' | 'TEAM' | 'AGENDA' | 'OPPORTUNITY' | 'SARAH_MESSAGE';
export type ActivationEventType = 'ONBOARDING_OPENED' | 'CSV_TEMPLATE_DOWNLOADED' | 'PATIENT_IMPORT_COMPLETED' | 'DEMO_LOADED' | 'DEMO_REMOVED' | 'TEAM_CREATED' | 'AGENDA_OPENED' | 'OPPORTUNITY_PRIORITIZED' | 'SARAH_MESSAGE_PREPARED';

export type ActivationSnapshot = {
  dismissed: boolean;
  completedSteps: number;
  totalSteps: number;
  steps: Array<{ key: ActivationStepKey; complete: boolean }>;
  nextStep: { key: ActivationStepKey; complete: boolean } | null;
  eventContract: { acceptsOnly: readonly ActivationEventType[] };
};

export function getActivationSnapshot() {
  return apiRequest<ActivationSnapshot>('/api/onboarding');
}

export function completeActivationStep(step: ActivationStepKey) {
  return apiRequest<ActivationSnapshot>(`/api/onboarding/steps/${step}`, { method: 'PATCH', body: JSON.stringify({ completed: true }) });
}

export function dismissActivation(dismissed: boolean) {
  return apiRequest<ActivationSnapshot>('/api/onboarding', { method: 'PATCH', body: JSON.stringify({ dismissed }) });
}

export function trackActivationEvent(type: ActivationEventType) {
  return apiRequest<{ ok: true }>('/api/onboarding/events', { method: 'POST', body: JSON.stringify({ type }) });
}

export function loadDemoClinic() {
  return apiRequest<{ snapshot: ActivationSnapshot }>('/api/onboarding/demo', { method: 'POST' });
}

export function removeDemoClinic() {
  return apiRequest<{ snapshot: ActivationSnapshot }>('/api/onboarding/demo', { method: 'DELETE' });
}
