import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ContextualHelp } from './ContextualHelp';

describe('ContextualHelp', () => {
  it('revela a orientação somente quando a pessoa solicita', async () => {
    render(<ContextualHelp title="Como importar" description="Baixe o modelo e revise a prévia antes de confirmar." />);
    expect(screen.queryByText(/baixe o modelo/i)).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /como importar/i }));
    expect(screen.getByText(/baixe o modelo/i)).toBeVisible();
  });
});
