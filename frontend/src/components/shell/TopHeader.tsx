import React, { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle2, Search } from 'lucide-react';
import { Link } from 'wouter';
import { useAuth } from '../../context/AuthContext';
import { listAppointments } from '../../lib/clinic';
import type { Appointment } from '../../types';
import { SearchModal } from '../common/SearchModal';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long', day: '2-digit', month: 'long',
});

function localDateInput(date = new Date()): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

export const TopHeader: React.FC = () => {
  const { currentUser, currentClinic } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isPulseLoading, setIsPulseLoading] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inAttendanceCount = appointments.filter((item) => item.status === 'EM_ATENDIMENTO').length;
  const inReceptionCount = appointments.filter((item) => item.status === 'NA_RECEPCAO').length;
  const firstName = currentUser.name.split(' ')[0];

  useEffect(() => {
    const controller = new AbortController();
    void listAppointments(localDateInput(), controller.signal)
      .then(setAppointments)
      .catch((requestError) => {
        if (!(requestError instanceof DOMException && requestError.name === 'AbortError')) setAppointments([]);
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsPulseLoading(false);
      });
    return () => controller.abort();
  }, []);

  return (
    <>
      <header className="relative z-30 flex min-h-[72px] items-center justify-between border-b border-white/[0.06] bg-bhon-bg/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8 2xl:px-10">
        <div className="min-w-0">
          <p className="bhon-eyebrow hidden sm:block">{dateFormatter.format(new Date())}</p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <h1 className="truncate font-display text-xl font-semibold leading-none text-bhon-text sm:text-2xl">Olá, {firstName}.</h1>
            <span aria-hidden="true" className="hidden h-1 w-1 rounded-full bg-bhon-gold sm:block" />
            <p className="hidden truncate text-[11px] text-bhon-muted lg:block">{currentClinic.name}</p>
          </div>
        </div>

        <div className="ml-4 flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-bhon-border bg-bhon-surface px-3 py-2 lg:flex" aria-live="polite">
            <span className="relative flex h-2 w-2">
              {isPulseLoading ? <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bhon-gold opacity-50 motion-reduce:animate-none" /> : null}
              <span className={`relative inline-flex h-2 w-2 rounded-full ${isPulseLoading ? 'bg-bhon-gold' : 'bg-bhon-teal'}`} />
            </span>
            <span className="text-[10px] font-semibold text-bhon-text">
              {isPulseLoading ? 'Sincronizando agenda' : `${inAttendanceCount} em atendimento`}
            </span>
            {!isPulseLoading && inReceptionCount > 0 ? <span className="border-l border-bhon-border pl-2 font-mono-data text-[9px] text-bhon-muted">{inReceptionCount} na recepção</span> : null}
          </div>

          <button type="button" onClick={() => setIsSearchOpen(true)} aria-label="Buscar pacientes" className="group flex h-10 items-center gap-2 rounded-full border border-bhon-border bg-bhon-surface px-3 text-bhon-muted transition-[border-color,color,box-shadow] hover:border-bhon-teal/50 hover:text-bhon-text hover:shadow-sm sm:min-w-[220px] sm:justify-between">
            <span className="flex items-center gap-2 text-[11px]"><Search aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Buscar paciente</span></span>
            <kbd className="hidden rounded border border-bhon-border bg-bhon-bg px-1.5 py-0.5 font-mono-data text-[9px] text-bhon-muted sm:block">Ctrl K</kbd>
          </button>

          <Link href="/clinic/agenda" aria-label="Abrir agenda" title="Abrir agenda" className="flex h-10 w-10 items-center justify-center rounded-full bg-bhon-teal text-bhon-navy transition-[background-color,transform] hover:bg-[#14CBA7] active:scale-95">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
          </Link>

          <span title="Dados conectados ao ambiente clínico" aria-label="Dados conectados ao ambiente clínico" className="hidden h-10 w-10 items-center justify-center rounded-full border border-bhon-border bg-bhon-surface text-bhon-teal sm:flex">
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
          </span>
        </div>
      </header>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
