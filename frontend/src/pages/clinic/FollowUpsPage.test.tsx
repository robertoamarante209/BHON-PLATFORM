import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { FollowUpsPage } from './FollowUpsPage';

vi.mock('wouter', () => ({ useLocation: () => ['/clinic/follow-ups', vi.fn()] }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ currentUser: { role: 'OWNER' } }) }));
vi.mock('../../lib/clinic', () => ({
  executeFollowUpAction: vi.fn(),
  listFollowUps: vi.fn().mockResolvedValue({
    data: [{ id: 'f1', patientId: 'p1', patientName: 'Ana Lima', patientRecordNumber: '#0001', category: 'ORCAMENTO', reason: 'Orçamento sem retorno', responsibleUserId: null, responsibleUserName: null, deadlineAt: '2026-09-14T12:00:00.000Z', lastContactAt: null, nextAction: 'Entrar em contato', status: 'PENDENTE' }],
    assignees: [], metrics: { pendingToday: 1, categoryCounts: { ORCAMENTO: 1 } }, pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
  }),
}));

describe('FollowUpsPage', () => {
  it('prioriza a ação de recuperação sem tabela densa', async () => {
    render(<FollowUpsPage />);
    expect(await screen.findByRole('heading', { name: 'Recuperação' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Fila de recuperação' })).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: 'Registrar contato com Ana Lima' })).toBeInTheDocument();
  });
});
