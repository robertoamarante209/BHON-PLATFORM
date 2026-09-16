import { describe, expect, it } from 'vitest';
import { buildRecoveryWhatsAppMessage } from './recoveryMessages';

describe('mensagens de recuperação por WhatsApp', () => {
  it('acolhe uma falta e oferece um próximo passo simples', () => {
    expect(buildRecoveryWhatsAppMessage({ patientName: 'Ana Souza', category: 'CONFIRMACAO', reason: 'Paciente faltou sem aviso.' }))
      .toBe('Olá, Ana! Sentimos sua falta hoje. Sua equipe separou um momento para retomarmos seu cuidado com tranquilidade. Quer que eu envie duas opções de horário para esta semana?');
  });

  it('recupera um orçamento com contexto, valor e convite sem pressão', () => {
    expect(buildRecoveryWhatsAppMessage({ patientName: 'Marcos Lima', category: 'ORCAMENTO', reason: 'Orçamento enviado sem retorno.' }))
      .toBe('Olá, Marcos! Ficou alguma dúvida sobre o plano que montamos para você? Podemos revisar as opções e encontrar a forma mais confortável para seguir com o seu cuidado. Prefere um resumo por aqui ou falar com a nossa equipe?');
  });
});
