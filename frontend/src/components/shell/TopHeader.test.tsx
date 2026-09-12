import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TopHeader } from './TopHeader';

const api = vi.hoisted(() => ({ listAppointments: vi.fn() }));
vi.mock('../../lib/clinic', () => api);
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({
  currentUser: { name: 'Ana' }, currentClinic: { id: 'clinic-1', name: 'Clínica BHON' },
}) }));
vi.mock('../common/SearchModal', () => ({ SearchModal: () => null }));

describe('TopHeader', () => {
  it('mostra falha sem contagem de sucesso e permite recuperar a agenda', async () => {
    api.listAppointments.mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce([]);
    const user = userEvent.setup();
    render(<TopHeader />);
    expect(await screen.findByText('Agenda indisponível')).toBeInTheDocument();
    expect(screen.queryByText('0 em atendimento')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Dados conectados ao ambiente clínico')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Atualizar agenda' }));
    expect(await screen.findByText('0 em atendimento')).toBeInTheDocument();
    expect(screen.queryByText('Agenda indisponível')).not.toBeInTheDocument();
  });
});
