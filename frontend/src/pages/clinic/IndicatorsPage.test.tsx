import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { IndicatorsPage } from './IndicatorsPage';
import { getIndicators } from '../../lib/clinic';

vi.mock('../../lib/clinic', () => ({ getIndicators: vi.fn() }));

describe('IndicatorsPage', () => {
  beforeEach(() => {
    vi.mocked(getIndicators).mockResolvedValue({
      period: 'MONTH',
      range: { start: '2026-09-01T03:00:00.000Z', end: '2026-10-01T03:00:00.000Z' },
      metrics: {
        attendanceRate: null,
        roomOccupancyRate: null,
        roomOccupancyReason: 'Configure os horários de funcionamento para calcular a capacidade disponível.',
        quoteConversionRate: null,
        abandonmentRate: null,
        averageTicket: null,
        activeTreatments: 0,
        receivedRevenue: 0,
        scheduledMinutes: 0,
        activeRoomsCount: 0,
      },
      productivity: [],
    });
  });

  it('mostra ausência de base sem inventar percentuais', async () => {
    render(<IndicatorsPage />);

    expect(await screen.findAllByText('Sem base suficiente')).not.toHaveLength(0);
    expect(screen.queryByText('88.2%')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhuma produção clínica registrada no período')).toBeInTheDocument();
  });
});
