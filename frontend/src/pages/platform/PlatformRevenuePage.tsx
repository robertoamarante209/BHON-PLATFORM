import React from 'react';
import { useOperationalData } from '../../context/OperationalDataContext';
import { TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign } from 'lucide-react';

export const PlatformRevenuePage: React.FC = () => {
  const { platformClinics } = useOperationalData();

  const activeMRR = platformClinics
    .filter((c) => c.status === 'ATIVA')
    .reduce((acc, c) => acc + c.mrr, 0);

  const arr = activeMRR * 12;

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-white">
            Análise de Receita e MRR da Plataforma
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Métricas de expansão de carteira, retenção de mensalidades e evolução do modelo de receita.
          </p>
        </div>
      </div>

      {/* Grid de Movimentação Líquida de Receita (Seção 32) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">MRR Atual</span>
          <div className="font-mono-data text-xl font-bold text-amber-400">
            R$ {activeMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Novo MRR (Mês)</span>
          <div className="font-mono-data text-xl font-bold text-emerald-400">+R$ 1.290,00</div>
          <span className="text-[10px] text-emerald-400 flex items-center gap-0.5 mt-1">
            <ArrowUpRight className="w-3 h-3" /> Nova clínica
          </span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Expansão</span>
          <div className="font-mono-data text-xl font-bold text-emerald-400">+R$ 800,00</div>
          <span className="text-[10px] text-slate-400 mt-1 block">Upgrades de salas</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Contração</span>
          <div className="font-mono-data text-xl font-bold text-slate-400">R$ 0,00</div>
          <span className="text-[10px] text-slate-500 mt-1 block">Downgrades</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Churn MRR</span>
          <div className="font-mono-data text-xl font-bold text-rose-400">-R$ 690,00</div>
          <span className="text-[10px] text-rose-400 flex items-center gap-0.5 mt-1">
            <ArrowDownRight className="w-3 h-3" /> 1 cancelamento
          </span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded border-l-4 border-l-emerald-500">
          <span className="text-xs text-slate-400 block mb-1">Movimento Líquido</span>
          <div className="font-mono-data text-xl font-bold text-emerald-400">+R$ 1.400,00</div>
          <span className="text-[10px] text-emerald-400 mt-1 block">Crescimento real</span>
        </div>
      </div>

      {/* Gráfico / Tabela de Distribuição de Receita por Plano */}
      <div className="bg-slate-950 border border-slate-800 rounded p-4">
        <h3 className="text-xs font-bold text-white uppercase tracking-wider mb-3">
          Composição de MRR por Plano de Assinatura
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 font-mono-data text-xs">
          <div className="p-3 bg-slate-900 border border-slate-800 rounded">
            <div className="flex justify-between text-slate-400 mb-1">
              <span>BHON Clinic Starter:</span>
              <span>1 clínica</span>
            </div>
            <p className="font-bold text-white text-sm">R$ 690,00 /mês</p>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded">
            <div className="flex justify-between text-slate-400 mb-1">
              <span>BHON Clinic Pro:</span>
              <span>2 clínicas</span>
            </div>
            <p className="font-bold text-white text-sm">R$ 2.580,00 /mês</p>
          </div>

          <div className="p-3 bg-slate-900 border border-slate-800 rounded">
            <div className="flex justify-between text-slate-400 mb-1">
              <span>BHON Enterprise:</span>
              <span>1 clínica</span>
            </div>
            <p className="font-bold text-white text-sm">R$ 2.490,00 /mês</p>
          </div>
        </div>
      </div>
    </div>
  );
};
