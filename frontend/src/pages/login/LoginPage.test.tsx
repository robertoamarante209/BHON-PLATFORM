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

  it('exibe a abertura por quatro segundos em todas as visitas', () => {
    vi.useFakeTimers();
    sessionStorage.setItem('bhon-brand-intro-seen', 'true');
    render(<LoginPage />);

    expect(screen.getByTestId('brand-intro')).toBeVisible();
    act(() => vi.advanceTimersByTime(3999));
    expect(screen.getByTestId('brand-intro')).toBeVisible();
    act(() => vi.advanceTimersByTime(1));
    expect(screen.queryByTestId('brand-intro')).not.toBeInTheDocument();
  });

  it('não anima a abertura quando o usuário prefere movimento reduzido', () => {
    vi.stubGlobal('matchMedia', vi.fn().mockReturnValue({ matches: true }));
    render(<LoginPage />);
    expect(screen.queryByTestId('brand-intro')).not.toBeInTheDocument();
  });

  it('inicia o campo de e-mail vazio para não expor o acesso administrativo', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('Usuário')).toHaveValue('');
  });

  it('reproduz a composição editorial do protótipo aprovado', () => {
    render(<LoginPage />);

    expect(screen.getAllByRole('img', { name: 'BHON' })[0]).toHaveAttribute('src', '/figma-login-symbol.png');
    expect(screen.getByRole('heading', { name: /^login$/i })).toBeVisible();
    expect(screen.getByText(/acreditar no futuro da saúde/i)).toBeVisible();
    expect(screen.getByRole('img', { name: /ambiente clínico minimalista/i })).toHaveAttribute('src', '/figma-login-office.jpg');
  });

  it('mantém somente as informações essenciais para entrar', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('Usuário')).toBeVisible();
    expect(screen.getByLabelText('Senha')).toBeVisible();
    expect(screen.getByRole('checkbox', { name: /lembrar meu acesso/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /^entrar$/i })).toBeVisible();
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
