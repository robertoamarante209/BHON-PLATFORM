import { describe, expect, it } from 'vitest';
import { buildRecoveryWhatsAppDraft } from './recovery';

describe('buildRecoveryWhatsAppDraft', () => {
  it('creates a clear, non-presumptive draft for a pending clinical follow-up', () => {
    expect(buildRecoveryWhatsAppDraft({ patientName: 'Ana Silva', reason: 'Orçamento do tratamento', nextAction: 'Revisar as opções de pagamento' })).toBe(
      'Olá, Ana. Aqui é da clínica. Estamos entrando em contato para dar continuidade ao seu orçamento do tratamento. Podemos ajudar a revisar as opções de pagamento?'
    );
  });

  it('uses a neutral next step when the follow-up has no suggested action', () => {
    expect(buildRecoveryWhatsAppDraft({ patientName: 'Bruno', reason: 'retorno clínico' })).toContain('Podemos encontrar o melhor horário para você?');
  });
});
