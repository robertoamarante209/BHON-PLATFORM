import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useOperationalData } from '../../context/OperationalDataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MetricCard } from '../../components/common/MetricCard';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { DollarSign, Search, CheckCircle2, AlertTriangle, ArrowRight } from 'lucide-react';
import { Payment } from '../../types';

export const FinancePage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { payments, recordPayment, budgets } = useOperationalData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [confirmPaymentId, setConfirmPaymentId] = useState<string | null>(null);

  // Métricas Mandatórias do Master Prompt (Seção 22)
  const totalReceived = payments
    .filter((p) => p.status === 'PAGO')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalToReceive = payments
    .filter((p) => p.status === 'PENDENTE')
    .reduce((acc, p) => acc + p.amount, 0);

  const totalOverdue = payments
    .filter((p) => p.status === 'ATRASADO')
    .reduce((acc, p) => acc + p.amount, 0);

  const projectedRevenue = totalReceived + totalToReceive + totalOverdue;

  const totalInNegotiation = budgets
    .filter((b) => b.status === 'NEGOTIATING' || b.status === 'SENT')
    .reduce((acc, b) => acc + b.finalAmount, 0);

  const avgTicket = payments.length > 0 ? Math.round(projectedRevenue / payments.length) : 3200;

  const filteredPayments = payments.filter((p) => {
    const matchesSearch =
      p.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.referenceDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.patientRecordNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleSettlePayment = () => {
    if (confirmPaymentId) {
      recordPayment(confirmPaymentId);
      setConfirmPaymentId(null);
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-bhon-border gap-3">
        <div>
          <h1 className="text-lg font-bold text-bhon-text uppercase tracking-wide">
            Financeiro da Clínica
          </h1>
          <p className="text-xs text-bhon-muted mt-0.5">
            Contas a receber dos pacientes, baixas de pagamentos, controle de inadimplência e conciliação.
          </p>
        </div>

        <span className="font-mono-data text-xs text-bhon-muted self-start sm:self-auto">
          {payments.length} lançamentos registrados
        </span>
      </div>

      {/* Métricas Requeridas pelo Master Prompt (Seção 22) */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <MetricCard
          label="Receita Prevista"
          value={`R$ ${projectedRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtext="Total faturado no ciclo"
        />
        <MetricCard
          label="Receita Recebida"
          value={`R$ ${totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtext="Entradas confirmadas"
          highlight={true}
        />
        <MetricCard
          label="A Receber"
          value={`R$ ${totalToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtext="Parcelas em dia"
        />
        <MetricCard
          label="Inadimplência"
          value={`R$ ${totalOverdue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtext="Valores em atraso"
          delta={totalOverdue > 0 ? { value: 'Atenção', isPositive: false } : undefined}
        />
        <MetricCard
          label="Em Negociação"
          value={`R$ ${totalInNegotiation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtext="Orçamentos pendentes"
        />
        <MetricCard
          label="Ticket Médio"
          value={`R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtext="Por procedimento"
        />
      </div>

      {/* Barra de Busca e Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-bhon-border rounded">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-bhon-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por paciente, prontuário ou procedimento..."
            className="w-full pl-9 pr-3 py-1.5 border border-bhon-border rounded text-xs text-bhon-text placeholder:text-bhon-muted focus:outline-none focus:border-bhon-teal"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-bhon-border rounded text-xs text-bhon-text bg-white"
          >
            <option value="ALL">Todos os status</option>
            <option value="PAGO">Pagos</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="ATRASADO">Atrasados</option>
            <option value="PARCIAL">Parciais</option>
          </select>
        </div>
      </div>

      {/* Tabela Mandatória do Master Prompt:
          Data, Paciente, Referência, Categoria, Valor, Vencimento, Status */}
      <div className="bg-white border border-bhon-border rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="bhon-table">
            <thead>
              <tr>
                <th>Vencimento</th>
                <th>Paciente</th>
                <th>Referência / Descrição</th>
                <th>Categoria</th>
                <th>Valor</th>
                <th>Forma de Pagamento</th>
                <th>Status</th>
                <th className="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                  <td className="font-mono-data text-xs whitespace-nowrap">
                    {p.dueDate}
                  </td>
                  <td className="whitespace-nowrap">
                    <span
                      onClick={() => setLocation(`/clinic/patients/${p.patientId}`)}
                      className="font-bold text-bhon-text hover:text-bhon-teal hover:underline cursor-pointer"
                    >
                      {p.patientName}
                    </span>
                    <span className="block font-mono-data text-[10px] text-bhon-muted">
                      {p.patientRecordNumber}
                    </span>
                  </td>
                  <td className="text-xs font-semibold text-bhon-text max-w-xs truncate" title={p.referenceDescription}>
                    {p.referenceDescription}
                  </td>
                  <td className="text-xs text-bhon-muted whitespace-nowrap">
                    {p.category}
                  </td>
                  <td className="font-mono-data font-bold text-xs text-bhon-text whitespace-nowrap">
                    R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-xs text-bhon-muted whitespace-nowrap">
                    {p.paymentMethod || 'PIX'}
                  </td>
                  <td className="whitespace-nowrap">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {p.status !== 'PAGO' ? (
                      <button
                        onClick={() => setConfirmPaymentId(p.id)}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors"
                      >
                        Baixar
                      </button>
                    ) : (
                      <span className="font-mono-data text-[10px] text-emerald-700 font-bold">
                        RECEBIDO
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Diálogo de Confirmação de Baixa de Pagamento */}
      <ConfirmationDialog
        isOpen={!!confirmPaymentId}
        onClose={() => setConfirmPaymentId(null)}
        onConfirm={handleSettlePayment}
        title="Confirmar Recebimento e Baixa"
        description="A parcela será marcada como PAGA. O saldo do paciente será liquidado, a linha do tempo do prontuário será atualizada e o valor entrará no fluxo de caixa da clínica."
        confirmText="Confirmar Recebimento"
        isDestructive={false}
      />
    </div>
  );
};
