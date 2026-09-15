import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { Appointment } from '../types';
import { listAppointments } from '../lib/clinic';
import { clinicCalendarDate } from '../lib/datetime';
import { DAILY_APPOINTMENTS_CHANGED } from '../lib/appointmentEvents';

type DailyAppointmentsState = { appointments: Appointment[] | null; loading: boolean; error: string; refresh: () => Promise<void> };
const DailyAppointmentsContext = createContext<DailyAppointmentsState | undefined>(undefined);

export const DailyAppointmentsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const requestRevision = useRef(0);
  const refresh = useCallback(async () => {
    const revision = ++requestRevision.current;
    setLoading(true);
    try {
      const next = await listAppointments(clinicCalendarDate());
      if (revision !== requestRevision.current) return;
      setAppointments(next); setError('');
    } catch (reason) {
      if (revision !== requestRevision.current) return;
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o dia.');
    } finally { if (revision === requestRevision.current) setLoading(false); }
  }, []);

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 60_000);
    const onFocus = () => void refresh();
    window.addEventListener('focus', onFocus);
    window.addEventListener(DAILY_APPOINTMENTS_CHANGED, onFocus);
    return () => { requestRevision.current += 1; window.clearInterval(interval); window.removeEventListener('focus', onFocus); window.removeEventListener(DAILY_APPOINTMENTS_CHANGED, onFocus); };
  }, [refresh]);

  return <DailyAppointmentsContext.Provider value={{ appointments, loading, error, refresh }}>{children}</DailyAppointmentsContext.Provider>;
};

export const useDailyAppointments = () => {
  const value = useContext(DailyAppointmentsContext);
  if (!value) throw new Error('useDailyAppointments deve ser utilizado dentro de DailyAppointmentsProvider');
  return value;
};
