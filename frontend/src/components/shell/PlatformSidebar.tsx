import React from 'react';
import { useLocation, Link } from 'wouter';
import {
  Layers,
  Building,
  CreditCard,
  Receipt,
  TrendingUp,
  HeartHandshake,
  Users2,
  LifeBuoy,
  Gauge,
  Sliders,
  ArrowLeft,
  LogOut,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export const PlatformSidebar: React.FC = () => {
  const [location] = useLocation();
  const { currentUser, logout } = useAuth();

  const navItems = [
    { label: 'Visão Geral', path: '/platform/overview', icon: Layers },
    { label: 'Clínicas', path: '/platform/clinics', icon: Building },
    { label: 'Assinaturas', path: '/platform/subscriptions', icon: CreditCard },
    { label: 'Faturamento', path: '/platform/billing', icon: Receipt },
    { label: 'Receita', path: '/platform/revenue', icon: TrendingUp },
    { label: 'Clientes', path: '/platform/customers', icon: HeartHandshake },
    { label: 'Usuários', path: '/platform/users', icon: Users2 },
    { label: 'Suporte', path: '/platform/support', icon: LifeBuoy },
    { label: 'Indicadores', path: '/platform/indicators', icon: Gauge },
    { label: 'Configurações', path: '/platform/settings', icon: Sliders },
  ];

  return (
    <aside className="w-64 bg-slate-950 text-white flex flex-col flex-shrink-0 min-h-screen select-none border-r border-slate-800">
      {/* 
        Cabeçalho do Mantenedor da Plataforma BHON
        Logo oficial BHON única no topo esquerdo.
      */}
      <div className="p-5 pb-4 border-b border-slate-800/80 bg-slate-900/50">
        <Link href="/platform/overview" aria-label="Ir para a visão geral da plataforma" className="block rounded-xl border border-white/10 bg-white p-3 shadow-sm">
          <span className="block w-full">
            <img src="/logo-bhon-dark.svg" alt="BHON" width="620" height="190" className="h-auto w-full" />
          </span>
        </Link>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-bhon-teal font-bold text-[10px] uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Plataforma BHON (Owner)</span>
          </div>
          <span className="font-mono-data text-[10px] px-1.5 py-0.5 rounded bg-bhon-teal/10 text-bhon-teal border border-bhon-teal/30">
            ROOT
          </span>
        </div>
      </div>

      {/* Navegação do Negócio da Plataforma */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path;

          return (
            <Link
              key={item.path}
              href={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-bhon-teal/15 text-bhon-teal font-semibold'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
            >
                <div className="flex items-center gap-2.5">
                  <Icon aria-hidden="true" className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
            </Link>
          );
        })}

        {/* Retornar para a Operação Clínica */}
        <div className="pt-4 mt-4 border-t border-slate-800/80">
          <Link href="/clinic/overview" className="flex items-center gap-2 rounded px-3 py-2 text-xs font-semibold text-bhon-teal transition-colors hover:bg-slate-900">
              <ArrowLeft aria-hidden="true" className="w-4 h-4" />
              <span>Ver Operação Clínica</span>
          </Link>
        </div>
      </nav>

      {/* Rodapé do Mantenedor */}
      <div className="p-3 border-t border-slate-800 bg-black/40 text-xs">
        <div className="flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="font-semibold text-slate-200 truncate">{currentUser.name}</p>
            <p className="text-[10px] font-mono-data text-bhon-teal">PLATFORM_OWNER</p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Sair da plataforma"
            title="Sair da plataforma"
            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut aria-hidden="true" className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
