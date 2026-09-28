// @ts-expect-error Vitest executes this regression under Node; the browser bundle never imports it.
import { readFileSync } from 'node:fs';
// @ts-expect-error See note above; keeping Node types out of the production frontend is intentional.
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const source = (relativePath: string) =>
  readFileSync(fileURLToPath(new URL(relativePath, import.meta.url)), 'utf8');

describe('contratos visuais da BHON', () => {
  it('não exibe o checkout interno de R$ 1 no faturamento', () => {
    expect(source('../pages/platform/PlatformBillingPage.tsx')).not.toContain('Testar checkout R$ 1');
  });

  it('usa superfícies semânticas na central da Anna', () => {
    const secretaryConsole = source('../components/secretary/SecretaryConsole.tsx');
    expect(secretaryConsole).toContain('Secretária Anna');
    expect(secretaryConsole).toContain('bg-bhon-surface');
    expect(secretaryConsole).not.toContain('bg-white');
  });
});
