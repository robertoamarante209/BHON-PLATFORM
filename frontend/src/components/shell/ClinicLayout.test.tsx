import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClinicLayout } from './ClinicLayout';
import { ThemeProvider } from '../../context/ThemeContext';

vi.mock('./Sidebar', () => ({ Sidebar: () => <nav>Menu</nav> }));
vi.mock('./TopHeader', () => ({ TopHeader: () => <header>Cabeçalho</header> }));

describe('ClinicLayout', () => {
  it('oferece atalho de teclado para o conteúdo principal', () => {
    render(<ThemeProvider><ClinicLayout><h1>Visão clínica</h1></ClinicLayout></ThemeProvider>);

    expect(screen.getByRole('link', { name: 'Ir para o conteúdo principal' })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
  });

  it('usa a experiência clínica clara e responsiva', () => {
    const { container } = render(<ThemeProvider><ClinicLayout><h1>Visão clínica</h1></ClinicLayout></ThemeProvider>);

    const layout = container.querySelector('.bhon-clinic-theme');
    expect(layout).not.toBeNull();
    expect(layout).not.toHaveClass('bhon-clinic-theme--dark');
    expect(screen.getByRole('main')).toHaveClass('overflow-y-auto');
  });
});
