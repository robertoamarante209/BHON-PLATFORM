import { apiRequest } from './api';

export type SarahOpportunity = {
  id: string;
  patientId: string;
  sourceType: string;
  sourceId: string;
  priorityScore: number;
  estimatedValue: number;
  stage: string;
  nextActionAt: string | null;
  closedReason: string | null;
  patient: { id: string; name: string; phone: string | null } | null;
  consentStatus: string;
  outboundEligible: boolean;
  activeSequence: { id: string; step: number; status: string; scheduledAt: string | null } | null;
  events: { id: string; sequenceId: string | null; channel: string; direction: string; kind: string; contentRedacted: string | null; actorType: string; occurredAt: string }[];
};
export type SarahTemplate = { id: string; text: string };
export type SarahQueue = { data: SarahOpportunity[]; draftTemplates: SarahTemplate[] };
export type ConsentSource = 'SIGNED_FORM' | 'IN_PERSON' | 'WHATSAPP' | 'PHONE';
export const listSarahOpportunities = (signal?: AbortSignal) => apiRequest<SarahQueue>('/api/recovery/opportunities', { signal });
export const prepareSarahDraft = (id: string, text: string) => apiRequest<{ success: true; data: { id: string; text: string; kind: string; occurredAt: string } }>(
  `/api/recovery/${encodeURIComponent(id)}/drafts`, { method: 'POST', body: JSON.stringify({ text, reviewed: true }) },
);
export const changeSarahOpportunity = (id: string, action: 'handoff' | 'opt-out') => apiRequest(
  `/api/recovery/${encodeURIComponent(id)}/${action}`, { method: 'POST' },
);
export const recordSarahConsent = (patientId: string, source: ConsentSource, policyVersion: string) => apiRequest('/api/recovery/consents', {
  method: 'POST', body: JSON.stringify({ patientId, channel: 'WHATSAPP', purpose: 'RECOVERY', explicit: true, source, policyVersion }),
});

export function sarahQueueState(item: SarahOpportunity): 'Agir agora' | 'Sarah conduzindo' | 'Encerrado' {
  if (item.stage === 'ENDED') return 'Encerrado';
  if (['ACTION_REQUIRED', 'HUMAN_HANDOFF'].includes(item.stage) || !item.outboundEligible || item.activeSequence?.status !== 'ACTIVE') return 'Agir agora';
  return 'Sarah conduzindo';
}

export function manualWhatsAppUrl(phone: string | null | undefined, draft: string): string | null {
  if (!phone || !/^[+\d\s().-]+$/.test(phone)) return null;
  let digits = phone.replace(/\D/g, '');
  if (!phone.trim().startsWith('+') && (digits.length === 10 || digits.length === 11)) digits = `55${digits}`;
  if (!/^55[1-9]\d\d{8,9}$/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(draft)}`;
}

// Never render arbitrary event payloads, even when their field is named redacted.
export function sarahEventSummary(kind: string): string {
  const labels: Record<string, string> = {
    DRAFT_REVIEWED: 'Rascunho comercial revisado pela equipe.',
    HANDOFF: 'Oportunidade transferida para atendimento humano.',
    OPT_OUT: 'Recusa de contato registrada.',
  };
  return labels[kind] ?? 'Atualização registrada no histórico.';
}
