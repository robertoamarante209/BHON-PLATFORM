type RecoveryMessageInput = {
  patientName: string;
  category: string;
  reason?: string | null;
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'tudo bem';

export function buildRecoveryWhatsAppMessage({ patientName, category, reason = '' }: RecoveryMessageInput): string {
  const name = firstName(patientName);
  const normalizedReason = (reason ?? '').toLocaleLowerCase('pt-BR');
  const isNoShow = category === 'CONFIRMACAO' || /faltou|ausência|ausencia/.test(normalizedReason);

  if (category === 'ORCAMENTO') {
    return `Olá, ${name}! Ficou alguma dúvida sobre o plano que montamos para você? Podemos revisar as opções e encontrar a forma mais confortável para seguir com o seu cuidado. Prefere um resumo por aqui ou falar com a nossa equipe?`;
  }

  if (isNoShow) {
    return `Olá, ${name}! Sentimos sua falta hoje. Sua equipe separou um momento para retomarmos seu cuidado com tranquilidade. Quer que eu envie duas opções de horário para esta semana?`;
  }

  return `Olá, ${name}! Passando para saber como você está e se podemos ajudar no seu próximo passo de cuidado. Prefere que a nossa equipe fale com você por aqui?`;
}
