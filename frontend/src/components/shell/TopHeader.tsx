import React, { useEffect, useState } from 'react';
import { CalendarDays, RefreshCw, Search } from 'lucide-react';
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
  const [pulseStatus, setPulseStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const inAttendanceCount = appointments.filter((item) => item.status === 'EM_ATENDIMENTO').length;
  const inReceptionCount = appointments.filter((item) => item.status === 'NA_RECEPCAO').length;
  const firstName = currentUser.name.split(' ')[0];

  useEffect(() => {
    const controller = new AbortController();
    setPulseStatus('loading');
    void listAppointments(localDateInput(), controller.signal)
      .then((items) => {
        if (controller.signal.aborted) return;
        setAppointments(items);
        setPulseStatus('ready');
      })
      .catch(() => {
        if (!controller.signal.aborted) setPulseStatus('error');
      });
    return () => controller.abort();
  }, [currentClinic.id, retry]);

  return (
    <>
      <header className="relative z-30 flex min-h-[72px] flex-wrap items-center justify-between gap-y-2 border-b border-bhon-border bg-bhon-surface px-4 py-3 sm:px-6 lg:px-8 2xl:px-10">
        <div className="min-w-0">
          <p className="bhon-eyebrow hidden sm:block">{dateFormatter.format(new Date())}</p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <p className="truncate font-display text-xl font-semibold leading-none text-bhon-text sm:text-2xl">Olá, {firstName}.</p>
            <span aria-hidden="true" className="hidden h-1 w-1 rounded-full bg-bhon-gold sm:block" />
            <p className="hidden truncate text-[11px] text-bhon-muted lg:block">{currentClinic.name}</p>
          </div>
        </div>

        <div className="ml-4 flex items-center gap-2 sm:gap-3">
          <button type="button" onClick={() => setIsSearchOpen(true)} aria-label="Buscar pacientes" className="group flex h-11 min-w-11 items-center gap-2 rounded-full border border-bhon-border bg-bhon-surface px-3 text-bhon-muted transition-colors hover:border-bhon-teal-dark hover:text-bhon-text sm:min-w-[180px] sm:justify-between">
            <span className="flex items-center gap-2 text-[11px]"><Search aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Buscar paciente</span></span>
            <kbd className="hidden rounded border border-bhon-border bg-bhon-bg px-1.5 py-0.5 font-mono-data text-[9px] text-bhon-muted sm:block">Ctrl K</kbd>
          </button>

          <Link href="/clinic/agenda" aria-label="Abrir agenda" title="Abrir agenda" className="flex h-11 w-11 items-center justify-center rounded-full bg-bhon-teal-dark text-white transition-colors hover:bg-bhon-navy">
            <CalendarDays aria-hidden="true" className="h-4 w-4" />
          </Link>

        </div>
        <div className="flex w-full items-center gap-2 text-xs text-bhon-muted lg:order-none lg:w-auto" role="status" aria-live="polite">
          <span>{pulseStatus === 'loading' ? 'Sincronizando agenda' : pulseStatus === 'error' ? 'Agenda indisponível' : `${inAttendanceCount} em atendimento`}</span>
          {pulseStatus === 'ready' && inReceptionCount > 0 ? <span className="border-l border-bhon-border pl-2">{inReceptionCount} na recepção</span> : null}
          {pulseStatus === 'error' ? <button type="button" onClick={() => setRetry((value) => value + 1)} aria-label="Atualizar agenda" className="flex min-h-11 items-center gap-1 rounded-lg px-2 font-semibold text-bhon-teal-dark hover:bg-bhon-bg"><RefreshCw aria-hidden="true" className="h-4 w-4" />Tentar novamente</button> : null}
        </div>
      </header>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
