import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PlatformOverviewPage } from './PlatformOverviewPage';

vi.mock('wouter', () => ({ useLocation: () => ['/platform/overview', vi.fn()] }));
vi.mock('../../components/common/StatusBadge', () => ({ StatusBadge: () => <span>Status</span> }));
vi.mock('../../components/common/MetricCard', () => ({ MetricCard: () => null }));
vi.mock('../../context/OperationalDataContext', () => ({
  useOperationalData: () => ({
    platformClinics: [
      { id: 'clinic-1', name: 'Clínica Horizonte', ownerName: 'Ana', planName: 'Profissional', mrr: 1200, status: 'ATIVA', lastActivityAt: 'Hoje' },
      { id: 'clinic-2', name: 'Clínica Central', ownerName: 'Bruno', planName: 'Essencial', mrr: 800, status: 'PAGAMENTO_PENDENTE', lastActivityAt: 'Ontem' },
    ],
    platformInvoices: [{ id: 'invoice-1', amount: 800, status: 'ATRASADO' }],
    supportTickets: [],
  }),
}));

describe('PlatformOverviewPage', () => {
  it('mostra visualizações operacionais baseadas na carteira disponível', () => {
    render(<PlatformOverviewPage />);

    expect(screen.getByRole('heading', { name: 'Visualizações operacionais' })).toBeVisible();
    expect(screen.getByText('MRR por clínica')).toBeVisible();
    expect(screen.getByText('Saúde da carteira')).toBeVisible();
  });
});
