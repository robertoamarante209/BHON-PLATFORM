import React, { useState } from 'react';
import { Bell, CalendarDays, Check, ChevronRight, Search } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '../../context/AuthContext';
import { useOperationalData } from '../../context/OperationalDataContext';
import { SearchModal } from '../common/SearchModal';

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long', day: '2-digit', month: 'long',
});

export const TopHeader: React.FC = () => {
  const { currentUser, currentClinic } = useAuth();
  const { appointments, notifications, markNotificationRead, markAllNotificationsRead } = useOperationalData();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [, setLocation] = useLocation();
  const inAttendanceCount = appointments.filter((item) => item.status === 'EM_ATENDIMENTO').length;
  const inReceptionCount = appointments.filter((item) => item.status === 'NA_RECEPCAO').length;
  const unreadCount = notifications.filter((item) => !item.read).length;
  const firstName = currentUser.name.split(' ')[0];

  return (
    <>
      <header className="relative z-30 flex min-h-[76px] items-center justify-between border-b border-bhon-border/80 bg-bhon-surface/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8 2xl:px-10">
        <div className="min-w-0">
          <p className="bhon-eyebrow hidden sm:block">{dateFormatter.format(new Date())}</p>
          <div className="mt-1 flex min-w-0 items-center gap-2">
            <h1 className="truncate font-display text-xl leading-none text-bhon-navy sm:text-2xl">Olá, {firstName}.</h1>
            <span aria-hidden="true" className="hidden h-1 w-1 rounded-full bg-bhon-gold sm:block" />
            <p className="hidden truncate text-[11px] text-bhon-muted lg:block">{currentClinic.name}</p>
          </div>
        </div>

        <div className="ml-4 flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-2 rounded-full border border-bhon-border bg-white/70 px-3 py-2 lg:flex">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-bhon-teal opacity-50 motion-reduce:animate-none" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-bhon-teal" />
            </span>
            <span className="text-[10px] font-semibold text-bhon-text">{inAttendanceCount} em atendimento</span>
            {inReceptionCount > 0 ? <span className="border-l border-bhon-border pl-2 font-mono-data text-[9px] text-bhon-muted">{inReceptionCount} na recepção</span> : null}
          </div>

          <button type="button" onClick={() => setIsSearchOpen(true)} aria-label="Buscar na clínica" className="group flex h-10 items-center gap-2 rounded-full border border-bhon-border bg-white/80 px-3 text-bhon-muted transition-[border-color,color,box-shadow] hover:border-bhon-teal/50 hover:text-bhon-navy hover:shadow-sm sm:min-w-[220px] sm:justify-between">
            <span className="flex items-center gap-2 text-[11px]"><Search aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Buscar paciente ou ação</span></span>
            <kbd className="hidden rounded border border-bhon-border bg-bhon-bg px-1.5 py-0.5 font-mono-data text-[9px] text-bhon-muted sm:block">Ctrl K</kbd>
          </button>

          <Link href="/clinic/agenda">
            <div title="Abrir agenda" className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full bg-bhon-navy text-white transition-[background-color,transform] hover:bg-bhon-navy-hover active:scale-95">
              <CalendarDays aria-hidden="true" className="h-4 w-4" />
            </div>
          </Link>

          <div className="relative">
            <button type="button" onClick={() => setIsNotifOpen((open) => !open)} aria-label={`Notificações${unreadCount > 0 ? `, ${unreadCount} não lidas` : ''}`} aria-expanded={isNotifOpen} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-bhon-border bg-white/80 text-bhon-muted transition-colors hover:text-bhon-navy">
              <Bell aria-hidden="true" className="h-4 w-4" />
              {unreadCount > 0 ? <span aria-hidden="true" className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-rose-500" /> : null}
            </button>

            {isNotifOpen ? (
              <div className="absolute right-0 mt-3 w-[min(360px,calc(100vw-6rem))] overflow-hidden rounded-2xl border border-bhon-border bg-bhon-surface shadow-[0_24px_70px_rgba(18,27,42,0.18)]">
                <div className="flex items-center justify-between border-b border-bhon-border px-4 py-3.5">
                  <div><p className="bhon-eyebrow">Concierge clínico</p><p className="mt-1 text-sm font-semibold text-bhon-navy">Atenções da operação</p></div>
                  {unreadCount > 0 ? <button type="button" onClick={markAllNotificationsRead} className="flex items-center gap-1 text-[10px] font-semibold text-bhon-teal-dark hover:text-bhon-navy"><Check aria-hidden="true" className="h-3 w-3" /> Marcar lidas</button> : null}
                </div>
                <div className="max-h-80 divide-y divide-bhon-border overflow-y-auto overscroll-contain">
                  {notifications.length === 0 ? (
                    <p className="px-5 py-8 text-center text-xs text-bhon-muted">Tudo em ordem por aqui.</p>
                  ) : notifications.map((notification) => (
                    <button type="button" key={notification.id} onClick={() => { markNotificationRead(notification.id); if (notification.link) { setLocation(notification.link); setIsNotifOpen(false); } }} className={`flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-bhon-bg ${notification.read ? '' : 'bg-bhon-teal-subtle/40'}`}>
                      <span aria-hidden="true" className={`mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full ${notification.read ? 'bg-bhon-border' : 'bg-bhon-teal'}`} />
                      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold text-bhon-text">{notification.title}</span><span className="mt-1 block line-clamp-2 text-[10px] leading-relaxed text-bhon-muted">{notification.message}</span></span>
                      <ChevronRight aria-hidden="true" className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-bhon-muted" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </header>
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
