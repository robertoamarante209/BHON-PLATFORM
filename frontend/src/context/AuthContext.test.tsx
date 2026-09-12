import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const owner = {
  id: 'owner-1', tenantId: 'tenant-1', name: 'Roberto', email: 'roberto',
  role: 'PLATFORM_OWNER', status: 'ACTIVE',
};

const Harness = () => {
  const auth = useAuth() as ReturnType<typeof useAuth> & { sessionIssue?: string | null };
  const { isAuthenticated, login, logout, refreshSession } = auth;
  return <>
    <span>{isAuthenticated ? 'autenticado' : 'desconectado'}</span>
    <span>{auth.sessionIssue || 'sem-problema'}</span>
    <button onClick={() => void login('roberto', 'senha')}>entrar</button>
    <button onClick={() => void refreshSession()}>atualizar sessão</button>
    <button onClick={() => void logout()}>sair</button>
  </>;
};

const jsonResponse = (status: number, body: object) => new Response(JSON.stringify(body), {
  status,
  headers: { 'Content-Type': 'application/json' },
});

afterEach(() => vi.unstubAllGlobals());

describe('AuthProvider', () => {
  it('não deixa a verificação inicial atrasada desfazer um login concluído', async () => {
    let failInitial!: (reason: Error) => void;
    const initial = new Promise<Response>((_resolve, reject) => { failInitial = reject; });
    vi.stubGlobal('fetch', vi.fn()
      .mockReturnValueOnce(initial)
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: owner }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })));

    render(<AuthProvider><Harness /></AuthProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));
    expect(await screen.findByText('autenticado')).toBeVisible();

    await act(async () => failInitial(new Error('falha de rede tardia')));
    expect(screen.getByText('autenticado')).toBeVisible();
  });

  it.each([
    ['falha de rede', () => Promise.reject(new Error('rede indisponível'))],
    ['erro 5xx', () => Promise.resolve(jsonResponse(503, { code: 'INTERNAL_ERROR' }))],
  ])('preserva uma sessão autenticada durante %s de /auth/me', async (_label, transientResult) => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { code: 'INVALID_SESSION' }))
      .mockResolvedValueOnce(jsonResponse(200, { user: owner }))
      .mockImplementationOnce(transientResult);
    vi.stubGlobal('fetch', fetchMock);

    render(<AuthProvider><Harness /></AuthProvider>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));
    expect(await screen.findByText('autenticado')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'atualizar sessão' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(screen.getByText('autenticado')).toBeVisible();
    expect(await screen.findByText('SESSION_RECOVERY_FAILED')).toBeVisible();
  });

  it('limpa a sessão local quando /auth/me confirma INVALID_SESSION com 401', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { code: 'INVALID_SESSION' }))
      .mockResolvedValueOnce(jsonResponse(200, { user: owner }))
      .mockResolvedValueOnce(jsonResponse(401, { code: 'INVALID_SESSION' }));
    vi.stubGlobal('fetch', fetchMock);

    render(<AuthProvider><Harness /></AuthProvider>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));
    expect(await screen.findByText('autenticado')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'atualizar sessão' }));

    expect(await screen.findByText('desconectado')).toBeVisible();
    expect(screen.getByText('sem-problema')).toBeVisible();
  });

  it('não permite que refresh tardio restaure a identidade depois do logout', async () => {
    let resolveRefresh!: (response: Response) => void;
    const delayedRefresh = new Promise<Response>((resolve) => { resolveRefresh = resolve; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(jsonResponse(401, { code: 'INVALID_SESSION' }))
      .mockResolvedValueOnce(jsonResponse(200, { user: owner }))
      .mockImplementationOnce(() => delayedRefresh)
      .mockResolvedValueOnce(jsonResponse(204, {}));
    vi.stubGlobal('fetch', fetchMock);

    render(<AuthProvider><Harness /></AuthProvider>);
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));
    expect(await screen.findByText('autenticado')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'atualizar sessão' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    fireEvent.click(screen.getByRole('button', { name: 'sair' }));
    expect(await screen.findByText('desconectado')).toBeVisible();

    await act(async () => resolveRefresh(jsonResponse(200, { user: owner })));
    expect(screen.getByText('desconectado')).toBeVisible();
  });

  it.each(['USER_BLOCKED', 'TENANT_UNAVAILABLE'])(
    'mantém a identidade local e representa o 403 %s sem tratá-lo como credencial inválida',
    async (code) => {
      const fetchMock = vi.fn()
        .mockResolvedValueOnce(jsonResponse(401, { code: 'INVALID_SESSION' }))
        .mockResolvedValueOnce(jsonResponse(200, { user: owner }))
        .mockResolvedValueOnce(jsonResponse(403, { code }));
      vi.stubGlobal('fetch', fetchMock);

      render(<AuthProvider><Harness /></AuthProvider>);
      await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
      fireEvent.click(screen.getByRole('button', { name: 'entrar' }));
      expect(await screen.findByText('autenticado')).toBeVisible();

      fireEvent.click(screen.getByRole('button', { name: 'atualizar sessão' }));

      expect(await screen.findByText(code)).toBeVisible();
      expect(screen.getByText('autenticado')).toBeVisible();
    },
  );
});
