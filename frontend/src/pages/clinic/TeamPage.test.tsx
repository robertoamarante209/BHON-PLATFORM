import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { TeamPage } from './TeamPage';

const api = vi.hoisted(() => ({ createTeamMember: vi.fn(), listTeam: vi.fn() }));
vi.mock('../../lib/clinic', () => api);

describe('TeamPage', () => {
  beforeEach(() => {
    api.listTeam.mockResolvedValue({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 1 }, metrics: { activeCount: 0, inAttendanceCount: 0, todayAppointmentsCount: 0, averageWorkloadHours: null } });
    api.createTeamMember.mockResolvedValue({ id: 'u1' });
  });

  it('cria login com permissões selecionadas individualmente', async () => {
    render(<TeamPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Novo acesso' }));
    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ana Souza' } });
    fireEvent.change(screen.getByLabelText('Usuário ou e-mail'), { target: { value: 'ana.souza' } });
    fireEvent.change(screen.getByLabelText('Senha temporária'), { target: { value: 'Segura.2026' } });
    fireEvent.click(screen.getByLabelText('Visualizar agenda'));
    fireEvent.click(screen.getByRole('button', { name: 'Criar acesso' }));

    await waitFor(() => expect(api.createTeamMember).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Ana Souza', email: 'ana.souza', permissions: ['agenda.view'],
    })));
  });
});
