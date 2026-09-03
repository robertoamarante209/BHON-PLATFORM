import React from 'react';
import { useLocation } from 'wouter';
import { useOperationalData } from '../../context/OperationalDataContext';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import {
  ShieldAlert,
  Building,
  CreditCard,
  LifeBuoy,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users2
} from 'lucide-react';

export const PlatformOverviewPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { platformClinics, platformInvoices, supportTickets } = useOperationalData();

  // Métricas Mandatórias do Negócio BHON (Seção 27)
  const activeClinicsCount = platformClinics.filter((c) => c.status === 'ATIVA').length;
  const newClinicsThisMonth = platformClinics.filter((c) => c.status === 'TESTE').length;
  const totalMRR = platformClinics
    .filter((c) => c.status === 'ATIVA')
    .reduce((acc, c) => acc + c.mrr, 0);

  const overdueInvoices = platformInvoices.filter((i) => i.status === 'ATRASADO');
  const overdueAmount = overdueInvoices.reduce((acc, i) => acc + i.amount, 0);

  const openTickets = supportTickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS');
  const atRiskClinics = platformClinics.filter((c) => c.status === 'PAGAMENTO_PENDENTE' || c.status === 'SUSPENSA');

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Cabeçalho do Mantenedor */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-white">
            Platform Overview
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Controle operacional e financeiro da plataforma BHON.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation('/platform/clinics')}
            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors"
          >
            <Building className="w-3.5 h-3.5" />
            <span>Gerenciar Clínicas</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          EXCEÇÕES OPERACIONAIS DA PLATAFORMA (SEÇÃO 27)
          ============================================================ */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400">
            Fila de Exceções do Negócio BHON
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Exceção 1: Inadimplência de Assinatura */}
          <div className="p-4 bg-slate-950 border border-amber-900/60 rounded border-l-4 border-l-amber-500 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono-data text-[11px] font-bold text-amber-400">
                  {overdueInvoices.length} MENSALIDADES ATRASADAS
                </span>
                <span className="font-mono-data text-xs text-rose-400 font-bold">
                  R$ {overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs font-bold text-slate-200">
                Clínicas com fatura de assinatura pendente
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Tentativa de cobrança automática falhou. Notificar financeiro da clínica.
              </p>
            </div>
            <button
              onClick={() => setLocation('/platform/billing')}
              className="mt-3 w-full py-1.5 bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/80 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Ver Faturamento e Cobrar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Exceção 2: Chamados Críticos de Suporte */}
          <div className="p-4 bg-slate-950 border border-rose-900/60 rounded border-l-4 border-l-rose-600 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono-data text-[11px] font-bold text-rose-400">
                  {openTickets.length} CHAMADOS EM ABERTO
                </span>
                <span className="font-mono-data text-xs text-rose-300 font-bold">
                  1 CRÍTICO
                </span>
              </div>
              <p className="text-xs font-bold text-slate-200">
                Suporte Técnico das Clínicas
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Clínica Bucal relatou falha de sincronização de agenda no Consultório 02.
              </p>
            </div>
            <button
              onClick={() => setLocation('/platform/support')}
              className="mt-3 w-full py-1.5 bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Resolver Chamados de Suporte</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Exceção 3: Clínicas em Risco de Churn */}
          <div className="p-4 bg-slate-950 border border-slate-800 rounded border-l-4 border-l-blue-500 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono-data text-[11px] font-bold text-blue-400">
                  {atRiskClinics.length} CLÍNICAS EM RISCO
                </span>
                <span className="font-mono-data text-xs text-slate-300">
                  SAÚDE DA CARTEIRA
                </span>
              </div>
              <p className="text-xs font-bold text-slate-200">
                Clínicas suspensas ou com bloqueio de licença
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Atuar proativamente para retenção e liberação de acesso.
              </p>
            </div>
            <button
              onClick={() => setLocation('/platform/customers')}
              className="mt-3 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Revisar Clientes em Risco</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          MÉTRICAS MACRO DA PLATAFORMA (SEÇÃO 27)
          ============================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Clínicas Ativas na BHON</span>
          <div className="font-mono-data text-2xl font-bold text-white">{activeClinicsCount}</div>
          <span className="text-[11px] text-emerald-400 font-mono-data mt-1 block">+1 este mês</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded border-l-4 border-l-amber-500">
          <span className="text-xs text-slate-400 block mb-1">MRR (Receita Recorrente Mensal)</span>
          <div className="font-mono-data text-2xl font-bold text-amber-400">
            R$ {totalMRR.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-400 font-mono-data mt-1 block">ARR: R$ {(totalMRR * 12).toLocaleString('pt-BR')}</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Taxa de Retenção Líquida</span>
          <div className="font-mono-data text-2xl font-bold text-emerald-400">96.8%</div>
          <span className="text-[11px] text-slate-400 font-mono-data mt-1 block">Churn mensal: 1.2%</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Usuários Clínicos Ativos</span>
          <div className="font-mono-data text-2xl font-bold text-white">42</div>
          <span className="text-[11px] text-slate-400 font-mono-data mt-1 block">Dentistas e recepcionistas</span>
        </div>
      </div>

      {/* ============================================================
          TABELA DE CLÍNICAS OPERACIONAIS NO ECOSSISTEMA BHON
          ============================================================ */}
      <div className="bg-slate-950 border border-slate-800 rounded overflow-hidden">
        <div className="p-3 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              Clínicas sob Gestão da Plataforma
            </h3>
            <p className="text-[11px] text-slate-400">
              Isolamento estrito multi-inquilino garantido em nível de banco de dados.
            </p>
          </div>
          <span className="font-mono-data text-xs text-slate-400">
            {platformClinics.length} contratos
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase font-mono-data">
                <th className="p-3">Clínica</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Plano BHON</th>
                <th className="p-3">MRR</th>
                <th className="p-3">Status</th>
                <th className="p-3">Última Atividade</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {platformClinics.map((clinic) => (
                <tr
                  key={clinic.id}
                  onClick={() => setLocation(`/platform/clinics/${clinic.id}`)}
                  className="hover:bg-slate-900/60 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-bold text-white whitespace-nowrap">
                    {clinic.name}
                  </td>
                  <td className="p-3 text-slate-300 whitespace-nowrap">
                    {clinic.ownerName}
                  </td>
                  <td className="p-3 text-slate-300 whitespace-nowrap font-mono-data">
                    {clinic.planName}
                  </td>
                  <td className="p-3 font-mono-data font-bold text-amber-400 whitespace-nowrap">
                    R$ {clinic.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <StatusBadge status={clinic.status} size="sm" />
                  </td>
                  <td className="p-3 text-slate-400 font-mono-data whitespace-nowrap">
                    {clinic.lastActivityAt}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLocation(`/platform/clinics/${clinic.id}`);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                    >
                      Dossiê
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
