import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DocumentsPage, IntegrationsPage, InventoryPage, WhatsAppPage } from './OperationsPages';

const api = vi.hoisted(() => ({ listDocuments: vi.fn(), listInventory: vi.fn(), listFollowUps: vi.fn() }));
vi.mock('../../lib/operations', () => api);
vi.mock('../../lib/clinic', () => api);

vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ currentUser: { role: 'OWNER' } }) }));

describe('IntegrationsPage', () => {
  it('explica a aprovação pendente sem oferecer configuração ou conexão', () => {
    render(<IntegrationsPage />);
    expect(screen.getByRole('status')).toHaveTextContent(/aguardam aprovação/i);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
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
