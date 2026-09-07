import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Loader2, Search, WalletCards } from 'lucide-react';
import { useLocation } from 'wouter';
import { Drawer } from '../../components/common/Drawer';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { listPayments, settlePayment, type FinanceMetrics, type Pagination } from '../../lib/clinic';
import type { Payment, PaymentStatus } from '../../types';

const statuses: PaymentStatus[] = ['PAGO', 'PENDENTE', 'ATRASADO', 'PARCIAL', 'CANCELADO'];
const writeRoles = ['OWNER', 'ADMIN', 'MANAGER', 'FINANCIAL'];
const methods = [
  ['PIX', 'PIX'], ['CARTAO_CREDITO', 'Cartão de crédito'], ['CARTAO_DEBITO', 'Cartão de débito'],
  ['DINHEIRO', 'Dinheiro'], ['TRANSFERENCIA', 'Transferência'], ['BOLETO', 'Boleto'], ['OUTRO', 'Outro'],
] as const;
const emptyMetrics: FinanceMetrics = { receivedAmount: 0, outstandingAmount: 0, overdueAmount: 0, projectedRevenue: 0, negotiationAmount: 0, averageTicket: null };
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const date = (value: string) => new Date(value).toLocaleDateString('pt-BR', { timeZone: 'UTC' });

export const FinancePage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [focusId] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('focus') || '');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [metrics, setMetrics] = useState<FinanceMetrics>(emptyMetrics);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<PaymentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Payment | null>(null);
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState('PIX');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const canWrite = writeRoles.includes(currentUser.role);

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const result = await listPayments({ search: search.trim() || undefined, status: status === 'ALL' ? undefined : status, focus: focusId || undefined, page, limit: 20 }, signal);
      setPayments(result.data); setMetrics(result.metrics); setPagination(result.pagination);
      setSelected((current) => current ? result.data.find((item) => item.id === current.id) || null : focusId ? result.data.find((item) => item.id === focusId) || result.data[0] || null : null);
    } catch (loadError) {
      if ((loadError as Error).name !== 'AbortError') setError((loadError as Error).message || 'Não foi possível carregar o financeiro.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [focusId, page, search, status]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  const openPayment = (payment: Payment) => {
    setSelected(payment); setAmount((payment.outstandingAmount ?? payment.amount).toFixed(2)); setMethod('PIX'); setNotes(''); setError('');
  };

  const receive = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected || saving) return;
    const parsed = Number(amount.replace(',', '.'));
    const outstanding = selected.outstandingAmount ?? selected.amount;
    if (!Number.isFinite(parsed) || parsed <= 0 || parsed > outstanding) {
      setError(`Informe um valor entre R$ 0,01 e ${money(outstanding)}.`); return;
    }
    setSaving(true); setError('');
    try {
      await settlePayment(selected.id, { amount: parsed, method, notes: notes.trim() || undefined });
      setFeedback(parsed < outstanding ? 'Recebimento parcial registrado e saldo atualizado.' : 'Recebimento integral registrado com sucesso.');
      setSelected(null); await load();
    } catch (saveError) {
      setError((saveError as Error).message || 'Não foi possível registrar o recebimento.');
    } finally { setSaving(false); }
  };

  const cards = [
    ['Receita prevista', metrics.projectedRevenue, 'Total dos recebíveis'],
    ['Receita recebida', metrics.receivedAmount, 'Entradas confirmadas'],
    ['Saldo a receber', metrics.outstandingAmount, 'Em aberto'],
    ['Inadimplência', metrics.overdueAmount, 'Saldo vencido'],
    ['Em negociação', metrics.negotiationAmount, 'Orçamentos ativos'],
    ['Ticket médio', metrics.averageTicket, 'Por recebível ativo'],
  ] as const;

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col justify-between gap-3 border-b border-bhon-border pb-3 sm:flex-row sm:items-center"><div><h1 className="text-lg font-bold uppercase tracking-wide text-bhon-text">Financeiro da Clínica</h1><p className="mt-0.5 text-xs text-bhon-muted">Recebíveis persistidos, baixas parciais e integrais com trilha de auditoria.</p></div><span className="font-mono-data text-xs text-bhon-muted">{pagination.total} lançamentos</span></div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{cards.map(([label, value, subtext], index) => <MetricCard key={label} label={label} value={value == null ? '—' : money(value)} subtext={subtext} highlight={index === 1} delta={index === 3 && Number(value) > 0 ? { value: 'Atenção', isPositive: false } : undefined} />)}</div>

      {!focusId && <div className="flex flex-col gap-3 rounded border border-bhon-border bg-white p-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-bhon-muted" /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar paciente, prontuário ou referência…" className="w-full rounded border border-bhon-border py-1.5 pl-9 pr-3 text-xs focus:border-bhon-teal focus:outline-none" /></div><select value={status} onChange={(event) => { setStatus(event.target.value as PaymentStatus | 'ALL'); setPage(1); }} className="rounded border border-bhon-border bg-white px-2.5 py-1.5 text-xs"><option value="ALL">Todos os status</option>{statuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>}

      {feedback && <div role="status" className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">{feedback}</div>}
      {error && <div role="alert" className="flex items-center gap-2 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"><AlertTriangle className="h-4 w-4 shrink-0" /><span className="flex-1">{error}</span><button type="button" onClick={() => void load()} className="font-bold underline">Tentar novamente</button></div>}

      <div className="overflow-hidden rounded border border-bhon-border bg-white shadow-sm">
        {loading ? <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-bhon-muted"><Loader2 className="h-4 w-4 animate-spin" /> Carregando financeiro…</div> : payments.length === 0 ? <div className="min-h-52 p-10 text-center"><WalletCards className="mx-auto h-8 w-8 text-bhon-muted" /><p className="mt-3 font-semibold text-bhon-text">Nenhum recebível encontrado</p><p className="mt-1 text-xs text-bhon-muted">Ajuste os filtros ou aprove um orçamento para gerar recebíveis.</p></div> : <>
          <div className="divide-y divide-bhon-border md:hidden">{payments.map((payment) => <button type="button" key={payment.id} onClick={() => openPayment(payment)} className={`w-full p-4 text-left transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.99] ${payment.id === focusId ? 'bg-teal-50' : ''}`}><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-bhon-text">{payment.patientName}</p><p className="font-mono-data text-[10px] text-bhon-muted">{payment.patientRecordNumber} · vence {date(payment.dueDate)}</p></div><StatusBadge status={payment.status} /></div><p className="mt-3 truncate text-xs font-medium">{payment.referenceDescription}</p><div className="mt-2 flex items-end justify-between"><span className="text-[11px] text-bhon-muted">Saldo <strong className="block font-mono-data text-sm text-bhon-text">{money(payment.outstandingAmount ?? payment.amount)}</strong></span><span className="text-[11px] font-bold text-bhon-teal">Detalhes →</span></div></button>)}</div>
          <div className="hidden overflow-x-auto md:block"><table className="bhon-table"><thead><tr><th>Vencimento</th><th>Paciente</th><th>Referência</th><th>Categoria</th><th>Valor / saldo</th><th>Última forma</th><th>Status</th><th className="text-right">Ação</th></tr></thead><tbody>{payments.map((payment) => <tr key={payment.id} className={`transition-colors hover:bg-slate-50 ${payment.id === focusId ? 'bg-teal-50' : ''}`}><td className="whitespace-nowrap font-mono-data text-xs">{date(payment.dueDate)}</td><td className="whitespace-nowrap"><button type="button" onClick={() => setLocation(`/clinic/patients/${payment.patientId}`)} className="font-bold text-bhon-text hover:text-bhon-teal hover:underline">{payment.patientName}</button><span className="block font-mono-data text-[10px] text-bhon-muted">{payment.patientRecordNumber}</span></td><td className="max-w-xs truncate text-xs font-semibold" title={payment.referenceDescription}>{payment.referenceDescription}</td><td className="whitespace-nowrap text-xs text-bhon-muted">{payment.category}</td><td className="whitespace-nowrap"><strong className="block font-mono-data text-xs">{money(payment.amount)}</strong><span className="font-mono-data text-[10px] text-bhon-muted">saldo {money(payment.outstandingAmount ?? payment.amount)}</span></td><td className="whitespace-nowrap text-xs text-bhon-muted">{payment.paymentMethod || '—'}</td><td><StatusBadge status={payment.status} /></td><td className="text-right"><button type="button" onClick={() => openPayment(payment)} className="rounded border border-bhon-border bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-bhon-navy transition-[color,background-color,transform] duration-150 ease-out hover:bg-bhon-navy hover:text-white active:scale-[0.97]">{payment.status === 'PAGO' || payment.status === 'CANCELADO' ? 'Consultar' : canWrite ? 'Receber' : 'Consultar'}</button></td></tr>)}</tbody></table></div>
        </>}
      </div>

      {!focusId && pagination.totalPages > 1 && <div className="flex items-center justify-end gap-2 text-xs text-bhon-muted"><button type="button" aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded border border-bhon-border p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>Página {page} de {pagination.totalPages}</span><button type="button" aria-label="Próxima página" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded border border-bhon-border p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>}

      <Drawer isOpen={!!selected} onClose={() => !saving && setSelected(null)} title={selected && !['PAGO', 'CANCELADO'].includes(selected.status) && canWrite ? 'Registrar recebimento' : 'Consultar recebível'} subtitle={selected ? `${selected.patientName} (${selected.patientRecordNumber})` : ''} width="max-w-lg">{selected && <div className="space-y-4 text-xs"><div className="space-y-2 rounded border border-bhon-border bg-slate-50 p-3"><div className="flex items-start justify-between gap-3"><div><p className="text-bhon-muted">Referência</p><p className="font-bold">{selected.referenceDescription}</p></div><StatusBadge status={selected.status} /></div><div className="grid grid-cols-2 gap-3 border-t border-bhon-border pt-2"><div><p className="text-bhon-muted">Valor original</p><strong className="font-mono-data">{money(selected.amount)}</strong></div><div><p className="text-bhon-muted">Saldo em aberto</p><strong className="font-mono-data text-bhon-teal-dark">{money(selected.outstandingAmount ?? selected.amount)}</strong></div></div>{selected.lastReceipt && <p className="border-t border-bhon-border pt-2 text-bhon-muted">Última baixa: {money(selected.lastReceipt.amount)} em {new Date(selected.lastReceipt.paidAt).toLocaleString('pt-BR')} · {selected.lastReceipt.method.replace(/_/g, ' ')}</p>}</div>
        {!canWrite ? <div className="rounded border border-bhon-border p-3 text-bhon-muted">Seu perfil possui acesso somente para consulta do financeiro.</div> : ['PAGO', 'CANCELADO'].includes(selected.status) ? <div className="rounded border border-bhon-border p-3 text-bhon-muted">Este recebível não possui saldo disponível para baixa.</div> : <form onSubmit={receive} className="space-y-3"><label className="block space-y-1"><span className="font-bold">Valor recebido</span><input required type="number" min="0.01" max={selected.outstandingAmount ?? selected.amount} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} className="w-full rounded border border-bhon-border p-2 font-mono-data focus:border-bhon-teal focus:outline-none" /></label><label className="block space-y-1"><span className="font-bold">Forma de recebimento</span><select required value={method} onChange={(event) => setMethod(event.target.value)} className="w-full rounded border border-bhon-border bg-white p-2">{methods.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="block space-y-1"><span className="font-bold">Observação (opcional)</span><textarea rows={3} maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded border border-bhon-border p-2" placeholder="Ex.: comprovante conferido pela recepção" /></label><button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-1.5 rounded bg-emerald-700 py-2.5 font-bold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-emerald-800 active:scale-[0.97] disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirmar recebimento</button></form>}
        <button type="button" onClick={() => { setLocation(`/clinic/patients/${selected.patientId}`); setSelected(null); }} className="flex w-full items-center justify-center gap-1.5 rounded border border-bhon-border py-2 font-semibold text-bhon-navy transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]">Abrir prontuário <ArrowRight className="h-3.5 w-3.5" /></button></div>}</Drawer>
    </div>
  );
};

