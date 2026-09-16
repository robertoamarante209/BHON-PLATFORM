export type WhatsAppMessageKind =
  | 'CONFIRMATION'
  | 'MISSED_APPOINTMENT'
  | 'BUDGET_FOLLOW_UP'
  | 'TREATMENT_CONTINUITY';

export type WhatsAppMessageValues = {
  clinicName: string;
  patientName: string;
  date?: string;
  time?: string;
  procedure?: string;
};

function appointmentMoment({ date, time }: WhatsAppMessageValues): string {
  if (date && time) return `${date} às ${time}`;
  if (date) return `no dia ${date}`;
  if (time) return `às ${time}`;
  return 'em um horário que funcione para você';
}

export function buildWhatsAppMessage(kind: WhatsAppMessageKind, values: WhatsAppMessageValues): string {
  const patientName = values.patientName.trim() || 'Olá';
  const clinicName = values.clinicName.trim() || 'nossa clínica';
  const context = values.procedure?.trim() ? ` para ${values.procedure.trim()}` : '';

  switch (kind) {
    case 'CONFIRMATION':
      return `Olá, ${patientName}! Aqui é da ${clinicName}. Passando para confirmar seu atendimento${context} em ${appointmentMoment(values)}. Se precisar, é só responder por aqui para confirmar ou ajustar o horário — queremos que sua visita seja tranquila.`;
    case 'MISSED_APPOINTMENT':
      return `Olá, ${patientName}! Sentimos que não conseguimos te receber hoje na ${clinicName}. Acontecem imprevistos — conte com a gente para encontrar um novo horário${context} que fique confortável para você. Quer que eu te envie algumas opções?`;
    case 'BUDGET_FOLLOW_UP':
      return `Olá, ${patientName}! Aqui é da ${clinicName}. Ficamos à disposição sobre a proposta${context} que conversamos. Nosso objetivo é que você tenha clareza para decidir com segurança; se quiser, podemos tirar suas dúvidas e pensar no melhor próximo passo para você.`;
    case 'TREATMENT_CONTINUITY':
      return `Olá, ${patientName}! Aqui é da ${clinicName}. Estamos acompanhando seu cuidado${context} e queremos facilitar seu próximo passo. Se fizer sentido para você, responda por aqui e organizamos juntos a continuidade do seu atendimento.`;
  }
}
