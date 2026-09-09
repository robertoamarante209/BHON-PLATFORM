import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

describe('LoginPage', () => {
  it('inicia o campo de e-mail vazio para não expor o acesso administrativo', () => {
    render(<LoginPage />);

    expect(screen.getByLabelText('E-mail Institucional')).toHaveValue('');
  });

  it('apresenta a identidade clínica oficial sem linguagem técnica de SaaS', () => {
    render(<LoginPage />);

    expect(screen.getByRole('img', { name: 'BHON — A clínica no controle.' })).toHaveAttribute('src', '/logo-official.jpg');
    expect(screen.getByRole('heading', { name: /sua clínica em perfeita sintonia/i })).toBeInTheDocument();
    expect(screen.queryByText(/multi-tenant/i)).not.toBeInTheDocument();
  });

  it('reúne a apresentação da marca e o acesso na mesma tela', () => {
    render(<LoginPage />);

    expect(screen.getByRole('heading', { name: /sua clínica em perfeita sintonia/i })).toBeVisible();
    expect(screen.getByRole('heading', { name: /bem-vindo de volta/i })).toBeVisible();
    expect(screen.getByRole('button', { name: /entrar na clínica/i })).toBeVisible();
  });
});
