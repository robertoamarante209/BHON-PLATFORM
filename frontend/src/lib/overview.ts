import type { Appointment } from '../types';

/** Fields returned by the tenant-scoped recovery endpoint used in the briefing. */
export type RecoveryItem = {
  id: string; sourceId: string; source: 'FOLLOW_UP' | 'QUOTE' | 'OPPORTUNITY' | 'TREATMENT' | 'PAYMENT';
  priority: 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW'; signal: string; reason: string;
  patient: { id: string; name: string; recordNumber: string; phone: string | null };
  valueAtRisk: number | null; responsible: { id: string; name: string } | null;
  detectedAt: string; deadline: string | null; ageDays: number; nextAction: string; state: string; href: string;
};

export function agendaBriefing(items: Appointment[], now = new Date()) {
  const appointments = [...items].sort((a, b) => Date.parse(a.scheduledAt) - Date.parse(b.scheduledAt));
  return {
    appointments,
    patientCount: new Set(appointments.map(item => item.patientId)).size,
    pending: appointments.filter(item => item.status === 'AGUARDANDO_CONFIRMACAO'),
    missed: appointments.filter(item => item.status === 'FALTA'),
    inProgress: appointments.filter(item => item.status === 'EM_ATENDIMENTO').length,
    reception: appointments.filter(item => item.status === 'NA_RECEPCAO').length,
    next: appointments.find(item => ['CONFIRMADO', 'AGUARDANDO_CONFIRMACAO', 'ENCAIXE'].includes(item.status)
      && Date.parse(item.scheduledAt) >= now.getTime()),
  };
}

export function prioritizeRecovery(items: RecoveryItem[]) {
  const rank = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };
  return [...items].sort((a, b) => rank[b.priority] - rank[a.priority]
    || (a.deadline ? Date.parse(a.deadline) : Infinity) - (b.deadline ? Date.parse(b.deadline) : Infinity)
    || (b.valueAtRisk ?? 0) - (a.valueAtRisk ?? 0) || b.ageDays - a.ageDays);
}

export function recoverableQuotes(items: RecoveryItem[]) {
  const quotes = [...new Map(items.filter(item => item.source === 'QUOTE').map(item => [item.sourceId, item])).values()];
  const known = quotes.filter(item => item.valueAtRisk !== null && Number.isFinite(item.valueAtRisk) && item.valueAtRisk >= 0);
  return { value: known.reduce((sum, item) => sum + item.valueAtRisk!, 0), count: quotes.length, unknown: quotes.length - known.length };
}
