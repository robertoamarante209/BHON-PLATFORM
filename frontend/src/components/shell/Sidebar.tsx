import React from 'react';
import { Link, useLocation } from 'wouter';
import {
  BarChart3, Building2, CalendarDays, CircleDollarSign, ClipboardCheck,
  Clock3, LayoutDashboard, LogOut, Settings, ShieldAlert, Sparkles,
  Stethoscope, Target, UserCheck, Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOperationalData } from '../../context/OperationalDataContext';

export const Sidebar: React.FC = () => {
  const [location] = useLocation();
  const { currentUser, currentClinic, logout } = useAuth();
  const { followUps, budgets } = useOperationalData();
  const pendingFollowUps = followUps.filter((item) => item.status === 'PENDENTE').length;
  const negotiatingBudgets = budgets.filter((item) => item.status === 'NEGOTIATING' || item.status === 'SENT').length;

  const sections = [
    { label: 'Cuidado', items: [
      { label: 'Visão do dia', path: '/clinic/overview', icon: LayoutDashboard },
      { label: 'Agenda clínica', path: '/clinic/agenda', icon: CalendarDays },
      { label: 'Pacientes', path: '/clinic/patients', icon: Users },
      { label: 'Tratamentos', path: '/clinic/treatments', icon: Stethoscope },
    ] },
    { label: 'Relacionamento', items: [
      { label: 'Oportunidades', path: '/clinic/opportunities', icon: Target },
      { label: 'Acompanhamentos', path: '/clinic/follow-ups', icon: Clock3, badge: pendingFollowUps || undefined },
      { label: 'Orçamentos', path: '/clinic/budgets', icon: ClipboardCheck, badge: negotiatingBudgets || undefined },
    ] },
    { label: 'Gestão', items: [
      { label: 'Financeiro', path: '/clinic/finance', icon: CircleDollarSign },
      { label: 'Equipe', path: '/clinic/team', icon: UserCheck },
      { label: 'Indicadores', path: '/clinic/indicators', icon: BarChart3 },
      { label: 'Configurações', path: '/clinic/settings', icon: Settings },
    ] },
  ];

  return (
    <aside className="relative z-40 flex min-h-screen w-[76px] flex-shrink-0 flex-col overflow-hidden border-r border-white/10 bg-bhon-navy text-white shadow-[18px_0_50px_rgba(14,26,43,0.08)] sm:w-[84px] xl:w-[264px]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_20%_0%,rgba(24,168,150,0.18),transparent_62%)]" />

      <div className="relative px-3 pb-5 pt-6 xl:px-6">
        <Link href="/clinic/overview">
          <img src="/logo.png" alt="BHON" width="156" height="48" fetchPriority="high" className="mx-auto h-9 w-auto cursor-pointer object-contain xl:mx-0 xl:h-10" />
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
                const active = location === item.path || (item.path !== '/clinic/overview' && location.startsWith(item.path));
                return (
                  <Link key={item.path} href={item.path}>
                    <div title={item.label} className={`group relative flex min-h-11 cursor-pointer items-center justify-center rounded-xl px-3 transition-[color,background-color,box-shadow] duration-200 xl:justify-between ${active ? 'bg-white text-bhon-navy shadow-[0_8px_24px_rgba(0,0,0,0.18)]' : 'text-slate-400 hover:bg-white/[0.07] hover:text-white'}`}>
                      {active ? <span aria-hidden="true" className="absolute -left-2 h-5 w-1 rounded-r-full bg-bhon-teal xl:-left-4" /> : null}
                      <div className="flex items-center gap-3">
                        <Icon aria-hidden="true" className={`h-[18px] w-[18px] ${active ? 'text-bhon-teal-dark' : 'text-slate-500 group-hover:text-bhon-teal'}`} />
                        <span className="hidden text-[12px] font-semibold xl:block">{item.label}</span>
                      </div>
                      {item.badge !== undefined ? <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-bhon-gold px-1 font-mono-data text-[8px] font-bold text-bhon-navy xl:static xl:h-5 xl:min-w-5 xl:text-[9px]">{item.badge}</span> : null}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}

        {currentUser.role === 'PLATFORM_OWNER' ? (
          <Link href="/platform/overview">
            <div className="mt-4 flex min-h-11 cursor-pointer items-center justify-center rounded-xl border border-bhon-gold/30 bg-bhon-gold/10 px-3 text-bhon-gold xl:justify-start xl:gap-3">
              <ShieldAlert aria-hidden="true" className="h-[18px] w-[18px]" />
              <span className="hidden text-[11px] font-semibold xl:block">Ambiente da plataforma</span>
            </div>
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
          <button type="button" onClick={logout} aria-label="Sair do sistema" title="Sair do sistema" className="hidden rounded-lg p-2 text-slate-500 transition-colors hover:bg-white/10 hover:text-white xl:block">
            <LogOut aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
