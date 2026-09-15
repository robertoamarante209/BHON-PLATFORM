import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

const auth = vi.hoisted(() => ({
  currentUser: { name: 'Ana', role: 'OWNER', permissions: [] as string[] },
}));

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<'a'> & { href: string }) => <a href={href} {...props}>{children}</a>,
  useLocation: () => ['/clinic/overview'],
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: auth.currentUser,
    currentClinic: { name: 'BHON', activeRoomsCount: 0 },
    logout: vi.fn(),
  }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    auth.currentUser = { name: 'Ana', role: 'OWNER', permissions: [] };
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

  it('mantém a navegação diária curta e revela ferramentas sob demanda', async () => {
    const user = userEvent.setup();
    render(<Sidebar />);
    const desktopNavigation = screen.getByRole('navigation', { name: 'Navegação clínica' });
    expect(within(desktopNavigation).queryByRole('link', { name: 'Configurações' })).not.toBeInTheDocument();
    await user.click(within(desktopNavigation).getByRole('button', { name: 'Mostrar ferramentas de gestão' }));
    expect(within(desktopNavigation).getByRole('link', { name: 'Configurações' })).toBeInTheDocument();
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
    expect(within(dialog).queryByRole('link', { name: 'Integrações' })).not.toBeInTheDocument();
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Navegação clínica' })).not.toBeInTheDocument();
  });

  it('mostra somente áreas autorizadas para cada acesso individual', async () => {
    auth.currentUser = { name: 'Bia', role: 'RECEPTIONIST', permissions: ['agenda.view'] };
    const user = userEvent.setup();
    render(<Sidebar />);

    const desktopNavigation = screen.getByRole('navigation', { name: 'Navegação clínica' });
    expect(within(desktopNavigation).getByRole('link', { name: 'Agenda clínica' })).toBeInTheDocument();
    expect(within(desktopNavigation).queryByRole('link', { name: 'Pacientes' })).not.toBeInTheDocument();
    expect(within(desktopNavigation).queryByRole('link', { name: 'Recuperar orçamentos' })).not.toBeInTheDocument();
    expect(within(desktopNavigation).queryByRole('link', { name: 'Equipe' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Abrir menu' }));
    const dialog = screen.getByRole('dialog', { name: 'Navegação clínica' });
    expect(within(dialog).getByRole('link', { name: 'Agenda clínica' })).toBeInTheDocument();
    expect(within(dialog).queryByRole('link', { name: 'Pacientes' })).not.toBeInTheDocument();
  });
});
