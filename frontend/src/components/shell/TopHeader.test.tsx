import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { TopHeader } from './TopHeader';

vi.mock('wouter', () => ({ Link: ({ children, href, ...props }: React.ComponentProps<'a'> & { href: string }) => <a href={href} {...props}>{children}</a> }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ currentUser: { name: 'Ana Souza' }, currentClinic: { name: 'Clínica Ana' } }) }));
vi.mock('../../context/DailyAppointmentsContext', () => ({ useDailyAppointments: () => ({
  appointments: [
    { id: '1', status: 'EM_ATENDIMENTO' },
    { id: '2', status: 'CONCLUIDO' },
  ], loading: false, error: '',
}) }));
vi.mock('../common/SearchModal', () => ({ SearchModal: () => null }));

describe('TopHeader', () => {
  it('mantém data e pulso completo acessíveis com resumo compacto no mobile', () => {
    render(<TopHeader />);
    const date = screen.getByText(/feira|sábado|domingo/i);
    expect(date).not.toHaveClass('hidden');
    expect(screen.getByText('Ao vivo: 1')).toBeVisible();
    expect(screen.getByText('2 agendados · 1 concluído · Ao vivo: 1 em atendimento')).toHaveClass('sr-only');
  });
});
