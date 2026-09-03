import React from 'react';
import { useOperationalData } from '../../context/OperationalDataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { HeartHandshake, ShieldAlert, CheckCircle2 } from 'lucide-react';

export const PlatformCustomersPage: React.FC = () => {
  const { platformClinics } = useOperationalData();

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-slate-100">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-white">
            Saúde e Sucesso dos Clientes (Clínicas)
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitoramento de engajamento operacional, Lifetime Value (LTV) e risco de cancelamento.
          </p>
        </div>
      </div>

      {/* Tabela Mandatória do Master Prompt (Seção 33) */}
      <div className="bg-slate-950 border border-slate-800 rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase font-mono-data">
                <th className="p-3">Clínica</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Plano</th>
                <th className="p-3">Status</th>
                <th className="p-3">Lifetime Value (LTV)</th>
                <th className="p-3">MRR</th>
                <th className="p-3">Início</th>
                <th className="p-3">Última Atividade</th>
                <th className="p-3">Saúde da Conta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {platformClinics.map((c) => {
                const health =
                  c.status === 'ATIVA'
                    ? 'HEALTHY'
                    : c.status === 'PAGAMENTO_PENDENTE'
                    ? 'ATTENTION'
                    : 'AT RISK';

                return (
                  <tr key={c.id} className="hover:bg-slate-900/60 transition-colors">
                    <td className="p-3 font-bold text-white whitespace-nowrap">
                      {c.name}
                    </td>
                    <td className="p-3 text-slate-300 whitespace-nowrap">
                      {c.ownerName}
                    </td>
                    <td className="p-3 font-mono-data text-slate-400 whitespace-nowrap">
                      {c.planName}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <StatusBadge status={c.status} size="sm" />
                    </td>
                    <td className="p-3 font-mono-data font-bold text-slate-200 whitespace-nowrap">
                      R$ {(c.mrr * 14).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 font-mono-data font-bold text-amber-400 whitespace-nowrap">
                      R$ {c.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="p-3 font-mono-data text-slate-500 whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="p-3 font-mono-data text-slate-400 whitespace-nowrap">
                      {c.lastActivityAt}
                    </td>
                    <td className="p-3 whitespace-nowrap font-mono-data">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                          health === 'HEALTHY'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                            : health === 'ATTENTION'
                            ? 'bg-amber-950 text-amber-300 border-amber-800'
                            : 'bg-rose-950 text-rose-300 border-rose-800'
                        }`}
                      >
                        {health}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
