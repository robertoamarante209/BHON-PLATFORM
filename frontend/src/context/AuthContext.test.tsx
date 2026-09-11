import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';

const owner = {
  id: 'owner-1', tenantId: 'tenant-1', name: 'Roberto', email: 'roberto',
  role: 'PLATFORM_OWNER', status: 'ACTIVE',
};

const Harness = () => {
  const { isAuthenticated, login } = useAuth();
  return <>
    <span>{isAuthenticated ? 'autenticado' : 'desconectado'}</span>
    <button onClick={() => void login('roberto', 'senha')}>entrar</button>
  </>;
};

describe('AuthProvider', () => {
  it('não deixa a verificação inicial atrasada desfazer um login concluído', async () => {
    let finishInitial!: (response: Response) => void;
    const initial = new Promise<Response>((resolve) => { finishInitial = resolve; });
    vi.stubGlobal('fetch', vi.fn()
      .mockReturnValueOnce(initial)
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: owner }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })));

    render(<AuthProvider><Harness /></AuthProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'entrar' }));
    expect(await screen.findByText('autenticado')).toBeVisible();

    await act(async () => finishInitial(new Response('', { status: 401 })));
    expect(screen.getByText('autenticado')).toBeVisible();
  });
});
