import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProtocolEditor } from './ProtocolEditor';

describe('ProtocolEditor', () => {
  it('mantém etapas ordenadas e permite desativar sem excluir', async () => {
    const user = userEvent.setup(); const onSave = vi.fn().mockResolvedValue(undefined);
    render(<ProtocolEditor protocols={[]} canManage onSave={onSave} />);
    await user.click(screen.getByRole('button', { name: /novo protocolo/i }));
    await user.type(screen.getByLabelText(/título/i), 'Protocolo da clínica');
    await user.type(screen.getByLabelText(/etapa 1/i), 'Primeira');
    await user.click(screen.getByRole('button', { name: /adicionar etapa/i }));
    await user.type(screen.getByLabelText(/etapa 2/i), 'Segunda');
    await user.click(screen.getByRole('button', { name: /^salvar$/i }));
    expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ steps: ['Primeira', 'Segunda'] }));
    expect(screen.queryByRole('button', { name: /excluir/i })).not.toBeInTheDocument();
  });
});
