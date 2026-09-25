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
    expect(within(navigation).getByRole('link', { name: /entrar no dashboard/i })).toHaveAttribute('href', '/login');
    fireEvent.keyDown(navigation, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
  it('provides real destinations for legal documents and support', () => {
    const { container } = render(<BhonLandingPage />);
    expect(container.querySelector('.public-marquee')).toBeNull();
    expect(screen.queryByText('GESTÃO PARA CLÍNICAS DE TODAS AS ESPECIALIDADES')).not.toBeInTheDocument();
    expect(screen.queryByText('BHON / 001')).not.toBeInTheDocument();
    expect(screen.getByText(/transformamos faltas em faturamento/i)).toBeVisible();
    expect(screen.queryByText('01 / A ROTINA MERECE MAIS CLAREZA')).not.toBeInTheDocument();
    expect(screen.queryByText('05 / ANTES DE COMEÇAR')).not.toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /entrar no dashboard/i })[0]).toHaveAttribute('href', '/login');
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
