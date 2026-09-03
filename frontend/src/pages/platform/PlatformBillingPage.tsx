import React, { useState } from 'react';
import { useOperationalData } from '../../context/OperationalDataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MetricCard } from '../../components/common/MetricCard';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { Receipt, Search, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { PlatformInvoice } from '../../types';

export const PlatformBillingPage: React.FC = () => {
  const { platformInvoices, markPlatformInvoicePaid, platformClinics } = useOperationalData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [confirmInvoiceId, setConfirmInvoiceId] = useState<string | null>(null);

  // Métricas do Faturamento da BHON cobrado das clínicas (Seção 31)
  const totalReceived = platformInvoices
    .filter((i) => i.status === 'PAGO')
    .reduce((acc, i) => acc + i.amount, 0);

  const totalToReceive = platformInvoices
    .filter((i) => i.status === 'PENDENTE')
    .reduce((acc, i) => acc + i.amount, 0);

  const totalOverdue = platformInvoices
    .filter((i) => i.status === 'ATRASADO')
    .reduce((acc, i) => acc + i.amount, 0);

  const mrr = platformClinics
    .filter((c) => c.status === 'ATIVA')
    .reduce((acc, c) => acc + c.mrr, 0);

  const arr = mrr * 12;
  const arpc = platformClinics.length > 0 ? Math.round(mrr / platformClinics.length) : 1350;

  const filteredInvoices = platformInvoices.filter((inv) => {
    const matchesSearch =
      inv.clinicName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleConfirmPaid = () => {
    if (confirmInvoiceId) {
      markPlatformInvoicePaid(confirmInvoiceId);
      setConfirmInvoiceId(null);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto text-slate-100">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-3">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-white">
            Faturamento da BHON
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Cobrança de mensalidades e receita recorrente das clínicas clientes (Receita BHON).
          </p>
        </div>

        <div className="p-2 bg-amber-950/60 border border-amber-800/80 rounded font-mono-data text-xs text-amber-300">
          MRR Ativo: <strong>R$ {mrr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>
        </div>
      </div>

      {/* Métricas Mandatórias do Faturamento da BHON (Seção 31) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Receita Recebida (Mês)</span>
          <div className="font-mono-data text-xl font-bold text-emerald-400">
            R$ {totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 font-mono-data mt-1 block">Mensalidades liquidadas</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">Receita a Receber</span>
          <div className="font-mono-data text-xl font-bold text-amber-400">
            R$ {totalToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 font-mono-data mt-1 block">A vencer no ciclo</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded border-l-4 border-l-rose-500">
          <span className="text-xs text-slate-400 block mb-1">Mensalidades Atrasadas</span>
          <div className="font-mono-data text-xl font-bold text-rose-400">
            R$ {totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-rose-300 font-mono-data mt-1 block">Requer régua de cobrança</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">ARR Projetado</span>
          <div className="font-mono-data text-xl font-bold text-white">
            R$ {arr.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 font-mono-data mt-1 block">Anualizado</span>
        </div>

        <div className="p-3.5 bg-slate-950 border border-slate-800 rounded">
          <span className="text-xs text-slate-400 block mb-1">ARPC (Receita Média)</span>
          <div className="font-mono-data text-xl font-bold text-white">
            R$ {arpc.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </div>
          <span className="text-[10px] text-slate-400 font-mono-data mt-1 block">Por clínica parceira</span>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-3 border border-slate-800 rounded">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por clínica ou número de fatura..."
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
            <option value="PAGO">Pagos</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="ATRASADO">Atrasados</option>
          </select>
        </div>
      </div>

      {/* Tabela Mandatória do Master Prompt (Seção 31):
          Clínica, Plano, Valor, Vencimento, Status, Último pagamento, Próxima cobrança */}
      <div className="bg-slate-950 border border-slate-800 rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-900/90 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase font-mono-data">
                <th className="p-3">Fatura</th>
                <th className="p-3">Clínica Contratante</th>
                <th className="p-3">Plano</th>
                <th className="p-3">Valor da Mensalidade</th>
                <th className="p-3">Vencimento</th>
                <th className="p-3">Status</th>
                <th className="p-3">Último Pagamento</th>
                <th className="p-3">Próxima Cobrança</th>
                <th className="p-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredInvoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-900/60 transition-colors">
                  <td className="p-3 font-mono-data font-bold text-white whitespace-nowrap">
                    {inv.invoiceNumber}
                  </td>
                  <td className="p-3 font-bold text-slate-200 whitespace-nowrap">
                    {inv.clinicName}
                  </td>
                  <td className="p-3 font-mono-data text-slate-400 whitespace-nowrap">
                    {inv.planName}
                  </td>
                  <td className="p-3 font-mono-data font-bold text-amber-400 whitespace-nowrap">
                    R$ {inv.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-3 font-mono-data text-slate-300 whitespace-nowrap">
                    {inv.dueDate}
                  </td>
                  <td className="p-3 whitespace-nowrap">
                    <StatusBadge status={inv.status} size="sm" />
                  </td>
                  <td className="p-3 font-mono-data text-slate-400 whitespace-nowrap">
                    {inv.lastPaymentDate || '—'}
                  </td>
                  <td className="p-3 font-mono-data text-slate-300 whitespace-nowrap">
                    {inv.nextBillingDate}
                  </td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {inv.status !== 'PAGO' ? (
                      <button
                        onClick={() => setConfirmInvoiceId(inv.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors"
                      >
                        Confirmar Pagamento
                      </button>
                    ) : (
                      <span className="font-mono-data text-[10px] text-emerald-400 font-bold">
                        LIQUIDADO
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmationDialog
        isOpen={!!confirmInvoiceId}
        onClose={() => setConfirmInvoiceId(null)}
        onConfirm={handleConfirmPaid}
        title="Baixar Fatura da Plataforma BHON"
        description="A fatura de mensalidade será confirmada como PAGA no faturamento da BHON. A clínica cliente terá a licença renovada automaticamente para o próximo ciclo."
        confirmText="Confirmar Baixa"
        isDestructive={false}
      />
    </div>
  );
};
