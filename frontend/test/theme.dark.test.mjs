import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const stylesheet = readFileSync(resolve(process.cwd(), 'src', 'index.css'), 'utf8');

describe('contraste do modo noturno da clínica', () => {
  it('força superfícies utilitárias claras a usar a camada noturna', () => {
    expect(stylesheet).toContain('.bhon-clinic-theme--dark .bg-white');
    expect(stylesheet).toMatch(/\.bhon-clinic-theme--dark \.bg-white,[\s\S]*background-color:\s*var\(--color-surface\)\s*!important;/);
  });

  it('define texto secundário legível no tema noturno', () => {
    expect(stylesheet).toMatch(/\.bhon-clinic-theme--dark\s*\{[\s\S]*--color-muted:\s*#B6C7C1;/);
  });
});
