import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';

describe('rotas durante a verificação da sessão', () => {
  it.each([['/termos', 'Termos de Uso'], ['/privacidade', 'Política de Privacidade']])('abre %s mesmo sem conexão com a sessão', async (path, title) => {
    window.history.replaceState(null, '', path);
    render(<App />);
    expect(await screen.findByRole('heading', { name: title })).toBeVisible();
    expect(screen.getByRole('link', { name: 'bhonsuport@gmail.com' })).toHaveAttribute('href', 'mailto:bhonsuport@gmail.com');
    expect(screen.getByText(/documento em versão inicial/i)).toBeVisible();
  });
  beforeEach(() => {
    window.history.replaceState(null, '', '/');
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
  });

  it('mantém um estado recuperável na raiz quando a verificação inicial falha', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(new Response(JSON.stringify({ user: {
      id: 'owner-1', tenantId: 'tenant-1', name: 'Roberto', email: 'roberto', role: 'PLATFORM_OWNER', status: 'ACTIVE',
    } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    render(<App />);
    expect(window.location.pathname).toBe('/');
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível verificar sua sessão. Tente novamente.');
    expect(screen.queryByRole('heading', { name: 'Bem-vindo à BHON.' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(await screen.findByRole('heading', { name: 'Visualizações operacionais' })).toBeVisible();
  });

  it('mantém um estado recuperável em /login quando a verificação inicial falha', async () => {
    window.history.replaceState(null, '', '/login');
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível verificar sua sessão. Tente novamente.');
    expect(screen.queryByRole('heading', { name: 'Bem-vindo à BHON.' })).not.toBeInTheDocument();
  });

  it('prioriza a rota específica do prontuário antes da lista de pacientes', async () => {
    window.history.replaceState(null, '', '/clinic/patients/paciente-1');
    vi.stubGlobal('fetch', vi.fn((url: string) => {
      if (url === '/auth/me') return Promise.resolve(new Response(JSON.stringify({ user: {
        id: 'user-1', tenantId: 'tenant-1', name: 'Ana', email: 'ana', role: 'OWNER', status: 'ACTIVE',
        tenant: { id: 'tenant-1', name: 'Clínica', slug: 'clinica', email: 'clinica@test', status: 'ACTIVE', planCode: 'PRO', createdAt: '', activeRoomsCount: 1 },
      } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      if (url === '/api/patients/paciente-1') return new Promise<Response>(() => undefined);
      if (url === '/api/recovery') return Promise.resolve(new Response(JSON.stringify({
        generatedAt: '', assignees: [], items: [], metrics: {
          actionsRequiringAttention: 0, overdueActions: 0, inactiveBudgets: 0,
          stalledOpportunities: 0, treatmentsAtRisk: 0, overduePayments: 0,
          inactiveQuoteValue: 0, overdueReceivables: 0, financialExposure: 0,
        },
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      return Promise.resolve(new Response(JSON.stringify({ data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    }));

    render(<App />);
    expect(await screen.findByText('Carregando prontuário integrado…')).toBeVisible();
  });

  it('entrega a gestão real de clínicas ao Owner', async () => {
    window.history.replaceState(null, '', '/platform/clinics');
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ user: {
      id: 'owner-1', tenantId: 'tenant-1', name: 'Roberto', email: 'roberto', role: 'PLATFORM_OWNER', status: 'ACTIVE',
    } }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    render(<App />);

    expect(await screen.findByRole('heading', { name: 'Gestão Global de Clínicas' })).toBeVisible();
    expect(screen.queryByText('Esta área estará disponível em breve.')).not.toBeInTheDocument();
  });
});
