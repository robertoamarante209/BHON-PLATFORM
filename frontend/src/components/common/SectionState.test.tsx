import { render, screen } from '@testing-library/react';
import { Settings } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import { SectionState } from './SectionState';

describe('SectionState', () => {
  it('explica o estado e mantém a ação acessível', () => {
    render(<SectionState icon={Settings} title="Ainda não configurado" description="Cadastre os dados para continuar." action={<button type="button">Configurar</button>} />);

    expect(screen.getByRole('heading', { name: 'Ainda não configurado' })).toBeInTheDocument();
    expect(screen.getByText('Cadastre os dados para continuar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Configurar' })).toBeEnabled();
  });
});
