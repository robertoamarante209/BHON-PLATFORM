export type StoredPaymentStatus = "PAGO" | "PENDENTE" | "ATRASADO" | "PARCIAL" | "CANCELADO";

export function moneyToCents(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.round(value * 100);
}

export function outstandingCents(totalCents: number, paidCents: number): number {
  return Math.max(0, totalCents - paidCents);
}

export function receiptResult(totalCents: number, paidCents: number, receiptCents: number) {
  const outstanding = outstandingCents(totalCents, paidCents);
  if (!Number.isInteger(receiptCents) || receiptCents <= 0) return { valid: false as const, reason: "INVALID_AMOUNT" as const };
  if (receiptCents > outstanding) return { valid: false as const, reason: "AMOUNT_EXCEEDS_OUTSTANDING" as const };
  const nextPaidCents = paidCents + receiptCents;
  return {
    valid: true as const,
    nextPaidCents,
    outstandingCents: outstandingCents(totalCents, nextPaidCents),
    status: (nextPaidCents >= totalCents ? "PAGO" : "PARCIAL") as StoredPaymentStatus,
  };
}

export function effectivePaymentStatus(input: {
  status: StoredPaymentStatus;
  totalCents: number;
  paidCents: number;
  dueDate: Date;
  today: Date;
}): StoredPaymentStatus {
  if (input.status === "CANCELADO") return "CANCELADO";
  if (outstandingCents(input.totalCents, input.paidCents) === 0) return "PAGO";
  if (input.dueDate.getTime() < input.today.getTime()) return "ATRASADO";
  if (input.paidCents > 0) return "PARCIAL";
  return "PENDENTE";
}

