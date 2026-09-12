import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

const route = vi.hoisted(() => ({ pathname: '/clinic/overview', search: '' }));
const userRole = vi.hoisted(() => ({ value: 'OWNER' }));
vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<'a'> & { href: string }) => <a href={href} {...props}>{children}</a>,
  useLocation: () => [route.pathname],
  useSearch: () => route.search,
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { name: 'Ana', role: userRole.value },
    currentClinic: { name: 'BHON', activeRoomsCount: 0 },
    logout: vi.fn(),
  }),
}));

describe('Sidebar', () => {
  beforeEach(() => { route.pathname = '/clinic/overview'; route.search = ''; userRole.value = 'OWNER'; });

  it('oculta a área financeira para um perfil sem permissão de leitura', async () => {
    userRole.value = 'DENTIST';
    render(<Sidebar />);
    expect(screen.queryByRole('link', { name: 'Financeiro' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Abrir menu' }));
    expect(screen.queryByRole('link', { name: 'Financeiro' })).not.toBeInTheDocument();
  });

  it('seleciona exclusivamente a recuperação e acompanha mudanças de query', () => {
    route.pathname = '/clinic/follow-ups';
    route.search = 'category=ORCAMENTO&focus=budget-1';
    const { rerender } = render(<Sidebar />);
    const nav = within(screen.getByRole('navigation', { name: 'Navegação clínica' }));
    expect(nav.getByRole('link', { current: 'page' })).toHaveAccessibleName('Recuperar orçamentos');
    route.search = 'category=RETORNO';
    rerender(<Sidebar />);
    expect(nav.getByRole('link', { current: 'page' })).toHaveAccessibleName('Acompanhamentos');
    route.pathname = '/clinic/patients/123';
    rerender(<Sidebar />);
    expect(nav.getByRole('link', { current: 'page' })).toHaveAccessibleName('Pacientes');
  });

  it('contém o foco e a interação no menu e restaura o botão de abertura', async () => {
    const user = userEvent.setup();
    const { container } = render(<Sidebar />);
    const opener = screen.getByRole('button', { name: 'Abrir menu' });
    await user.click(opener);
    const dialog = screen.getByRole('dialog', { name: 'Navegação clínica' });
    const close = within(dialog).getByRole('button', { name: 'Fechar navegação' });
    const logout = within(dialog).getByRole('button', { name: 'Sair do sistema' });
    expect(close).toHaveFocus();
    expect(container).toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('hidden');
    await user.tab({ shift: true });
    expect(logout).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.keyboard('{Escape}');
    expect(opener).toHaveFocus();
    expect(container).not.toHaveAttribute('inert');
    expect(document.body.style.overflow).toBe('');
  });
  it('usa a identidade oficial transparente da BHON na navegação principal', () => {
    render(<Sidebar />);
    expect(screen.getByRole('img', { name: 'BHON' })).toHaveAttribute('src', '/logo-bhon-dark.svg');
  });

  it('destaca recuperação de orçamentos na navegação clínica', () => {
    render(<Sidebar />);
    expect(screen.getAllByRole('link', { name: 'Recuperar orçamentos' })).toEqual(
      expect.arrayContaining([expect.objectContaining({ href: expect.stringContaining('/clinic/follow-ups?category=ORCAMENTO') })]),
    );
  });

  it('abre navegação móvel completa e fecha com Escape', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Navegação clínica' });
    expect(within(dialog).getByRole('link', { name: 'Configurações' })).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: 'WhatsApp' })).toHaveAttribute('href', '/clinic/whatsapp');
    expect(within(dialog).getByRole('link', { name: 'Estoque' })).toHaveAttribute('href', '/clinic/inventory');
    expect(within(dialog).getByRole('link', { name: 'Documentos' })).toHaveAttribute('href', '/clinic/documents');
    expect(within(dialog).getByRole('link', { name: 'Integrações' })).toHaveAttribute('href', '/clinic/integrations');
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Navegação clínica' })).not.toBeInTheDocument();
  });
});
