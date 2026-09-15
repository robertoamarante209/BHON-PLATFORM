import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SettingsPage } from './SettingsPage';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { role: 'OWNER' } }),
}));
vi.mock('../../lib/clinic', () => ({
  getClinicSettings: vi.fn().mockResolvedValue({
    clinic: { id: 'clinic-1', name: 'BHON Clínica', slug: 'bhon', email: 'contato@bhon.test', status: 'ACTIVE', planCode: 'PRO', createdAt: '2026-01-01', activeRoomsCount: 0 },
    rooms: [],
  }),
  createRoom: vi.fn(),
  updateRoom: vi.fn(),
  getClinicAvailability: vi.fn().mockResolvedValue({ professionalId: null, revision: 0, intervals: [] }),
  updateClinicAvailability: vi.fn(),
}));

describe('SettingsPage', () => {
  it('carrega dados reais e apresenta ambientes vazios honestamente', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    expect(await screen.findByDisplayValue('BHON Clínica')).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'Consultórios e Salas' }));
    expect(screen.getByText('Nenhum ambiente cadastrado')).toBeInTheDocument();
    expect(screen.queryByText('(11) 3288-4100')).not.toBeInTheDocument();
  });

  it('apresenta a configuração de disponibilidade sem prometer bloqueio de agenda', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);

    await screen.findByDisplayValue('BHON Clínica');
    await user.click(screen.getByRole('button', { name: 'Horários' }));

    expect(screen.getByRole('heading', { name: 'Disponibilidade da clínica' })).toBeInTheDocument();
    expect(screen.getByText(/não bloqueia agendamentos/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Salvar horários' })).toBeInTheDocument();
  });
});
