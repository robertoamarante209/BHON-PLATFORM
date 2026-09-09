import { describe, expect, it } from 'vitest';
import { clinicCalendarDate, formatClinicTime, zonedLocalDateTimeToIso } from './datetime';

describe('horário clínico', () => {
  it('mantém data e hora no fuso de São Paulo, independentemente do navegador', () => {
    expect(clinicCalendarDate(new Date('2026-09-10T02:30:00.000Z'), 'America/Sao_Paulo')).toBe('2026-09-09');
    expect(zonedLocalDateTimeToIso('2026-09-09', '14:30', 'America/Sao_Paulo')).toBe('2026-09-09T17:30:00.000Z');
    expect(formatClinicTime('2026-09-09T17:30:00.000Z', 'America/Sao_Paulo')).toBe('14:30');
  });
});
