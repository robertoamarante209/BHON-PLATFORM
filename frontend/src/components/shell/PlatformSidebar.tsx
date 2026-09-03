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
import { useOperationalData } from '../../context/OperationalDataContext';

export const PlatformSidebar: React.FC = () => {
  const [location] = useLocation();
  const { currentUser, logout } = useAuth();
  const { supportTickets, platformInvoices } = useOperationalData();

  const openTickets = supportTickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  const overdueInvoices = platformInvoices.filter(i => i.status === 'ATRASADO').length;

  const navItems = [
    { label: 'Visão Geral', path: '/platform/overview', icon: Layers },
    { label: 'Clínicas', path: '/platform/clinics', icon: Building },
    { label: 'Assinaturas', path: '/platform/subscriptions', icon: CreditCard },
    {
      label: 'Faturamento',
      path: '/platform/billing',
      icon: Receipt,
      badge: overdueInvoices > 0 ? `${overdueInvoices} pend.` : undefined,
    },
    { label: 'Receita', path: '/platform/revenue', icon: TrendingUp },
    { label: 'Clientes', path: '/platform/customers', icon: HeartHandshake },
    { label: 'Usuários', path: '/platform/users', icon: Users2 },
    {
      label: 'Suporte',
      path: '/platform/support',
      icon: LifeBuoy,
      badge: openTickets > 0 ? openTickets : undefined,
    },
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
        <Link href="/platform/overview">
          <img
            src="/logo.png"
            alt="BHON — A clínica no controle."
            className="h-10 w-auto cursor-pointer block"
          />
        </Link>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[10px] uppercase tracking-wider">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Plataforma BHON (Owner)</span>
          </div>
          <span className="font-mono-data text-[10px] px-1.5 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
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
            <Link key={item.path} href={item.path}>
              <div
                className={`flex items-center justify-between px-3 py-2 rounded text-xs font-medium cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-amber-600 text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`font-mono-data text-[10px] px-1.5 py-0.2 rounded font-bold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-amber-300 border border-slate-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          );
        })}

        {/* Retornar para a Operação Clínica */}
        <div className="pt-4 mt-4 border-t border-slate-800/80">
          <Link href="/clinic/overview">
            <div className="flex items-center gap-2 px-3 py-2 rounded text-xs font-semibold text-bhon-teal hover:bg-slate-900 cursor-pointer transition-colors">
              <ArrowLeft className="w-4 h-4" />
              <span>Ver Operação Clínica</span>
            </div>
          </Link>
        </div>
      </nav>

      {/* Rodapé do Mantenedor */}
      <div className="p-3 border-t border-slate-800 bg-black/40 text-xs">
        <div className="flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="font-semibold text-slate-200 truncate">{currentUser.name}</p>
            <p className="text-[10px] font-mono-data text-amber-400">PLATFORM_OWNER</p>
          </div>
          <button
            onClick={logout}
            title="Sair da plataforma"
            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
};
