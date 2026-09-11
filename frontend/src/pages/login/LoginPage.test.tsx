import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage, GOOGLE_BUTTON_OPTIONS } from './LoginPage';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn(), loginWithGoogle: vi.fn() }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useRealTimers();
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: false }));
  });

  it('exibe a abertura da marca uma vez e libera o formulário automaticamente', () => {
    vi.useFakeTimers();
    render(<LoginPage />);

    expect(screen.getByTestId('brand-intro')).toBeVisible();
    act(() => vi.advanceTimersByTime(1500));
    expect(screen.queryByTestId('brand-intro')).not.toBeInTheDocument();
    expect(sessionStorage.getItem('bhon-brand-intro-seen')).toBe('true');
  });

  it('não anima a abertura quando o usuário prefere movimento reduzido', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    render(<LoginPage />);
    expect(screen.queryByTestId('brand-intro')).not.toBeInTheDocument();
  });

  it('inicia o campo de e-mail vazio para não expor o acesso administrativo', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('E-mail Institucional')).toHaveValue('');
  });

  it('apresenta a marca clara aprimorada sobre a entrada', () => {
    render(<LoginPage />);

    expect(screen.getByRole('img', { name: 'BHON' })).toHaveAttribute('src', '/logo-bhon-dark.svg');
    expect(screen.getByRole('heading', { name: /oi, seja bem - vindo/i })).toBeVisible();
    expect(screen.getByRole('img', { name: /organização clínica inteligente/i })).toHaveAttribute('src', '/figma-login-illustration.png');
  });

  it('mantém somente as informações essenciais para entrar', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('E-mail Institucional')).toBeVisible();
    expect(screen.getByLabelText('Senha de Acesso')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /lembrar meu acesso/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /entrar na clínica/i })).toBeVisible();
    expect(screen.queryByText(/sua clínica em perfeita sintonia/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/agenda coordenada|acesso protegido|seu acesso é individual/i)).not.toBeInTheDocument();
  });

  it('usa o botão Google oficial em tratamento escuro compatível com a identidade BHON', () => {
    expect(GOOGLE_BUTTON_OPTIONS).toMatchObject({
      type: 'standard',
      theme: 'filled_black',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      locale: 'pt-BR',
    });
  });
});
