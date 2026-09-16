import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RecoveryQueue } from './RecoveryQueue';

const apiRequest = vi.hoisted(() => vi.fn());
vi.mock('../../lib/api', () => ({ apiRequest }));

describe('RecoveryQueue', () => {
  it('separa a ação prioritária dos detalhes operacionais em uma leitura vertical', async () => {
    apiRequest.mockResolvedValueOnce({
      assignees: [],
      metrics: { actionsRequiringAttention: 1, financialExposure: 1200, overdueActions: 0, inactiveBudgets: 0, stalledOpportunities: 0, treatmentsAtRisk: 0, overduePayments: 0, inactiveQuoteValue: 0, overdueReceivables: 0 },
      items: [{
        id: 'recovery-1', source: 'FOLLOW_UP', sourceId: 'follow-up-1', priority: 'HIGH', signal: 'Falta', reason: 'Paciente faltou sem aviso.',
        patient: { id: 'patient-1', name: 'Paciente Validação', recordNumber: '#00001', phone: null }, valueAtRisk: 1200,
        responsible: { id: 'user-1', name: 'Recepção' }, detectedAt: '2026-09-16T12:00:00.000Z', deadline: null, ageDays: 1,
        nextAction: 'Retomar contato hoje', state: 'PENDENTE', href: '/clinic/follow-ups',
      }],
    });

    render(<RecoveryQueue onNavigate={vi.fn()} />);

    expect(await screen.findByRole('heading', { name: 'Ações prioritárias' })).toBeVisible();
    expect(screen.getByText('Paciente Validação')).toBeVisible();
    expect(screen.getByRole('button', { name: /executar/i })).toBeVisible();
  });
});
