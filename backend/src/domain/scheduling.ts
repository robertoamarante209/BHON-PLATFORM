const APPOINTMENT_TRANSITIONS: Record<string, readonly string[]> = {
  CONFIRMADO: ["NA_RECEPCAO", "CANCELADO", "FALTA", "ENCAIXE"],
  AGUARDANDO_CONFIRMACAO: ["CONFIRMADO", "NA_RECEPCAO", "CANCELADO", "FALTA"],
  NA_RECEPCAO: ["EM_ATENDIMENTO", "ATRASADO", "CANCELADO", "FALTA"],
  EM_ATENDIMENTO: ["CONCLUIDO", "ATRASADO", "CANCELADO"],
  ATRASADO: ["NA_RECEPCAO", "EM_ATENDIMENTO", "CONCLUIDO", "CANCELADO", "FALTA"],
  ENCAIXE: ["NA_RECEPCAO", "EM_ATENDIMENTO", "CONCLUIDO", "CANCELADO", "FALTA"],
  FALTA: ["CONFIRMADO", "CANCELADO"],
  CANCELADO: ["CONFIRMADO", "ENCAIXE"],
  CONCLUIDO: [],
};

export function isAppointmentTransitionAllowed(current: string, next: string): boolean {
  return APPOINTMENT_TRANSITIONS[current]?.includes(next) ?? false;
}

export function parseAppointmentDuration(value: unknown): number | null {
  const duration = Number(value ?? 30);
  return Number.isInteger(duration) && duration >= 5 && duration <= 480 ? duration : null;
}

export function intervalsOverlap(firstStart: Date, firstDurationMinutes: number, secondStart: Date, secondDurationMinutes: number): boolean {
  const firstEnd = firstStart.getTime() + firstDurationMinutes * 60_000;
  const secondEnd = secondStart.getTime() + secondDurationMinutes * 60_000;
  return firstStart.getTime() < secondEnd && secondStart.getTime() < firstEnd;
}

