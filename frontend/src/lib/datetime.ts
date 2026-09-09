export const CLINIC_TIME_ZONE = import.meta.env.VITE_BHON_TIME_ZONE || 'America/Sao_Paulo';

function partsAt(date: Date, timeZone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).map((part) => [part.type, part.value]));
  return {
    year: Number(parts.year), month: Number(parts.month), day: Number(parts.day),
    hour: Number(parts.hour), minute: Number(parts.minute), second: Number(parts.second),
  };
}

export function clinicCalendarDate(now = new Date(), timeZone = CLINIC_TIME_ZONE) {
  const parts = partsAt(now, timeZone);
  return `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

export function zonedLocalDateTimeToIso(dateValue: string, timeValue: string, timeZone = CLINIC_TIME_ZONE) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(timeValue);
  if (!dateMatch || !timeMatch) throw new Error('Data ou horário clínico inválido.');
  const target = Date.UTC(Number(dateMatch[1]), Number(dateMatch[2]) - 1, Number(dateMatch[3]), Number(timeMatch[1]), Number(timeMatch[2]));
  let instant = target;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const observed = partsAt(new Date(instant), timeZone);
    const observedAsUtc = Date.UTC(observed.year, observed.month - 1, observed.day, observed.hour, observed.minute, observed.second);
    instant -= observedAsUtc - target;
  }
  return new Date(instant).toISOString();
}

export function formatClinicTime(value: string | Date, timeZone = CLINIC_TIME_ZONE) {
  return new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(typeof value === 'string' ? new Date(value) : value);
}
