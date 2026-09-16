import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TopHeader } from './TopHeader';
import { ThemeProvider } from '../../context/ThemeContext';

const router = vi.hoisted(() => ({ location: '/clinic/overview' }));

vi.mock('wouter', () => ({
  Link: ({ children, href, ...props }: React.ComponentProps<'a'> & { href: string }) => <a href={href} {...props}>{children}</a>,
  useLocation: () => [router.location, vi.fn()],
}));
vi.mock('../../context/DailyAppointmentsContext', () => ({ useDailyAppointments: () => ({
  appointments: [
    { id: '1', status: 'EM_ATENDIMENTO' },
    { id: '2', status: 'CONCLUIDO' },
  ], loading: false, error: '',
}) }));
vi.mock('../common/SearchModal', () => ({ SearchModal: () => null }));

describe('TopHeader', () => {
  afterEach(() => vi.useRealTimers());

  it('mantém o cumprimento acolhedor e deixa os números no indicador operacional', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-14T12:00:00.000Z'));

    render(<ThemeProvider><TopHeader /></ThemeProvider>);

    expect(screen.getByRole('heading', { name: 'Bom dia.' })).toBeVisible();
    expect(screen.queryByText(/hoje é segunda-feira/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Clínica Ana')).not.toBeInTheDocument();
  });

  it('mantém data e pulso completo acessíveis com resumo compacto no mobile', () => {
    render(<ThemeProvider><TopHeader /></ThemeProvider>);
    const date = screen.getByText(/feira|sábado|domingo/i, { selector: 'p' });
    expect(date).not.toHaveClass('hidden');
    expect(screen.getByText('Ao vivo: 1')).toBeVisible();
    expect(screen.getByText('1 agendado · 1 concluído · Ao vivo: 1 em atendimento')).toHaveClass('sr-only');
  });

  it('mostra o cumprimento apenas na visão geral', () => {
    router.location = '/clinic/agenda';

    render(<ThemeProvider><TopHeader /></ThemeProvider>);

    expect(screen.queryByRole('heading', { name: /bom dia|boa tarde|boa noite/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/feira|sábado|domingo/i, { selector: 'p' })).not.toBeInTheDocument();
  });

  it('alterna o tema clínico por um controle acessível', () => {
    render(<ThemeProvider><TopHeader /></ThemeProvider>);

    fireEvent.click(screen.getByRole('button', { name: 'Alternar para tema escuro' }));

    expect(screen.getByRole('button', { name: 'Alternar para tema claro' })).toBeVisible();
  });
});
