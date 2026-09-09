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
}));

vi.mock('wouter', () => ({ useLocation: () => ['/clinic/agenda', vi.fn()] }));
vi.mock('../../lib/clinic', () => ({
  ...api,
  appointmentTransitions: {
    CONFIRMADO: ['NA_RECEPCAO', 'CANCELADO', 'FALTA', 'ENCAIXE'],
  },
}));

describe('AgendaPage', () => {
  beforeEach(() => {
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
