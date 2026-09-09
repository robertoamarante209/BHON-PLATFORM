export type IndicatorPeriod = "TODAY" | "WEEK" | "MONTH";

type DateParts = { year: number; month: number; day: number };

function datePartsAt(date: Date, timeZone: string): DateParts {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date).map((part) => [part.type, part.value]));

  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
}

function zonedMidnightUtc(year: number, month: number, day: number, timeZone: string): Date {
  const target = Date.UTC(year, month - 1, day);
  let instant = target;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = new Date(instant);
    const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(observed).map((part) => [part.type, part.value]));
    const observedAsUtc = Date.UTC(
      Number(values.year), Number(values.month) - 1, Number(values.day),
      Number(values.hour), Number(values.minute), Number(values.second),
    );
    instant -= observedAsUtc - target;
  }

  return new Date(instant);
}

export function indicatorPeriodRange(now: Date, period: IndicatorPeriod, timeZone: string) {
  const local = datePartsAt(now, timeZone);

  if (period === "TODAY") {
    return {
      start: zonedMidnightUtc(local.year, local.month, local.day, timeZone),
      end: zonedMidnightUtc(local.year, local.month, local.day + 1, timeZone),
    };
  }

  if (period === "WEEK") {
    const dayOfWeek = new Date(Date.UTC(local.year, local.month - 1, local.day)).getUTCDay();
    const daysSinceMonday = (dayOfWeek + 6) % 7;
    return {
      start: zonedMidnightUtc(local.year, local.month, local.day - daysSinceMonday, timeZone),
      end: zonedMidnightUtc(local.year, local.month, local.day - daysSinceMonday + 7, timeZone),
    };
  }

  return {
    start: zonedMidnightUtc(local.year, local.month, 1, timeZone),
    end: zonedMidnightUtc(local.year, local.month + 1, 1, timeZone),
  };
}

export function percentage(part: number, total: number): number | null {
  if (total <= 0) return null;
  return Math.round((part / total) * 1_000) / 10;
}
