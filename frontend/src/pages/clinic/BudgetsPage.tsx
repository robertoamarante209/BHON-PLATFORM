import React, { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { useLocation } from 'wouter';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import { Drawer } from '../../components/common/Drawer';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { approveBudget, listBudgets, type BudgetMetrics, type Pagination } from '../../lib/clinic';
import type { Budget, QuoteStatus } from '../../types';

const approvalRoles = ['OWNER', 'ADMIN', 'MANAGER'];
const quoteStatuses: QuoteStatus[] = ['DRAFT', 'SENT', 'VIEWED', 'NEGOTIATING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'NO_RESPONSE'];
const emptyMetrics: BudgetMetrics = { totalInNegotiation: 0, noResponseCount: 0, approvedCount: 0, rejectedCount: 0, conversionRate: null };

export const BudgetsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [metrics, setMetrics] = useState<BudgetMetrics>(emptyMetrics);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<QuoteStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [selectedBudget, setSelectedBudget] = useState<Budget | null>(null);
  const [confirmApproveId, setConfirmApproveId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const result = await listBudgets({ search: searchTerm.trim() || undefined, status: statusFilter === 'ALL' ? undefined : statusFilter, page, limit: 20 }, signal);
      setBudgets(result.data);
      setMetrics(result.metrics);
      setPagination(result.pagination);
      setSelectedBudget((current) => current ? result.data.find((item) => item.id === current.id) || null : null);
    } catch (loadError) {
      if ((loadError as Error).name !== 'AbortError') setError((loadError as Error).message || 'Não foi possível carregar os orçamentos.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  const handleApproveConfirm = async () => {
    if (!confirmApproveId || saving) return;
    setSaving(true);
    setError('');
    try {
      await approveBudget(confirmApproveId);
      setConfirmApproveId(null);
      await load();
    } catch (approveError) {
      setConfirmApproveId(null);
      setError((approveError as Error).message || 'Não foi possível aprovar o orçamento.');
    } finally {
      setSaving(false);
    }
  };

  const canApprove = approvalRoles.includes(currentUser.role);
  const money = (value: number) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col justify-between gap-3 border-b border-bhon-border pb-3 sm:flex-row sm:items-center"><div><h1 className="text-lg font-bold uppercase tracking-wide text-bhon-text">Orçamentos Clínicos</h1><p className="mt-0.5 text-xs text-bhon-muted">Negociação persistida de planos terapêuticos e conversão financeira auditável.</p></div><span className="font-mono-data text-xs text-bhon-muted">{pagination.total} propostas encontradas</span></div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5"><MetricCard label="Total em Negociação" value={money(metrics.totalInNegotiation)} subtext="Volume ativo na esteira" highlight /><MetricCard label="Sem Resposta" value={metrics.noResponseCount} subtext="Propostas sem retorno" /><MetricCard label="Aprovados" value={metrics.approvedCount} subtext="Tratamentos ativados" /><MetricCard label="Recusados" value={metrics.rejectedCount} subtext="Propostas encerradas" /><MetricCard label="Taxa de Conversão" value={metrics.conversionRate == null ? 'Sem base' : `${metrics.conversionRate}%`} subtext="Aprovados entre decisões" /></div>

      <div className="flex flex-col gap-3 rounded border border-bhon-border bg-white p-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-bhon-muted" /><input value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder="Buscar por paciente, prontuário ou procedimento…" className="w-full rounded border border-bhon-border py-1.5 pl-9 pr-3 text-xs focus:border-bhon-teal focus:outline-none" /></div><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as QuoteStatus | 'ALL'); setPage(1); }} className="rounded border border-bhon-border bg-white px-2.5 py-1.5 text-xs"><option value="ALL">Todos os status</option>{quoteStatuses.map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}</select></div>

      {error && <div role="alert" className="flex items-center justify-between border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"><span>{error}</span><button type="button" onClick={() => void load()} className="font-bold underline">Tentar novamente</button></div>}

      <div className="overflow-hidden rounded border border-bhon-border bg-white shadow-sm">{loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-bhon-muted"><Loader2 className="h-4 w-4 animate-spin" /> Carregando orçamentos…</div> : budgets.length === 0 ? <div className="min-h-48 p-10 text-center"><p className="font-semibold text-bhon-text">Nenhum orçamento encontrado</p><p className="mt-1 text-xs text-bhon-muted">Ajuste a busca ou o status selecionado.</p></div> : <div className="overflow-x-auto"><table className="bhon-table"><thead><tr><th>Paciente</th><th>Plano de Tratamento</th><th>Criado Por</th><th>Valor Bruto</th><th>Desconto</th><th>Valor Final</th><th>Condição</th><th>Status</th><th className="text-right">Ação</th></tr></thead><tbody>{budgets.map((budget) => <tr key={budget.id} onClick={() => setSelectedBudget(budget)} className="cursor-pointer transition-colors hover:bg-slate-50"><td className="whitespace-nowrap"><p className="font-bold text-bhon-text">{budget.patientName}</p><span className="font-mono-data text-[10px] text-bhon-muted">{budget.patientRecordNumber}</span></td><td className="max-w-xs truncate font-semibold text-bhon-text">{budget.treatmentTitle}</td><td className="whitespace-nowrap text-xs text-bhon-muted">{budget.createdByName || 'Não informado'}</td><td className="whitespace-nowrap font-mono-data text-xs text-slate-500">{money(budget.totalAmount)}</td><td className="whitespace-nowrap font-mono-data text-xs text-emerald-700">{budget.discountAmount > 0 ? `-${money(budget.discountAmount)}` : '—'}</td><td className="whitespace-nowrap font-mono-data text-xs font-bold">{money(budget.finalAmount)}</td><td className="max-w-xs truncate text-xs text-bhon-muted">{budget.paymentMethod || 'A definir'}</td><td><StatusBadge status={budget.status} /></td><td className="text-right">{canApprove && !['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(budget.status) ? <button type="button" onClick={(event) => { event.stopPropagation(); setConfirmApproveId(budget.id); }} className="rounded bg-emerald-700 px-2.5 py-1 text-[11px] font-bold text-white transition-colors hover:bg-emerald-800">Aprovar</button> : budget.status === 'ACCEPTED' ? <span className="font-mono-data text-[10px] font-bold text-emerald-700">ATIVADO</span> : '—'}</td></tr>)}</tbody></table></div>}</div>

      {pagination.totalPages > 1 && <div className="flex items-center justify-end gap-2 text-xs text-bhon-muted"><button type="button" aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded border border-bhon-border p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>Página {page} de {pagination.totalPages}</span><button type="button" aria-label="Próxima página" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded border border-bhon-border p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>}

      <Drawer isOpen={!!selectedBudget} onClose={() => setSelectedBudget(null)} title="Dossiê do Orçamento" subtitle={selectedBudget ? `${selectedBudget.patientName} (${selectedBudget.patientRecordNumber})` : ''} width="max-w-lg">{selectedBudget && <div className="space-y-4 text-xs"><div className="space-y-1.5 rounded border border-bhon-border bg-slate-50 p-3"><button type="button" onClick={() => setLocation(`/clinic/patients/${selectedBudget.patientId}`)} className="font-bold text-bhon-teal hover:underline">Abrir prontuário de {selectedBudget.patientName} →</button><div className="flex justify-between"><span className="text-bhon-muted">Plano terapêutico</span><span className="font-bold">{selectedBudget.treatmentTitle}</span></div><div className="flex justify-between"><span className="text-bhon-muted">Condição proposta</span><span>{selectedBudget.paymentMethod || 'A combinar'}</span></div></div><div><p className="mb-2 font-bold uppercase tracking-wider">Procedimentos inclusos</p><div className="overflow-hidden rounded border border-bhon-border"><table className="bhon-table"><thead><tr><th>Procedimento</th><th>Qtd</th><th className="text-right">Total</th></tr></thead><tbody>{selectedBudget.items.map((item) => <tr key={item.id}><td>{item.description}</td><td className="font-mono-data">{item.quantity}</td><td className="text-right font-mono-data font-bold">{money(item.totalPrice)}</td></tr>)}</tbody></table></div></div><div className="space-y-1 rounded border border-bhon-border bg-slate-50 p-3 font-mono-data"><div className="flex justify-between text-bhon-muted"><span>Subtotal</span><span>{money(selectedBudget.totalAmount)}</span></div><div className="flex justify-between text-emerald-700"><span>Desconto</span><span>-{money(selectedBudget.discountAmount)}</span></div><div className="flex justify-between border-t border-bhon-border pt-1.5 text-sm font-bold"><span>Valor final</span><span>{money(selectedBudget.finalAmount)}</span></div></div>{canApprove && !['ACCEPTED', 'REJECTED', 'EXPIRED'].includes(selectedBudget.status) && <button type="button" disabled={saving} onClick={() => setConfirmApproveId(selectedBudget.id)} className="flex w-full items-center justify-center gap-1.5 rounded bg-emerald-700 py-2.5 font-bold uppercase tracking-wider text-white transition-colors hover:bg-emerald-800 disabled:opacity-60"><CheckCircle2 className="h-4 w-4" /> Aprovar e ativar tratamento</button>}</div>}</Drawer>

      <ConfirmationDialog isOpen={!!confirmApproveId} onClose={() => !saving && setConfirmApproveId(null)} onConfirm={() => void handleApproveConfirm()} title="Aprovar orçamento e disparar fluxos" description="Esta ação converte a oportunidade aberta, ativa o tratamento, gera o recebível e registra timeline e auditoria em uma única transação." confirmText={saving ? 'Processando…' : 'Aprovar e ativar'} isDestructive={false} />
    </div>
  );
};
