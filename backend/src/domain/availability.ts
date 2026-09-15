export type AvailabilityInterval = { dayOfWeek: number; start: string; end: string };

const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function normalizeAvailability(value: unknown): AvailabilityInterval[] {
  if (!Array.isArray(value)) throw new Error("Disponibilidade inválida.");
  const intervals = value.map((item) => {
    if (!item || typeof item !== "object") throw new Error("Disponibilidade inválida.");
    const { dayOfWeek, start, end } = item as Record<string, unknown>;
    if (!Number.isInteger(dayOfWeek) || Number(dayOfWeek) < 0 || Number(dayOfWeek) > 6 || typeof start !== "string" || typeof end !== "string" || !TIME.test(start) || !TIME.test(end) || start >= end) throw new Error("Disponibilidade inválida: confira dia e horários.");
    return { dayOfWeek: Number(dayOfWeek), start, end };
  }).sort((a, b) => a.dayOfWeek - b.dayOfWeek || a.start.localeCompare(b.start));
  for (let index = 1; index < intervals.length; index++) {
    const previous = intervals[index - 1]!; const current = intervals[index]!;
    if (previous.dayOfWeek === current.dayOfWeek && current.start < previous.end) throw new Error("Disponibilidade inválida: intervalos não podem se sobrepor.");
  }
  return intervals;
}
