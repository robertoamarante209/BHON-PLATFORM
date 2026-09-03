import React, { useState } from 'react';
import {
  Search,
  Bell,
  CheckCircle2,
  Activity,
  User as UserIcon,
  ChevronDown,
  X,
  Clock,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOperationalData } from '../../context/OperationalDataContext';
import { SearchModal } from '../common/SearchModal';
import { useLocation } from 'wouter';

export const TopHeader: React.FC = () => {
  const { currentUser, currentClinic } = useAuth();
  const { appointments, notifications, markNotificationRead, markAllNotificationsRead } = useOperationalData();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [, setLocation] = useLocation();

  // Contagem de consultórios com atendimento acontecendo agora
  const inAttendanceCount = appointments.filter(a => a.status === 'EM_ATENDIMENTO').length;
  const inReceptionCount = appointments.filter(a => a.status === 'NA_RECEPCAO').length;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <>
      <header className="h-14 bg-white border-b border-bhon-border px-6 flex items-center justify-between sticky top-0 z-30 select-none">
        {/* Lado Esquerdo: Barra de Busca Global */}
        <div className="flex items-center gap-4 flex-1 max-w-xl">
          <button
            onClick={() => setIsSearchOpen(true)}
            className="w-full flex items-center justify-between px-3.5 py-1.5 rounded border border-bhon-border bg-bhon-bg hover:bg-slate-100 text-xs text-bhon-muted transition-colors text-left group"
          >
            <div className="flex items-center gap-2">
              <Search className="w-3.5 h-3.5 text-bhon-muted group-hover:text-bhon-text" />
              <span>Buscar paciente, prontuário (#03945), ação...</span>
            </div>
            <span className="font-mono-data text-[10px] text-slate-400 border border-slate-200 bg-white px-1.5 py-0.5 rounded">
              ⌘K
            </span>
          </button>
        </div>

        {/* Lado Direito: Status Operacional dos Consultórios + Sincronização + Notificações + Usuário */}
        <div className="flex items-center gap-5">
          {/* Status Operacional Clínico (Prompt Seção 13) */}
          <div className="hidden lg:flex items-center gap-2.5 px-3 py-1 rounded bg-slate-50 border border-bhon-border text-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-bhon-teal opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-bhon-teal"></span>
            </span>
            <span className="text-bhon-text font-medium text-[11px]">
              Operação ativa: <span className="font-mono-data font-bold text-bhon-text">{inAttendanceCount}</span> consultórios em atendimento
            </span>
            {inReceptionCount > 0 && (
              <span className="font-mono-data text-[10px] px-1.5 py-0.2 rounded bg-blue-100 text-blue-800 font-semibold">
                {inReceptionCount} NA RECEPÇÃO
              </span>
            )}
          </div>

          {/* Sincronização / Status do Sistema */}
          <div className="hidden sm:flex items-center gap-1 text-[11px] font-mono-data text-bhon-muted">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Sincronizado</span>
          </div>

          {/* Notificações com sino e badge */}
          <div className="relative">
            <button
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-1.5 rounded hover:bg-slate-100 text-bhon-muted hover:text-bhon-text transition-colors"
              title="Notificações Operacionais"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-rose-600 rounded-full"></span>
              )}
            </button>

            {/* Painel Dropdown de Notificações */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded border border-bhon-border shadow-xl z-50 text-xs overflow-hidden">
                <div className="p-3 border-b border-bhon-border bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-bhon-text uppercase tracking-wide text-[11px]">Notificações</span>
                    {unreadCount > 0 && (
                      <span className="font-mono-data text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-semibold">
                        {unreadCount} novas
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllNotificationsRead}
                      className="text-[10px] text-bhon-teal hover:underline font-medium"
                    >
                      Marcar lidas
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-bhon-border">
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-bhon-muted text-[11px]">
                      Nenhuma notificação operacional no momento.
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        onClick={() => {
                          markNotificationRead(notif.id);
                          if (notif.link) {
                            setLocation(notif.link);
                            setIsNotifOpen(false);
                          }
                        }}
                        className={`p-3 hover:bg-slate-50 cursor-pointer transition-colors ${
                          !notif.read ? 'bg-teal-50/30' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className={`text-xs font-semibold ${!notif.read ? 'text-bhon-text' : 'text-bhon-muted'}`}>
                            {notif.title}
                          </p>
                          <span className="font-mono-data text-[9px] text-bhon-muted flex-shrink-0">
                            {new Date(notif.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-bhon-muted mt-1 leading-snug">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Usuário e Função */}
          <div className="flex items-center gap-2 pl-3 border-l border-bhon-border text-xs">
            <div className="w-7 h-7 rounded bg-bhon-navy text-white flex items-center justify-center font-bold text-xs uppercase">
              {currentUser.name.charAt(0)}
            </div>
            <div className="hidden md:block leading-tight">
              <p className="font-semibold text-bhon-text text-xs">{currentUser.name}</p>
              <p className="text-[10px] font-mono-data text-bhon-muted">{currentUser.role}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Modal de Busca Global */}
      <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  );
};
