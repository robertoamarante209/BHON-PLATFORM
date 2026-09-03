import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useOperationalData } from '../../context/OperationalDataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { Building, Search, ArrowRight, ShieldAlert, CheckCircle2, PauseCircle } from 'lucide-react';
import { PlatformClinic } from '../../types';

export const PlatformClinicsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { platformClinics, toggleClinicStatus } = useOperationalData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [suspendClinicId, setSuspendClinicId] = useState<string | null>(null);

  const filteredClinics = platformClinics.filter((c) => {
    const matchesSearch =
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.ownerName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleConfirmSuspend = () => {
    if (suspendClinicId) {
      const target = platformClinics.find((c) => c.id === suspendClinicId);
      if (target) {
        const newStatus = target.status === 'SUSPENSA' ? 'ATIVA' : 'SUSPENSA';
        toggleClinicStatus(suspendClinicId, newStatus);
      }
      setSuspendClinicId(null);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto text-slate-100">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-white">
            Gestão Global de Clínicas
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Controle de licenciamento, planos contratados, acessos e faturamento do ecossistema BHON.
          </p>
        </div>

        <span className="font-mono-data text-xs text-slate-400 self-start sm:self-auto">
          {platformClinics.length} clínicas cadastradas
        </span>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 border border-slate-800 rounded">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar clínica ou responsável..."
            className="w-full pl-9 pr-3 py-1.5 border border-slate-800 bg-slate-900 rounded text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-slate-800 bg-slate-900 rounded text-xs text-slate-200"
          >
            <option value="ALL">Todos os status</option>
            <option value="ATIVA">Ativa</option>
            <option value="TESTE">Teste (Trial)</option>
            <option value="PAGAMENTO_PENDENTE">Pagamento Pendente</option>
            <option value="SUSPENSA">Suspensa</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>
      </div>

      {/* Tabela Mandatória do Master Prompt (Seção 28):
          Clínica, Responsável, Plano, Status, Usuários, Última atividade, Próxima cobrança, MRR, Data de entrada */}
      <div className="bg-slate-950 border border-slate-800 rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase font-mono-data">
                <th className="p-3">Clínica</th>
                <th className="p-3">Responsável</th>
                <th className="p-3">Plano</th>
                <th className="p-3">Status</th>
                <th className="p-3">Usuários</th>
                <th className="p-3">Última Atividade</th>
                <th className="p-3">Próxima Cobrança</th>
                <th className="p-3">MRR</th>
                <th className="p-3">Data Entrada</th>
                <th className="p-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredClinics.map((c) => (
                <tr
                  key={c.id}
                  onClick={() => setLocation(`/platform/clinics/${c.id}`)}
                  className="hover:bg-slate-900/60 cursor-pointer transition-colors"
                >
                  <td className="p-3 font-bold text-white whitespace-nowrap">
                    {c.name}
                  </td>
                  <td className="p-3 text-slate-300 whitespace-nowrap">
                    {c.ownerName}
                  </td>
                  <td className="p-3 font-mono-data text-slate-300 whitespace-nowrap">
                    {c.planName}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <StatusBadge status={c.status} size="sm" />
                  </td>
                  <td className="p-3 font-mono-data text-slate-400 whitespace-nowrap">
                    {c.usersCount} ativos
                  </td>
                  <td className="p-3 font-mono-data text-slate-400 whitespace-nowrap">
                    {c.lastActivityAt}
                  </td>
                  <td className="p-3 font-mono-data text-slate-300 whitespace-nowrap">
                    {c.nextBillingDate}
                  </td>
                  <td className="p-3 font-mono-data font-bold text-amber-400 whitespace-nowrap">
                    R$ {c.mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 font-mono-data text-slate-500 whitespace-nowrap">
                    {new Date(c.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setLocation(`/platform/clinics/${c.id}`)}
                        className="px-2 py-1 text-[11px] font-semibold text-slate-200 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors"
                      >
                        Abrir
                      </button>
                      <button
                        onClick={() => setSuspendClinicId(c.id)}
                        className={`px-2 py-1 text-[11px] font-semibold rounded border transition-colors ${
                          c.status === 'SUSPENSA'
                            ? 'bg-emerald-950 text-emerald-300 border-emerald-800 hover:bg-emerald-900'
                            : 'bg-rose-950 text-rose-300 border-rose-800 hover:bg-rose-900'
                        }`}
                      >
                        {c.status === 'SUSPENSA' ? 'Reativar' : 'Suspender'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diálogo de Confirmação para Suspender/Reativar Clínica */}
      <ConfirmationDialog
        isOpen={!!suspendClinicId}
        onClose={() => setSuspendClinicId(null)}
        onConfirm={handleConfirmSuspend}
        title="Alterar Status de Acesso da Clínica"
        description="Ao suspender a clínica, todos os acessos dos seus usuários serão temporariamente bloqueados para entrada até que a assinatura seja regularizada. Os dados médicos permanecem íntegros e preservados."
        confirmText="Confirmar Alteração"
        isDestructive={true}
      />
    </div>
  );
};
