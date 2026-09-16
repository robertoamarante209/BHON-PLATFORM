import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Drawer } from './Drawer';

describe('Drawer', () => {
  it('é montado diretamente no documento para não ser recortado por animações da página', () => {
    render(<div className="bhon-clinic-theme bhon-page-enter"><Drawer isOpen onClose={() => undefined} title="Novo paciente"><p>Conteúdo</p></Drawer></div>);

    const dialog = screen.getByRole('dialog');
    expect(dialog.closest('.fixed.inset-0')?.parentElement).toBe(document.body);
    expect(dialog.closest('.bhon-clinic-theme')).not.toBeNull();
    expect(screen.getByText('Conteúdo').parentElement).toHaveClass('text-bhon-text');
  });
});
