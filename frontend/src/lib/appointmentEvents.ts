export const DAILY_APPOINTMENTS_CHANGED = 'bhon:daily-appointments-changed';
export const notifyDailyAppointmentsChanged = () => window.dispatchEvent(new Event(DAILY_APPOINTMENTS_CHANGED));
