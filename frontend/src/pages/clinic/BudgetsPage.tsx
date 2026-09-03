import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useOperationalData } from '../../context/OperationalDataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MetricCard } from '../../components/common/MetricCard';
import { Drawer } from '../../components/common/Drawer';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import {
  FileCheck,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  DollarSign,
  AlertTriangle
} from 'lucide-react';
import { Budget } from '../../types';

export const BudgetsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { budgets, approveBudget } = useOperationalData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);

  // Métricas Mandatórias do Master Prompt (Seção 21)
  const totalInNegotiation = budgets
    .filter((b) => b.status === 'NEGOTIATING' || b.status === 'SENT' || b.status === 'VIEWED')
    .reduce((acc, b) => acc + b.finalAmount, 0);

  const noResponseCount = budgets.filter((b) => b.status === 'NO_RESPONSE').length;
  const approvedCount = budgets.filter((b) => b.status === 'ACCEPTED').length;
  const rejectedCount = budgets.filter((b) => b.status === 'REJECTED').length;

  const totalDecided = approvedCount + rejectedCount;
  const conversionRate = totalDecided > 0 ? Math.round((approvedCount / totalDecided) * 100) : 78;

  const filteredBudgets = budgets.filter((b) => {
    const matchesSearch =
      b.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.treatmentTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.patientRecordNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || b.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleApproveConfirm = () => {
    if (confirmApproveId) {
      approveBudget(confirmApproveId);
      setConfirmApproveId(null);
      if (selectedBudget && selectedBudget.id === confirmApproveId) {
        setSelectedBudget((prev) => (prev ? { ...prev, status: 'ACCEPTED' } : null));
      }
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-bhon-border gap-3">
        <div>
          <h1 className="text-lg font-bold text-bhon-text uppercase tracking-wide">
            Orçamentos Clínicos
          </h1>
          <p className="text-xs text-bhon-muted mt-0.5">
            Negociação de planos de tratamento, detalhamento de procedimentos e conversão financeira.
          </p>
        </div>

        <span className="font-mono-data text-xs text-bhon-muted self-start sm:self-auto">
          {budgets.length} propostas registradas
        </span>
      </div>

      {/* Métricas Requeridas pelo Master Prompt (Seção 21) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <MetricCard
          label="Total em Negociação"
          value={`R$ ${totalInNegotiation.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
          subtext="Volume ativo na esteira"
          highlight={true}
        />
        <MetricCard
          label="Sem Resposta"
          value={noResponseCount}
          subtext="Mais de 3 dias sem retorno"
          delta={noResponseCount > 0 ? { value: `${noResponseCount} parados`, isPositive: false } : undefined}
        />
        <MetricCard
          label="Aprovados"
          value={approvedCount}
          subtext="Tratamentos ativados"
          delta={{ value: '+4 este mês', isPositive: true }}
        />
        <MetricCard
          label="Recusados"
          value={rejectedCount}
          subtext="Motivo de recusa registrado"
        />
        <MetricCard
          label="Taxa de Conversão"
          value={`${conversionRate}%`}
          subtext="Meta clínica: 70%"
          delta={{ value: '+8% vs meta', isPositive: true }}
        />
      </div>

      {/* Barra de Filtros */}
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
            <option value="NEGOTIATING">Em Negociação</option>
            <option value="ACCEPTED">Aprovados</option>
            <option value="SENT">Enviados</option>
            <option value="NO_RESPONSE">Sem Resposta</option>
            <option value="REJECTED">Recusados</option>
          </select>
        </div>
      </div>

      {/* Tabela de Orçamentos */}
      <div className="bg-white border border-bhon-border rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="bhon-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Plano de Tratamento</th>
                <th>Criado Por</th>
                <th>Valor Bruto</th>
                <th>Desconto</th>
                <th>Valor Final</th>
                <th>Condição de Pagamento</th>
                <th>Status</th>
                <th className="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredBudgets.map((b) => (
                <tr
                  key={b.id}
                  onClick={() => setSelectedBudget(b)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="whitespace-nowrap">
                    <p className="font-bold text-bhon-text">{b.patientName}</p>
                    <span className="font-mono-data text-[10px] text-bhon-muted">
                      {b.patientRecordNumber}
                    </span>
                  </td>
                  <td className="font-semibold text-bhon-text max-w-xs truncate" title={b.treatmentTitle}>
                    {b.treatmentTitle}
                  </td>
                  <td className="text-xs text-bhon-muted whitespace-nowrap">
                    {b.createdByName || 'Dr. Roberto Carlos Fagundes'}
                  </td>
                  <td className="font-mono-data text-xs text-slate-500 line-through whitespace-nowrap">
                    R$ {b.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="font-mono-data text-xs text-emerald-700 whitespace-nowrap">
                    {b.discountAmount > 0
                      ? `-R$ ${b.discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : '—'}
                  </td>
                  <td className="font-mono-data font-bold text-xs text-bhon-text whitespace-nowrap">
                    R$ {b.finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="text-xs text-bhon-muted max-w-xs truncate">
                    {b.paymentMethod || 'A definir'}
                  </td>
                  <td className="whitespace-nowrap">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="text-right whitespace-nowrap">
                    {b.status !== 'ACCEPTED' ? (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmApproveId(b.id);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded transition-colors"
                      >
                        Aprovar
                      </button>
                    ) : (
                      <span className="font-mono-data text-[10px] text-emerald-700 font-bold">
                        ATIVADO
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer com Detalhes dos Procedimentos do Orçamento */}
      <Drawer
        isOpen={!!selectedBudget}
        onClose={() => setSelectedBudget(null)}
        title="Dossiê do Orçamento"
        subtitle={selectedBudget ? `${selectedBudget.patientName} (${selectedBudget.patientRecordNumber})` : ''}
        width="max-w-lg"
      >
        {selectedBudget && (
          <div className="space-y-4 text-xs">
            {/* Cabeçalho do Orçamento */}
            <div className="p-3 bg-slate-50 border border-bhon-border rounded space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Plano Terapêutico:</span>
                <span className="font-bold text-bhon-text">{selectedBudget.treatmentTitle}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Condição Proposta:</span>
                <span className="text-bhon-text font-medium">{selectedBudget.paymentMethod || 'A combinar'}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-bhon-border">
                <span className="text-bhon-muted">Status Atual:</span>
                <StatusBadge status={selectedBudget.status} />
              </div>
            </div>

            {/* Procedimentos e Itens */}
            <div>
              <p className="font-bold text-bhon-text uppercase tracking-wider text-[11px] mb-2">
                Procedimentos Inclusos na Proposta
              </p>
              <div className="border border-bhon-border rounded overflow-hidden">
                <table className="bhon-table">
                  <thead>
                    <tr>
                      <th>Procedimento</th>
                      <th>Qtd</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedBudget.items.map((item) => (
                      <tr key={item.id}>
                        <td className="font-medium text-bhon-text">{item.description}</td>
                        <td className="font-mono-data">{item.quantity}</td>
                        <td className="font-mono-data font-bold text-right">
                          R$ {item.totalPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Totalizadores */}
            <div className="p-3 bg-slate-50 border border-bhon-border rounded space-y-1 font-mono-data">
              <div className="flex justify-between text-bhon-muted">
                <span>Subtotal Bruto:</span>
                <span>R$ {selectedBudget.totalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              {selectedBudget.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Desconto Aplicado:</span>
                  <span>-R$ {selectedBudget.discountAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-bold text-bhon-text pt-1.5 border-t border-bhon-border">
                <span>Valor Final Aprovado:</span>
                <span>R$ {selectedBudget.finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {/* Botão de Ação de Aprovação (Workflow Cruzado) */}
            {selectedBudget.status !== 'ACCEPTED' ? (
              <button
                type="button"
                onClick={() => setConfirmApproveId(selectedBudget.id)}
                className="w-full py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Aprovar Orçamento e Ativar Tratamento</span>
              </button>
            ) : (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded font-semibold text-center">
                ✓ Orçamento Aprovado • Tratamento ativado e recebíveis lançados
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Confirmação de Aprovação com Explicação das Consequências de Sistema */}
      <ConfirmationDialog
        isOpen={!!confirmApproveId}
        onClose={() => setConfirmApproveId(null)}
        onConfirm={handleApproveConfirm}
        title="Aprovar Orçamento e Disparar Fluxos"
        description="Ao aprovar este orçamento: 1) A oportunidade será convertida em venda; 2) O tratamento clínico será ativado com suas sessões; 3) O lançamento de entrada a receber será registrado no financeiro; 4) O evento será registrado na linha do tempo do prontuário e no log de auditoria."
        confirmText="Aprovar e Ativar"
        isDestructive={false}
      />
    </div>
  );
};
