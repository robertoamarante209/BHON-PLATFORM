import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'wouter';
import {
  BarChart3, Building2, CalendarDays, CircleDollarSign, ClipboardCheck,
  Clock3, LayoutDashboard, LogOut, Menu, Settings, ShieldAlert, Sparkles,
  Stethoscope, Target, UserCheck, Users, X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const sections = [
  { label: 'Cuidado', items: [
    { label: 'Visão do dia', path: '/clinic/overview', icon: LayoutDashboard },
    { label: 'Agenda clínica', path: '/clinic/agenda', icon: CalendarDays },
    { label: 'Pacientes', path: '/clinic/patients', icon: Users },
    { label: 'Tratamentos', path: '/clinic/treatments', icon: Stethoscope },
  ] },
  { label: 'Relacionamento', items: [
    { label: 'Oportunidades', path: '/clinic/opportunities', icon: Target },
    { label: 'Acompanhamentos', path: '/clinic/follow-ups', icon: Clock3 },
    { label: 'Orçamentos', path: '/clinic/budgets', icon: ClipboardCheck },
  ] },
  { label: 'Gestão', items: [
    { label: 'Financeiro', path: '/clinic/finance', icon: CircleDollarSign },
    { label: 'Equipe', path: '/clinic/team', icon: UserCheck },
    { label: 'Indicadores', path: '/clinic/indicators', icon: BarChart3 },
    { label: 'Configurações', path: '/clinic/settings', icon: Settings },
  ] },
];

const mobilePrimaryItems = sections[0].items.slice(0, 3);

export const Sidebar: React.FC = () => {
  const [location] = useLocation();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { currentUser, currentClinic, logout } = useAuth();

  const isActive = (path: string) => location === path || (path !== '/clinic/overview' && location.startsWith(path));

  useEffect(() => {
    if (!isMobileOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsMobileOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isMobileOpen]);

  return (
    <>
      <aside className="relative z-40 hidden min-h-screen w-[84px] flex-shrink-0 flex-col overflow-hidden border-r border-white/10 bg-bhon-navy text-white shadow-[18px_0_50px_rgba(14,26,43,0.08)] sm:flex xl:w-[264px]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_20%_0%,rgba(24,168,150,0.18),transparent_62%)]" />

        <div className="relative px-3 pb-5 pt-6 xl:px-6">
          <Link href="/clinic/overview" aria-label="Ir para a visão do dia" className="mx-auto block w-14 overflow-hidden rounded-lg bg-white shadow-sm xl:mx-0 xl:w-full">
            <span className="bhon-brand-lockup block w-full">
              <img src="/logo-official.jpg" alt="BHON — A clínica no controle." width="1920" height="1280" />
            </span>
          </Link>
          <div className="mt-6 hidden rounded-2xl border border-white/10 bg-white/[0.055] p-4 xl:block">
            <div className="mb-2 flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-bhon-gold">
              <Building2 aria-hidden="true" className="h-3 w-3" /> Clínica ativa
            </div>
            <p className="truncate text-sm font-semibold text-white" title={currentClinic.name}>{currentClinic.name}</p>
            <p className="mt-1 text-[11px] text-slate-400">{currentClinic.activeRoomsCount} ambientes em operação</p>
          </div>
        </div>

        <nav aria-label="Navegação clínica" className="relative flex-1 overflow-y-auto px-2 pb-4 xl:px-4">
          {sections.map((section) => (
            <div key={section.label} className="mb-5">
              <p className="mb-2 hidden px-3 text-[9px] font-bold uppercase tracking-[0.24em] text-slate-500 xl:block">{section.label}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link key={item.path} href={item.path} title={item.label} aria-label={item.label} aria-current={active ? 'page' : undefined} className={`group relative flex min-h-11 items-center justify-center rounded-xl px-3 transition-[color,background-color,box-shadow] duration-200 xl:justify-start ${active ? 'bg-white text-bhon-navy shadow-[0_8px_24px_rgba(0,0,0,0.18)]' : 'text-slate-400 hover:bg-white/[0.07] hover:text-white'}`}>
                      {active ? <span aria-hidden="true" className="absolute -left-2 h-5 w-1 rounded-r-full bg-bhon-teal xl:-left-4" /> : null}
                      <div className="flex items-center gap-3">
                        <Icon aria-hidden="true" className={`h-[18px] w-[18px] ${active ? 'text-bhon-teal-dark' : 'text-slate-500 group-hover:text-bhon-teal'}`} />
                        <span className="hidden text-[12px] font-semibold xl:block">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {currentUser.role === 'PLATFORM_OWNER' ? (
            <Link href="/platform/overview" aria-label="Ambiente da plataforma" className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-bhon-gold/30 bg-bhon-gold/10 px-3 text-bhon-gold xl:justify-start xl:gap-3">
              <ShieldAlert aria-hidden="true" className="h-[18px] w-[18px]" />
              <span className="hidden text-[11px] font-semibold xl:block">Ambiente da plataforma</span>
            </Link>
          ) : null}
        </nav>

        <div className="relative border-t border-white/10 p-2 xl:p-4">
          <div className="flex items-center justify-center gap-3 rounded-xl p-2 xl:justify-start">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-bhon-teal/30 bg-bhon-teal/10 text-sm font-semibold text-bhon-teal">{currentUser.name.charAt(0)}</div>
            <div className="hidden min-w-0 flex-1 xl:block">
              <p className="truncate text-xs font-semibold text-white">{currentUser.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-slate-500"><Sparkles aria-hidden="true" className="h-2.5 w-2.5" /> Operação clínica</p>
            </div>
            <button type="button" onClick={logout} aria-label="Sair do sistema" title="Sair do sistema" className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/10 hover:text-white">
              <LogOut aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <nav aria-label="Atalhos clínicos" className="fixed inset-x-3 bottom-3 z-50 grid h-16 grid-cols-4 rounded-2xl border border-white/10 bg-bhon-navy/95 px-2 text-white shadow-[0_18px_50px_rgba(18,27,42,0.3)] backdrop-blur-xl sm:hidden">
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link key={item.path} href={item.path} aria-label={item.label} aria-current={active ? 'page' : undefined} className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold transition-colors ${active ? 'text-bhon-teal' : 'text-slate-300'}`}>
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span>{item.label.replace(' clínica', '')}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setIsMobileOpen(true)} aria-label="Abrir menu" aria-expanded={isMobileOpen} className="flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-semibold text-slate-300">
          <Menu aria-hidden="true" className="h-5 w-5" />
          <span>Mais</span>
        </button>
      </nav>

      {isMobileOpen ? (
        <div className="fixed inset-0 z-[70] sm:hidden">
          <button type="button" onClick={() => setIsMobileOpen(false)} aria-label="Fechar menu" className="absolute inset-0 h-full w-full bg-bhon-navy/60 backdrop-blur-sm" />
          <div role="dialog" aria-modal="true" aria-label="Navegação clínica" className="bhon-mobile-sheet absolute inset-x-3 bottom-3 max-h-[calc(100dvh-1.5rem)] overflow-y-auto rounded-3xl border border-white/10 bg-bhon-navy p-5 text-white shadow-2xl">
            <div className="mb-5 flex items-center justify-between gap-4">
              <div>
                <p className="bhon-eyebrow !text-bhon-gold">{currentClinic.name}</p>
                <h2 className="mt-1 text-lg font-bold">Navegação</h2>
              </div>
              <button type="button" onClick={() => setIsMobileOpen(false)} aria-label="Fechar navegação" className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-white">
                <X aria-hidden="true" className="h-5 w-5" />
              </button>
            </div>

            {sections.map((section) => (
              <div key={section.label} className="mb-5">
                <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">{section.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link key={item.path} href={item.path} onClick={() => setIsMobileOpen(false)} aria-current={active ? 'page' : undefined} className={`flex min-h-12 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition-colors ${active ? 'bg-white text-bhon-navy' : 'bg-white/[0.055] text-slate-200'}`}>
                        <Icon aria-hidden="true" className={`h-4 w-4 ${active ? 'text-bhon-teal-dark' : 'text-bhon-teal'}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

            <button type="button" onClick={logout} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/10 text-sm font-semibold text-slate-300">
              <LogOut aria-hidden="true" className="h-4 w-4" /> Sair do sistema
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
};
