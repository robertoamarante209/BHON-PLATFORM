import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FollowUpsPage } from './FollowUpsPage';
import type { FollowUp } from '../../types';

const api = vi.hoisted(() => ({ listFollowUps: vi.fn(), executeFollowUpAction: vi.fn() }));
const auth = vi.hoisted(() => ({ currentUser: { role: 'VIEWER' } }));
vi.mock('../../lib/clinic', () => api);
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ currentUser: auth.currentUser }) }));
const records: FollowUp[] = [
  { id: 'first', tenantId: 'clinic-1', patientId: 'patient-1', patientName: 'Ana', patientRecordNumber: '001', category: 'ORCAMENTO', reason: 'Recuperar orçamento', priority: 'HIGH', status: 'PENDENTE', deadlineAt: '2026-09-12T12:00:00Z', createdAt: '2026-09-11T12:00:00Z' },
  { id: 'second', tenantId: 'clinic-1', patientId: 'patient-2', patientName: 'Bia', patientRecordNumber: '002', category: 'RETORNO', reason: 'Agendar retorno', priority: 'HIGH', status: 'PENDENTE', deadlineAt: '2026-09-12T12:00:00Z', createdAt: '2026-09-11T12:00:00Z' },
];

describe('FollowUpsPage query navigation', () => {
  beforeEach(() => {
    auth.currentUser = { role: 'VIEWER' };
    window.history.replaceState(null, '', '/clinic/follow-ups?category=ORCAMENTO');
    api.listFollowUps.mockImplementation(async ({ category, focus }) => ({
      data: records.filter((item) => (!focus || item.id === focus) && (!category || item.category === category)),
      assignees: [], metrics: { pendingToday: 2, categoryCounts: { ORCAMENTO: 1, RETORNO: 1 } },
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }));
  });

  it('aplica a categoria do link e mantém URL e filtros sincronizados', async () => {
    const user = userEvent.setup();
    render(<FollowUpsPage />);
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Bia')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Orçamento \(/ })).toHaveAttribute('aria-pressed', 'true');
    await user.click(screen.getByRole('button', { name: /Retorno \(/ }));
    expect(await screen.findByText('Bia')).toBeInTheDocument();
    expect(window.location.search).toContain('category=RETORNO');
    act(() => window.history.pushState(null, '', '/clinic/follow-ups?category=ORCAMENTO'));
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Bia')).not.toBeInTheDocument();
  });

  it('troca o foco sem remontar a página e limpa o painel ao voltar à fila', async () => {
    window.history.replaceState(null, '', '/clinic/follow-ups?focus=first');
    render(<FollowUpsPage />);
    expect(await screen.findByRole('dialog')).toHaveTextContent('Ana (001)');
    act(() => window.history.pushState(null, '', '/clinic/follow-ups?focus=second'));
    await waitFor(() => expect(screen.getByRole('dialog')).toHaveTextContent('Bia (002)'));
    act(() => window.history.pushState(null, '', '/clinic/follow-ups?category=INVALID'));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    expect(screen.getByText('Bia')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Confirmar ação' })).not.toBeInTheDocument();
  });

  it('does not leave the previous category rows actionable when its replacement request fails', async () => {
    api.listFollowUps.mockImplementation(async ({ category }) => {
      if (category === 'RETORNO') throw new Error('Fila indisponível');
      return {
        data: records.filter((item) => item.category === category),
        assignees: [], metrics: { pendingToday: 1, categoryCounts: { ORCAMENTO: 1, RETORNO: 0 } },
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };
    });
    render(<FollowUpsPage />);
    expect(await screen.findByText('Ana')).toBeInTheDocument();

    act(() => window.history.pushState(null, '', '/clinic/follow-ups?category=RETORNO'));

    expect(await screen.findByText('Fila indisponível')).toBeInTheDocument();
    expect(screen.getByText('Dados de acompanhamentos indisponíveis')).toBeInTheDocument();
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Tratar' })).not.toBeInTheDocument();
  });

  it('keeps the newest query result when a retry from an older query resolves late', async () => {
    let resolveRetry: ((value: { data: FollowUp[]; assignees: []; metrics: { pendingToday: number; categoryCounts: Record<string, number> }; pagination: { page: number; limit: number; total: number; totalPages: number } }) => void) | undefined;
    let retryStarted = false;
    api.listFollowUps.mockImplementation(({ category }) => {
      if (category === 'RETORNO' && !retryStarted) {
        retryStarted = true;
        return Promise.reject(new Error('Fila indisponível'));
      }
      if (category === 'RETORNO') return new Promise((resolve) => { resolveRetry = resolve; });
      return Promise.resolve({
        data: records.filter((item) => item.category === category),
        assignees: [], metrics: { pendingToday: 1, categoryCounts: { ORCAMENTO: 1, RETORNO: 1 } },
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    });
    const user = userEvent.setup();
    render(<FollowUpsPage />);
    expect(await screen.findByText('Ana')).toBeInTheDocument();

    act(() => window.history.pushState(null, '', '/clinic/follow-ups?category=RETORNO'));
    expect(await screen.findByText('Fila indisponível')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    await waitFor(() => expect(resolveRetry).toBeDefined());

    act(() => window.history.pushState(null, '', '/clinic/follow-ups?category=ORCAMENTO'));
    expect(await screen.findByText('Ana')).toBeInTheDocument();
    await act(async () => {
      resolveRetry?.({
        data: [records[1]], assignees: [], metrics: { pendingToday: 1, categoryCounts: { ORCAMENTO: 1, RETORNO: 1 } },
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });
    });

    expect(screen.getByText('Ana')).toBeInTheDocument();
    expect(screen.queryByText('Bia')).not.toBeInTheDocument();
  });

  it('keeps the navigated query when a pending action resolves', async () => {
    let resolveAction: (() => void) | undefined;
    auth.currentUser = { role: 'MANAGER' };
    api.executeFollowUpAction.mockImplementation(() => new Promise<void>((resolve) => { resolveAction = resolve; }));
    render(<FollowUpsPage />);
    const user = userEvent.setup();
    expect(await screen.findByText('Ana')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Tratar' }));
    await user.type(screen.getByLabelText('Registro do contato'), 'Contato realizado');
    await user.click(screen.getByRole('button', { name: 'Confirmar ação' }));
    await waitFor(() => expect(resolveAction).toBeDefined());

    act(() => window.history.pushState(null, '', '/clinic/follow-ups?category=RETORNO'));
    expect(await screen.findByText('Bia')).toBeInTheDocument();
    await act(async () => { resolveAction?.(); });

    await waitFor(() => expect(screen.getByText('Bia')).toBeInTheDocument());
    expect(screen.queryByText('Ana')).not.toBeInTheDocument();
  });
});
