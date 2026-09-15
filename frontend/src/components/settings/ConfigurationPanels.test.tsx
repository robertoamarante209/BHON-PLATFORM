import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AvailabilitySettingsPanel } from './ConfigurationPanels';

const api = vi.hoisted(() => ({ getAvailability: vi.fn(), getAvailabilityProfessionals: vi.fn(), saveAvailability: vi.fn() }));
vi.mock('../../lib/clinicConfiguration', async (original) => ({ ...(await original()), ...api }));

describe('AvailabilitySettingsPanel', () => {
  beforeEach(() => { api.getAvailability.mockReset(); api.getAvailabilityProfessionals.mockResolvedValue([{ id: 'p1', name: 'Ana' }]); });
  it('não exibe nem salva dados antigos enquanto troca de profissional e falha', async () => {
    const user = userEvent.setup();
    api.getAvailability.mockResolvedValueOnce({ professionalId: null, intervals: [{ dayOfWeek: 1, start: '08:00', end: '09:00' }], version: 4 }).mockRejectedValueOnce(new Error('Falha ao buscar'));
    render(<AvailabilitySettingsPanel user={{ role: 'OWNER', permissions: [] }} />);
    expect(await screen.findByDisplayValue('08:00')).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText('Escopo da disponibilidade'), 'p1');
    expect(screen.queryByDisplayValue('08:00')).not.toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent('Falha ao buscar');
    expect(screen.queryByRole('button', { name: /salvar disponibilidade/i })).not.toBeInTheDocument();
  });
});
