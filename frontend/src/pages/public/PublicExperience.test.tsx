import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BhonLandingPage } from './BhonLandingPage';

describe('public navigation', () => {
  it('opens, closes and restores focus from mobile navigation', () => {
    render(<BhonLandingPage />);
    const trigger = screen.getByRole('button', { name: 'Abrir navegação' });
    trigger.focus();
    fireEvent.click(trigger);
    const navigation = screen.getByRole('dialog', { name: 'Navegação' });
    expect(within(navigation).getByRole('link', { name: 'Entrar' })).toHaveAttribute('href', '/login');
    fireEvent.keyDown(navigation, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('provides real destinations for legal documents and support', () => {
    render(<BhonLandingPage />);
    expect(screen.getByRole('link', { name: 'Termos de Uso' })).toHaveAttribute('href', '/termos');
    expect(screen.getByRole('link', { name: 'Política de Privacidade' })).toHaveAttribute('href', '/privacidade');
    expect(screen.getByRole('link', { name: 'bhonsuport@gmail.com' })).toHaveAttribute('href', 'mailto:bhonsuport@gmail.com');
  });
  it('restores the requested section when the landing page mounts after navigation', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(Element.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    window.history.replaceState(null, '', '/#planos');
    render(<BhonLandingPage />);
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
  });
});
