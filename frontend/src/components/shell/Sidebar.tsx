import React, { useCallback, useEffect, useState } from 'react';
import { Link, useLocation, useSearch } from 'wouter';
import {
  BarChart3, Boxes, CalendarDays, CircleDollarSign, ClipboardCheck, FileText,
  Clock3, LayoutDashboard, LogOut, Menu, Settings, ShieldAlert, Sparkles,
  MessageCircle, PlugZap, Stethoscope, Target, UserCheck, Users,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { MobileNavigationDialog } from './MobileNavigationDialog';

const sections = [
  { label: 'Cuidado', items: [
    { label: 'Visão do dia', path: '/clinic/overview', icon: LayoutDashboard },
    { label: 'Agenda clínica', path: '/clinic/agenda', icon: CalendarDays },
    { label: 'Pacientes', path: '/clinic/patients', icon: Users },
    { label: 'Tratamentos', path: '/clinic/treatments', icon: Stethoscope },
  ] },
  { label: 'Relacionamento', items: [
    { label: 'Recuperar orçamentos', path: '/clinic/follow-ups?category=ORCAMENTO', icon: Sparkles },
    { label: 'Oportunidades', path: '/clinic/opportunities', icon: Target },
    { label: 'Acompanhamentos', path: '/clinic/follow-ups', icon: Clock3 },
    { label: 'Orçamentos', path: '/clinic/budgets', icon: ClipboardCheck },
    { label: 'WhatsApp', path: '/clinic/whatsapp', icon: MessageCircle },
  ] },
  { label: 'Gestão', items: [
    { label: 'Financeiro', path: '/clinic/finance', icon: CircleDollarSign },
    { label: 'Equipe', path: '/clinic/team', icon: UserCheck },
    { label: 'Indicadores', path: '/clinic/indicators', icon: BarChart3 },
    { label: 'Estoque', path: '/clinic/inventory', icon: Boxes },
    { label: 'Documentos', path: '/clinic/documents', icon: FileText },
    { label: 'Integrações', path: '/clinic/integrations', icon: PlugZap },
    { label: 'Configurações', path: '/clinic/settings', icon: Settings },
  ] },
];

const mobilePrimaryItems = [sections[0].items[1], sections[0].items[0], sections[1].items[0]];

export const Sidebar: React.FC = () => {
  const [location] = useLocation();
  const search = useSearch();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { currentUser, currentClinic, logout } = useAuth();
  // Matches the API's finance read roles; other clinical areas allow all clinic roles to read.
  const visibleSections = sections.map((section) => ({
    ...section,
    items: section.items.filter((item) => item.path !== '/clinic/finance' || ['OWNER', 'ADMIN', 'MANAGER', 'FINANCIAL', 'VIEWER'].includes(currentUser.role)),
  }));

  const closeMobileMenu = useCallback(() => setIsMobileOpen(false), []);
  const isActive = (path: string) => {
    const [pathname, query] = path.split('?');
    if (location !== pathname && !location.startsWith(`${pathname}/`)) return false;
    if (pathname === '/clinic/follow-ups') {
      const recoveringBudgets = new URLSearchParams(search).get('category') === 'ORCAMENTO';
      return query ? recoveringBudgets : !recoveringBudgets;
    }
    return true;
  };

  useEffect(() => {
    closeMobileMenu();
  }, [location, search, closeMobileMenu]);

  return (
    <>
      <aside className="relative z-40 hidden min-h-screen w-[76px] flex-shrink-0 flex-col overflow-hidden border-r border-bhon-border bg-white text-bhon-text sm:flex lg:w-[248px]">

        <div className="relative px-3 pb-6 pt-5">
          <Link href="/clinic/overview" aria-label="Ir para a visão do dia" className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl transition-colors hover:bg-bhon-bg lg:h-auto lg:w-full lg:justify-start lg:px-2 lg:py-2">
            <span className="block h-8 w-8 lg:h-auto lg:w-[176px]">
              <img src="/logo-bhon-dark.svg" alt="BHON" width="620" height="190" className="h-full w-full object-contain" />
            </span>
          </Link>
        </div>

        <nav aria-label="Navegação clínica" className="relative flex-1 overflow-y-auto px-3 pb-4">
          {visibleSections.map((section) => (
            <div key={section.label} className="mb-5">
              <p className="sr-only">{section.label}</p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const active = isActive(item.path);
                  return (
                    <Link key={item.path} href={item.path} title={item.label} aria-label={item.label} aria-current={active ? 'page' : undefined} className={`group relative flex min-h-11 items-center justify-center rounded-xl px-3 transition-[color,background-color,box-shadow] duration-200 lg:justify-start ${active ? 'bg-bhon-teal/10 text-bhon-teal-dark shadow-[inset_0_0_0_1px_rgba(0,184,148,0.12)]' : 'text-bhon-muted hover:bg-bhon-bg hover:text-bhon-text'}`}>
                      {active ? <span aria-hidden="true" className="absolute -left-3 h-5 w-0.5 rounded-r-full bg-bhon-teal" /> : null}
                      <div className="flex items-center gap-3">
                        <Icon aria-hidden="true" className={`h-[18px] w-[18px] ${active ? 'text-bhon-teal-dark' : 'text-slate-500 group-hover:text-bhon-teal'}`} />
                        <span className="sr-only lg:not-sr-only lg:text-xs lg:font-semibold">{item.label}</span>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}

          {currentUser.role === 'PLATFORM_OWNER' ? (
            <Link href="/platform/overview" aria-label="Ambiente da plataforma" className="mt-4 flex min-h-11 items-center justify-center rounded-xl border border-bhon-gold/30 bg-bhon-gold/10 px-3 text-bhon-gold">
              <ShieldAlert aria-hidden="true" className="h-[18px] w-[18px]" />
              <span className="sr-only">Ambiente da plataforma</span>
            </Link>
          ) : null}
        </nav>

        <div className="relative border-t border-bhon-border p-2">
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl p-2">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full border border-bhon-teal/30 bg-bhon-teal/10 text-sm font-semibold text-bhon-teal">{currentUser.name.charAt(0)}</div>
            <div className="sr-only lg:not-sr-only lg:min-w-0 lg:flex-1">
              <p className="truncate text-xs font-semibold text-bhon-text">{currentUser.name}</p>
              <p className="mt-0.5 flex items-center gap-1 text-[9px] uppercase tracking-[0.12em] text-slate-500"><Sparkles aria-hidden="true" className="h-2.5 w-2.5" /> Operação clínica</p>
            </div>
            <button type="button" onClick={logout} aria-label="Sair do sistema" title="Sair do sistema" className="flex h-11 w-11 items-center justify-center rounded-lg text-bhon-muted transition-colors hover:bg-bhon-bg hover:text-bhon-text">
              <LogOut aria-hidden="true" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <nav aria-label="Atalhos clínicos" className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 grid min-h-16 grid-cols-4 rounded-2xl border border-bhon-border bg-bhon-surface p-1 text-bhon-text shadow-sm sm:hidden">
        {mobilePrimaryItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link key={item.path} href={item.path} aria-label={item.label} aria-current={active ? 'page' : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-center text-xs font-semibold transition-colors ${active ? 'bg-bhon-teal/10 text-bhon-teal-dark' : 'text-bhon-muted hover:bg-bhon-bg'}`}>
              <Icon aria-hidden="true" className="h-5 w-5" />
              <span>{item.path.includes('?') ? 'Recuperar' : item.label.replace(' clínica', '')}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => setIsMobileOpen(true)} aria-label="Abrir menu" aria-haspopup="dialog" aria-expanded={isMobileOpen} className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl text-xs font-semibold text-bhon-muted hover:bg-bhon-bg">
          <Menu aria-hidden="true" className="h-5 w-5 text-bhon-navy" />
          <span>Mais</span>
        </button>
      </nav>

      {isMobileOpen ? (
        <MobileNavigationDialog clinicName={currentClinic.name} onClose={closeMobileMenu}>
          <nav aria-label="Todas as áreas clínicas">
            {visibleSections.map((section) => (
              <div key={section.label} className="mb-5">
                <p className="mb-2 px-1 text-xs font-semibold text-bhon-muted">{section.label}</p>
                <div className="grid grid-cols-2 gap-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                      <Link key={item.path} href={item.path} onClick={closeMobileMenu} aria-current={active ? 'page' : undefined} className={`flex min-h-12 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${active ? 'bg-bhon-teal/10 text-bhon-teal-dark' : 'bg-bhon-bg text-bhon-text hover:bg-bhon-teal/10'}`}>
                        <Icon aria-hidden="true" className="h-4 w-4 shrink-0 text-bhon-teal-dark" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
            <button type="button" onClick={logout} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-bhon-border text-sm font-semibold text-bhon-muted hover:bg-bhon-bg">
              <LogOut aria-hidden="true" className="h-4 w-4" /> Sair do sistema
            </button>
        </MobileNavigationDialog>
      ) : null}
    </>
  );
};
