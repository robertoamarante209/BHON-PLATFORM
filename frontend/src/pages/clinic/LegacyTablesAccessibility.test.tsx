import React from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BudgetsPage } from './BudgetsPage';
import { FollowUpsPage } from './FollowUpsPage';
import { TreatmentsPage } from './TreatmentsPage';

const api = vi.hoisted(() => ({
  approveBudget: vi.fn(),
  executeFollowUpAction: vi.fn(),
  listBudgets: vi.fn(),
  listFollowUps: vi.fn(),
  listTreatments: vi.fn(),
  updateTreatmentStageStatus: vi.fn(),
  updateTreatmentStatus: vi.fn(),
}));
const auth = vi.hoisted(() => ({ currentUser: { role: 'OWNER', permissions: undefined as string[] | undefined } }));

vi.mock('wouter', () => ({ useLocation: () => ['', vi.fn()] }));
vi.mock('../../context/AuthContext', () => ({ useAuth: () => ({ currentUser: auth.currentUser }) }));
vi.mock('../../lib/clinic', () => api);

const pagination = { page: 1, limit: 20, total: 1, totalPages: 1 };

describe('tabelas clínicas acessíveis', () => {
  afterEach(cleanup);

  beforeEach(() => {
    auth.currentUser = { role: 'OWNER', permissions: undefined };
    api.listBudgets.mockResolvedValue({
      data: [{ id: 'budget-1', patientId: 'patient-1', patientName: 'Paciente Orçamento', patientRecordNumber: '#00001', treatmentTitle: 'Plano clínico', createdByName: 'Responsável', totalAmount: 1000, discountAmount: 0, finalAmount: 1000, paymentMethod: 'PIX', status: 'DRAFT', items: [] }],
      metrics: { totalInNegotiation: 1000, noResponseCount: 0, approvedCount: 0, rejectedCount: 0, conversionRate: null },
      pagination,
    });
    api.listTreatments.mockResolvedValue({
      data: [{ id: 'treatment-1', patientId: 'patient-1', patientName: 'Paciente Tratamento', patientRecordNumber: '#00002', name: 'Tratamento clínico', status: 'ACTIVE', progressPercent: 0, stages: [], totalValue: 1000 }],
      pagination,
    });
    api.listFollowUps.mockResolvedValue({
      data: [{ id: 'follow-up-1', patientId: 'patient-1', patientName: 'Paciente Acompanhamento', patientRecordNumber: '#00003', category: 'RETORNO', reason: 'Retorno clínico', deadlineAt: '2026-09-10T12:00:00.000Z', status: 'PENDENTE' }],
      assignees: [],
      metrics: { pendingToday: 0, categoryCounts: {} },
      pagination,
    });
  });

  it('abre orçamento somente pelo botão sem tornar a linha clicável', async () => {
    render(<BudgetsPage />);
    const row = (await screen.findByText('Paciente Orçamento')).closest('tr');
    expect(row).not.toBeNull();
    fireEvent.click(row!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dossiê' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('oculta aprovação quando gestor possui permissões explícitas vazias', async () => {
    auth.currentUser = { role: 'ADMIN', permissions: [] };
    render(<BudgetsPage />);
    await screen.findByText('Paciente Orçamento');
    expect(screen.queryByRole('button', { name: 'Aprovar' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dossiê' }));
    expect(screen.queryByRole('button', { name: /Aprovar e ativar tratamento/ })).not.toBeInTheDocument();
  });

  it('abre tratamento somente pelo botão sem tornar a linha clicável', async () => {
    render(<TreatmentsPage />);
    const row = (await screen.findByText('Paciente Tratamento')).closest('tr');
    expect(row).not.toBeNull();
    fireEvent.click(row!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dossiê' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('abre acompanhamento somente pelo botão sem tornar a linha clicável', async () => {
    render(<FollowUpsPage />);
    const card = (await screen.findByText('Paciente Acompanhamento')).closest('article');
    expect(card).not.toBeNull();
    fireEvent.click(card!);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Registrar contato com Paciente Acompanhamento' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});
