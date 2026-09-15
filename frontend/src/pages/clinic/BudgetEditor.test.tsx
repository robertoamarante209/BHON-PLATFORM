import React from 'react';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetEditor } from './BudgetEditor';

const api = vi.hoisted(() => ({ createBudget: vi.fn(), listPatients: vi.fn() }));
vi.mock('../../lib/clinic', () => api);

describe('editor de orçamento', () => {
  afterEach(cleanup);
  beforeEach(() => {
    api.createBudget.mockReset();
    api.listPatients.mockReset().mockResolvedValue({
      data: [{ id: 'patient-1', name: 'Ana Souza', recordNumber: '#00001', status: 'ACTIVE' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('pesquisa paciente, mostra total exato e persiste o orçamento', async () => {
    api.createBudget.mockResolvedValue({ id: 'budget-1' });
    const onSaved = vi.fn();
    const user = userEvent.setup();
    render(<BudgetEditor open onClose={vi.fn()} onSaved={onSaved} />);

    await user.type(screen.getByLabelText('Buscar paciente'), 'Ana');
    expect(await screen.findByRole('button', { name: /Ana Souza.*#00001/ })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /Ana Souza.*#00001/ }));
    await user.type(screen.getByLabelText('Descrição do item 1'), 'Sessão clínica');
    fireEvent.change(screen.getByLabelText('Quantidade do item 1'), { target: { value: '3' } });
    fireEvent.change(screen.getByLabelText('Valor unitário do item 1'), { target: { value: '0.10' } });
    fireEvent.change(screen.getByLabelText('Desconto'), { target: { value: '0.01' } });
    expect(screen.getByText('R$ 0,29')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Salvar orçamento' }));

    await waitFor(() => expect(api.createBudget).toHaveBeenCalledWith({
      patientId: 'patient-1', title: 'Plano clínico',
      items: [{ description: 'Sessão clínica', quantity: 3, unitPrice: 0.1 }],
      discountAmount: 0.01, paymentMethod: undefined,
    }));
    expect(onSaved).toHaveBeenCalledWith('budget-1');
  });

  it('preserva o rascunho em falha recuperável e impede envio duplicado', async () => {
    let reject!: (error: Error) => void;
    api.createBudget.mockReturnValue(new Promise((_resolve, rejectPromise) => { reject = rejectPromise; }));
    const user = userEvent.setup();
    render(<BudgetEditor open onClose={vi.fn()} onSaved={vi.fn()} />);
    await user.type(screen.getByLabelText('Buscar paciente'), 'Ana');
    await user.click(await screen.findByRole('button', { name: /Ana Souza.*#00001/ }));
    await user.type(screen.getByLabelText('Descrição do item 1'), 'Avaliação clínica');
    fireEvent.change(screen.getByLabelText('Valor unitário do item 1'), { target: { value: '100' } });
    const submit = screen.getByRole('button', { name: 'Salvar orçamento' });
    await user.click(submit);
    await user.click(submit);
    expect(api.createBudget).toHaveBeenCalledTimes(1);
    reject(new Error('Serviço indisponível'));
    expect(await screen.findByRole('alert')).toHaveTextContent('Serviço indisponível');
    expect(screen.getByLabelText('Descrição do item 1')).toHaveValue('Avaliação clínica');
  });
});
