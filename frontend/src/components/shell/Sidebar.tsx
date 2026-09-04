import React from 'react';
import { useLocation, Link } from 'wouter';
import {
  LayoutDashboard,
  Calendar,
  Users,
  Stethoscope,
  Target,
  Clock,
  FileCheck,
  DollarSign,
  UserCheck,
  BarChart3,
  Settings,
  LogOut,
  ShieldAlert,
  Building2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useOperationalData } from '../../context/OperationalDataContext';

export const Sidebar: React.FC = () => {
  const [location] = useLocation();
  const { currentUser, currentClinic, logout } = useAuth();
  const { followUps, budgets } = useOperationalData();

  // Badges operacionais de atenção
  const pendingFollowUps = followUps.filter(f => f.status === 'PENDENTE').length;
  const negotiatingBudgets = budgets.filter(b => b.status === 'NEGOTIATING' || b.status === 'SENT').length;

  const navItems = [
    { label: 'Visão Geral', path: '/clinic/overview', icon: LayoutDashboard },
    { label: 'Agenda', path: '/clinic/agenda', icon: Calendar },
    { label: 'Pacientes', path: '/clinic/patients', icon: Users },
    { label: 'Tratamentos', path: '/clinic/treatments', icon: Stethoscope },
    { label: 'Oportunidades', path: '/clinic/opportunities', icon: Target },
    {
      label: 'Acompanhamentos',
      path: '/clinic/follow-ups',
      icon: Clock,
      badge: pendingFollowUps > 0 ? pendingFollowUps : undefined,
    },
    {
      label: 'Orçamentos',
      path: '/clinic/budgets',
      icon: FileCheck,
      badge: negotiatingBudgets > 0 ? negotiatingBudgets : undefined,
    },
    { label: 'Financeiro', path: '/clinic/finance', icon: DollarSign },
    { label: 'Equipe', path: '/clinic/team', icon: UserCheck },
    { label: 'Indicadores', path: '/clinic/indicators', icon: BarChart3 },
    { label: 'Configurações', path: '/clinic/settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-bhon-navy text-white flex flex-col flex-shrink-0 min-h-screen select-none border-r border-slate-800">
      {/* 
        REGRA ABSOLUTA DE MARCA (SEÇÃO 7):
        A logo oficial BHON deve aparecer EXATAMENTE UMA VEZ na barra lateral escura no canto superior esquerdo.
        Ativo oficial transparente recortado.
      */}
      <div className="p-5 pb-4 border-b border-slate-800/80">
        <Link href="/clinic/overview">
          <img
            src="/logo.png"
            alt="BHON — A clínica no controle."
            className="h-10 w-auto cursor-pointer block"
          />
        </Link>

        {/* Identificação de Contexto de Clínica */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between">
          <div className="truncate pr-2">
            <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1.5">
              <Building2 className="w-3 h-3 text-bhon-teal" />
              <span>Clínica Ativa</span>
            </div>
            <p className="text-xs font-semibold text-slate-200 truncate mt-0.5" title={currentClinic.name}>
              {currentClinic.name}
            </p>
          </div>
          <span className="font-mono-data text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-bhon-teal border border-slate-700">
            {currentClinic.activeRoomsCount} SALAS
          </span>
        </div>
      </div>

      {/* Navegação Clínica Principal */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || (item.path !== '/clinic/overview' && location.startsWith(item.path));

          return (
            <Link key={item.path} href={item.path}>
              <div
                className={`flex items-center justify-between px-3 py-2 rounded text-xs font-medium cursor-pointer transition-colors ${
                  isActive
                    ? 'bg-bhon-teal text-white font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
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

        {/* Atalho para Ambiente do Mantenedor da Plataforma se for Platform Owner */}
        {currentUser.role === 'PLATFORM_OWNER' && (
          <div className="pt-3 mt-3 border-t border-slate-800/80">
            <Link href="/platform/overview">
              <div className="flex items-center justify-between px-3 py-2 rounded text-xs font-bold text-amber-400 bg-amber-950/40 border border-amber-800/60 hover:bg-amber-900/40 cursor-pointer transition-colors">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Ambiente BHON Platform</span>
                </div>
              </div>
            </Link>
          </div>
        )}
      </nav>

      {/* Rodapé da Barra Lateral: Usuário, Papel e Logout */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 text-xs">
        <div className="flex items-center justify-between mb-2">
          <div className="truncate pr-2">
            <p className="font-semibold text-slate-200 truncate">{currentUser.name}</p>
            <p className="text-[10px] font-mono-data text-slate-400 truncate mt-0.5">{currentUser.role}</p>
          </div>
          <button
            onClick={logout}
            title="Sair do sistema"
            className="p-1.5 rounded text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>

      </div>
    </aside>
  );
};
