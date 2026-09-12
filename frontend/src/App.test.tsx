import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const auth = vi.hoisted(() => ({
  isAuthenticated: false,
  isLoadingAuth: false,
  sessionIssue: null as string | null,
  refreshSession: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('./context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => auth,
}));

vi.mock('wouter', () => ({
  Redirect: ({ to }: { to: string }) => <span>redirect:{to}</span>,
  Link: ({ children }: { children: React.ReactNode }) => children,
  Route: ({ children }: { children?: React.ReactNode }) => children,
  Switch: ({ children }: { children?: React.ReactNode }) => children,
  useLocation: () => ['/clinic/overview', vi.fn()],
  useSearch: () => 'view=today',
}));

import { RequireAuth } from './App';

describe('RequireAuth', () => {
  beforeEach(() => {
    auth.isAuthenticated = false;
    auth.isLoadingAuth = false;
    auth.sessionIssue = null;
    auth.refreshSession.mockReset();
    auth.logout.mockReset();
  });

  it('oferece recuperação sem redirecionar ao login quando a sessão não pôde ser verificada', () => {
    auth.sessionIssue = 'SESSION_RECOVERY_FAILED';

    render(<RequireAuth><span>conteúdo protegido</span></RequireAuth>);

    expect(screen.queryByText('redirect:/login')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
    expect(auth.refreshSession).toHaveBeenCalledOnce();
  });

  it('preserva pathname e busca como rota pretendida ao pedir autenticação', () => {
    render(<RequireAuth><span>conteúdo protegido</span></RequireAuth>);

    expect(screen.getByText('redirect:/login?next=%2Fclinic%2Foverview%3Fview%3Dtoday')).toBeVisible();
  });

  it('explica indisponibilidade da clínica sem tratar o 403 como credencial inválida', () => {
    auth.sessionIssue = 'TENANT_UNAVAILABLE';

    render(<RequireAuth><span>conteúdo protegido</span></RequireAuth>);

    expect(screen.getByText('Clínica indisponível')).toBeVisible();
    expect(screen.queryByText('redirect:/login')).not.toBeInTheDocument();
  });
});
