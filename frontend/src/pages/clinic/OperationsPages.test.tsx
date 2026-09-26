import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentsPage, IntegrationsPage, InventoryPage, WhatsAppPage } from './OperationsPages';

const api = vi.hoisted(() => ({ listDocuments: vi.fn(), listInventory: vi.fn(), listFollowUps: vi.fn() }));
vi.mock('../../lib/operations', () => api);
vi.mock('../../lib/clinic', () => api);

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ currentUser: { role: 'OWNER' } }) }));

describe('IntegrationsPage', () => {
  it('offers CFO as guided external access without claiming connection or automatic recording', () => {
    render(<IntegrationsPage />);
    const cfoCard = screen.getByRole('heading', { name: 'Prescrição eletrônica CFO', level: 2 }).closest('article');
    expect(cfoCard).not.toBeNull();
    expect(within(cfoCard!).getByText('Acesso guiado')).toBeInTheDocument();
    const link = within(cfoCard!).getByRole('link', { name: 'Prescrição eletrônica CFO' });
    expect(link).toHaveAttribute('href', 'https://prescricao.cfo.org.br/login');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
    expect(link.getAttribute('href')).not.toContain('?');
    expect(cfoCard).toHaveTextContent(/o profissional emite e assina externamente/i);
    expect(cfoCard).toHaveTextContent(/BHON não transmite dados clínicos nem considera a prescrição registrada automaticamente/i);
    expect(cfoCard).not.toHaveTextContent(/conectado/i);
    expect(cfoCard).not.toHaveTextContent(/registro do documento no prontuário/i);

    const stripeCard = screen.getByRole('heading', { name: 'Stripe', level: 2 }).closest('article');
    expect(stripeCard).not.toBeNull();
    expect(within(stripeCard!).getByText('Não conectado')).toBeInTheDocument();
    expect(within(stripeCard!).getByRole('button', { name: 'Configuração em breve' })).toBeDisabled();
    expect(screen.getByRole('heading', { name: 'Integrações', level: 1 })).toBeInTheDocument();
  });
});

describe('OperationsPages request state', () => {
  it.each([
    ['documentos', DocumentsPage, api.listDocuments],
    ['estoque', InventoryPage, api.listInventory],
    ['contatos', WhatsAppPage, api.listFollowUps],
  ] as const)('não apresenta %s vazios depois de uma falha', async (_name, Page, request) => {
    request.mockRejectedValue(new Error('Serviço indisponível'));
    render(<Page />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Serviço indisponível');
    expect(screen.queryByText(/Nenhum (documento|material|contato)/)).not.toBeInTheDocument();
    expect(screen.queryByText('0 contatos com telefone disponível')).not.toBeInTheDocument();
  });
});
