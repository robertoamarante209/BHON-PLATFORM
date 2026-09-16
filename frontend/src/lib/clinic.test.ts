import { describe, expect, it, vi } from 'vitest';
import { getPatientDossier } from './clinic';

const apiRequest = vi.hoisted(() => vi.fn());

vi.mock('./api', () => ({ apiRequest }));

describe('getPatientDossier', () => {
  it('preserva os dados do paciente quando um agendamento do prontuário não traz patient aninhado', async () => {
    apiRequest.mockResolvedValueOnce({
      id: 'patient-1', tenantId: 'tenant-1', recordNumber: '#00001', name: 'Paciente Validação',
      status: 'ACTIVE', createdAt: '2026-09-16T12:00:00.000Z', treatments: [], quotes: [], payments: [], followUps: [], timelineEvents: [],
      appointments: [{
        id: 'appointment-1', tenantId: 'tenant-1', patientId: 'patient-1', professionalId: 'professional-1', roomId: 'room-1',
        scheduledAt: '2026-09-16T14:00:00.000Z', durationMinutes: 30, procedureName: 'Avaliação', status: 'CONFIRMADO', createdAt: '2026-09-16T12:00:00.000Z', updatedAt: '2026-09-16T12:00:00.000Z',
        professional: { id: 'professional-1', name: 'Dra. Ana' }, room: { id: 'room-1', name: 'Sala 1' },
      }],
    });

    const dossier = await getPatientDossier('patient-1');

    expect(dossier.patient.name).toBe('Paciente Validação');
    expect(dossier.appointments[0]).toMatchObject({ patientName: 'Paciente Validação', patientRecordNumber: '#00001' });
  });
});
