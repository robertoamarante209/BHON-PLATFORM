import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, ArrowRight, ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { useLocation } from 'wouter';
import { Drawer } from '../../components/common/Drawer';
import { useAuth } from '../../context/AuthContext';
import { listOpportunities, opportunityTransitions, updateOpportunityStatus, type OpportunityMetrics, type Pagination } from '../../lib/clinic';
import type { Opportunity, OpportunityStatus } from '../../types';

const stages: Array<{ code: OpportunityStatus; label: string }> = [
  { code: 'NEW_CONTACT', label: 'Novo Contato' }, { code: 'TRIAGEM', label: 'Triagem' },
  { code: 'AVALIACAO', label: 'Avaliação' }, { code: 'PLANO_APRESENTADO', label: 'Plano Apresentado' },
  { code: 'ORCAMENTO', label: 'Orçamento' }, { code: 'NEGOCIACAO', label: 'Negociação' },
  { code: 'CONVERTIDO', label: 'Convertido' }, { code: 'PERDIDO', label: 'Perdido' },
];
const emptyCounts = Object.fromEntries(stages.map(({ code }) => [code, 0])) as Record<OpportunityStatus, number>;
const writeRoles = ['OWNER', 'ADMIN', 'MANAGER', 'RECEPTIONIST'];

export const OpportunitiesPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [metrics, setMetrics] = useState<OpportunityMetrics>({ activePotential: 0, counts: emptyCounts });
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<OpportunityStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);
  const [targetStatus, setTargetStatus] = useState<OpportunityStatus | ''>('');
  const [nextStep, setNextStep] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const result = await listOpportunities({ search: searchTerm.trim() || undefined, status: selectedStage === 'ALL' ? undefined : selectedStage, page, limit: 20 }, signal);
      setOpportunities(result.data);
      setMetrics(result.metrics);
      setPagination(result.pagination);
      setSelectedOpportunity((current) => current ? result.data.find((item) => item.id === current.id) || null : null);
    } catch (loadError) {
      if ((loadError as Error).name !== 'AbortError') setError((loadError as Error).message || 'Não foi possível carregar o funil.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page, searchTerm, selectedStage]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  const openOpportunity = (opportunity: Opportunity) => {
    setSelectedOpportunity(opportunity);
    setTargetStatus('');
    setNextStep(opportunity.nextStep || '');
    setReason('');
    setError('');
  };

  const submitStatus = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedOpportunity || !targetStatus || saving) return;
    if (targetStatus === 'PERDIDO' && reason.trim().length < 3) {
      setError('Informe o motivo da perda com pelo menos 3 caracteres.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateOpportunityStatus(selectedOpportunity.id, targetStatus, { nextStep: nextStep.trim() || undefined, reason: reason.trim() || undefined });
      setFeedback('Estágio atualizado e registrado na timeline do paciente.');
      setSelectedOpportunity(null);
      await load();
    } catch (saveError) {
      setError((saveError as Error).message || 'Não foi possível atualizar a oportunidade.');
    } finally {
      setSaving(false);
    }
  };

  const availableTargets = selectedOpportunity
    ? opportunityTransitions[selectedOpportunity.status].filter((status) => status !== 'CONVERTIDO')
    : [];
  const canWrite = writeRoles.includes(currentUser.role);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col justify-between gap-3 border-b border-bhon-border pb-3 sm:flex-row sm:items-center"><div><h1 className="text-lg font-bold uppercase tracking-wide text-bhon-text">Funil de Oportunidades Clínicas</h1><p className="mt-0.5 text-xs text-bhon-muted">Conversão terapêutica persistida, inatividade calculada e próximos passos auditáveis.</p></div><div className="rounded border border-bhon-border bg-slate-50 p-2 text-right"><span className="block text-[10px] font-bold uppercase text-bhon-muted">Potencial ativo</span><span className="font-mono-data text-sm font-bold text-bhon-teal-dark">R$ {metrics.activePotential.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div></div>

      <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-bhon-muted" /><input value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder="Buscar paciente, prontuário, origem ou próximo passo…" className="w-full rounded border border-bhon-border bg-white py-1.5 pl-9 pr-3 text-xs focus:border-bhon-teal focus:outline-none" /></div>

      <div className="flex select-none items-center gap-1.5 overflow-x-auto pb-1"><button type="button" onClick={() => { setSelectedStage('ALL'); setPage(1); }} className={`whitespace-nowrap rounded px-3 py-1.5 text-xs font-semibold transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] ${selectedStage === 'ALL' ? 'bg-bhon-navy text-white' : 'border border-bhon-border bg-white text-bhon-muted hover:text-bhon-text'}`}>Todos ({Object.values(metrics.counts).reduce((sum, value) => sum + value, 0)})</button>{stages.map((stage) => <button type="button" key={stage.code} onClick={() => { setSelectedStage(stage.code); setPage(1); }} className={`flex items-center gap-1.5 whitespace-nowrap rounded px-3 py-1.5 text-xs font-semibold transition-[color,background-color,transform] duration-150 ease-out active:scale-[0.97] ${selectedStage === stage.code ? 'bg-bhon-teal text-white' : 'border border-bhon-border bg-white text-bhon-muted hover:text-bhon-text'}`}><span>{stage.label}</span><span className="font-mono-data text-[10px] opacity-80">({metrics.counts[stage.code] || 0})</span></button>)}</div>

      {feedback && <div role="status" className="border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-900">{feedback}</div>}
      {error && <div role="alert" className="flex items-center justify-between border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"><span>{error}</span><button type="button" onClick={() => void load()} className="font-bold underline">Tentar novamente</button></div>}

      <div className="overflow-hidden rounded border border-bhon-border bg-white shadow-sm">{loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-bhon-muted"><Loader2 className="h-4 w-4 animate-spin" /> Carregando oportunidades…</div> : opportunities.length === 0 ? <div className="min-h-48 p-10 text-center"><p className="font-semibold text-bhon-text">Nenhuma oportunidade encontrada</p><p className="mt-1 text-xs text-bhon-muted">Ajuste a busca ou selecione outro estágio.</p></div> : <div className="overflow-x-auto"><table className="bhon-table"><thead><tr><th>Paciente</th><th>Origem</th><th>Tratamento Previsto</th><th>Valor Potencial</th><th>Responsável</th><th>Último Contato</th><th>Dias Inativo</th><th>Próximo Passo</th><th>Estágio</th><th className="text-right">Ação</th></tr></thead><tbody>{opportunities.map((opportunity) => <tr key={opportunity.id} className="transition-colors hover:bg-slate-50"><td className="whitespace-nowrap font-bold"><button type="button" onClick={() => setLocation(`/clinic/patients/${opportunity.patientId}`)} className="text-left hover:text-bhon-teal hover:underline">{opportunity.patientName}</button>{opportunity.patientPhone && <span className="block font-mono-data text-[10px] font-normal text-bhon-muted">{opportunity.patientPhone}</span>}</td><td className="whitespace-nowrap text-xs text-bhon-muted">{opportunity.source || 'Não informada'}</td><td className="max-w-xs truncate text-xs font-semibold">{opportunity.treatmentTitle || 'Em definição'}</td><td className="whitespace-nowrap font-mono-data text-xs font-bold">{opportunity.potentialValue == null ? 'Em dimensionamento' : `R$ ${opportunity.potentialValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</td><td className="whitespace-nowrap text-xs text-bhon-muted">{opportunity.assignedToName || 'Não atribuído'}</td><td className="whitespace-nowrap font-mono-data text-xs text-bhon-muted">{opportunity.lastContactAt ? new Date(opportunity.lastContactAt).toLocaleDateString('pt-BR') : 'Nenhum'}</td><td className="whitespace-nowrap font-mono-data text-xs">{opportunity.daysInactive > 5 ? <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-1.5 py-0.5 text-[11px] font-bold text-rose-800"><AlertTriangle className="h-3 w-3" />{opportunity.daysInactive} dias</span> : `${opportunity.daysInactive} dias`}</td><td className="max-w-xs truncate text-xs font-medium text-bhon-teal-dark">{opportunity.nextStep || 'Definir próximo passo'}</td><td><span className="rounded border border-slate-200 bg-slate-100 px-2 py-0.5 font-mono-data text-[11px] font-semibold">{opportunity.status.replace(/_/g, ' ')}</span></td><td className="text-right"><button type="button" onClick={() => openOpportunity(opportunity)} className="rounded border border-bhon-border bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-bhon-navy transition-[color,background-color,transform] duration-150 ease-out hover:bg-bhon-navy hover:text-white active:scale-[0.97]">{canWrite ? 'Gerenciar' : 'Consultar'}</button></td></tr>)}</tbody></table></div>}</div>

      {pagination.totalPages > 1 && <div className="flex items-center justify-end gap-2 text-xs text-bhon-muted"><button type="button" aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded border border-bhon-border p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>Página {page} de {pagination.totalPages}</span><button type="button" aria-label="Próxima página" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded border border-bhon-border p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>}

      <Drawer isOpen={!!selectedOpportunity} onClose={() => !saving && setSelectedOpportunity(null)} title={canWrite ? 'Gerenciar oportunidade' : 'Consultar oportunidade'} subtitle={selectedOpportunity?.patientName || ''} width="max-w-lg">{selectedOpportunity && <form onSubmit={submitStatus} className="space-y-4 text-xs"><div className="rounded border border-bhon-border bg-slate-50 p-3"><p className="text-bhon-muted">Estágio atual</p><p className="mt-1 font-bold">{selectedOpportunity.status.replace(/_/g, ' ')}</p></div>{!canWrite ? <div className="rounded border border-bhon-border p-3 text-bhon-muted">Seu perfil possui acesso somente para consulta deste funil.</div> : availableTargets.length === 0 ? <div className="rounded border border-bhon-border p-3 text-bhon-muted">Este estágio não possui transição manual. Conversões são realizadas pela aprovação do orçamento.</div> : <><label className="block space-y-1"><span className="font-bold">Próximo estágio</span><select required value={targetStatus} onChange={(event) => setTargetStatus(event.target.value as OpportunityStatus)} className="w-full rounded border border-bhon-border bg-white p-2"><option value="">Selecione…</option>{availableTargets.map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}</select></label><label className="block space-y-1"><span className="font-bold">Próximo passo</span><input value={nextStep} onChange={(event) => setNextStep(event.target.value)} maxLength={500} className="w-full rounded border border-bhon-border p-2" placeholder="Ex.: ligar amanhã para confirmar decisão" /></label>{targetStatus === 'PERDIDO' && <label className="block space-y-1"><span className="font-bold text-rose-800">Motivo da perda</span><textarea required minLength={3} maxLength={500} rows={3} value={reason} onChange={(event) => setReason(event.target.value)} className="w-full rounded border border-rose-300 p-2" /></label>}<button type="submit" disabled={saving || !targetStatus} className="flex w-full items-center justify-center gap-1.5 rounded bg-bhon-navy py-2 font-bold text-white transition-[background-color,transform] duration-150 ease-out hover:bg-bhon-navy-hover active:scale-[0.97] disabled:opacity-60">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />} Atualizar estágio</button></>}</form>}</Drawer>
    </div>
  );
};
