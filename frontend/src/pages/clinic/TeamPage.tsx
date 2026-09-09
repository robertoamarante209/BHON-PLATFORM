import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search, Users } from 'lucide-react';
import { MetricCard } from '../../components/common/MetricCard';
import { listTeam, type Pagination, type TeamMetrics } from '../../lib/clinic';
import type { TeamMember, UserRole, UserStatus } from '../../types';

const roles: Array<{ value: UserRole; label: string }> = [
  { value: 'OWNER', label: 'Proprietário' }, { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Gestor' }, { value: 'DENTIST', label: 'Cirurgião-dentista' },
  { value: 'RECEPTIONIST', label: 'Recepção' }, { value: 'FINANCIAL', label: 'Financeiro' }, { value: 'VIEWER', label: 'Consulta' },
];
const emptyMetrics: TeamMetrics = { activeCount: 0, inAttendanceCount: 0, todayAppointmentsCount: 0, averageWorkloadHours: null };

function OperationalStatus({ status }: { status: TeamMember['status'] }) {
  const styles = status === 'EM_ATENDIMENTO'
    ? 'border-teal-300 bg-teal-50 text-teal-800'
    : status === 'ATIVO' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-600';
  const label = status === 'EM_ATENDIMENTO' ? 'EM ATENDIMENTO' : status === 'ATIVO' ? 'ATIVO' : 'INDISPONÍVEL';
  return <span className={`rounded border px-2 py-0.5 font-mono-data text-[10px] font-semibold ${styles}`}>{label}</span>;
}

export const TeamPage: React.FC = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [metrics, setMetrics] = useState<TeamMetrics>(emptyMetrics);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [role, setRole] = useState<UserRole | 'ALL'>('ALL');
  const [userStatus, setUserStatus] = useState<UserStatus | 'ALL'>('ALL');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try {
      const result = await listTeam({ search: search.trim() || undefined, role: role === 'ALL' ? undefined : role, status: userStatus === 'ALL' ? undefined : userStatus, page, limit: 20 }, signal);
      setMembers(result.data); setMetrics(result.metrics); setPagination(result.pagination);
    } catch (loadError) {
      if ((loadError as Error).name !== 'AbortError') setError((loadError as Error).message || 'Não foi possível carregar a equipe.');
    } finally { if (!signal?.aborted) setLoading(false); }
  }, [page, role, search, userStatus]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => void load(controller.signal), 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [load]);

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col justify-between gap-3 border-b border-bhon-border pb-3 sm:flex-row sm:items-center"><div><h1 className="text-lg font-bold uppercase tracking-wide text-bhon-text">Equipe Clínica e Operacional</h1><p className="mt-0.5 text-xs text-bhon-muted">Agenda diária e ocupação calculadas diretamente dos usuários e atendimentos da clínica.</p></div><span className="font-mono-data text-xs text-bhon-muted">{pagination.total} integrantes encontrados</span></div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><MetricCard label="Equipe ativa" value={metrics.activeCount} subtext="Usuários habilitados" /><MetricCard label="Em atendimento agora" value={metrics.inAttendanceCount} subtext="Consultórios ocupados" highlight /><MetricCard label="Atendimentos do dia" value={metrics.todayAppointmentsCount} subtext="Exceto cancelados" /><MetricCard label="Carga média" value={metrics.averageWorkloadHours == null ? '—' : `${metrics.averageWorkloadHours.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`} subtext="Entre usuários ativos" /></div>

      <div className="grid gap-3 rounded border border-bhon-border bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><div className="relative"><Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-bhon-muted" /><input aria-label="Buscar integrantes" name="teamSearch" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar nome, e-mail, especialidade ou CRO…" className="w-full rounded border border-bhon-border py-1.5 pl-9 pr-3 text-xs focus:border-bhon-teal focus:outline-none" /></div><select aria-label="Filtrar equipe por função" name="teamRole" value={role} onChange={(event) => { setRole(event.target.value as UserRole | 'ALL'); setPage(1); }} className="rounded border border-bhon-border bg-white px-2.5 py-1.5 text-xs"><option value="ALL">Todas as funções</option>{roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select aria-label="Filtrar equipe por acesso" name="teamStatus" value={userStatus} onChange={(event) => { setUserStatus(event.target.value as UserStatus | 'ALL'); setPage(1); }} className="rounded border border-bhon-border bg-white px-2.5 py-1.5 text-xs"><option value="ALL">Todos os acessos</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option><option value="BLOCKED">Bloqueados</option></select></div>

      {error && <div role="alert" className="flex items-center justify-between border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"><span>{error}</span><button type="button" onClick={() => void load()} className="font-bold underline">Tentar novamente</button></div>}

      <div className="overflow-hidden rounded border border-bhon-border bg-white shadow-sm">{loading ? <div className="flex min-h-52 items-center justify-center gap-2 text-sm text-bhon-muted"><Loader2 className="h-4 w-4 animate-spin" /> Carregando equipe…</div> : members.length === 0 ? <div className="min-h-52 p-10 text-center"><Users className="mx-auto h-8 w-8 text-bhon-muted" /><p className="mt-3 font-semibold text-bhon-text">Nenhum integrante encontrado</p><p className="mt-1 text-xs text-bhon-muted">Ajuste os filtros para ampliar a busca.</p></div> : <><div className="divide-y divide-bhon-border md:hidden">{members.map((member) => <article key={member.id} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-bhon-text">{member.name}</p><p className="text-[11px] text-bhon-muted">{member.roleLabel}{member.specialty ? ` · ${member.specialty}` : ''}</p></div><OperationalStatus status={member.status} /></div><div className="mt-3 grid grid-cols-3 gap-2 rounded bg-slate-50 p-2 text-center"><div><strong className="block font-mono-data text-sm">{member.todayAppointmentsCount}</strong><span className="text-[10px] text-bhon-muted">agenda</span></div><div><strong className="block font-mono-data text-sm text-emerald-700">{member.completedAppointmentsCount}</strong><span className="text-[10px] text-bhon-muted">concluídos</span></div><div><strong className="block truncate font-mono-data text-xs">{member.currentRoomName || '—'}</strong><span className="text-[10px] text-bhon-muted">consultório</span></div></div><p className="mt-2 truncate text-[11px] text-bhon-muted">{member.email}{member.cro ? ` · ${member.cro}` : ''}</p></article>)}</div><div className="hidden overflow-x-auto md:block"><table className="bhon-table"><thead><tr><th>Profissional</th><th>Função</th><th>Especialidade / registro</th><th>Agenda hoje</th><th>Concluídos</th><th>Carga diária</th><th>Consultório atual</th><th>Status operacional</th></tr></thead><tbody>{members.map((member) => <tr key={member.id} className="transition-colors duration-150 hover:bg-slate-50"><td className="whitespace-nowrap"><p className="font-bold text-bhon-text">{member.name}</p><span className="text-[10px] text-bhon-muted">{member.email}</span></td><td className="whitespace-nowrap text-xs font-semibold">{member.roleLabel}</td><td className="whitespace-nowrap text-xs text-bhon-muted"><p>{member.specialty || '—'}</p>{member.cro && <span className="font-mono-data text-[10px] font-semibold text-bhon-teal-dark">{member.cro}</span>}</td><td className="whitespace-nowrap font-mono-data text-xs"><strong>{member.todayAppointmentsCount}</strong> consultas</td><td className="whitespace-nowrap font-mono-data text-xs font-semibold text-emerald-700">{member.completedAppointmentsCount}</td><td className="whitespace-nowrap font-mono-data text-xs text-bhon-muted">{member.workloadHours == null ? '—' : `${member.workloadHours}h`}</td><td className="whitespace-nowrap font-mono-data text-xs font-semibold">{member.currentRoomName || '—'}</td><td><OperationalStatus status={member.status} /></td></tr>)}</tbody></table></div></>}</div>

      {pagination.totalPages > 1 && <div className="flex items-center justify-end gap-2 text-xs text-bhon-muted"><button type="button" aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded border border-bhon-border p-1.5 transition-transform duration-150 active:scale-[0.97] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>Página {page} de {pagination.totalPages}</span><button type="button" aria-label="Próxima página" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded border border-bhon-border p-1.5 transition-transform duration-150 active:scale-[0.97] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>}
    </div>
  );
};
