import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const owner = {
  id: 'owner-1', tenantId: 'tenant-1', name: 'Roberto', email: 'roberto',
  role: 'PLATFORM_OWNER', status: 'ACTIVE',
};

const Harness = () => {
  const { currentUser, isAuthenticated, isLoadingAuth, sessionError, login, loginWithGoogle, logout, refreshSession } = useAuth();
  return <>
    <span>{isAuthenticated ? 'autenticado' : 'desconectado'}</span>
    <span>{isLoadingAuth ? 'carregando' : 'pronto'}</span>
    <span>{currentUser.name}</span>
    {sessionError ? <span>{sessionError}</span> : null}
    <button onClick={() => void login('roberto', 'senha')}>entrar</button>
    <button onClick={() => void loginWithGoogle('credencial')}>entrar com google</button>
    <button onClick={() => void logout()}>sair</button>
    <button onClick={() => void refreshSession()}>atualizar</button>
  </>;
};

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

  it('preserva a sessão local em falha transitória e permite tentar novamente', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: owner }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: owner }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    render(<AuthProvider><Harness /></AuthProvider>);
    expect(await screen.findByText('autenticado')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'atualizar' }));
    expect(await screen.findByText('Não foi possível verificar sua sessão. Tente novamente.')).toBeVisible();
    expect(screen.getByText('autenticado')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'atualizar' }));
    await act(async () => undefined);
    expect(screen.queryByText('Não foi possível verificar sua sessão. Tente novamente.')).not.toBeInTheDocument();
  });

  it('revoga a sessão local quando o servidor responde 401', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: owner }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: 'INVALID_SESSION' }), { status: 401, headers: { 'Content-Type': 'application/json' } })));
    render(<AuthProvider><Harness /></AuthProvider>);
    expect(await screen.findByText('autenticado')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'atualizar' }));
    expect(await screen.findByText('desconectado')).toBeVisible();
  });

  it('espera o logout terminar antes de enviar somente o login mais recente', async () => {
    let finishLogout!: (response: Response) => void;
    const delayedLogout = new Promise<Response>((resolve) => { finishLogout = resolve; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: owner }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockReturnValueOnce(delayedLogout)
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: owner }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    render(<AuthProvider><Harness /></AuthProvider>);
    expect(await screen.findByText('autenticado')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'sair' }));
    fireEvent.click(screen.getByRole('button', { name: 'sair' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));
    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => finishLogout(new Response(null, { status: 204 })));
    expect(await screen.findByText('autenticado')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toBe('/auth/login');
  });

  it('continua o login após falha de rede no logout sem rejeição não tratada', async () => {
    let failLogout!: (reason: Error) => void;
    const delayedLogout = new Promise<Response>((_resolve, reject) => { failLogout = reject; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: owner }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockReturnValueOnce(delayedLogout)
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: owner }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AuthProvider><Harness /></AuthProvider>);
    expect(await screen.findByText('autenticado')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'sair' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await act(async () => failLogout(new Error('offline')));
    expect(await screen.findByText('autenticado')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it('serializa login por senha e Google mesmo quando a primeira resposta atrasa', async () => {
    let finishPassword!: (response: Response) => void;
    const delayedPassword = new Promise<Response>((resolve) => { finishPassword = resolve; });
    const googleUser = { ...owner, id: 'google-1', name: 'Conta Google' };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockReturnValueOnce(delayedPassword)
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: googleUser }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AuthProvider><Harness /></AuthProvider>);
    expect(await screen.findByText('desconectado')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'entrar com google' }));
      await Promise.resolve();
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => finishPassword(new Response(JSON.stringify({ user: owner }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    expect(await screen.findByText('Conta Google')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toBe('/auth/google');
  });

  it('espera um login em andamento terminar antes de enviar o logout mais recente', async () => {
    let finishLogin!: (response: Response) => void;
    const delayedLogin = new Promise<Response>((resolve) => { finishLogin = resolve; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockReturnValueOnce(delayedLogin)
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AuthProvider><Harness /></AuthProvider>);
    expect(await screen.findByText('desconectado')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'sair' }));
    expect(fetchMock).toHaveBeenCalledTimes(2);

    await act(async () => finishLogin(new Response(JSON.stringify({ user: owner }), { status: 200, headers: { 'Content-Type': 'application/json' } })));
    expect(await screen.findByText('desconectado')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[2][0]).toBe('/auth/logout');
  });

  it('trata um segundo logout pendente como a intenção mais recente sem duplicar a requisição', async () => {
    let finishLogout!: (response: Response) => void;
    const delayedLogout = new Promise<Response>((resolve) => { finishLogout = resolve; });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: owner }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockReturnValueOnce(delayedLogout)
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: owner }), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);
    render(<AuthProvider><Harness /></AuthProvider>);
    expect(await screen.findByText('autenticado')).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: 'sair' }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));
    fireEvent.click(screen.getByRole('button', { name: 'sair' }));
    await act(async () => finishLogout(new Response(null, { status: 204 })));

    expect(await screen.findByText('desconectado')).toBeVisible();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
