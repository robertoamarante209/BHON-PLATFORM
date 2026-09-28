import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StartTrialPage } from './StartTrialPage';

describe('StartTrialPage', () => {
  it('discloses the two cycles and requires both legal acceptances', () => {
    render(<StartTrialPage />);
    expect(screen.getByRole('heading', { name: /comece com 14 dias/i })).toBeVisible();
    expect(screen.getByLabelText(/mensal.*r\$ 290/i)).toBeChecked();
    expect(screen.getByLabelText(/termos de uso/i)).toBeRequired();
    expect(screen.getByLabelText(/política de privacidade/i)).toBeRequired();
  });
});
