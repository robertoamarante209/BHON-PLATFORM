import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PatientsPage } from './PatientsPage';

const api = vi.hoisted(() => ({ createPatient: vi.fn(), listPatients: vi.fn() }));
const auth = vi.hoisted(() => ({ currentUser: { role: 'OWNER', permissions: [] as string[] } }));
vi.mock('wouter', () => ({ useLocation: () => ['/clinic/patients', vi.fn()] }));
vi.mock('../../lib/clinic', () => api);
vi.mock('../../context/AuthContext', () => ({ useAuth: () => auth }));

describe('PatientsPage', () => {
  beforeEach(() => {
    auth.currentUser = { role: 'OWNER', permissions: [] };
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

  it('não oferece cadastro para quem possui somente consulta de pacientes', async () => {
    auth.currentUser = { role: 'VIEWER', permissions: ['patients.view'] };
    render(<PatientsPage />);

    expect(await screen.findByRole('region', { name: 'Lista de pacientes' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Novo paciente' })).not.toBeInTheDocument();
  });
});
