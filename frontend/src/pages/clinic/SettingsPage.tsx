import React, { useEffect, useState } from 'react';
import { Building2, CalendarClock, DoorOpen, FileHeart, Loader2, Pencil, Plus, RefreshCw, Save, ShieldCheck, Users } from 'lucide-react';
import { SectionState } from '../../components/common/SectionState';
import { useAuth } from '../../context/AuthContext';
import { createClinicProtocol, createRoom, getClinicAvailability, getClinicSettings, listClinicProtocols, updateClinicAvailability, updateRoom, type AvailabilityInterval, type ClinicAvailability, type ClinicProtocol, type ClinicSettings, type RoomInput } from '../../lib/clinic';
import type { Room } from '../../types';

type Section = 'CLINIC' | 'ROOMS' | 'HOURS' | 'PROCEDURES' | 'PROTOCOLS' | 'USERS';
const sections: Array<{ key: Section; label: string; icon: typeof Building2 }> = [
  { key: 'CLINIC', label: 'Dados da Clínica', icon: Building2 },
  { key: 'ROOMS', label: 'Consultórios e Salas', icon: DoorOpen },
  { key: 'HOURS', label: 'Horários', icon: CalendarClock },
  { key: 'PROCEDURES', label: 'Procedimentos', icon: FileHeart },
  { key: 'PROTOCOLS', label: 'Protocolos', icon: ShieldCheck },
  { key: 'USERS', label: 'Usuários e Permissões', icon: Users },
];

type RoomEditorProps = { room?: Room; saving: boolean; onCancel: () => void; onSave: (input: RoomInput) => Promise<void> };

function RoomEditor({ room, saving, onCancel, onSave }: RoomEditorProps) {
  const [name, setName] = useState(room?.name || '');
  const [description, setDescription] = useState(room?.description || '');
  const [orderIndex, setOrderIndex] = useState(room?.orderIndex || 1);

  return <form className="room-editor-enter rounded-2xl border border-bhon-teal/30 bg-teal-50/40 p-4" onSubmit={(event) => { event.preventDefault(); void onSave({ name: name.trim(), description: description.trim() || undefined, orderIndex }); }}>
    <div className="flex items-start justify-between gap-3"><div><h3 className="font-display text-lg text-bhon-navy">{room ? 'Editar ambiente' : 'Novo ambiente clínico'}</h3><p className="mt-1 text-xs text-bhon-muted">Use o nome que a equipe reconhece na agenda.</p></div><button type="button" onClick={onCancel} className="min-h-10 rounded-lg px-3 text-xs font-bold text-bhon-muted hover:bg-white focus-visible:ring-2 focus-visible:ring-bhon-teal">Cancelar</button></div>
    <div className="mt-4 grid gap-4 sm:grid-cols-[minmax(0,1fr)_7rem]">
      <label className="text-xs font-semibold text-bhon-text">Nome do ambiente<input name="roomName" autoComplete="off" required minLength={2} maxLength={100} value={name} onChange={(event) => setName(event.target.value)} placeholder="Ex.: Consultório 01…" className="mt-1.5 min-h-11 w-full rounded-xl border border-bhon-border bg-white px-3 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-bhon-teal focus-visible:ring-2 focus-visible:ring-bhon-teal/20" /></label>
      <label className="text-xs font-semibold text-bhon-text">Ordem<input name="roomOrder" type="number" inputMode="numeric" min={1} max={999} value={orderIndex} onChange={(event) => setOrderIndex(Number(event.target.value))} className="mt-1.5 min-h-11 w-full rounded-xl border border-bhon-border bg-white px-3 font-mono-data text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-bhon-teal focus-visible:ring-2 focus-visible:ring-bhon-teal/20" /></label>
    </div>
    <label className="mt-4 block text-xs font-semibold text-bhon-text">Descrição opcional<textarea name="roomDescription" autoComplete="off" maxLength={500} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Ex.: Atendimento geral e avaliações…" className="mt-1.5 w-full resize-y rounded-xl border border-bhon-border bg-white px-3 py-2.5 text-sm outline-none transition-[border-color,box-shadow] focus-visible:border-bhon-teal focus-visible:ring-2 focus-visible:ring-bhon-teal/20" /></label>
    <button type="submit" disabled={saving || name.trim().length < 2} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-bhon-navy px-4 text-xs font-bold text-white shadow-sm transition-[background-color,transform,opacity] hover:bg-bhon-navy-light active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-bhon-teal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}{saving ? 'Salvando…' : 'Salvar Ambiente'}</button>
  </form>;
}

const weekdays = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function AvailabilityEditor({ value, canManage, saving, onSave }: { value: ClinicAvailability; canManage: boolean; saving: boolean; onSave: (intervals: AvailabilityInterval[]) => Promise<void> }) {
  const [intervals, setIntervals] = useState(value.intervals);
  useEffect(() => setIntervals(value.intervals), [value]);
  const addInterval = () => setIntervals((current) => [...current, { dayOfWeek: 1, start: '08:00', end: '12:00' }]);
  const updateInterval = (index: number, change: Partial<AvailabilityInterval>) => setIntervals((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...change } : item));
  const removeInterval = (index: number) => setIntervals((current) => current.filter((_, itemIndex) => itemIndex !== index));
  return <section className="p-5 sm:p-7" aria-labelledby="availability-settings-title"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h2 id="availability-settings-title" className="font-display text-xl text-bhon-navy">Disponibilidade da clínica</h2><p className="mt-1 max-w-xl text-sm text-bhon-muted">Use períodos separados para pausas. Esta referência organiza a operação e não bloqueia agendamentos.</p></div>{canManage ? <button type="button" onClick={addInterval} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-bhon-teal/30 px-4 text-xs font-bold text-bhon-teal-dark hover:bg-teal-50 focus-visible:ring-2 focus-visible:ring-bhon-teal"><Plus className="h-4 w-4" aria-hidden="true" />Adicionar período</button> : null}</div>
    <div className="mt-6 space-y-3">{intervals.length === 0 ? <div className="rounded-2xl border border-dashed border-bhon-border bg-bhon-ivory/50 p-5 text-sm text-bhon-muted">Nenhum período definido. Dias sem períodos são considerados fechados.</div> : intervals.map((interval, index) => <div key={`${interval.dayOfWeek}-${index}`} className="grid gap-3 rounded-2xl border border-bhon-border p-3 sm:grid-cols-[minmax(0,1fr)_8rem_8rem_auto]"><label className="text-xs font-semibold text-bhon-text">Dia<select disabled={!canManage} value={interval.dayOfWeek} onChange={(event) => updateInterval(index, { dayOfWeek: Number(event.target.value) })} className="mt-1.5 min-h-11 w-full rounded-xl border border-bhon-border bg-white px-3 text-sm disabled:opacity-60">{weekdays.map((day, dayOfWeek) => <option key={day} value={dayOfWeek}>{day}</option>)}</select></label><label className="text-xs font-semibold text-bhon-text">Início<input disabled={!canManage} type="time" value={interval.start} onChange={(event) => updateInterval(index, { start: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-bhon-border bg-white px-3 text-sm disabled:opacity-60" /></label><label className="text-xs font-semibold text-bhon-text">Fim<input disabled={!canManage} type="time" value={interval.end} onChange={(event) => updateInterval(index, { end: event.target.value })} className="mt-1.5 min-h-11 w-full rounded-xl border border-bhon-border bg-white px-3 text-sm disabled:opacity-60" /></label>{canManage ? <button type="button" onClick={() => removeInterval(index)} className="min-h-11 self-end rounded-xl px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 focus-visible:ring-2 focus-visible:ring-rose-500">Remover</button> : null}</div>)}</div>
    {canManage ? <button type="button" disabled={saving} onClick={() => void onSave(intervals)} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-bhon-navy px-4 text-xs font-bold text-white shadow-sm hover:bg-bhon-navy-light focus-visible:ring-2 focus-visible:ring-bhon-teal disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Save className="h-4 w-4" aria-hidden="true" />}Salvar horários</button> : null}</section>;
}

function ProtocolsPanel({ protocols, canManage, onCreate }: { protocols: ClinicProtocol[]; canManage: boolean; onCreate: () => void }) {
  return <section className="p-5 sm:p-7" aria-labelledby="protocols-settings-title"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h2 id="protocols-settings-title" className="font-display text-xl text-bhon-navy">Protocolos operacionais</h2><p className="mt-1 max-w-xl text-sm text-bhon-muted">Modelos organizam a rotina da equipe; não substituem avaliação ou conduta clínica.</p></div>{canManage ? <button type="button" onClick={onCreate} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-bhon-navy px-4 text-xs font-bold text-white hover:bg-bhon-navy-light focus-visible:ring-2 focus-visible:ring-bhon-teal"><Plus className="h-4 w-4" aria-hidden="true" />Novo protocolo</button> : null}</div>{protocols.length ? <div className="mt-6 grid gap-3">{protocols.map((protocol) => <article key={protocol.id} className="rounded-2xl border border-bhon-border p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-bhon-navy">{protocol.title}</h3><p className="mt-1 text-xs text-bhon-muted">{protocol.description || 'Sem descrição.'}</p></div><span className={`rounded-full px-2 py-1 font-mono-data text-[10px] font-bold ${protocol.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>{protocol.isActive ? 'ATIVO' : 'INATIVO'}</span></div><ol className="mt-3 list-decimal space-y-1 pl-4 text-xs text-bhon-text">{protocol.steps.map((step, index) => <li key={`${protocol.id}-${index}`}>{step}</li>)}</ol></article>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-bhon-border bg-bhon-ivory/50 p-5 text-sm text-bhon-muted">Nenhum protocolo cadastrado.</div>}</section>;
}

export const SettingsPage: React.FC = () => {
  const { currentUser } = useAuth();
  const [activeSection, setActiveSection] = useState<Section>('CLINIC');
  const [settings, setSettings] = useState<ClinicSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editorRoom, setEditorRoom] = useState<Room | null | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [availability, setAvailability] = useState<ClinicAvailability>({ professionalId: null, revision: 0, intervals: [] });
  const [protocols, setProtocols] = useState<ClinicProtocol[]>([]);
  const canManage = ['OWNER', 'ADMIN', 'MANAGER'].includes(currentUser.role);

  const load = async (signal?: AbortSignal) => {
    setLoading(true); setError('');
    try { setSettings(await getClinicSettings(signal)); }
    catch (loadError) { if ((loadError as Error).name !== 'AbortError') setError((loadError as Error).message || 'Não foi possível carregar as configurações.'); }
    finally { if (!signal?.aborted) setLoading(false); }
  };

  useEffect(() => { const controller = new AbortController(); void load(controller.signal); return () => controller.abort(); }, []);
  useEffect(() => { if (activeSection !== 'HOURS') return; const controller = new AbortController(); void getClinicAvailability(controller.signal).then(setAvailability).catch((loadError) => { if ((loadError as Error).name !== 'AbortError') setError((loadError as Error).message || 'Não foi possível carregar a disponibilidade.'); }); return () => controller.abort(); }, [activeSection]);
  useEffect(() => { if (activeSection !== 'PROTOCOLS') return; const controller = new AbortController(); void listClinicProtocols(controller.signal).then(setProtocols).catch((loadError) => { if ((loadError as Error).name !== 'AbortError') setError((loadError as Error).message || 'Não foi possível carregar os protocolos.'); }); return () => controller.abort(); }, [activeSection]);

  const saveAvailability = async (intervals: AvailabilityInterval[]) => {
    setSaving(true); setError(''); setFeedback('');
    try { setAvailability(await updateClinicAvailability({ revision: availability.revision, intervals })); setFeedback('Disponibilidade atualizada com sucesso.'); }
    catch (saveError) { setError((saveError as Error).message || 'Não foi possível salvar os horários.'); }
    finally { setSaving(false); }
  };
  const createProtocol = async () => {
    const title = window.prompt('Nome do protocolo operacional');
    if (!title?.trim()) return;
    setSaving(true); setError(''); setFeedback('');
    try { const protocol = await createClinicProtocol({ title, steps: ['Definir a primeira etapa'] }); setProtocols((current) => [...current, protocol]); setFeedback('Protocolo criado. Edite as etapas antes de usar na rotina.'); }
    catch (saveError) { setError((saveError as Error).message || 'Não foi possível criar o protocolo.'); }
    finally { setSaving(false); }
  };

  const saveRoom = async (input: RoomInput) => {
    setSaving(true); setError(''); setFeedback('');
    try {
      const room = editorRoom ? await updateRoom(editorRoom.id, input) : await createRoom(input);
      setSettings((current) => current ? { ...current, rooms: editorRoom ? current.rooms.map((item) => item.id === room.id ? room : item) : [...current.rooms, room].sort((a, b) => a.orderIndex - b.orderIndex) } : current);
      setFeedback(editorRoom ? 'Ambiente atualizado com sucesso.' : 'Ambiente criado com sucesso.');
      setEditorRoom(undefined);
    } catch (saveError) { setError((saveError as Error).message || 'Não foi possível salvar o ambiente.'); }
    finally { setSaving(false); }
  };

  const toggleRoom = async (room: Room) => {
    setSaving(true); setError(''); setFeedback('');
    try {
      const updated = await updateRoom(room.id, { isActive: !room.isActive });
      setSettings((current) => current ? { ...current, rooms: current.rooms.map((item) => item.id === updated.id ? updated : item) } : current);
      setFeedback(updated.isActive ? 'Ambiente reativado e disponível para novos agendamentos.' : 'Ambiente desativado para novos agendamentos. O histórico foi preservado.');
    } catch (saveError) { setError((saveError as Error).message || 'Não foi possível atualizar o ambiente.'); }
    finally { setSaving(false); }
  };

  const notConfigured: Record<Exclude<Section, 'CLINIC' | 'ROOMS' | 'HOURS' | 'PROTOCOLS'>, { icon: typeof Building2; title: string; description: string }> = {
    PROCEDURES: { icon: FileHeart, title: 'Tabela de procedimentos ainda não configurada', description: 'Nenhum procedimento padrão foi publicado para esta clínica.' },
    USERS: { icon: Users, title: 'Gestão de usuários em preparação', description: 'A equipe exibida no BHON já vem do banco; convites e permissões serão configurados em uma etapa dedicada.' },
  };

  return <div className="page-enter mx-auto max-w-7xl space-y-5">
    <header className="border-b border-bhon-border pb-4"><p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-bhon-gold">Administração Clínica</p><h1 className="text-balance font-display text-2xl text-bhon-navy sm:text-3xl">Configurações da clínica</h1><p className="mt-1 max-w-2xl text-pretty text-sm text-bhon-muted">Dados institucionais e ambientes usados pela operação real.</p></header>
    {error ? <div role="alert" className="flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 sm:flex-row sm:items-center"><span>{error}</span><button type="button" onClick={() => void load()} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 font-bold hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-rose-500"><RefreshCw className="h-4 w-4" aria-hidden="true" />Tentar novamente</button></div> : null}
    {feedback ? <p aria-live="polite" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{feedback}</p> : null}

    <div className="grid gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <nav aria-label="Seções de configuração" className="flex gap-2 overflow-x-auto rounded-2xl border border-bhon-border bg-white p-2 shadow-sm lg:block lg:space-y-1 lg:overflow-visible">{sections.map(({ key, label, icon: Icon }) => <button key={key} type="button" onClick={() => { setActiveSection(key); setEditorRoom(undefined); }} aria-current={activeSection === key ? 'page' : undefined} className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl px-3 text-left text-xs font-bold transition-[background-color,color,transform] active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-bhon-teal lg:w-full ${activeSection === key ? 'bg-bhon-navy text-white shadow-sm' : 'text-bhon-muted hover:bg-bhon-ivory hover:text-bhon-navy'}`}><Icon className="h-4 w-4" aria-hidden="true" />{label}</button>)}</nav>

      <main id="settings-panel" className="min-h-[28rem] overflow-hidden rounded-2xl border border-bhon-border bg-white shadow-sm">
        {loading ? <div className="flex min-h-[28rem] items-center justify-center gap-3 text-sm text-bhon-muted" aria-live="polite"><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Carregando configurações…</div> : settings ? <>
          {activeSection === 'CLINIC' ? <section className="p-5 sm:p-7" aria-labelledby="clinic-settings-title"><div><h2 id="clinic-settings-title" className="font-display text-xl text-bhon-navy">Identidade institucional</h2><p className="mt-1 text-sm text-bhon-muted">Informações confirmadas pela sessão ativa. A edição será liberada quando o fluxo cadastral estiver disponível.</p></div><div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-semibold text-bhon-text">Nome da clínica<input disabled value={settings.clinic.name} className="mt-1.5 min-h-11 w-full rounded-xl border border-bhon-border bg-slate-50 px-3 text-sm text-bhon-muted" /></label><label className="text-xs font-semibold text-bhon-text">Nome de exibição<input disabled value={settings.clinic.tradeName || 'Não informado'} className="mt-1.5 min-h-11 w-full rounded-xl border border-bhon-border bg-slate-50 px-3 text-sm text-bhon-muted" /></label><label className="text-xs font-semibold text-bhon-text">E-mail institucional<input disabled type="email" value={settings.clinic.email} className="mt-1.5 min-h-11 w-full rounded-xl border border-bhon-border bg-slate-50 px-3 text-sm text-bhon-muted" /></label><label className="text-xs font-semibold text-bhon-text">Telefone<input disabled type="tel" value={settings.clinic.phone || 'Não informado'} className="mt-1.5 min-h-11 w-full rounded-xl border border-bhon-border bg-slate-50 px-3 text-sm text-bhon-muted" /></label></div><dl className="mt-6 grid gap-3 border-t border-bhon-border pt-5 text-xs sm:grid-cols-3"><div><dt className="text-bhon-muted">Status</dt><dd className="mt-1 font-mono-data font-bold text-emerald-700">{settings.clinic.status}</dd></div><div><dt className="text-bhon-muted">Plano</dt><dd className="mt-1 font-mono-data font-bold text-bhon-navy">{settings.clinic.planCode}</dd></div><div><dt className="text-bhon-muted">Ambientes ativos</dt><dd className="mt-1 font-mono-data font-bold text-bhon-navy">{settings.rooms.filter((room) => room.isActive).length}</dd></div></dl></section> : null}

          {activeSection === 'ROOMS' ? <section className="p-5 sm:p-7" aria-labelledby="rooms-settings-title"><div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start"><div><h2 id="rooms-settings-title" className="font-display text-xl text-bhon-navy">Ambientes clínicos</h2><p className="mt-1 max-w-xl text-sm text-bhon-muted">Salas disponíveis para compor a agenda. Desativar preserva todo o histórico.</p></div>{canManage && editorRoom === undefined ? <button type="button" onClick={() => setEditorRoom(null)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-bhon-teal px-4 text-xs font-bold text-white shadow-sm transition-[background-color,transform] hover:bg-bhon-teal-dark active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-bhon-teal focus-visible:ring-offset-2"><Plus className="h-4 w-4" aria-hidden="true" />Adicionar Ambiente</button> : null}</div>
          {editorRoom !== undefined ? <div className="mt-5"><RoomEditor key={editorRoom?.id || 'new'} room={editorRoom || undefined} saving={saving} onCancel={() => setEditorRoom(undefined)} onSave={saveRoom} /></div> : null}
          {settings.rooms.length === 0 && editorRoom === undefined ? <SectionState icon={DoorOpen} title="Nenhum ambiente cadastrado" description="Cadastre o primeiro consultório ou sala para liberar novos agendamentos." action={canManage ? <button type="button" onClick={() => setEditorRoom(null)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-bhon-navy px-4 text-xs font-bold text-white transition-[background-color,transform] hover:bg-bhon-navy-light active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-bhon-teal focus-visible:ring-offset-2"><Plus className="h-4 w-4" aria-hidden="true" />Cadastrar Primeiro Ambiente</button> : undefined} /> : <div className="mt-5 grid gap-3 sm:grid-cols-2">{settings.rooms.map((room) => <article key={room.id} className={`rounded-2xl border p-4 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-md ${room.isActive ? 'border-bhon-border bg-white' : 'border-slate-200 bg-slate-50 opacity-75'}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="truncate font-bold text-bhon-navy">{room.name}</h3><span className={`rounded-full px-2 py-0.5 font-mono-data text-[10px] font-bold ${room.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-200 text-slate-600'}`}>{room.isActive ? 'ATIVO' : 'INATIVO'}</span></div><p className="mt-1 line-clamp-2 min-h-8 text-xs leading-4 text-bhon-muted">{room.description || 'Sem descrição.'}</p></div><span className="shrink-0 font-mono-data text-[10px] text-bhon-muted">#{room.orderIndex}</span></div>{canManage ? <div className="mt-4 flex gap-2 border-t border-bhon-border pt-3"><button type="button" onClick={() => setEditorRoom(room)} className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg text-xs font-bold text-bhon-navy hover:bg-bhon-ivory focus-visible:ring-2 focus-visible:ring-bhon-teal"><Pencil className="h-3.5 w-3.5" aria-hidden="true" />Editar</button><button type="button" disabled={saving} onClick={() => void toggleRoom(room)} className="min-h-10 flex-1 rounded-lg text-xs font-bold text-bhon-muted hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-bhon-teal disabled:opacity-50">{room.isActive ? 'Desativar' : 'Reativar'}</button></div> : null}</article>)}</div>}</section> : null}

          {activeSection === 'HOURS' ? <AvailabilityEditor value={availability} canManage={canManage} saving={saving} onSave={saveAvailability} /> : null}
          {activeSection === 'PROTOCOLS' ? <ProtocolsPanel protocols={protocols} canManage={canManage} onCreate={() => void createProtocol()} /> : null}
          {activeSection !== 'CLINIC' && activeSection !== 'ROOMS' && activeSection !== 'HOURS' && activeSection !== 'PROTOCOLS' ? <SectionState {...notConfigured[activeSection]} /> : null}
        </> : <SectionState icon={Building2} title="Configurações indisponíveis" description="Atualize a página para tentar consultar a clínica novamente." />}
      </main>
    </div>
  </div>;
};
