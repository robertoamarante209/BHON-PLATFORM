export const SECRETARY_INTENTS = [
  "GREETING",
  "BOOK_APPOINTMENT",
  "SAME_DAY_FIT",
  "RESCHEDULE_APPOINTMENT",
  "CONFIRM_APPOINTMENT",
  "CANCEL_APPOINTMENT",
  "CLINIC_INFORMATION",
  "CLINICAL_QUESTION",
  "HUMAN_HANDOFF",
  "UNKNOWN",
] as const;

export type SecretaryIntent = typeof SECRETARY_INTENTS[number];

export type SecretaryReply = {
  intent: SecretaryIntent;
  message: string;
  status: "OPEN" | "WAITING_DETAILS" | "HUMAN_HANDOFF";
  requiresSchedulingDetails: boolean;
};

const normalize = (value: string) => value
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .toLocaleLowerCase("pt-BR")
  .trim();

const includesAny = (value: string, terms: readonly string[]) => terms.some((term) => value.includes(term));

export function classifySecretaryIntent(message: string): SecretaryIntent {
  const value = normalize(message);
  if (!value) return "UNKNOWN";
  if (includesAny(value, ["atendente", "pessoa", "humano", "recepcao", "recepção"])) return "HUMAN_HANDOFF";
  if (includesAny(value, ["dor", "sintoma", "sintomas", "remedio", "remédio", "medicamento", "diagnostico", "diagnóstico", "prescricao", "prescrição", "urgencia", "urgência"])) return "CLINICAL_QUESTION";
  if (includesAny(value, ["encaixe", "hoje ainda", "hoje tem", "urgente horario", "urgente horário"])) return "SAME_DAY_FIT";
  if (includesAny(value, ["remarcar", "reagendar", "mudar horario", "mudar horário", "trocar horario", "trocar horário"])) return "RESCHEDULE_APPOINTMENT";
  if (includesAny(value, ["confirmo", "confirmar", "confirmada", "confirmado", "vou sim"])) return "CONFIRM_APPOINTMENT";
  if (includesAny(value, ["cancelar", "cancelo", "nao vou", "não vou", "desmarcar"])) return "CANCEL_APPOINTMENT";
  if (includesAny(value, ["agendar", "marcar consulta", "marcar horario", "marcar horário", "quero consulta", "horario disponivel", "horário disponível"])) return "BOOK_APPOINTMENT";
  if (includesAny(value, ["endereco", "endereço", "telefone", "local", "funcionamento", "informacao", "informação", "valor", "preco", "preço", "convenio", "convênio"])) return "CLINIC_INFORMATION";
  if (includesAny(value, ["oi", "ola", "olá", "bom dia", "boa tarde", "boa noite"])) return "GREETING";
  return "UNKNOWN";
}

export function buildSecretaryReply(input: { clinicName: string; patientName?: string | null; message: string }): SecretaryReply {
  const intent = classifySecretaryIntent(input.message);
  const greeting = input.patientName ? `Olá, ${input.patientName.split(" ")[0]}!` : "Olá!";
  const clinic = input.clinicName.trim() || "a clínica";

  switch (intent) {
    case "BOOK_APPOINTMENT":
      return { intent, status: "WAITING_DETAILS", requiresSchedulingDetails: true, message: `${greeting} Posso organizar seu agendamento na ${clinic}. Qual dia e período você prefere? Assim consulto a disponibilidade real antes de confirmar.` };
    case "SAME_DAY_FIT":
      return { intent, status: "WAITING_DETAILS", requiresSchedulingDetails: true, message: `${greeting} Vou verificar possibilidades de encaixe sem comprometer os atendimentos já confirmados. Você consegue vir em qual período hoje?` };
    case "RESCHEDULE_APPOINTMENT":
      return { intent, status: "WAITING_DETAILS", requiresSchedulingDetails: true, message: `${greeting} Claro. Me diga o melhor dia e período para você; eu só confirmo a nova opção depois de validar profissional e ambiente.` };
    case "CONFIRM_APPOINTMENT":
      return { intent, status: "OPEN", requiresSchedulingDetails: false, message: `${greeting} Perfeito. Estou registrando sua confirmação e deixo a equipe preparada para receber você.` };
    case "CANCEL_APPOINTMENT":
      return { intent, status: "WAITING_DETAILS", requiresSchedulingDetails: false, message: `${greeting} Entendi. Posso cancelar este horário e, se quiser, já procurar uma nova opção que funcione melhor para você. Confirma o cancelamento?` };
    case "CLINIC_INFORMATION":
      return { intent, status: "OPEN", requiresSchedulingDetails: false, message: `${greeting} Posso ajudar com informações sobre a ${clinic}, horários disponíveis e agendamentos. Para uma informação específica da unidade, vou consultar a equipe e retorno por aqui.` };
    case "CLINICAL_QUESTION":
      return { intent, status: "HUMAN_HANDOFF", requiresSchedulingDetails: false, message: `${greeting} Para sua segurança, dúvidas clínicas precisam ser respondidas pela equipe responsável. Já sinalizei sua mensagem para que façam o retorno adequado.` };
    case "HUMAN_HANDOFF":
      return { intent, status: "HUMAN_HANDOFF", requiresSchedulingDetails: false, message: `${greeting} Claro. Registrei seu pedido para a equipe responsável continuar este atendimento.` };
    case "GREETING":
      return { intent, status: "OPEN", requiresSchedulingDetails: false, message: `${greeting} Eu sou a Secretária Sarah da ${clinic}. Posso ajudar com agendamento, encaixe, remarcação, confirmação e informações da clínica.` };
    default:
      return { intent, status: "OPEN", requiresSchedulingDetails: false, message: `${greeting} Posso ajudar com agendamento, encaixe, remarcação, confirmação e informações da ${clinic}. Como você prefere seguir?` };
  }
}
