import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

function Probe() {
  const { theme, toggleTheme } = useTheme();
  return <><output>{theme}</output><button type="button" onClick={toggleTheme}>Alternar tema</button></>;
}

describe('ThemeProvider', () => {
  beforeEach(() => localStorage.clear());

  it('alterna o tema clínico e preserva a escolha local', () => {
    render(<ThemeProvider><Probe /></ThemeProvider>);

    expect(screen.getByText('light')).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'Alternar tema' }));
    expect(screen.getByText('dark')).toBeVisible();
    expect(localStorage.getItem('bhon-clinic-theme')).toBe('dark');
  });
});
