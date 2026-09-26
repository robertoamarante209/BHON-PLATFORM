import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { TeamPage } from './TeamPage';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ currentUser: { id: 'owner-1', role: 'OWNER' } }),
}));
vi.mock('../../lib/clinic', () => ({
  listTeam: vi.fn().mockResolvedValue({
    data: [{ id: 'member-1', name: 'Ana Costa', email: 'ana@bhon.test', role: 'RECEPTIONIST', roleLabel: 'Recepção', accessStatus: 'ACTIVE', status: 'ATIVO', todayAppointmentsCount: 2, completedAppointmentsCount: 1 }],
    metrics: { activeCount: 1, inAttendanceCount: 0, todayAppointmentsCount: 2, averageWorkloadHours: null },
    pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  }),
  updateTeamMemberAccess: vi.fn(),
}));

describe('TeamPage', () => {
  it('permite ao proprietário abrir o controle de acesso de um integrante', async () => {
    const user = userEvent.setup();
    render(<TeamPage />);

    expect(await screen.findByText('Ana Costa')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Gerenciar acesso de Ana Costa' }));

    expect(screen.getByRole('dialog', { name: 'Acesso de Ana Costa' })).toBeInTheDocument();
    expect(screen.getByLabelText('Função de Ana Costa')).toHaveValue('RECEPTIONIST');
  });
});
