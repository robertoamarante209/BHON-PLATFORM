import React from 'react';
import { useOperationalData } from '../../context/OperationalDataContext';
import { MetricCard } from '../../components/common/MetricCard';
import { Gauge, TrendingUp, ShieldCheck, Activity, Users2 } from 'lucide-react';

export const PlatformIndicatorsPage: React.FC = () => {
  const { platformClinics } = useOperationalData();

  const activeMRR = platformClinics
    .filter((c) => c.status === 'ATIVA')
    .reduce((acc, c) => acc + c.mrr, 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-white">
            Indicadores Globais da Plataforma BHON
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas de expansão de SaaS, estabilidade de infraestrutura e adoção funcional pelas clínicas.
          </p>
        </div>
      </div>

      {/* Grid de Indicadores Estratégicos da Plataforma (Seção 36) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded border-l-4 border-l-amber-500">
          <span className="text-xs text-slate-400 block mb-1">Crescimento de MRR</span>
          <div className="font-mono-data text-2xl font-bold text-amber-400">+14.2%</div>
          <span className="text-[11px] text-emerald-400 font-mono-data mt-1 block">No último trimestre</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Crescimento de ARR</span>
          <div className="font-mono-data text-2xl font-bold text-white">+18.0%</div>
          <span className="text-[11px] text-slate-400 font-mono-data mt-1 block">Projetado anual</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Net Revenue Retention (NRR)</span>
          <div className="font-mono-data text-2xl font-bold text-emerald-400">108.5%</div>
          <span className="text-[11px] text-slate-400 font-mono-data mt-1 block">Expansão de carteira</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Taxa de Churn</span>
          <div className="font-mono-data text-2xl font-bold text-white">1.1%</div>
          <span className="text-[11px] text-slate-400 font-mono-data mt-1 block">Média da indústria: 2.5%</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Disponibilidade do Sistema</span>
          <div className="font-mono-data text-2xl font-bold text-emerald-400">99.98%</div>
          <span className="text-[11px] text-slate-400 font-mono-data mt-1 block">Uptime em 30 dias</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Tempo Médio de Resolução</span>
          <div className="font-mono-data text-2xl font-bold text-white">42 min</div>
          <span className="text-[11px] text-slate-400 font-mono-data mt-1 block">Chamados de suporte</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Adoção de Funcionalidades</span>
          <div className="font-mono-data text-2xl font-bold text-white">84%</div>
          <span className="text-[11px] text-slate-400 font-mono-data mt-1 block">Uso da Fila de Exceções</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Aquisição de Clínicas</span>
          <div className="font-mono-data text-2xl font-bold text-emerald-400">+2 /mês</div>
          <span className="text-[11px] text-slate-400 font-mono-data mt-1 block">Taxa de ativação</span>
        </div>
      </div>
    </div>
  );
};
