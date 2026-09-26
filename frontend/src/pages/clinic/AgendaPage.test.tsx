import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgendaPage } from './AgendaPage';

const api = vi.hoisted(() => ({
  createAppointment: vi.fn(),
  getSchedulingResources: vi.fn(),
  listAppointments: vi.fn(),
  listPatients: vi.fn(),
  updateAppointmentStatus: vi.fn(),
  rescheduleAppointment: vi.fn(),
}));

const route = vi.hoisted(() => ({ search: '', navigate: vi.fn() }));
vi.mock('wouter', () => ({ useLocation: () => ['/clinic/agenda', route.navigate], useSearch: () => route.search }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ currentUser: { role: 'RECEPTIONIST' } }) }));
vi.mock('../../lib/clinic', () => ({
  ...api,
  appointmentTransitions: {
    CONFIRMADO: ['NA_RECEPCAO', 'CANCELADO', 'FALTA', 'ENCAIXE'],
    AGUARDANDO_CONFIRMACAO: ['CONFIRMADO', 'NA_RECEPCAO', 'CANCELADO', 'FALTA'],
  },
}));

describe('AgendaPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    route.search = '';
    api.listAppointments.mockResolvedValue([]);
    api.getSchedulingResources.mockResolvedValue({
      rooms: [{ id: 'room-1', tenantId: 'tenant-1', name: 'Consultório 01', orderIndex: 1, isActive: true }],
      professionals: [{ id: 'user-1', name: 'Profissional', role: 'OWNER' }],
    });
    api.listPatients.mockResolvedValue({
      data: [{ id: 'patient-1', tenantId: 'tenant-1', recordNumber: '#00001', name: 'Paciente real', status: 'ACTIVE', createdAt: '2026-09-09T00:00:00.000Z' }],
      pagination: { page: 1, limit: 50, total: 1, totalPages: 1 },
    });
    api.createAppointment.mockResolvedValue({ id: 'appointment-1' });
  });

  it('reacts to date and focus query changes while mounted and ignores stale responses', async () => {
    let finishOld!: (value: unknown[]) => void;
    api.listAppointments.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; }));
    route.search = '?date=2099-10-10';
    const view = render(<AgendaPage />);
    route.search = '?date=2099-10-11&focus=appointment-b';
    api.listAppointments.mockResolvedValue([{ id: 'appointment-b', patientId: 'patient-1', patientName: 'Paciente do dia', patientRecordNumber: '001', professionalId: 'user-1', professionalName: 'Profissional', roomId: 'room-1', roomName: 'Sala', scheduledAt: '2099-10-11T12:15:00Z', time: '09:15', durationMinutes: 45, procedureName: 'Retorno', status: 'CONFIRMADO', delayMinutes: 0 }]);
    view.rerender(<AgendaPage />);
    expect(await screen.findByRole('dialog', { name: 'Atendimento' })).toBeInTheDocument();
    finishOld([]);
    await waitFor(() => expect(screen.getByLabelText('Data da agenda')).toHaveValue('2099-10-11'));
    expect(screen.getByRole('button', { name: 'Editar ou reagendar' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cancelar agendamento' })).toBeEnabled();
  });

  it('falls back from invalid dates and preserves entered values after validation errors', async () => {
    route.search = '?date=2099-02-31';
    api.createAppointment.mockRejectedValue(new Error('Paciente já possui atendimento nesse intervalo.'));
    render(<AgendaPage />);
    const button = await screen.findByRole('button', { name: 'Novo agendamento' });
    await waitFor(() => expect(button).toBeEnabled());
    fireEvent.click(button);
    fireEvent.change(screen.getByLabelText('Procedimento clínico'), { target: { value: 'Avaliação inicial' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar e inserir na agenda/i }));
    expect(await screen.findByText('Paciente já possui atendimento nesse intervalo.')).toBeInTheDocument();
    expect(screen.getByLabelText('Procedimento clínico')).toHaveValue('Avaliação inicial');
    expect(screen.getByLabelText('Data da agenda')).not.toHaveValue('2099-02-31');
  });

  it('vincula paciente, ambiente e profissional em um novo agendamento', async () => {
    render(<AgendaPage />);
    const openButton = await screen.findByRole('button', { name: 'Novo agendamento' });
    await waitFor(() => expect(openButton).toBeEnabled());
    fireEvent.click(openButton);

    expect(screen.getByRole('dialog', { name: 'Novo Agendamento Clínico' })).toBeInTheDocument();
    expect(screen.getByLabelText('Paciente')).toHaveValue('patient-1');
    expect(screen.getByLabelText('Consultório')).toHaveValue('room-1');
    expect(screen.getByLabelText('Profissional')).toHaveValue('user-1');
    fireEvent.change(screen.getByLabelText('Procedimento clínico'), { target: { value: 'Avaliação inicial' } });
    fireEvent.click(screen.getByRole('button', { name: /confirmar e inserir na agenda/i }));

    await waitFor(() => expect(api.createAppointment).toHaveBeenCalledWith(expect.objectContaining({
      patientId: 'patient-1',
      roomId: 'room-1',
      professionalId: 'user-1',
      procedureName: 'Avaliação inicial',
      durationMinutes: 30,
      scheduledAt: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00\.000Z$/),
    })));
  });
});
