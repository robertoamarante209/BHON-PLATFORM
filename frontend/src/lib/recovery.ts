type RecoveryDraftInput = {
  patientName: string;
  reason: string;
  nextAction?: string;
};

const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'tudo bem';

export function buildRecoveryWhatsAppDraft({ patientName, reason, nextAction }: RecoveryDraftInput) {
  const detail = reason.trim().replace(/[.!?]+$/, '').toLocaleLowerCase('pt-BR') || 'acompanhamento';
  const invitation = nextAction?.trim()
    ? `Podemos ajudar a ${nextAction.trim().replace(/[.!?]+$/, '').toLocaleLowerCase('pt-BR')}?`
    : 'Podemos encontrar o melhor horário para você?';

  return `Olá, ${firstName(patientName)}. Aqui é da clínica. Estamos entrando em contato para dar continuidade ao seu ${detail}. ${invitation}`;
}
