import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientsPage } from './PatientsPage';

const api = vi.hoisted(() => ({ createPatient: vi.fn(), listPatients: vi.fn() }));
vi.mock('wouter', () => ({ useLocation: () => ['/clinic/patients', vi.fn()] }));
vi.mock('../../lib/clinic', () => api);

describe('PatientsPage', () => {
  beforeEach(() => {
    api.listPatients.mockResolvedValue({
      data: [{ id: 'p1', tenantId: 't1', recordNumber: '#0001', name: 'Maria Silva', phone: '(11) 99999-0000', status: 'ACTIVE', createdAt: '2026-09-01' }],
      pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
    });
  });

  it('oferece uma lista responsiva e cadastro progressivo', async () => {
    render(<PatientsPage />);

    expect(await screen.findByRole('region', { name: 'Lista de pacientes' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Novo paciente' })).toBeInTheDocument();
  });
});
