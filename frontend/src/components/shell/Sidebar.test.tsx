import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Sidebar } from './Sidebar';

vi.mock('wouter', () => ({
  Link: ({ href, children, ...props }: React.ComponentProps<'a'> & { href: string }) => <a href={href} {...props}>{children}</a>,
  useLocation: () => ['/clinic/overview'],
}));
vi.mock('../../context/AuthContext', () => ({
  useAuth: () => ({
    currentUser: { name: 'Ana', role: 'OWNER' },
    currentClinic: { name: 'BHON', activeRoomsCount: 0 },
    logout: vi.fn(),
  }),
}));

describe('Sidebar', () => {
  it('usa o novo símbolo da BHON na navegação principal', () => {
    render(<Sidebar />);
    expect(screen.getByRole('img', { name: 'BHON' })).toHaveAttribute('src', '/bhon-symbol.svg');
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
