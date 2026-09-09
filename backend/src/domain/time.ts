type DateParts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

function partsAt(date: Date, timeZone: string): DateParts {
  const values = Object.fromEntries(new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(values.year), month: Number(values.month), day: Number(values.day),
    hour: Number(values.hour), minute: Number(values.minute), second: Number(values.second),
  };
}

function zonedMidnightUtc(year: number, month: number, day: number, timeZone: string) {
  const target = Date.UTC(year, month - 1, day);
  let instant = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = partsAt(new Date(instant), timeZone);
    const observedAsUtc = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second);
    instant -= observedAsUtc - target;
  }
  return new Date(instant);
}

export function zonedDayRange(now: Date, timeZone: string) {
  const local = partsAt(now, timeZone);
  return {
    start: zonedMidnightUtc(local.year, local.month, local.day, timeZone),
    end: zonedMidnightUtc(local.year, local.month, local.day + 1, timeZone),
  };
}

export function zonedCalendarDayRange(value: string, timeZone: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const civilDate = new Date(Date.UTC(year, month - 1, day));
  if (civilDate.getUTCFullYear() !== year || civilDate.getUTCMonth() !== month - 1 || civilDate.getUTCDate() !== day) return null;
  return {
    start: zonedMidnightUtc(year, month, day, timeZone),
    end: zonedMidnightUtc(year, month, day + 1, timeZone),
  };
}
