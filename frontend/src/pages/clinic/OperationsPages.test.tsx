import React from 'react';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DocumentsPage, InventoryPage } from './OperationsPages';

const operations = vi.hoisted(() => ({
  createDocument: vi.fn(), createInventoryItem: vi.fn(), listDocuments: vi.fn(), listInventory: vi.fn(),
  moveInventory: vi.fn(), configureIntegration: vi.fn(), listIntegrations: vi.fn(),
}));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ currentUser: { role: 'OWNER' } }) }));
vi.mock('../../lib/clinic', () => ({ listFollowUps: vi.fn() }));
vi.mock('../../lib/operations', () => operations);

describe('formulários operacionais', () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    operations.listInventory.mockResolvedValue([]);
    operations.listDocuments.mockResolvedValue([]);
  });

  it('limpa estoque após persistir sem exibir falso erro', async () => {
    operations.createInventoryItem.mockResolvedValue({ id: 'item-1' });
    const user = userEvent.setup(); render(<InventoryPage />);
    const input = screen.getByPlaceholderText('Material'); await user.type(input, 'Luvas');
    await user.click(screen.getByRole('button', { name: 'Cadastrar material' }));
    await waitFor(() => expect(input).toHaveValue(''));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('limpa documento após persistir sem exibir falso erro', async () => {
    operations.createDocument.mockResolvedValue({ id: 'document-1' });
    const user = userEvent.setup(); render(<DocumentsPage />);
    const title = screen.getByPlaceholderText('Título');
    await user.type(title, 'Consentimento');
    await user.type(screen.getByPlaceholderText('Categoria'), 'Clínico');
    await user.type(screen.getByPlaceholderText('Nome do arquivo'), 'consentimento.pdf');
    await user.type(screen.getByPlaceholderText('https://…'), 'https://example.test/consentimento.pdf');
    await user.click(screen.getByRole('button', { name: 'Cadastrar documento' }));
    await waitFor(() => expect(title).toHaveValue(''));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
