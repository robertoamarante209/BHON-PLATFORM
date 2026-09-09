import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlatformUnavailablePage } from './PlatformUnavailablePage';

describe('PlatformUnavailablePage', () => {
  it('identifica explicitamente um módulo sem backend sem apresentar dados demonstrativos', () => {
    render(<PlatformUnavailablePage title="Faturamento" description="Gestão das assinaturas da plataforma." />);

    expect(screen.getByRole('heading', { name: 'Faturamento' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Módulo não configurado');
    expect(screen.getByText(/nenhum dado demonstrativo/i)).toBeInTheDocument();
  });
});
