import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { BhonLandingPage } from './BhonLandingPage';

describe('BhonLandingPage', () => {
  it('presents the approved offer with an explicit trial and two billing cycles', () => {
    render(<BhonLandingPage />);
    expect(screen.getByRole('heading', { name: /a clínica no controle/i })).toBeVisible();
    expect(screen.getByText('R$ 290')).toBeVisible();
    expect(screen.getByText('R$ 2.900')).toBeVisible();
    expect(screen.getAllByText(/14 dias para testar/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('link', { name: /começar teste grátis/i })[0]).toHaveAttribute('href', '/comece');
  });
});
