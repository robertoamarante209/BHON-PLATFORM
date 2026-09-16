import { describe, expect, it } from 'vitest';
import { buildWhatsAppMessage } from './whatsappTemplates';

const values = {
  clinicName: 'Clínica Horizonte',
  patientName: 'Marina',
  date: '18/09',
  time: '14:30',
  procedure: 'avaliação',
};

describe('buildWhatsAppMessage', () => {
  it('prepara uma confirmação com contexto e escolha simples', () => {
    const message = buildWhatsAppMessage('CONFIRMATION', values);

    expect(message).toContain('Marina');
    expect(message).toContain('18/09 às 14:30');
    expect(message).toContain('confirmar ou ajustar o horário');
  });

  it('retoma uma ausência de forma acolhedora e sem culpa', () => {
    expect(buildWhatsAppMessage('MISSED_APPOINTMENT', values)).toContain('conte com a gente');
  });

  it('recupera um orçamento convidando perguntas, sem pressão artificial', () => {
    const message = buildWhatsAppMessage('BUDGET_FOLLOW_UP', values);

    expect(message).toContain('tirar suas dúvidas');
    expect(message).not.toMatch(/última chance|só hoje|vagas limitadas/i);
  });

  it('mantém o próximo passo claro durante a continuidade do tratamento', () => {
    expect(buildWhatsAppMessage('TREATMENT_CONTINUITY', values)).toContain('próximo passo');
  });
});
