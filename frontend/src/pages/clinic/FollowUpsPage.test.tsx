import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FollowUpsPage } from './FollowUpsPage';

const auth = vi.hoisted(() => ({ currentUser: { role: 'OWNER', permissions: [] as string[] } }));
vi.mock('wouter', () => ({ useLocation: () => ['/clinic/follow-ups', vi.fn()] }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));
vi.mock('../../lib/clinic', () => ({
  executeFollowUpAction: vi.fn(),
  listFollowUps: vi.fn().mockResolvedValue({
    data: [{ id: 'f1', patientId: 'p1', patientName: 'Ana Lima', patientRecordNumber: '#0001', category: 'ORCAMENTO', reason: 'Orçamento sem retorno', responsibleUserId: null, responsibleUserName: null, deadlineAt: '2026-09-14T12:00:00.000Z', lastContactAt: null, nextAction: 'Entrar em contato', status: 'PENDENTE' }],
    assignees: [], metrics: { pendingToday: 1, categoryCounts: { ORCAMENTO: 1 } }, pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  }),
}));

describe('FollowUpsPage', () => {
  beforeEach(() => {
    auth.currentUser = { role: 'OWNER', permissions: [] };
  });

  it('prioriza a ação de recuperação sem tabela densa', async () => {
    render(<FollowUpsPage />);
    expect(await screen.findByRole('heading', { name: 'Recuperação' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Fila de recuperação' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Registrar contato com Ana Lima' })).toBeInTheDocument();
  });

  it('abre a fila apenas para consulta quando o acesso não pode executar ações', async () => {
    auth.currentUser = { role: 'VIEWER', permissions: ['recovery.view'] };
    render(<FollowUpsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'Consultar Ana Lima' }));

    expect(screen.getByText('Seu acesso permite somente consultar esta fila.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar ação' })).not.toBeInTheDocument();
  });
});
