export type AvailabilityInterval = {
  dayOfWeek: number;
  start: string;
  end: string;
};

export type AvailabilityParseResult =
  | { ok: true; intervals: AvailabilityInterval[] }
  | { ok: false; code: "INVALID_DAY" | "INVALID_TIME" | "INVALID_INTERVAL" | "OVERLAPPING_INTERVAL" };

const timePattern = /^([01]\d|2[0-3]):[0-5]\d$/;

function minutes(value: string) {
  const hour = Number(value.slice(0, 2));
  const minute = Number(value.slice(3, 5));
  return hour * 60 + minute;
}

export function parseAvailabilityIntervals(input: unknown): AvailabilityParseResult {
  if (!Array.isArray(input)) return { ok: false, code: "INVALID_INTERVAL" };

  const intervals: AvailabilityInterval[] = [];
  for (const item of input) {
    if (!item || typeof item !== "object") return { ok: false, code: "INVALID_INTERVAL" };
    const { dayOfWeek, start, end } = item as Partial<AvailabilityInterval>;
    if (typeof dayOfWeek !== "number" || !Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) return { ok: false, code: "INVALID_DAY" };
    if (typeof start !== "string" || typeof end !== "string" || !timePattern.test(start) || !timePattern.test(end)) {
      return { ok: false, code: "INVALID_TIME" };
    }
    if (minutes(start) >= minutes(end)) return { ok: false, code: "INVALID_INTERVAL" };
    intervals.push({ dayOfWeek, start, end });
  }

  intervals.sort((left, right) => left.dayOfWeek - right.dayOfWeek || minutes(left.start) - minutes(right.start));
  for (let index = 1; index < intervals.length; index += 1) {
    const previous = intervals[index - 1]!;
    const current = intervals[index]!;
    if (previous.dayOfWeek === current.dayOfWeek && minutes(current.start) < minutes(previous.end)) {
      return { ok: false, code: "OVERLAPPING_INTERVAL" };
    }
  }
  return { ok: true, intervals };
}
