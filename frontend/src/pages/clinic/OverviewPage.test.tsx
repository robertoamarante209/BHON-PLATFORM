import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Appointment } from '../../types';
import { OverviewPage } from './OverviewPage';

const api = vi.hoisted(() => ({
  listAppointments: vi.fn(),
  updateAppointmentStatus: vi.fn(),
}));

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) => <a href={href} {...props}>{children}</a>,
  useLocation: () => ['/clinic/overview', vi.fn()],
}));

vi.mock('../../components/recovery/RecoveryQueue', () => ({
  RecoveryQueue: () => <div>Recuperação</div>,
}));

vi.mock('../../lib/clinic', async () => {
  const actual = await vi.importActual<typeof import('../../lib/clinic')>('../../lib/clinic');
  return {
    ...actual,
    listAppointments: api.listAppointments,
    updateAppointmentStatus: api.updateAppointmentStatus,
  };
});

const appointment: Appointment = {
  id: 'appointment-1',
  tenantId: 'tenant-1',
  patientId: 'patient-1',
  patientName: 'Mariana Costa',
  patientRecordNumber: '#00001',
  professionalId: 'professional-1',
  professionalName: 'Dra. Silva',
  roomId: 'room-1',
  roomName: 'Sala 1',
  scheduledAt: '2026-09-14T18:00:00.000Z',
  time: '15:00',
  durationMinutes: 45,
  procedureName: 'Avaliação',
  status: 'CONFIRMADO',
  delayMinutes: 0,
};

const secondAppointment: Appointment = {
  ...appointment,
  id: 'appointment-2',
  patientId: 'patient-2',
  patientName: 'Carlos Mendes',
  patientRecordNumber: '#00002',
  scheduledAt: '2026-09-14T19:00:00.000Z',
  time: '16:00',
  procedureName: 'Retorno',
};

describe('OverviewPage', () => {
  beforeEach(() => {
    api.listAppointments.mockReset();
    api.updateAppointmentStatus.mockReset();
    api.listAppointments.mockResolvedValue([appointment]);
  });

  it('impede repetir uma transição enquanto a atualização do atendimento está em andamento', async () => {
    let finishUpdate: (() => void) | undefined;
    const updatePromise = new Promise<void>((resolve) => { finishUpdate = resolve; });
    api.updateAppointmentStatus.mockReturnValue(updatePromise);

    render(<OverviewPage />);

    await screen.findByText('Mariana Costa');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir atendimento de Mariana Costa' }));

    const arrivalButton = screen.getByRole('button', { name: 'Confirmar chegada' });
    fireEvent.click(arrivalButton);

    await waitFor(() => expect(api.updateAppointmentStatus).toHaveBeenCalledTimes(1));
    expect(arrivalButton).toBeDisabled();

    fireEvent.click(arrivalButton);
    expect(api.updateAppointmentStatus).toHaveBeenCalledTimes(1);

    await act(async () => {
      finishUpdate?.();
      await updatePromise;
    });
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });

  it('permite tentar novamente quando a operação do dia falha ao carregar', async () => {
    api.listAppointments.mockRejectedValueOnce(new Error('Falha temporária.'));

    render(<OverviewPage />);

    expect(await screen.findByRole('alert')).toHaveTextContent('Falha temporária.');
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Mariana Costa')).toBeVisible();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(api.listAppointments).toHaveBeenCalledTimes(2);
  });

  it('mantém um atendimento mais recente aberto quando a ação anterior termina', async () => {
    api.listAppointments.mockResolvedValue([appointment, secondAppointment]);
    let finishUpdate: (() => void) | undefined;
    const updatePromise = new Promise<void>((resolve) => { finishUpdate = resolve; });
    api.updateAppointmentStatus.mockReturnValue(updatePromise);

    render(<OverviewPage />);

    await screen.findByText('Carlos Mendes');
    fireEvent.click(screen.getByRole('button', { name: 'Abrir atendimento de Mariana Costa' }));
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar chegada' }));
    await waitFor(() => expect(api.updateAppointmentStatus).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Abrir atendimento de Carlos Mendes' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Carlos Mendes');

    await act(async () => {
      finishUpdate?.();
      await updatePromise;
    });

    expect(screen.getByRole('dialog')).toHaveTextContent('Carlos Mendes');
  });
});
