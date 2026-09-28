import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ActivationChecklist } from './ActivationChecklist';

const snapshot = {
  dismissed: false,
  completedSteps: 1,
  totalSteps: 6,
  steps: [
    { key: 'PROFILE' as const, complete: true },
    { key: 'PATIENTS' as const, complete: false },
    { key: 'TEAM' as const, complete: false },
    { key: 'AGENDA' as const, complete: false },
    { key: 'OPPORTUNITY' as const, complete: false },
    { key: 'SARAH_MESSAGE' as const, complete: false },
  ],
  nextStep: { key: 'PATIENTS' as const, complete: false },
  eventContract: { acceptsOnly: ['ONBOARDING_OPENED'] as const },
};

describe('ActivationChecklist', () => {
  it('orienta o primeiro resultado e navega para pacientes sem bloquear a operação', async () => {
    const onNavigate = vi.fn();
    render(<ActivationChecklist snapshot={snapshot} onRefresh={vi.fn()} onNavigate={onNavigate} />);

    expect(screen.getByRole('heading', { name: /primeiro resultado/i })).toBeVisible();
    await userEvent.click(screen.getByRole('button', { name: /importar pacientes/i }));
    expect(onNavigate).toHaveBeenCalledWith('/clinic/patients');
  });

  it('não aparece quando o roteiro está dispensado', () => {
    const { container } = render(<ActivationChecklist snapshot={{ ...snapshot, dismissed: true }} onRefresh={vi.fn()} onNavigate={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});
