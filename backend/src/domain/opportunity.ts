export const opportunityTransitions = {
  NEW_CONTACT: ["TRIAGEM", "PERDIDO"],
  TRIAGEM: ["AVALIACAO", "PERDIDO"],
  AVALIACAO: ["PLANO_APRESENTADO", "PERDIDO"],
  PLANO_APRESENTADO: ["ORCAMENTO", "NEGOCIACAO", "PERDIDO"],
  ORCAMENTO: ["NEGOCIACAO", "CONVERTIDO", "PERDIDO"],
  NEGOCIACAO: ["ORCAMENTO", "CONVERTIDO", "PERDIDO"],
  CONVERTIDO: [],
  PERDIDO: ["TRIAGEM"],
} as const;

export type OpportunityState = keyof typeof opportunityTransitions;

export function isOpportunityTransitionAllowed(from: OpportunityState, to: OpportunityState): boolean {
  return (opportunityTransitions[from] as readonly OpportunityState[]).includes(to);
}

export function inactivityDays(lastContactAt: Date | null, updatedAt: Date, now = new Date()): number {
  const reference = lastContactAt || updatedAt;
  return Math.max(0, Math.floor((now.getTime() - reference.getTime()) / 86_400_000));
}
