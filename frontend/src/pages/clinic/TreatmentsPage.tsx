import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Calendar, ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { useLocation } from 'wouter';
import { Drawer } from '../../components/common/Drawer';
import { StatusBadge } from '../../components/common/StatusBadge';
import { useAuth } from '../../context/AuthContext';
import { listTreatments, updateTreatmentStageStatus, updateTreatmentStatus, type Pagination } from '../../lib/clinic';
import type { Treatment, TreatmentStage, TreatmentStatus } from '../../types';

const managementRoles = ['OWNER', 'ADMIN', 'MANAGER'];
const clinicalWriteRoles = [...managementRoles, 'RECEPTIONIST'];
const statusOptions: TreatmentStatus[] = ['LEAD', 'QUOTED', 'PENDING', 'ACTIVE', 'SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'RISK_OF_ABANDONMENT', 'COMPLETED', 'CANCELLED', 'ABANDONED'];
const allowedTreatmentTransitions: Record<TreatmentStatus, TreatmentStatus[]> = {
  LEAD: ['QUOTED', 'CANCELLED'], QUOTED: ['PENDING', 'ACTIVE', 'CANCELLED'], PENDING: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['SCHEDULED', 'IN_PROGRESS', 'PAUSED', 'RISK_OF_ABANDONMENT', 'COMPLETED', 'CANCELLED', 'ABANDONED'],
  SCHEDULED: ['IN_PROGRESS', 'ACTIVE', 'PAUSED', 'CANCELLED', 'ABANDONED'],
  IN_PROGRESS: ['ACTIVE', 'PAUSED', 'RISK_OF_ABANDONMENT', 'COMPLETED', 'CANCELLED', 'ABANDONED'],
  PAUSED: ['ACTIVE', 'IN_PROGRESS', 'CANCELLED', 'ABANDONED'],
  RISK_OF_ABANDONMENT: ['ACTIVE', 'IN_PROGRESS', 'PAUSED', 'COMPLETED', 'CANCELLED', 'ABANDONED'],
  COMPLETED: [], CANCELLED: [], ABANDONED: ['ACTIVE'],
};
const allowedStageTransitions: Record<TreatmentStage['status'], TreatmentStage['status'][]> = {
  PENDING: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'], SCHEDULED: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
  IN_PROGRESS: ['PENDING', 'COMPLETED', 'CANCELLED'], COMPLETED: [], CANCELLED: ['PENDING'],
};

export const TreatmentsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TreatmentStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setError('');
    try {
      const result = await listTreatments({ search: searchTerm.trim() || undefined, status: statusFilter === 'ALL' ? undefined : statusFilter, page, limit: 20 }, signal);
      setTreatments(result.data);
      setPagination(result.pagination);
      setSelectedTreatment((current) => current ? result.data.find((item) => item.id === current.id) || null : null);
    } catch (loadError) {
      if ((loadError as Error).name !== 'AbortError') setError((loadError as Error).message || 'Não foi possível carregar os tratamentos.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [page, searchTerm, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  const changeTreatmentStatus = async (status: TreatmentStatus) => {
    if (!selectedTreatment || saving) return;
    if (['CANCELLED', 'ABANDONED'].includes(status) && reason.trim().length < 3) {
      setError('Informe um motivo com pelo menos 3 caracteres para encerrar ou abandonar o tratamento.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await updateTreatmentStatus(selectedTreatment.id, status, reason.trim() || undefined);
      setReason('');
      await load();
    } catch (saveError) {
      setError((saveError as Error).message || 'Não foi possível atualizar o tratamento.');
    } finally {
      setSaving(false);
    }
  };

  const changeStageStatus = async (stage: TreatmentStage, status: TreatmentStage['status']) => {
    if (saving || status === stage.status) return;
    setSaving(true);
    setError('');
    try {
      await updateTreatmentStageStatus(stage.id, status);
      await load();
    } catch (saveError) {
      setError((saveError as Error).message || 'Não foi possível atualizar a etapa.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col justify-between gap-3 border-b border-bhon-border pb-3 sm:flex-row sm:items-center">
        <div><h1 className="text-lg font-bold uppercase tracking-wide text-bhon-text">Planos de Tratamento e Continuidade</h1><p className="mt-0.5 text-xs text-bhon-muted">Etapas terapêuticas persistidas, progresso clínico e prevenção de abandono.</p></div>
        <span className="font-mono-data text-xs text-bhon-muted">{pagination.total} tratamentos encontrados</span>
      </div>

      <div className="flex flex-col gap-3 rounded border border-bhon-border bg-white p-3 sm:flex-row">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-bhon-muted" /><input value={searchTerm} onChange={(event) => { setSearchTerm(event.target.value); setPage(1); }} placeholder="Buscar por tratamento, paciente ou prontuário…" className="w-full rounded border border-bhon-border py-1.5 pl-9 pr-3 text-xs focus:border-bhon-teal focus:outline-none" /></div>
        <select value={statusFilter} onChange={(event) => { setStatusFilter(event.target.value as TreatmentStatus | 'ALL'); setPage(1); }} className="rounded border border-bhon-border bg-white px-2.5 py-1.5 text-xs"><option value="ALL">Todos os status</option>{statusOptions.map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}</select>
      </div>

      {error && <div role="alert" className="flex items-center justify-between border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"><span>{error}</span><button type="button" onClick={() => void load()} className="font-bold underline">Tentar novamente</button></div>}

      <div className="overflow-hidden rounded border border-bhon-border bg-white shadow-sm">
        {loading ? <div className="flex min-h-48 items-center justify-center gap-2 text-sm text-bhon-muted"><Loader2 className="h-4 w-4 animate-spin" /> Carregando tratamentos…</div> : treatments.length === 0 ? <div className="min-h-48 p-10 text-center"><p className="font-semibold text-bhon-text">Nenhum tratamento encontrado</p><p className="mt-1 text-xs text-bhon-muted">Ajuste os filtros ou aprove um orçamento para ativar um plano terapêutico.</p></div> : <div className="overflow-x-auto"><table className="bhon-table"><thead><tr><th>Paciente</th><th>Tratamento</th><th>Profissional</th><th>Etapa Atual</th><th>Progresso</th><th>Último Atendimento</th><th>Próxima Etapa</th><th>Status</th><th className="text-right">Ação</th></tr></thead><tbody>
          {treatments.map((treatment) => <tr key={treatment.id} className="transition-colors hover:bg-slate-50"><td className="whitespace-nowrap"><p className="font-bold text-bhon-text">{treatment.patientName}</p><span className="font-mono-data text-[10px] text-bhon-muted">{treatment.patientRecordNumber}</span></td><td className="max-w-xs truncate font-semibold text-bhon-text">{treatment.name}</td><td className="whitespace-nowrap text-xs text-bhon-muted">{treatment.responsibleUserName || 'Não atribuído'}</td><td className="whitespace-nowrap text-xs">{treatment.currentStageTitle || 'Sem etapa pendente'}</td><td className="whitespace-nowrap"><div className="flex items-center gap-2"><div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200"><div className={treatment.status === 'RISK_OF_ABANDONMENT' ? 'h-full bg-rose-500' : 'h-full bg-bhon-teal'} style={{ width: `${treatment.progressPercent}%` }} /></div><span className="font-mono-data text-[11px] font-bold">{treatment.progressPercent}%</span></div></td><td className="whitespace-nowrap font-mono-data text-xs text-bhon-muted">{treatment.lastAppointmentAt ? new Date(treatment.lastAppointmentAt).toLocaleDateString('pt-BR') : '—'}</td><td className="whitespace-nowrap font-mono-data text-xs">{treatment.nextStageDate ? new Date(treatment.nextStageDate).toLocaleDateString('pt-BR') : <span className="inline-flex items-center gap-1 font-semibold text-rose-600"><AlertTriangle className="h-3 w-3" /> Sem data</span>}</td><td><StatusBadge status={treatment.status} /></td><td className="text-right"><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedTreatment(treatment); }} className="rounded border border-bhon-border bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-bhon-navy transition-colors hover:bg-bhon-navy hover:text-white">Dossiê</button></td></tr>)}
        </tbody></table></div>}
      </div>

      {pagination.totalPages > 1 && <div className="flex items-center justify-end gap-2 text-xs text-bhon-muted"><button type="button" aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded border border-bhon-border p-1.5 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>Página {page} de {pagination.totalPages}</span><button type="button" aria-label="Próxima página" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded border border-bhon-border p-1.5 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>}

      <Drawer isOpen={!!selectedTreatment} onClose={() => setSelectedTreatment(null)} title="Dossiê do Plano Terapêutico" subtitle={selectedTreatment ? `${selectedTreatment.name} • ${selectedTreatment.patientName}` : ''} width="max-w-lg">
        {selectedTreatment && <div className="space-y-4 text-xs"><div className="space-y-2 rounded border border-bhon-border bg-slate-50 p-3"><button type="button" onClick={() => setLocation(`/clinic/patients/${selectedTreatment.patientId}`)} className="font-bold text-bhon-teal hover:underline">{selectedTreatment.patientName} ({selectedTreatment.patientRecordNumber}) →</button><div className="flex justify-between"><span className="text-bhon-muted">Responsável</span><span>{selectedTreatment.responsibleUserName || 'Não atribuído'}</span></div><div className="flex justify-between"><span className="text-bhon-muted">Investimento</span><span className="font-mono-data font-bold">{selectedTreatment.totalValue == null ? 'Não informado' : `R$ ${selectedTreatment.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}</span></div></div>
          {managementRoles.includes(currentUser.role) && <div className="space-y-2 rounded border border-bhon-border p-3"><label className="font-bold uppercase tracking-wider">Status do tratamento</label><select disabled={saving || allowedTreatmentTransitions[selectedTreatment.status].length === 0} value={selectedTreatment.status} onChange={(event) => void changeTreatmentStatus(event.target.value as TreatmentStatus)} className="w-full rounded border border-bhon-border bg-white p-2 disabled:opacity-60">{[selectedTreatment.status, ...allowedTreatmentTransitions[selectedTreatment.status]].map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}</select><textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Motivo obrigatório para cancelamento ou abandono" rows={2} className="w-full rounded border border-bhon-border p-2" /></div>}
          <div><p className="mb-2 font-bold uppercase tracking-wider">Etapas clínicas</p><div className="space-y-2">{selectedTreatment.stages.length === 0 ? <p className="rounded border border-bhon-border bg-slate-50 p-3 text-bhon-muted">Nenhuma etapa cadastrada.</p> : selectedTreatment.stages.map((stage) => <div key={stage.id} className="flex items-center justify-between gap-3 rounded border border-bhon-border p-3"><div><p className="font-bold">{stage.stageNumber}. {stage.title}</p>{stage.description && <p className="mt-0.5 text-bhon-muted">{stage.description}</p>}</div>{clinicalWriteRoles.includes(currentUser.role) ? <select disabled={saving || allowedStageTransitions[stage.status].length === 0} value={stage.status} onChange={(event) => void changeStageStatus(stage, event.target.value as TreatmentStage['status'])} className="rounded border border-bhon-border bg-white p-1.5 text-[11px] disabled:opacity-60">{[stage.status, ...allowedStageTransitions[stage.status]].map((status) => <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>)}</select> : <StatusBadge status={stage.status} size="sm" />}</div>)}</div></div>
          <button type="button" onClick={() => { setLocation('/clinic/agenda'); setSelectedTreatment(null); }} className="flex w-full items-center justify-center gap-1.5 rounded bg-bhon-navy py-2 font-semibold text-white transition-colors hover:bg-bhon-navy-hover"><Calendar className="h-3.5 w-3.5" /> Agendar próxima sessão</button>
        </div>}
      </Drawer>
    </div>
  );
};
