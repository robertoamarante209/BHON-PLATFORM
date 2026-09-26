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

export type WhatsAppConsent = Readonly<{
  channel: "WHATSAPP";
  authorization: "EXPLICIT";
  status: "ACTIVE" | "REVOKED";
}>;

export type ActiveRecoverySequence = Readonly<{
  status: "ACTIVE";
  scheduledAction: "OUTREACH";
}>;

export type EndedRecoverySequence = Readonly<{
  status: "ENDED";
  scheduledAction: null;
}>;

export type RecoverySequence = ActiveRecoverySequence | EndedRecoverySequence;

export type CadenceSourceType = "MISSED_APPOINTMENT" | "BUDGET" | "INTERRUPTED_TREATMENT";

export type CadenceStep =
  | Readonly<{ kind: "OUTREACH"; scheduledAt: Date }>
  | Readonly<{ kind: "END"; scheduledAt: Date }>;

export type OpportunityScoreInput = Readonly<{
  value: number;
  urgency: number;
  responseLikelihood: number;
}>;

export type SequenceTransition = Readonly<{
  status: "ENDED";
  reason: "CONSENT_REVOKED";
  nextScheduledAction: null;
}>;

const cadenceOffsets: Record<CadenceSourceType, readonly number[]> = {
  MISSED_APPOINTMENT: [0, 48],
  BUDGET: [24, 72, 168],
  INTERRUPTED_TREATMENT: [168, 504, 1_080],
};

export function isOutboundEligible(consent: WhatsAppConsent | null, sequence: RecoverySequence): boolean {
  return consent?.status === "ACTIVE" && sequence.status === "ACTIVE";
}

function clampScoreInput(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.min(100, Math.max(0, value));
}

export function scoreOpportunity(input: OpportunityScoreInput): number {
  // Weighted 0-100 score: commercial value 50%, urgency 30%, response likelihood 20%.
  return Math.round(
    clampScoreInput(input.value) * 0.5 +
      clampScoreInput(input.urgency) * 0.3 +
      clampScoreInput(input.responseLikelihood) * 0.2,
  );
}

export function scheduleCadence(sourceType: CadenceSourceType, now: Date): CadenceStep[] {
  const offsets = cadenceOffsets[sourceType];
  const finalOffset = offsets.at(-1);
  if (finalOffset === undefined) throw new Error("Cadence requires at least one outreach step");

  const timestamp = now.getTime();
  return [
    ...offsets.map((offset) => ({
      kind: "OUTREACH" as const,
      scheduledAt: new Date(timestamp + offset * 3_600_000),
    })),
    { kind: "END", scheduledAt: new Date(timestamp + finalOffset * 3_600_000) },
  ];
}

export function revokeConsent(_sequence: RecoverySequence): SequenceTransition {
  return { status: "ENDED", reason: "CONSENT_REVOKED", nextScheduledAction: null };
}

