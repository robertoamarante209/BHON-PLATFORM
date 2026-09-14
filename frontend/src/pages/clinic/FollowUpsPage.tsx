import React, { useCallback, useEffect, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { useLocation } from 'wouter';
import { Drawer } from '../../components/common/Drawer';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { executeFollowUpAction, listFollowUps, type FollowUpAssignee, type FollowUpMetrics, type Pagination } from '../../lib/clinic';
import type { FollowUp, FollowUpCategory, FollowUpStatus } from '../../types';

type ActionKind = 'COMPLETE' | 'POSTPONE' | 'REASSIGN' | 'LOG_CONTACT';
type Outcome = 'CONTACTED' | 'RESCHEDULED' | 'RECOVERED' | 'NO_RESPONSE' | 'NOT_INTERESTED';
const categories: Array<{ code: FollowUpCategory; label: string }> = [
  { code: 'POS_OPERATORIO', label: 'Pós-atendimento' }, { code: 'CONFIRMACAO', label: 'Confirmação' },
  { code: 'RETORNO', label: 'Retorno' }, { code: 'ORCAMENTO', label: 'Orçamento' },
  { code: 'TRATAMENTO', label: 'Tratamento' }, { code: 'REATIVACAO', label: 'Reativação' },
  { code: 'PENDENCIA_CLINICA', label: 'Pendência de cuidado' },
];
const statuses: FollowUpStatus[] = ['PENDENTE', 'EM_ANDAMENTO', 'ADIADO', 'CONCLUIDO', 'CANCELADO'];
const emptyCategoryCounts = Object.fromEntries(categories.map(({ code }) => [code, 0])) as Record<FollowUpCategory, number>;
const actionRoles = ['OWNER', 'ADMIN', 'MANAGER', 'DENTIST', 'RECEPTIONIST'];

export const FollowUpsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [focusId] = useState(() => typeof window === 'undefined' ? '' : new URLSearchParams(window.location.search).get('focus') || '');
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [assignees, setAssignees] = useState<FollowUpAssignee[]>([]);
  const [metrics, setMetrics] = useState<FollowUpMetrics>({ pendingToday: 0, categoryCounts: emptyCategoryCounts });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<FollowUpCategory | 'ALL'>('ALL');
  const [statusFilter, setStatusFilter] = useState<FollowUpStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [selectedFollowUp, setSelectedFollowUp] = useState<FollowUp | null>(null);
  const [action, setAction] = useState<ActionKind>('LOG_CONTACT');
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<Outcome | ''>('');
  const [newDeadline, setNewDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const result = await listFollowUps({ search: searchTerm.trim() || undefined, category: selectedCategory === 'ALL' ? undefined : selectedCategory, status: statusFilter === 'ALL' ? undefined : statusFilter, focus: focusId || undefined, page, limit: 20 }, signal);
      setFollowUps(result.data);
      setAssignees(result.assignees);
      setMetrics(result.metrics);
      setPagination(result.pagination);
      setSelectedFollowUp((current) => current ? result.data.find((item) => item.id === current.id) || null : focusId ? result.data[0] || null : null);
    } catch (loadError) {
      if ((loadError as Error).name !== 'AbortError') setError((loadError as Error).message || 'Não foi possível carregar os acompanhamentos.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [focusId, page, searchTerm, selectedCategory, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  const openFollowUp = (followUp: FollowUp) => {
    setSelectedFollowUp(followUp); setAction('LOG_CONTACT'); setNotes(''); setOutcome(''); setNewDeadline('');
    setAssigneeId(followUp.responsibleUserId || ''); setError('');
  };

  const submitAction = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedFollowUp || saving) return;
    if ((action === 'COMPLETE' || action === 'LOG_CONTACT') && notes.trim().length < 3) {
      setError('Descreva o contato realizado com pelo menos 3 caracteres.'); return;
    }
    if (action === 'COMPLETE' && !outcome) { setError('Selecione o desfecho do acompanhamento.'); return; }
    if (action === 'POSTPONE' && (!newDeadline || new Date(newDeadline) <= new Date())) { setError('Informe um novo prazo futuro.'); return; }
    if (action === 'REASSIGN' && !assigneeId) { setError('Selecione o novo responsável.'); return; }
    setSaving(true); setError('');
    try {
      if (action === 'COMPLETE') await executeFollowUpAction(selectedFollowUp.id, { action, notes: notes.trim(), outcome: outcome as Outcome });
      else if (action === 'LOG_CONTACT') await executeFollowUpAction(selectedFollowUp.id, { action, notes: notes.trim(), outcome: outcome || undefined });
      else if (action === 'POSTPONE') await executeFollowUpAction(selectedFollowUp.id, { action, newDeadline: new Date(newDeadline).toISOString(), notes: notes.trim() || undefined });
      else await executeFollowUpAction(selectedFollowUp.id, { action, assigneeId, notes: notes.trim() || undefined });
      setFeedback(action === 'COMPLETE' ? 'Acompanhamento concluído e registrado na timeline.' : 'Acompanhamento atualizado com sucesso.');
      setSelectedFollowUp(null);
      await load();
    } catch (saveError) {
      setError((saveError as Error).message || 'Não foi possível atualizar o acompanhamento.');
    } finally { setSaving(false); }
  };

  const isClosed = selectedFollowUp ? ['CONCLUIDO', 'CANCELADO'].includes(selectedFollowUp.status) : false;
  const canAct = actionRoles.includes(currentUser.role);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <header className="flex flex-col justify-between gap-3 border-b border-bhon-border pb-5 sm:flex-row sm:items-end"><div><p className="bhon-eyebrow">Relacionamento contínuo</p><h1 className="mt-2 font-display text-3xl text-bhon-navy">Recuperação</h1><p className="mt-2 max-w-xl text-sm text-bhon-muted">Uma fila clara para retomar conversas, recuperar orçamentos e trazer pacientes de volta.</p></div><span className="rounded-full bg-bhon-teal-subtle px-4 py-2 font-mono-data text-xs text-bhon-teal-dark"><strong>{metrics.pendingToday}</strong> para hoje</span></header>

      {!focusId && <><div className="flex flex-col gap-3 sm:flex-row"><div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-bhon-muted" /><input value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder="Buscar paciente, prontuário, motivo ou próxima ação…" className="w-full rounded border border-bhon-border bg-white py-1.5 pl-9 pr-3 text-xs focus:border-bhon-teal focus:outline-none" /></div><select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as FollowUpStatus | 'ALL'); setPage(1); }} className="rounded border border-bhon-border bg-white px-2.5 py-1.5 text-xs"><option value="ALL">Todos os status</option>{statuses.map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}</select></div><div className="flex select-none items-center gap-1.5 overflow-x-auto pb-1"><button type="button" onClick={() => { setSelectedCategory('ALL'); setPage(1); }} className={`whitespace-nowrap rounded px-3 py-1.5 text-xs font-semibold transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] ${selectedCategory === 'ALL' ? 'bg-bhon-navy text-white' : 'border border-bhon-border bg-white text-bhon-muted hover:text-bhon-text'}`}>Todas</button>{categories.map((category) => <button type="button" key={category.code} onClick={() => { setSelectedCategory(category.code); setPage(1); }} className={`flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-xs font-semibold transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] ${selectedCategory === category.code ? 'bg-bhon-teal text-white' : 'border border-bhon-border bg-white text-bhon-muted hover:text-bhon-text'}`}><span>{category.label}</span><span className="font-mono-data text-[10px] opacity-80">({metrics.categoryCounts[category.code] || 0})</span></button>)}</div></>}

      {feedback && <div role="status" className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">{feedback}</div>}
      {error && <div role="alert" className="flex items-center justify-between border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"><span>{error}</span><button type="button" onClick={() => void load()} className="font-bold underline">Tentar novamente</button></div>}

      <section aria-label="Fila de recuperação">{loading ? <div className="flex min-h-48 items-center justify-center gap-2 rounded-2xl border border-bhon-border bg-white text-sm text-bhon-muted"><Loader2 className="h-4 w-4 animate-spin" /> Organizando prioridades…</div> : followUps.length === 0 ? <div className="min-h-48 rounded-2xl border border-bhon-border bg-white p-10 text-center"><p className="font-semibold text-bhon-text">Nenhuma conversa pendente</p><p className="mt-1 text-xs text-bhon-muted">A fila está em dia para os filtros selecionados.</p></div> : <div className="space-y-3">{followUps.map((followUp) => <article key={followUp.id} className="grid gap-4 rounded-2xl border border-bhon-border bg-white p-4 shadow-[0_8px_24px_rgba(31,49,60,0.035)] sm:grid-cols-[minmax(0,1fr)_170px_auto] sm:items-center sm:p-5"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="font-semibold text-bhon-text">{followUp.patientName}</p><span className="font-mono-data text-[10px] text-bhon-muted">{followUp.patientRecordNumber}</span><StatusBadge status={followUp.status} size="sm" /></div><p className="mt-2 truncate text-sm font-medium text-bhon-text">{followUp.reason}</p><p className="mt-1 truncate text-xs text-bhon-teal-dark">{followUp.nextAction || 'Registrar contato'}</p></div><div className="text-xs text-bhon-muted"><p className="font-mono-data text-bhon-text">{new Date(followUp.deadlineAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p><p className="mt-1 truncate">{followUp.responsibleUserName || 'Sem responsável'}</p></div><button type="button" aria-label={`${['CONCLUIDO', 'CANCELADO'].includes(followUp.status) ? 'Consultar' : 'Registrar contato com'} ${followUp.patientName}`} onClick={() => openFollowUp(followUp)} className="min-h-11 rounded-xl bg-bhon-navy px-4 text-xs font-semibold text-white hover:bg-bhon-navy-hover">{['CONCLUIDO', 'CANCELADO'].includes(followUp.status) ? 'Consultar' : 'Registrar contato'}</button></article>)}</div>}</section>

      {!focusId && pagination.totalPages > 1 && <div className="flex items-center justify-end gap-2 text-xs text-bhon-muted"><button type="button" aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded border border-bhon-border p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>Página {page} de {pagination.totalPages}</span><button type="button" aria-label="Próxima página" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded border border-bhon-border p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>}

      <Drawer isOpen={!!selectedFollowUp} onClose={() => !saving && setSelectedFollowUp(null)} title={isClosed || !canAct ? 'Consultar acompanhamento' : 'Executar acompanhamento'} subtitle={selectedFollowUp ? `${selectedFollowUp.patientName} (${selectedFollowUp.patientRecordNumber})` : ''} width="max-w-lg">{selectedFollowUp && <div className="space-y-4 text-xs"><div className="space-y-1.5 rounded border border-bhon-border bg-slate-50 p-3"><div className="flex justify-between"><span className="text-bhon-muted">Categoria</span><strong>{selectedFollowUp.category.replace(/_/g, ' ')}</strong></div><p className="font-bold">{selectedFollowUp.reason}</p><div className="flex justify-between border-t border-bhon-border pt-1.5"><span className="text-bhon-muted">Responsável</span><span>{selectedFollowUp.responsibleUserName || 'Não atribuído'}</span></div></div>{isClosed ? <div className="rounded border border-bhon-border p-3 text-bhon-muted">Este acompanhamento está encerrado e permanece disponível apenas para consulta.</div> : !canAct ? <div className="rounded border border-bhon-border p-3 text-bhon-muted">Seu perfil possui acesso somente para consulta desta fila.</div> : <form onSubmit={submitAction} className="space-y-3"><label className="block space-y-1"><span className="font-bold">Ação</span><select value={action} onChange={(event) => setAction(event.target.value as ActionKind)} className="w-full rounded border border-bhon-border bg-white p-2"><option value="LOG_CONTACT">Registrar contato</option><option value="COMPLETE">Concluir acompanhamento</option><option value="POSTPONE">Adiar prazo</option><option value="REASSIGN">Reatribuir responsável</option></select></label>{(action === 'COMPLETE' || action === 'LOG_CONTACT') && <><label className="block space-y-1"><span className="font-bold">Desfecho {action === 'COMPLETE' ? '(obrigatório)' : '(opcional)'}</span><select required={action === 'COMPLETE'} value={outcome} onChange={(event) => setOutcome(event.target.value as Outcome | '')} className="w-full rounded border border-bhon-border bg-white p-2"><option value="">Selecione…</option><option value="CONTACTED">Contato realizado</option><option value="RESCHEDULED">Consulta reagendada</option><option value="RECOVERED">Paciente recuperado</option><option value="NO_RESPONSE">Sem resposta</option><option value="NOT_INTERESTED">Sem interesse</option></select></label><label className="block space-y-1"><span className="font-bold">Registro do contato</span><textarea required minLength={3} maxLength={2000} rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded border border-bhon-border p-2" placeholder="Descreva objetivamente o contato e a orientação dada" /></label></>}{action === 'POSTPONE' && <><label className="block space-y-1"><span className="font-bold">Novo prazo</span><input required type="datetime-local" value={newDeadline} onChange={(event) => setNewDeadline(event.target.value)} className="w-full rounded border border-bhon-border p-2" /></label><label className="block space-y-1"><span className="font-bold">Justificativa</span><textarea maxLength={2000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded border border-bhon-border p-2" /></label></>}{action === 'REASSIGN' && <><label className="block space-y-1"><span className="font-bold">Novo responsável</span><select required value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="w-full rounded border border-bhon-border bg-white p-2"><option value="">Selecione…</option>{assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name} — {assignee.role}</option>)}</select></label><label className="block space-y-1"><span className="font-bold">Observação</span><textarea maxLength={2000} rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} className="w-full rounded border border-bhon-border p-2" /></label></>}<button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-1.5 rounded bg-bhon-navy py-2 font-bold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-bhon-navy-hover active:scale-[0.97] disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Confirmar ação</button></form>}<button type="button" onClick={() => { setLocation(`/clinic/patients/${selectedFollowUp.patientId}`); setSelectedFollowUp(null); }} className="flex w-full items-center justify-center gap-1.5 rounded border border-bhon-border py-2 font-semibold text-bhon-navy transition-[background-color,transform] duration-150 ease-out hover:bg-slate-50 active:scale-[0.97]">Abrir prontuário <ArrowRight className="h-3.5 w-3.5" /></button></div>}</Drawer>
    </div>
  );
};
