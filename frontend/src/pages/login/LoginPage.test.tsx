import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginPage } from './LoginPage';

vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({ login: vi.fn() }),
}));

describe('LoginPage', () => {
  beforeEach(() => {
    window.sessionStorage.setItem('bhon:intro-seen', 'true');
  });

  it('inicia o campo de e-mail vazio para não expor o acesso administrativo', () => {
    render(<LoginPage />);

    expect(screen.getByPlaceholderText('seu.nome@clinica.com.br')).toHaveValue('');
  });
});
