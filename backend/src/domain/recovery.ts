export type RecoveryPriority = "URGENT" | "HIGH" | "MEDIUM" | "LOW";
export type RecoverySource = "FOLLOW_UP" | "QUOTE" | "OPPORTUNITY" | "TREATMENT" | "PAYMENT";

export type RecoveryItem = {
  id: string;
  source: RecoverySource;
  sourceId: string;
  priority: RecoveryPriority;
  signal: string;
  reason: string;
  patient: { id: string; name: string; recordNumber: string; phone: string | null };
  valueAtRisk: number | null;
  responsible: { id: string; name: string } | null;
  detectedAt: string;
  deadline: string | null;
  ageDays: number;
  nextAction: string;
  state: string;
  availableActions: Array<"COMPLETE" | "POSTPONE" | "REASSIGN" | "LOG_CONTACT" | "OPEN">;
  href: string;
};

const priorityWeight: Record<RecoveryPriority, number> = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 };

export function daysSince(value: Date, now = Date.now()): number {
  return Math.max(0, Math.floor((now - value.getTime()) / 86_400_000));
}

export function asMoney(value: { toString(): string } | number | null): number | null {
  return value === null ? null : Number(value);
}

export function appendNote(current: string | null, next: string | undefined, now = new Date()): string | null {
  const note = next?.trim();
  if (!note) return current;
  const entry = `[${now.toISOString()}] ${note}`;
  return current ? `${current}\n${entry}` : entry;
}

export function sortRecoveryItems(items: RecoveryItem[]): RecoveryItem[] {
  return [...items].sort((left, right) => {
    const byPriority = priorityWeight[right.priority] - priorityWeight[left.priority];
    if (byPriority !== 0) return byPriority;
    const leftDeadline = left.deadline ? new Date(left.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    const rightDeadline = right.deadline ? new Date(right.deadline).getTime() : Number.MAX_SAFE_INTEGER;
    if (leftDeadline !== rightDeadline) return leftDeadline - rightDeadline;
    return right.ageDays - left.ageDays;
  });
}

export function financialExposure(inactiveQuoteValue: number, overdueReceivables: number): number {
  return inactiveQuoteValue + overdueReceivables;
}

