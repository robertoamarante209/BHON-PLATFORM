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
const auth = vi.hoisted(() => ({ currentUser: { role: 'OWNER', permissions: [] as string[] } }));

vi.mock('wouter', () => ({ useLocation: () => ['/clinic/agenda', vi.fn()] }));
vi.mock('../../lib/clinic', () => ({
  ...api,
  appointmentTransitions: {
    CONFIRMADO: ['NA_RECEPCAO', 'CANCELADO', 'FALTA', 'ENCAIXE'],
  },
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));

describe('AgendaPage', () => {
  beforeEach(() => {
    auth.currentUser = { role: 'OWNER', permissions: [] };
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
    expect(screen.getByLabelText('Sala')).toHaveValue('room-1');
    expect(screen.getByLabelText('Profissional')).toHaveValue('user-1');
    fireEvent.change(screen.getByLabelText('Tipo de atendimento'), { target: { value: 'Avaliação inicial' } });
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

  it('organiza a agenda diária por profissional', async () => {
    render(<AgendaPage />);

    expect(await screen.findByRole('columnheader', { name: /Profissional/ })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: /Profissional/ })).toHaveTextContent('Profissional');
  });

  it('mostra uma marcação como card com status visível', async () => {
    api.listAppointments.mockResolvedValue([{
      id: 'appointment-card', tenantId: 'tenant-1', patientId: 'patient-1', patientName: 'Paciente real', patientRecordNumber: '#00001',
      professionalId: 'user-1', professionalName: 'Profissional', roomId: 'room-1', roomName: 'Sala 1', scheduledAt: '2026-09-14T14:30:00.000Z',
      time: '14:30', durationMinutes: 30, procedureName: 'Avaliação inicial', status: 'AGUARDANDO_CONFIRMACAO', delayMinutes: 0,
    }]);
    render(<AgendaPage />);

    const card = await screen.findByTestId('agenda-appointment-card');
    expect(card).toHaveAttribute('data-tone', 'amber');
    expect(card).toHaveTextContent('Aguardando confirmação');
    expect(card).toHaveTextContent('Paciente real');
  });

  it('não oferece novo agendamento para acesso somente leitura', async () => {
    auth.currentUser = { role: 'VIEWER', permissions: ['agenda.view'] };
    render(<AgendaPage />);

    expect(await screen.findByRole('columnheader', { name: /Profissional/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo agendamento' })).not.toBeInTheDocument();
  });

  it('oferece cancelamento somente a quem recebeu essa permissão', async () => {
    auth.currentUser = { role: 'RECEPTIONIST', permissions: ['agenda.view', 'agenda.cancel'] };
    api.listAppointments.mockResolvedValue([{
      id: 'appointment-1', tenantId: 'tenant-1', patientId: 'patient-1', patientName: 'Paciente real', patientRecordNumber: '#00001',
      professionalId: 'user-1', professionalName: 'Profissional', roomId: 'room-1', roomName: 'Sala 1', scheduledAt: '2026-09-14T14:30:00.000Z',
      time: '14:30', durationMinutes: 30, procedureName: 'Avaliação inicial', status: 'CONFIRMADO', delayMinutes: 0,
    }]);
    render(<AgendaPage />);

    const appointmentCards = await screen.findAllByRole('button', { name: /Paciente real/ });
    fireEvent.click(appointmentCards[0]);

    expect(screen.getByRole('button', { name: 'Cancelar agendamento' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Confirmar Presença/ })).not.toBeInTheDocument();
  });
});
