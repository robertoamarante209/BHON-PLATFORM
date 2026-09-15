import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AvailabilityEditor } from './AvailabilityEditor';

describe('AvailabilityEditor', () => {
  it('distingue não configurado de fechado e permite intervalos separados', async () => {
    const user = userEvent.setup(); const onSave = vi.fn().mockResolvedValue(undefined);
    const { rerender } = render(<AvailabilityEditor value={null} canManage onSave={onSave} />);
    expect(screen.getByText(/ainda não configurada/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /configurar semana/i }));
    await user.click(screen.getByRole('button', { name: /adicionar intervalo/i }));
    expect(screen.getAllByLabelText(/início/i)).toHaveLength(1);
    rerender(<AvailabilityEditor value={{ professionalId: null, intervals: [], version: 1 }} canManage onSave={onSave} />);
    expect(screen.getByText(/semana fechada/i)).toBeInTheDocument();
  });
});
