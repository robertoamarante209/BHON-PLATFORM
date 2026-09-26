import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
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

  it('mantém os indicadores do período mais recente quando uma consulta anterior termina depois', async () => {
    let resolveMonth: ((value: Awaited<ReturnType<typeof getIndicators>>) => void) | undefined;
    let resolveWeek: ((value: Awaited<ReturnType<typeof getIndicators>>) => void) | undefined;
    const monthResult = new Promise<Awaited<ReturnType<typeof getIndicators>>>((resolve) => { resolveMonth = resolve; });
    const weekResult = new Promise<Awaited<ReturnType<typeof getIndicators>>>((resolve) => { resolveWeek = resolve; });
    vi.mocked(getIndicators).mockReturnValueOnce(monthResult).mockReturnValueOnce(weekResult);

    const user = userEvent.setup();
    render(<IndicatorsPage />);
    await user.click(screen.getByRole('button', { name: 'Semana' }));

    resolveWeek?.({
      period: 'WEEK', range: { start: '2026-09-21T03:00:00.000Z', end: '2026-09-28T03:00:00.000Z' },
      metrics: { attendanceRate: 75, roomOccupancyRate: null, roomOccupancyReason: 'Sem capacidade configurada.', quoteConversionRate: null, abandonmentRate: null, averageTicket: null, activeTreatments: 2, receivedRevenue: 1200, scheduledMinutes: 90, activeRoomsCount: 1 },
      productivity: [],
    });
    expect(await screen.findByText('75%')).toBeInTheDocument();

    resolveMonth?.({
      period: 'MONTH', range: { start: '2026-09-01T03:00:00.000Z', end: '2026-10-01T03:00:00.000Z' },
      metrics: { attendanceRate: 10, roomOccupancyRate: null, roomOccupancyReason: 'Sem capacidade configurada.', quoteConversionRate: null, abandonmentRate: null, averageTicket: null, activeTreatments: 1, receivedRevenue: 100, scheduledMinutes: 60, activeRoomsCount: 1 },
      productivity: [],
    });

    await new Promise((resolve) => setTimeout(resolve, 0));
    await waitFor(() => {
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.queryByText('10%')).not.toBeInTheDocument();
    });
  });
});
