import React, { useState } from 'react';
import { CalendarDays, Search } from 'lucide-react';
import { Link } from 'wouter';
import { useDailyAppointments } from '../../context/DailyAppointmentsContext';
import { CLINIC_TIME_ZONE } from '../../lib/datetime';
import { SearchModal } from '../common/SearchModal';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: CLINIC_TIME_ZONE, weekday: 'long', day: '2-digit', month: 'long',
});
const finishedStatuses = new Set(['CONCLUIDO', 'CANCELADO', 'FALTA']);

export const TopHeader: React.FC = () => {
  const { appointments, loading, error } = useDailyAppointments();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inAttendanceCount = appointments?.filter((item) => item.status === 'EM_ATENDIMENTO').length;
  const completedCount = appointments?.filter((item) => item.status === 'CONCLUIDO').length;
  const scheduledCount = appointments?.filter((item) => !finishedStatuses.has(item.status)).length;

  const hour = Number(new Intl.DateTimeFormat('pt-BR', { timeZone: CLINIC_TIME_ZONE, hour: '2-digit', hourCycle: 'h23' }).format(new Date()));
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
  const plural = (value: number, one: string, many: string) => `${value} ${value === 1 ? one : many}`;
  const fullPulse = appointments === null ? '' : `${plural(scheduledCount || 0, 'agendado', 'agendados')} · ${plural(completedCount || 0, 'concluído', 'concluídos')} · Ao vivo: ${inAttendanceCount || 0} em atendimento`;
  const dailyGreeting = `${greeting}.`;

  return (
    <>
      <header className="relative z-30 flex min-h-[72px] flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] bg-bhon-bg/90 px-4 py-3 backdrop-blur-xl sm:flex-nowrap sm:px-6 sm:py-0 lg:px-8 2xl:px-10">
        <div className="min-w-0 flex-1">
          <p className="bhon-eyebrow truncate">{dateFormatter.format(new Date())}</p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <h1 className="truncate font-display text-xl font-semibold leading-none text-bhon-text sm:text-2xl">{dailyGreeting}</h1>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 sm:ml-4 sm:gap-3">
          <div className="order-last flex items-center gap-2 rounded-full border border-bhon-border bg-bhon-surface px-3 py-2 sm:order-none" aria-live="polite" aria-label={error ? 'Agenda indisponível' : loading || appointments === null ? 'Sincronizando agenda' : fullPulse}>
            <span className="relative flex h-2 w-2">
              {!loading && !error ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-50 motion-reduce:animate-none" /> : null}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${error ? 'bg-rose-500' : loading ? 'bg-bhon-gold' : 'bg-emerald-500'}`} />
            </span>
            <span className="text-[10px] font-semibold text-bhon-text">
              {error ? 'Indisponível' : loading || appointments === null ? 'Sincronizando' : <><span className="sm:hidden">Ao vivo: {inAttendanceCount || 0}</span><span className="sr-only sm:not-sr-only">{fullPulse}</span></>}
            </span>
          </div>

          <button type="button" onClick={() => setIsSearchOpen(true)} aria-label="Buscar pacientes" className="group hidden h-10 items-center gap-2 rounded-full border border-bhon-border bg-bhon-surface px-3 text-bhon-muted transition-[border-color,color,box-shadow] hover:border-bhon-teal/50 hover:text-bhon-text hover:shadow-sm sm:flex sm:min-w-[220px] sm:justify-between">
            <span className="flex items-center gap-2 text-[11px]"><Search aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Buscar paciente</span></span>
            <kbd className="hidden rounded border border-bhon-border bg-bhon-bg px-1.5 py-0.5 font-mono-data text-[9px] text-bhon-muted sm:block">Ctrl K</kbd>
          </button>

          <Link href="/clinic/agenda" aria-label="Abrir agenda" title="Abrir agenda" className="flex h-10 w-10 items-center justify-center rounded-full bg-bhon-teal text-bhon-navy transition-[background-color,transform] hover:bg-[#14CBA7] active:scale-95">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
          </Link>

        </div>
      </header>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
