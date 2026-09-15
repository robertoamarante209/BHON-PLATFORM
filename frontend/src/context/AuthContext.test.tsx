import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const owner = {
  id: 'owner-1', tenantId: 'tenant-1', name: 'Roberto', email: 'roberto',
  role: 'PLATFORM_OWNER', status: 'ACTIVE',
};

const Harness = () => {
  const { isAuthenticated, isLoadingAuth, sessionError, login, refreshSession } = useAuth();
  return <>
    <span>{isAuthenticated ? 'autenticado' : 'desconectado'}</span>
    <span>{isLoadingAuth ? 'carregando' : 'pronto'}</span>
    {sessionError ? <span>{sessionError}</span> : null}
    <button onClick={() => void login('roberto', 'senha')}>entrar</button>
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
});
