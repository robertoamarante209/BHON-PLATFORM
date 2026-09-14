import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, KeyRound, Loader2, Plus, Search, Users } from 'lucide-react';
import { Drawer } from '../../components/common/Drawer';
import { createTeamMember, listTeam, type Pagination, type TeamMetrics } from '../../lib/clinic';
import type { TeamMember, UserRole, UserStatus } from '../../types';

const roles: Array<{ value: UserRole; label: string }> = [
  { value: 'OWNER', label: 'Proprietário' }, { value: 'ADMIN', label: 'Administrador' },
  { value: 'MANAGER', label: 'Gestor' }, { value: 'DENTIST', label: 'Profissional de saúde' },
  { value: 'RECEPTIONIST', label: 'Recepção' }, { value: 'FINANCIAL', label: 'Financeiro' }, { value: 'VIEWER', label: 'Consulta' },
];
const emptyMetrics: TeamMetrics = { activeCount: 0, inAttendanceCount: 0, todayAppointmentsCount: 0, averageWorkloadHours: null };
const permissionGroups = [
  { label: 'Agenda', items: [['agenda.view', 'Visualizar agenda'], ['agenda.create', 'Criar agendamentos'], ['agenda.edit', 'Editar agendamentos'], ['agenda.cancel', 'Cancelar agendamentos']] },
  { label: 'Pacientes', items: [['patients.view', 'Visualizar pacientes'], ['patients.create', 'Cadastrar pacientes'], ['patients.edit', 'Editar pacientes'], ['patients.export', 'Exportar pacientes']] },
  { label: 'Recuperação', items: [['recovery.view', 'Visualizar recuperação'], ['recovery.contact', 'Registrar contatos'], ['recovery.manage', 'Gerenciar oportunidades']] },
  { label: 'Gestão', items: [['finance.view', 'Visualizar financeiro'], ['finance.manage', 'Executar ações financeiras'], ['team.view', 'Visualizar equipe'], ['team.manage', 'Gerenciar equipe']] },
] as const;

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
  const [feedback, setFeedback] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newRole, setNewRole] = useState<Exclude<UserRole, 'PLATFORM_OWNER' | 'OWNER'>>('DENTIST');
  const [specialty, setSpecialty] = useState('');
  const [phone, setPhone] = useState('');
  const [permissions, setPermissions] = useState<string[]>([]);

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

  const togglePermission = (permission: string) => setPermissions((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true); setError(''); setFeedback('');
    try {
      await createTeamMember({ name: name.trim(), email: email.trim(), password, role: newRole, specialty: specialty.trim() || undefined, phone: phone.trim() || undefined, permissions });
      setIsCreateOpen(false); setName(''); setEmail(''); setPassword(''); setSpecialty(''); setPhone(''); setPermissions([]);
      setFeedback('Acesso criado com segurança.');
      await load();
    } catch (createError) {
      setError((createError as Error).message || 'Não foi possível criar o acesso.');
    } finally { setSaving(false); }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-4">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-semibold text-bhon-teal-dark">Gestão de acessos</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-bhon-text">Equipe</h1><p className="mt-1 text-sm text-bhon-muted">Organize profissionais e defina exatamente o que cada pessoa pode acessar.</p></div><button type="button" onClick={() => setIsCreateOpen(true)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-bhon-navy px-4 text-sm font-semibold text-white shadow-sm hover:bg-bhon-navy-hover"><Plus className="h-4 w-4" /> Novo acesso</button></div>

      <section aria-label="Resumo da equipe" className="flex flex-wrap items-center gap-x-8 gap-y-3 rounded-2xl border border-bhon-border bg-white px-5 py-4 text-xs shadow-[0_8px_28px_rgba(31,49,60,0.04)]"><p><strong className="mr-2 font-mono-data text-lg text-bhon-navy">{metrics.activeCount}</strong><span className="text-bhon-muted">pessoas ativas</span></p><p><strong className="mr-2 font-mono-data text-lg text-bhon-teal-dark">{metrics.inAttendanceCount}</strong><span className="text-bhon-muted">em atendimento</span></p><p><strong className="mr-2 font-mono-data text-lg text-bhon-navy">{metrics.todayAppointmentsCount}</strong><span className="text-bhon-muted">atendimentos hoje</span></p></section>

      <div className="grid gap-3 rounded border border-bhon-border bg-white p-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]"><div className="relative"><Search aria-hidden="true" className="absolute left-3 top-2.5 h-4 w-4 text-bhon-muted" /><input aria-label="Buscar integrantes" name="teamSearch" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar nome, usuário ou especialidade…" className="w-full rounded border border-bhon-border py-1.5 pl-9 pr-3 text-xs focus:border-bhon-teal focus:outline-none" /></div><select aria-label="Filtrar equipe por função" name="teamRole" value={role} onChange={(event) => { setRole(event.target.value as UserRole | 'ALL'); setPage(1); }} className="rounded border border-bhon-border bg-white px-2.5 py-1.5 text-xs"><option value="ALL">Todas as funções</option>{roles.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><select aria-label="Filtrar equipe por acesso" name="teamStatus" value={userStatus} onChange={(event) => { setUserStatus(event.target.value as UserStatus | 'ALL'); setPage(1); }} className="rounded border border-bhon-border bg-white px-2.5 py-1.5 text-xs"><option value="ALL">Todos os acessos</option><option value="ACTIVE">Ativos</option><option value="INACTIVE">Inativos</option><option value="BLOCKED">Bloqueados</option></select></div>

      {error && <div role="alert" className="flex items-center justify-between border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900"><span>{error}</span><button type="button" onClick={() => void load()} className="font-bold underline">Tentar novamente</button></div>}
      {feedback && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">{feedback}</div>}

      <section aria-label="Lista da equipe">{loading ? <div className="flex min-h-52 items-center justify-center gap-2 rounded-2xl border border-bhon-border bg-white text-sm text-bhon-muted"><Loader2 className="h-4 w-4 animate-spin" /> Carregando equipe…</div> : members.length === 0 ? <div className="min-h-52 rounded-2xl border border-bhon-border bg-white p-10 text-center"><Users className="mx-auto h-8 w-8 text-bhon-muted" /><p className="mt-3 font-semibold text-bhon-text">Nenhum integrante encontrado</p><p className="mt-1 text-xs text-bhon-muted">Ajuste os filtros para ampliar a busca.</p></div> : <div className="grid gap-3 md:grid-cols-2">{members.map((member) => <article key={member.id} className="rounded-2xl border border-bhon-border bg-white p-4 shadow-[0_8px_24px_rgba(31,49,60,0.035)] sm:p-5"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="truncate text-sm font-semibold text-bhon-text">{member.name}</p><p className="mt-0.5 truncate text-[11px] text-bhon-muted">{member.roleLabel}{member.specialty ? ` · ${member.specialty}` : ''}</p></div><OperationalStatus status={member.status} /></div><p className="mt-4 truncate text-xs text-bhon-muted">{member.email}</p><div className="mt-4 flex items-center gap-6 border-t border-bhon-border pt-3 text-[11px] text-bhon-muted"><span><strong className="mr-1 font-mono-data text-sm text-bhon-navy">{member.todayAppointmentsCount}</strong> hoje</span><span><strong className="mr-1 font-mono-data text-sm text-emerald-700">{member.completedAppointmentsCount}</strong> concluídos</span>{member.currentRoomName ? <span className="truncate">{member.currentRoomName}</span> : null}</div></article>)}</div>}</section>

      {pagination.totalPages > 1 && <div className="flex items-center justify-end gap-2 text-xs text-bhon-muted"><button type="button" aria-label="Página anterior" disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)} className="rounded border border-bhon-border p-1.5 transition-transform duration-150 active:scale-[0.97] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button><span>Página {page} de {pagination.totalPages}</span><button type="button" aria-label="Próxima página" disabled={page >= pagination.totalPages || loading} onClick={() => setPage((value) => value + 1)} className="rounded border border-bhon-border p-1.5 transition-transform duration-150 active:scale-[0.97] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button></div>}

      <Drawer isOpen={isCreateOpen} onClose={() => !saving && setIsCreateOpen(false)} title="Criar acesso" subtitle="Dados de entrada e permissões individuais" width="max-w-2xl">
        <form onSubmit={handleCreate} className="space-y-6">
          <section className="space-y-3"><div className="flex items-center gap-2"><KeyRound className="h-4 w-4 text-bhon-teal-dark" /><h2 className="text-sm font-semibold">Dados do funcionário</h2></div><div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold">Nome<input aria-label="Nome" required value={name} onChange={(event) => setName(event.target.value)} className="min-h-11 w-full rounded-xl border border-bhon-border px-3 text-sm font-normal" /></label>
            <label className="space-y-1 text-xs font-semibold">Usuário ou e-mail<input aria-label="Usuário ou e-mail" required value={email} onChange={(event) => setEmail(event.target.value)} className="min-h-11 w-full rounded-xl border border-bhon-border px-3 text-sm font-normal" /></label>
            <label className="space-y-1 text-xs font-semibold">Senha temporária<input aria-label="Senha temporária" required minLength={8} type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-11 w-full rounded-xl border border-bhon-border px-3 text-sm font-normal" /></label>
            <label className="space-y-1 text-xs font-semibold">Função<select aria-label="Função" value={newRole} onChange={(event) => setNewRole(event.target.value as typeof newRole)} className="min-h-11 w-full rounded-xl border border-bhon-border bg-white px-3 text-sm font-normal">{roles.filter((item) => !['OWNER', 'PLATFORM_OWNER'].includes(item.value)).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="space-y-1 text-xs font-semibold">Especialidade<input aria-label="Especialidade" value={specialty} onChange={(event) => setSpecialty(event.target.value)} className="min-h-11 w-full rounded-xl border border-bhon-border px-3 text-sm font-normal" /></label>
            <label className="space-y-1 text-xs font-semibold">Telefone<input aria-label="Telefone" value={phone} onChange={(event) => setPhone(event.target.value)} className="min-h-11 w-full rounded-xl border border-bhon-border px-3 text-sm font-normal" /></label>
          </div></section>
          <section><h2 className="text-sm font-semibold">Permissões individuais</h2><p className="mt-1 text-xs text-bhon-muted">Libere somente o necessário para esta função.</p><div className="mt-3 grid gap-3 sm:grid-cols-2">{permissionGroups.map((group) => <fieldset key={group.label} className="rounded-2xl border border-bhon-border p-4"><legend className="px-1 text-xs font-bold text-bhon-text">{group.label}</legend><div className="space-y-3">{group.items.map(([value, label]) => <label key={value} className="flex min-h-8 items-center gap-3 text-sm text-bhon-text"><input type="checkbox" aria-label={label} checked={permissions.includes(value)} onChange={() => togglePermission(value)} className="h-4 w-4 accent-bhon-teal" /><span>{label}</span></label>)}</div></fieldset>)}</div></section>
          <button type="submit" disabled={saving} className="min-h-12 w-full rounded-xl bg-bhon-teal text-sm font-bold text-white hover:bg-bhon-teal-dark disabled:opacity-60">{saving ? 'Criando acesso…' : 'Criar acesso'}</button>
        </form>
      </Drawer>
    </div>
  );
};
