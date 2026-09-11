import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { ClinicLayout } from './ClinicLayout';

vi.mock('./Sidebar', () => ({ Sidebar: () => <nav>Menu</nav> }));
vi.mock('./TopHeader', () => ({ TopHeader: () => <header>Cabeçalho</header> }));

describe('ClinicLayout', () => {
  it('oferece atalho de teclado para o conteúdo principal', () => {
    render(<ClinicLayout><h1>Visão clínica</h1></ClinicLayout>);

    expect(screen.getByRole('link', { name: 'Ir para o conteúdo principal' })).toHaveAttribute('href', '#main-content');
    expect(screen.getByRole('main')).toHaveAttribute('tabindex', '-1');
  });

  it('usa a experiência clínica clara e responsiva', () => {
    const { container } = render(<ClinicLayout><h1>Visão clínica</h1></ClinicLayout>);

    expect(container.firstChild).toHaveClass('bhon-clinic-theme');
    expect(container.firstChild).not.toHaveClass('bhon-dark-theme');
    expect(screen.getByRole('main')).toHaveClass('overflow-y-auto');
  });
});
