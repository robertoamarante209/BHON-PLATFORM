import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, Check, PhoneCall, RefreshCw } from 'lucide-react';
import { apiRequest } from '../../lib/api';

type RecoveryPriority = 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW';
type RecoverySource = 'FOLLOW_UP' | 'QUOTE' | 'OPPORTUNITY' | 'TREATMENT' | 'PAYMENT';

type RecoveryItem = {
  id: string;
  source: RecoverySource;
  sourceId: string;
  priority: RecoveryPriority;
  signal: string;
  reason: string;
  patient: { id: string; name: string; recordNumber: string; phone: string | null };
  valueAtRisk: number | null;
  responsible: { id: string; name: string } | null;
  detectedAt: string;
  deadline: string | null;
  ageDays: number;
  nextAction: string;
  state: string;
  href: string;
};

type RecoveryResponse = {
  generatedAt: string;
  assignees: Array<{ id: string; name: string; role: string }>;
  metrics: {
    actionsRequiringAttention: number;
    overdueActions: number;
    inactiveBudgets: number;
    stalledOpportunities: number;
    treatmentsAtRisk: number;
    overduePayments: number;
    inactiveQuoteValue: number;
    overdueReceivables: number;
    financialExposure: number;
  };
  items: RecoveryItem[];
};

type FollowUpAction = 'COMPLETE' | 'POSTPONE' | 'REASSIGN' | 'LOG_CONTACT';
type Outcome = 'CONTACTED' | 'RESCHEDULED' | 'RECOVERED' | 'NO_RESPONSE' | 'NOT_INTERESTED';

const priorityLabel: Record<RecoveryPriority, string> = {
  URGENT: 'Crítica',
  HIGH: 'Alta',
  MEDIUM: 'Média',
  LOW: 'Baixa',
};

const priorityClass: Record<RecoveryPriority, string> = {
  URGENT: 'border-l-rose-600 bg-rose-50/40 text-rose-800',
  HIGH: 'border-l-amber-500 bg-amber-50/30 text-amber-900',
  MEDIUM: 'border-l-sky-600 bg-sky-50/30 text-sky-900',
  LOW: 'border-l-slate-400 bg-white text-slate-700',
};

const outcomeLabels: Record<Outcome, string> = {
  CONTACTED: 'Contato realizado',
  RESCHEDULED: 'Paciente reagendado',
  RECOVERED: 'Continuidade recuperada',
  NO_RESPONSE: 'Sem resposta',
  NOT_INTERESTED: 'Sem interesse',
};

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function dateTimeLabel(value: string | null): string {
  if (!value) return 'Sem prazo definido';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function LoadingQueue() {
  return (
    <div className="border border-bhon-border bg-white" aria-label="Carregando fila operacional">
      {[0, 1, 2].map((item) => (
        <div key={item} className="border-b border-bhon-border p-4 last:border-b-0">
          <div className="h-3 w-24 animate-pulse bg-slate-200" />
          <div className="mt-3 h-4 w-2/3 animate-pulse bg-slate-200" />
          <div className="mt-2 h-3 w-1/2 animate-pulse bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

export function RecoveryQueue({ onNavigate }: { onNavigate: (href: string) => void }) {
  const [data, setData] = useState<RecoveryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [outcome, setOutcome] = useState<Outcome>('CONTACTED');
  const [newDeadline, setNewDeadline] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [submitting, setSubmitting] = useState<FollowUpAction | null>(null);
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      setData(await apiRequest<RecoveryResponse>('/api/recovery'));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a fila operacional.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const visibleItems = useMemo(() => data?.items.slice(0, 12) || [], [data]);

  async function execute(item: RecoveryItem, action: FollowUpAction) {
    setSubmitting(action);
    setFeedback('');
    try {
      await apiRequest(`/api/recovery/follow-ups/${item.sourceId}`, {
        method: 'PATCH',
        body: JSON.stringify({
          action,
          notes: notes.trim() || undefined,
          outcome: action === 'POSTPONE' ? undefined : outcome,
          newDeadline: action === 'POSTPONE' && newDeadline ? new Date(newDeadline).toISOString() : undefined,
          assigneeId: action === 'REASSIGN' ? assigneeId : undefined,
        }),
      });
      setFeedback(action === 'COMPLETE' ? 'Acompanhamento concluído.' : action === 'POSTPONE' ? 'Novo prazo salvo.' : action === 'REASSIGN' ? 'Responsável atualizado.' : 'Contato registrado.');
      setEditingId(null);
      setNotes('');
      setNewDeadline('');
      setAssigneeId('');
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar o acompanhamento.');
    } finally {
      setSubmitting(null);
    }
  }

  if (loading) return <LoadingQueue />;

  if (error && !data) {
    return (
      <div className="border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900" role="alert">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">Fila operacional indisponível</p>
            <p className="mt-1 text-xs text-rose-700">{error}</p>
          </div>
          <button type="button" onClick={() => { setLoading(true); void load(); }} className="flex items-center gap-1 border border-rose-300 bg-white px-2.5 py-1.5 text-xs font-semibold active:scale-[0.97]">
            <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <div className="border border-bhon-border bg-white px-5 py-8 text-center">
        <Check className="mx-auto h-5 w-5 text-bhon-teal" />
        <p className="mt-2 text-sm font-semibold text-bhon-text">Operação sob controle</p>
        <p className="mt-1 text-xs text-bhon-muted">Nenhuma exceção exige ação neste momento.</p>
      </div>
    );
  }

  return (
    <section aria-labelledby="recovery-title">
      <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-rose-700">Exceções primeiro</p>
          <h2 id="recovery-title" className="mt-0.5 text-base font-bold text-bhon-text">O que precisa de atenção agora</h2>
          <p className="mt-0.5 text-xs text-bhon-muted">Fila calculada com registros persistidos da clínica.</p>
        </div>
        <div className="flex gap-5 border-t border-bhon-border pt-2 sm:border-0 sm:pt-0">
          <div>
            <span className="block font-mono-data text-lg font-bold text-bhon-text">{data.metrics.actionsRequiringAttention}</span>
            <span className="text-[10px] uppercase tracking-wide text-bhon-muted">ações abertas</span>
          </div>
          <div>
            <span className="block font-mono-data text-lg font-bold text-rose-700">{currency.format(data.metrics.financialExposure)}</span>
            <span className="text-[10px] uppercase tracking-wide text-bhon-muted">exposição financeira</span>
          </div>
        </div>
      </div>

      {feedback && <div className="mb-2 border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800" role="status">{feedback}</div>}
      {error && <div className="mb-2 border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800" role="alert">{error}</div>}

      <div className="border border-bhon-border bg-white">
        {visibleItems.map((item) => {
          const editing = editingId === item.id;
          return (
            <article key={item.id} className={`border-b border-l-4 border-bhon-border last:border-b-0 ${priorityClass[item.priority]}`}>
              <div className="grid gap-3 p-3.5 lg:grid-cols-[minmax(0,1.7fr)_minmax(180px,.7fr)_minmax(150px,.55fr)_auto] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wide">
                    <span>{priorityLabel[item.priority]}</span>
                    <span className="text-bhon-muted">{item.signal}</span>
                    <span className="font-mono-data font-medium text-bhon-muted">{item.patient.recordNumber}</span>
                  </div>
                  <p className="mt-1 text-sm font-bold text-bhon-text">{item.patient.name}</p>
                  <p className="mt-0.5 text-xs text-bhon-text">{item.reason}</p>
                  <p className="mt-1 text-[11px] text-bhon-muted">Próxima ação: <span className="font-semibold text-bhon-text">{item.nextAction}</span></p>
                </div>
                <div className="text-xs">
                  <p className="text-[10px] uppercase tracking-wide text-bhon-muted">Responsável</p>
                  <p className="mt-1 font-semibold text-bhon-text">{item.responsible?.name || 'Não atribuído'}</p>
                  <p className="mt-1 text-[11px] text-bhon-muted">{item.ageDays} dia{item.ageDays === 1 ? '' : 's'} sem avanço</p>
                </div>
                <div className="text-xs">
                  <p className="text-[10px] uppercase tracking-wide text-bhon-muted">Valor / prazo</p>
                  <p className="mt-1 font-mono-data font-bold text-bhon-text">{item.valueAtRisk === null ? '—' : currency.format(item.valueAtRisk)}</p>
                  <p className="mt-1 text-[11px] text-bhon-muted">{dateTimeLabel(item.deadline)}</p>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {item.source === 'FOLLOW_UP' && (
                    <button type="button" onClick={() => { setEditingId(editing ? null : item.id); setFeedback(''); }} className="flex items-center gap-1.5 bg-bhon-teal px-3 py-2 text-xs font-bold text-white transition-transform duration-150 active:scale-[0.97]">
                      <PhoneCall className="h-3.5 w-3.5" /> Executar
                    </button>
                  )}
                  <button type="button" onClick={() => onNavigate(item.href)} className="flex items-center gap-1 border border-bhon-border bg-white px-2.5 py-2 text-xs font-semibold text-bhon-text transition-colors hover:bg-slate-50 active:scale-[0.97]">
                    Abrir <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {editing && (
                <div className="border-t border-bhon-border bg-slate-50 px-3.5 py-3 text-bhon-text">
                  <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-[1fr_200px_210px_220px]">
                    <label className="text-[11px] font-semibold">
                      Registro do contato
                      <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={2} maxLength={2000} placeholder="Descreva o contato e o próximo passo acordado" className="mt-1 w-full resize-y border border-bhon-border bg-white px-2.5 py-2 text-xs font-normal outline-none focus:border-bhon-teal" />
                    </label>
                    <label className="text-[11px] font-semibold">
                      Resultado
                      <select value={outcome} onChange={(event) => setOutcome(event.target.value as Outcome)} className="mt-1 w-full border border-bhon-border bg-white px-2.5 py-2 text-xs font-normal outline-none focus:border-bhon-teal">
                        {Object.entries(outcomeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <label className="text-[11px] font-semibold">
                      Novo prazo para adiar
                      <input type="datetime-local" value={newDeadline} onChange={(event) => setNewDeadline(event.target.value)} className="mt-1 w-full border border-bhon-border bg-white px-2.5 py-2 text-xs font-normal outline-none focus:border-bhon-teal" />
                    </label>
                    <label className="text-[11px] font-semibold">
                      Novo responsável
                      <select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)} className="mt-1 w-full border border-bhon-border bg-white px-2.5 py-2 text-xs font-normal outline-none focus:border-bhon-teal">
                        <option value="">Selecione</option>
                        {data.assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name}</option>)}
                      </select>
                    </label>
                  </div>
                  <div className="mt-3 flex flex-wrap justify-end gap-2">
                    <button type="button" disabled={!!submitting} onClick={() => void execute(item, 'LOG_CONTACT')} className="border border-bhon-border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">{submitting === 'LOG_CONTACT' ? 'Registrando…' : 'Registrar contato'}</button>
                    <button type="button" disabled={!!submitting || !newDeadline} onClick={() => void execute(item, 'POSTPONE')} className="border border-bhon-border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">{submitting === 'POSTPONE' ? 'Salvando…' : 'Adiar'}</button>
                    <button type="button" disabled={!!submitting || !assigneeId} onClick={() => void execute(item, 'REASSIGN')} className="border border-bhon-border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50">{submitting === 'REASSIGN' ? 'Atribuindo…' : 'Reatribuir'}</button>
                    <button type="button" disabled={!!submitting} onClick={() => void execute(item, 'COMPLETE')} className="bg-bhon-navy px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{submitting === 'COMPLETE' ? 'Concluindo…' : 'Concluir acompanhamento'}</button>
                  </div>
                </div>
              )}
            </article>
          );
        })}
      </div>
      {data.items.length > visibleItems.length && <p className="mt-2 text-right text-[11px] text-bhon-muted">Mostrando 12 de {data.items.length} exceções prioritárias.</p>}
    </section>
  );
}

