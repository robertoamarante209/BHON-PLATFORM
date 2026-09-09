import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BrandIntro } from './BrandIntro';

describe('BrandIntro', () => {
  it('apresenta a marca e permite seguir imediatamente para o login', () => {
    const onComplete = vi.fn();
    render(<BrandIntro onComplete={onComplete} />);

    expect(screen.getByRole('img', { name: 'BHON — A clínica no controle.' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Pular introdução' }));
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
