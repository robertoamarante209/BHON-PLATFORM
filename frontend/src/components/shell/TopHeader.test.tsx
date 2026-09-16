import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TopHeader } from './TopHeader';

vi.mock('wouter', () => ({ Link: ({ children, href, ...props }: React.ComponentProps<'a'> & { href: string }) => <a href={href} {...props}>{children}</a> }));
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

    render(<TopHeader />);

    expect(screen.getByRole('heading', { name: 'Bom dia.' })).toBeVisible();
    expect(screen.queryByText(/hoje é segunda-feira/i)).not.toBeInTheDocument();
    expect(screen.queryByText('Clínica Ana')).not.toBeInTheDocument();
  });

  it('mantém data e pulso completo acessíveis com resumo compacto no mobile', () => {
    render(<TopHeader />);
    const date = screen.getByText(/feira|sábado|domingo/i, { selector: 'p' });
    expect(date).not.toHaveClass('hidden');
    expect(screen.getByText('Ao vivo: 1')).toBeVisible();
    expect(screen.getByText('1 agendado · 1 concluído · Ao vivo: 1 em atendimento')).toHaveClass('sr-only');
  });
});
