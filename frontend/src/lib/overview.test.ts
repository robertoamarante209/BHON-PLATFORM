import { describe, expect, it } from 'vitest';
import type { Appointment } from '../types';
import { agendaBriefing, prioritizeRecovery, recoverableQuotes, type RecoveryItem } from './overview';

const appointment = (id: string, status: Appointment['status'], time: string): Appointment => ({
  id, status, scheduledAt: `2026-09-14T${time}:00Z`, time, tenantId: 'clinic', patientId: 'same-patient',
  patientName: 'Ana', patientRecordNumber: '001', professionalId: 'dentist', professionalName: 'Dra. Maria',
  roomId: 'room', roomName: 'Sala 1', durationMinutes: 30, procedureName: 'Avaliação', delayMinutes: 0,
});
const recovery = (id: string, patch: Partial<RecoveryItem> = {}): RecoveryItem => ({
  id, sourceId: id, source: 'QUOTE', priority: 'HIGH', signal: 'Orçamento sem avanço', reason: 'Sem atualização',
  patient: { id: 'patient', name: 'Ana', recordNumber: '001', phone: null }, valueAtRisk: null,
  responsible: null, detectedAt: '2026-09-01T12:00:00Z', deadline: null, ageDays: 13,
  nextAction: 'Retomar contato', state: 'NO_RESPONSE', href: `/clinic/budgets?focus=${id}`, ...patch,
});

describe('daily briefing derivation', () => {
  it('orders by instant and separates appointments from distinct patients without treating past slots as next', () => {
    const input = [appointment('future', 'CONFIRMADO', '15:00'), appointment('missed', 'FALTA', '12:00'),
      appointment('past', 'AGUARDANDO_CONFIRMACAO', '13:00'), appointment('done', 'CONCLUIDO', '11:00')];
    const result = agendaBriefing(input, new Date('2026-09-14T14:00:00Z'));
    expect(result.appointments.map(item => item.id)).toEqual(['done', 'missed', 'past', 'future']);
    expect(result.patientCount).toBe(1);
    expect(result.next?.id).toBe('future');
    expect(result.pending.map(item => item.id)).toEqual(['past']);
    expect(result.missed.map(item => item.id)).toEqual(['missed']);
    expect(input[0].id).toBe('future');
  });
  it('does not invent a next appointment when only concluded, cancelled and elapsed slots remain', () => {
    expect(agendaBriefing([appointment('a', 'CANCELADO', '17:00'), appointment('b', 'CONCLUIDO', '18:00'),
      appointment('c', 'CONFIRMADO', '10:00')], new Date('2026-09-14T14:00:00Z')).next).toBeUndefined();
  });
  it('ranks urgency before deadline, value and age without changing the API collection', () => {
    const items = [recovery('small', { valueAtRisk: 100 }), recovery('old', { valueAtRisk: 500, ageDays: 20 }),
      recovery('urgent', { priority: 'URGENT' }), recovery('due', { deadline: '2026-09-13T12:00:00Z' }),
      recovery('new', { valueAtRisk: 500, ageDays: 2 })];
    expect(prioritizeRecovery(items).map(item => item.id)).toEqual(['urgent', 'due', 'old', 'new', 'small']);
    expect(items[0].id).toBe('small');
  });
  it('counts quote potential once and excludes treatment totals, receivables and unknown money', () => {
    expect(recoverableQuotes([recovery('quote', { valueAtRisk: 500 }), recovery('quote', { valueAtRisk: 500 }),
      recovery('unknown'), recovery('treatment', { source: 'TREATMENT', valueAtRisk: 9000 }),
      recovery('payment', { source: 'PAYMENT', valueAtRisk: 200 })])).toEqual({ value: 500, count: 2, unknown: 1 });
  });
});
