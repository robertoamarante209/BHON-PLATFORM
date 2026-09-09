import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage, GOOGLE_BUTTON_OPTIONS } from './LoginPage';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn(), loginWithGoogle: vi.fn() }),
}));

describe('LoginPage', () => {
  it('inicia o campo de e-mail vazio para não expor o acesso administrativo', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('E-mail Institucional')).toHaveValue('');
  });

  it('apresenta a marca clara aprimorada sobre a entrada', () => {
    render(<LoginPage />);

    expect(screen.getByRole('img', { name: 'BHON' })).toHaveAttribute('src', '/logo-bhon-light.svg');
    expect(screen.getByRole('heading', { name: /acesse sua clínica/i })).toBeVisible();
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

  it('usa o botão Google oficial em tema escuro compatível com a identidade BHON', () => {
    expect(GOOGLE_BUTTON_OPTIONS).toMatchObject({
      type: 'standard',
      theme: 'outline_dark',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      locale: 'pt-BR',
    });
  });
});
