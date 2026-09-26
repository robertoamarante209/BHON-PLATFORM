import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useSearch } from 'wouter';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import {
  AlertTriangle,
  Building2,
  Plus,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  RefreshCw,
} from 'lucide-react';
import type { Appointment, AppointmentStatus, Patient, Room } from '../../types';
import { appointmentTransitions, createAppointment, getSchedulingResources, listAppointments, listPatients, rescheduleAppointment, updateAppointmentStatus } from '../../lib/clinic';
import type { ProfessionalOption } from '../../lib/clinic';
import { clinicCalendarDate, zonedLocalDateTimeToIso } from '../../lib/datetime';
import { canChangeAppointmentStatus, canManageAppointments } from '../../lib/clinicalPermissions';
import { useAuth } from '../../context/AuthContext';

function moveDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function validDate(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const AgendaPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const query = new URLSearchParams(search);
  const requestedDate = query.get('date');
  const selectedDate = validDate(requestedDate) ? requestedDate : clinicCalendarDate();
  const focusId = query.get('focus');
  const routeRef = useRef(search);
  routeRef.current = search;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const setSelectedDate = (value: string | ((current: string) => string)) => {
    const next = typeof value === 'function' ? value(selectedDate) : value;
    if (validDate(next)) setLocation(`/clinic/agenda?date=${next}`);
  };
  const { currentUser } = useAuth();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(focusId);
  const selectedApt = appointments.find((appointment) => appointment.id === selectedId) ?? null;
  const setSelectedApt = (appointment: Appointment | null) => { setSelectedId(appointment?.id ?? null); setActionError(''); };
  const [isNewAptOpen, setIsNewAptOpen] = useState(false);
  const [confirmFaltaId, setConfirmFaltaId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);
  const [actionError, setActionError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formDate, setFormDate] = useState(selectedDate);
  const [duration, setDuration] = useState(30);
  const [notes, setNotes] = useState('');

  // Filtros operacionais
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Horários operacionais clínicos: 08:00 até 18:30 a cada 30 min
  const standardTimeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00'
  ];

  // Formulário de Nova Consulta
  const [newPatientId, setNewPatientId] = useState('');
  const [newRoomId, setNewRoomId] = useState('');
  const [newTime, setNewTime] = useState('14:30');
  const [newProcedure, setNewProcedure] = useState('');
  const [newProfessionalId, setNewProfessionalId] = useState('');

  useEffect(() => {
    setSelectedId(focusId);
    setIsNewAptOpen(false);
    setEditingId(null);
    setConfirmFaltaId(null);
    setConfirmCancelId(null);
    setActionError('');
  }, [selectedDate, focusId]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setAppointments([]);
    void Promise.all([
      listAppointments(selectedDate, controller.signal),
      getSchedulingResources(controller.signal),
      listPatients({ status: 'ACTIVE', limit: 50 }, controller.signal),
    ]).then(([appointmentData, resources, patientData]) => {
      if (controller.signal.aborted) return;
      setAppointments(appointmentData);
      setRooms(resources.rooms);
      setProfessionals(resources.professionals);
      setPatients(patientData.data);
      setNewPatientId((current) => current || patientData.data[0]?.id || '');
      setNewRoomId((current) => current || resources.rooms[0]?.id || '');
      setNewProfessionalId((current) => current || resources.professionals[0]?.id || '');
    }).catch((requestError) => {
      if (controller.signal.aborted) return;
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a agenda.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [selectedDate, reloadKey]);

  const dateLabel = useMemo(() => new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${selectedDate}T12:00:00`)), [selectedDate]);
  const visibleAppointments = useMemo(() => appointments.filter((appointment) => statusFilter === 'ALL' || appointment.status === statusFilter).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt) || a.patientName.localeCompare(b.patientName)), [appointments, statusFilter]);
  const timeSlots = Array.from(new Set([...standardTimeSlots, ...visibleAppointments.map((apt) => apt.time)])).sort();
  // Historical appointments remain visible even if their room has been deactivated.
  const displayRooms = [...rooms];
  for (const apt of visibleAppointments) {
    if (!displayRooms.some((room) => room.id === apt.roomId)) displayRooms.push({ id: apt.roomId, name: apt.roomName, tenantId: apt.tenantId, orderIndex: 0, isActive: false });
  }
  const canTransition = (appointment: Appointment, status: AppointmentStatus) => (appointmentTransitions[appointment.status] ?? []).includes(status);
  const openForm = (appointment?: Appointment) => {
    setEditingId(appointment?.id ?? null);
    setFormDate(selectedDate);
    setNewPatientId(appointment?.patientId ?? patients[0]?.id ?? '');
    setNewRoomId(appointment?.roomId ?? rooms[0]?.id ?? '');
    setNewProfessionalId(appointment?.professionalId ?? professionals[0]?.id ?? '');
    setNewTime(appointment?.time ?? '14:30');
    setNewProcedure(appointment?.procedureName ?? '');
    setDuration(appointment?.durationMinutes ?? 30);
    setNotes(appointment?.notes ?? '');
    setActionError('');
    setIsNewAptOpen(true);
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === newPatientId);
    const room = rooms.find(r => r.id === newRoomId);
    const professional = professionals.find(value => value.id === newProfessionalId);
    if ((!editingId && !patient) || !room || !professional || !newProcedure.trim() || actionLoading || !canManageAppointments(currentUser.role)) return;
    const actionRoute = routeRef.current;
    setActionLoading(true);
    setActionError('');
    try {
      const input = {
        professionalId: professional.id,
        roomId: room.id,
        scheduledAt: zonedLocalDateTimeToIso(formDate, newTime),
        durationMinutes: duration,
        procedureName: newProcedure.trim(),
        notes: notes.trim(),
      };
      if (editingId) await rescheduleAppointment(editingId, input);
      else await createAppointment({ ...input, patientId: patient!.id });
      if (!mounted.current || routeRef.current !== actionRoute) return;
      setIsNewAptOpen(false);
      setSelectedId(null);
      setNewProcedure('');
      if (formDate !== selectedDate) setSelectedDate(formDate);
      else setReloadKey((value) => value + 1);
    } catch (requestError) {
      if (mounted.current && routeRef.current === actionRoute) setActionError(requestError instanceof Error ? requestError.message : 'Não foi possível salvar o agendamento.');
    } finally {
      if (mounted.current) setActionLoading(false);
    }
  };

  const changeStatus = async (appointment: Appointment, status: AppointmentStatus, delayMinutes?: number) => {
    if (actionLoading || !canChangeAppointmentStatus(currentUser.role) || !canTransition(appointment, status)) return;
    const actionRoute = routeRef.current;
    setActionLoading(true);
    setActionError('');
    try {
      await updateAppointmentStatus(appointment.id, status, delayMinutes);
      if (!mounted.current || routeRef.current !== actionRoute) return;
      setReloadKey((value) => value + 1);
    } catch (requestError) {
      if (mounted.current && routeRef.current === actionRoute) setActionError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar o atendimento.');
    } finally {
      if (mounted.current) setActionLoading(false);
    }
  };

  const handleFaltaConfirm = async () => {
    if (confirmFaltaId) {
      const appointment = appointments.find((value) => value.id === confirmFaltaId);
      if (appointment) await changeStatus(appointment, 'FALTA');
      setConfirmFaltaId(null);
    }
  };

  return (
    <div className="mx-auto max-w-[1480px] space-y-5">
      <section className="bhon-panel overflow-hidden rounded-[24px]">
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-7">
          <div>
            <p className="bhon-eyebrow">Ritual do dia</p>
            <h1 className="mt-2 text-balance font-display text-3xl text-bhon-navy sm:text-4xl">Agenda clínica</h1>
            <p className="mt-2 max-w-xl text-pretty text-xs leading-relaxed text-bhon-muted">Cada horário, ambiente e profissional reunidos em uma única linha de cuidado.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-full border border-bhon-border bg-white p-1 shadow-sm">
              <button type="button" aria-label="Dia anterior" onClick={() => setSelectedDate((value) => moveDate(value, -1))} className="flex h-9 w-9 items-center justify-center rounded-full text-bhon-muted transition-colors hover:bg-bhon-bg hover:text-bhon-navy"><ChevronLeft aria-hidden="true" className="h-4 w-4" /></button>
              <label className="sr-only" htmlFor="agenda-date">Data da agenda</label>
              <input id="agenda-date" name="agenda-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="min-w-0 border-0 bg-transparent px-2 text-xs font-semibold text-bhon-navy" />
              <button type="button" aria-label="Próximo dia" onClick={() => setSelectedDate((value) => moveDate(value, 1))} className="flex h-9 w-9 items-center justify-center rounded-full text-bhon-muted transition-colors hover:bg-bhon-bg hover:text-bhon-navy"><ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
            </div>
            <label className="sr-only" htmlFor="agenda-status">Filtrar por status</label>
            <select id="agenda-status" name="agenda-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-full border border-bhon-border bg-white px-4 text-xs text-bhon-text shadow-sm">
            <option value="ALL">Todos os status</option>
            <option value="AGUARDANDO_CONFIRMACAO">Aguardando confirmação</option>
            <option value="EM_ATENDIMENTO">Em Atendimento</option>
            <option value="NA_RECEPCAO">Na Recepção</option>
            <option value="CONFIRMADO">Confirmados</option>
            <option value="FALTA">Faltas</option>
            <option value="ATRASADO">Atrasados</option>
            <option value="ENCAIXE">Encaixes</option>
            <option value="CONCLUIDO">Concluídos</option>
            <option value="CANCELADO">Cancelados</option>
          </select>

          {canManageAppointments(currentUser.role) && <button type="button" onClick={() => openForm()} disabled={loading || !!error || rooms.length === 0 || professionals.length === 0 || patients.length === 0} className="flex h-11 items-center gap-2 rounded-full bg-bhon-navy px-5 text-xs font-semibold text-white shadow-[0_10px_28px_rgba(18,27,42,0.2)] transition-[background-color,transform,opacity] hover:bg-bhon-navy-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45">
            <Plus aria-hidden="true" className="h-4 w-4 text-bhon-teal" />
            <span>Novo agendamento</span>
          </button>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-bhon-border bg-[#F8F5EF] px-5 py-3 text-[10px] text-bhon-muted sm:px-6 lg:px-8">
          <span className="capitalize font-semibold text-bhon-navy">{dateLabel}</span>
          <span><strong className="font-mono-data text-bhon-navy">{visibleAppointments.length}</strong> atendimentos visíveis</span>
          <span><strong className="font-mono-data text-bhon-navy">{rooms.length}</strong> ambientes clínicos</span>
          <span><strong className="font-mono-data text-bhon-navy">{professionals.length}</strong> profissionais disponíveis</span>
        </div>
      </section>

      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900" role="alert" aria-live="polite">
          <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="flex items-center gap-1 border border-rose-300 bg-white px-2.5 py-1.5 font-semibold transition-transform duration-150 active:scale-[0.97]"><RefreshCw className="h-3.5 w-3.5" /> Recarregar</button>
        </div>
      ) : null}

      {!canManageAppointments(currentUser.role) && <p className="text-xs text-bhon-muted">Seu perfil permite consultar a agenda. Alterações devem ser feitas pela equipe responsável.</p>}
      {!loading && !error && focusId && selectedId === focusId && !selectedApt && <p role="status" className="bhon-panel rounded-xl p-4 text-sm text-bhon-muted">O atendimento solicitado não foi encontrado nesta data. Confira o dia selecionado.</p>}
      {!loading && !error && canManageAppointments(currentUser.role) && (patients.length === 0 || professionals.length === 0) && <p className="text-xs text-bhon-muted">Para agendar, cadastre um paciente ativo e um profissional na equipe.</p>}

      {loading && appointments.length === 0 ? <div className="bhon-panel rounded-2xl px-4 py-12 text-center text-xs text-bhon-muted">Preparando agenda e ambientes clínicos…</div> : null}

      {/* ============================================================
          MATRIZ DA AGENDA: EIXO VERTICAL DE HORÁRIOS + COLUNAS DE SALAS
          ============================================================ */}
      {!loading && !error && displayRooms.length === 0 ? (
        <section className="bhon-panel rounded-[22px] px-6 py-14 text-center sm:px-10" aria-labelledby="empty-rooms-title">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-bhon-border bg-[#F8F5EF] text-bhon-teal">
            <Building2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <h2 id="empty-rooms-title" className="mt-5 font-display text-2xl text-bhon-navy">Prepare os ambientes da clínica</h2>
          <p className="mx-auto mt-2 max-w-lg text-pretty text-xs leading-relaxed text-bhon-muted">A agenda está conectada e pronta para uso. Cadastre ao menos um consultório ou sala clínica para liberar os horários e novos agendamentos.</p>
          <p className="mt-5 font-mono-data text-[10px] uppercase tracking-[0.14em] text-bhon-muted">Nenhum dado demonstrativo foi inserido</p>
        </section>
      ) : null}

      {!loading && !error && displayRooms.length > 0 ? <div className="space-y-3">
        <section aria-label="Agenda do dia no celular" className="space-y-2 sm:hidden">
          {visibleAppointments.length === 0 ? <div className="bhon-panel rounded-2xl p-8 text-center text-sm text-bhon-muted">Nenhum atendimento para este filtro.</div> : visibleAppointments.map((apt) => (
            <button key={apt.id} type="button" onClick={() => setSelectedApt(apt)} className="bhon-panel flex w-full items-start gap-3 rounded-2xl p-4 text-left">
              <span className="rounded-xl bg-bhon-teal-subtle px-2.5 py-2 font-mono-data text-xs font-bold text-bhon-teal-dark">{apt.time}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-bhon-text">{apt.patientName}</span><span className="mt-1 block truncate text-xs text-bhon-muted">{apt.procedureName} · {apt.professionalName}</span><span className="mt-2 flex items-center gap-2"><StatusBadge status={apt.status} size="sm" /><span className="truncate text-[10px] text-bhon-muted">{apt.roomName}</span></span></span>
            </button>
          ))}
        </section>
        <div className="bhon-panel hidden overflow-x-auto rounded-2xl sm:block">
        {/* Cabeçalho das Colunas de Consultórios */}
        <div style={{ gridTemplateColumns: `86px repeat(${Math.max(displayRooms.length, 1)}, minmax(240px, 1fr))` }} className="sticky top-0 z-10 grid min-w-max border-b border-bhon-border bg-[#F8F5EF] text-[10px] font-bold uppercase tracking-[0.15em] text-bhon-text">
          <div className="border-r border-bhon-border p-4 text-center font-mono-data text-bhon-muted">
            Hora
          </div>
          {displayRooms.map((room) => (
            <div
              key={room.id}
              className="flex items-center justify-between border-r border-bhon-border p-4 last:border-r-0"
            >
              <span>{room.name}</span>
              <span className="font-mono-data text-[10px] text-bhon-muted font-normal lowercase">
                {room.description}
              </span>
            </div>
          ))}
        </div>

        {/* Grade de Horários */}
        <div className="bhon-long-list divide-y divide-bhon-border">
          {timeSlots.map((time) => {
            return (
              <div key={time} style={{ gridTemplateColumns: `86px repeat(${Math.max(displayRooms.length, 1)}, minmax(240px, 1fr))` }} className="grid min-h-[82px] min-w-max">
                {/* Eixo Vertical de Tempo */}
                <div className="flex items-center justify-center border-r border-bhon-border bg-[#FAF8F3] p-3 text-center font-mono-data text-[11px] font-semibold text-bhon-muted">
                  {time}
                </div>

                {/* Colunas dos Consultórios */}
                {displayRooms.map((room) => {
                  const slotAppointments = visibleAppointments.filter((apt) => apt.roomId === room.id && apt.time === time);

                  return (
                    <div
                      key={room.id}
                      className="relative space-y-2 border-r border-bhon-border p-2 last:border-r-0 hover:bg-bhon-bg/60"
                    >
                      {slotAppointments.map((apt) => (
                        <button key={apt.id} type="button" onClick={() => setSelectedApt(apt)} className={`flex w-full flex-col justify-between rounded-xl border p-3 text-left text-xs transition-[border-color,box-shadow,background-color] ${
                            apt.status === 'EM_ATENDIMENTO'
                              ? 'bg-teal-50/80 border-teal-400 shadow-[0_8px_20px_rgba(19,170,153,0.12)]'
                              : apt.status === 'NA_RECEPCAO'
                              ? 'bg-blue-50/80 border-blue-400'
                              : apt.status === 'FALTA'
                              ? 'bg-rose-50/80 border-rose-300 opacity-90'
                              : apt.status === 'ATRASADO'
                              ? 'bg-amber-50 border-amber-300'
                              : 'bg-white/90 border-bhon-border hover:border-bhon-teal hover:shadow-sm'
                          }`}
                        >
                          <div>
                            {/* Linha 1: Horário, Prontuário e Status */}
                            <div className="flex items-center justify-between gap-1 mb-1">
                              <span className="font-mono-data font-bold text-bhon-text text-[11px]">
                                {apt.time}
                              </span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono-data text-[10px] text-bhon-muted">
                                  {apt.patientRecordNumber}
                                </span>
                                <StatusBadge status={apt.status} size="sm" />
                              </div>
                            </div>

                            {/* Linha 2: Nome do Paciente */}
                            <p className="font-bold text-bhon-text truncate leading-tight">
                              {apt.patientName}
                            </p>

                            {/* Linha 3: Procedimento e Etapa de Tratamento */}
                            <p className="text-[11px] text-bhon-text font-medium truncate mt-0.5" title={apt.procedureName}>
                              {apt.procedureName}
                            </p>
                            {apt.treatmentStageTitle ? (
                              <p className="text-[10px] font-mono-data text-bhon-teal-dark truncate">
                                {apt.treatmentStageTitle}
                              </p>
                            ) : null}
                          </div>

                          {/* Rodapé do Card: Profissional e Atraso */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 mt-1 text-[10px] text-bhon-muted">
                            <span className="truncate">{apt.professionalName}</span>
                            {apt.delayMinutes > 0 ? (
                              <span className="font-mono-data text-amber-800 font-bold">
                                +{apt.delayMinutes}m atraso
                              </span>
                            ) : null}
                          </div>
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        </div>
      </div> : null}

      {/* ============================================================
          DRAWER DE AÇÕES DA CONSULTA DA AGENDA
          ============================================================ */}
      <Drawer
        isOpen={!!selectedApt && !isNewAptOpen}
        onClose={() => { if (!actionLoading) setSelectedApt(null); }}
        title="Atendimento"
        subtitle={selectedApt ? `${selectedApt.time} • ${selectedApt.patientName} (${selectedApt.patientRecordNumber})` : ''}
      >
        {selectedApt && (
          <div className="space-y-4">
            {actionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-900">{actionError}</p>}
            {/* Detalhes Clínicos da Consulta */}
            <div className="p-3 bg-slate-50 border border-bhon-border rounded space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Procedimento:</span>
                <span className="font-bold text-bhon-text">{selectedApt.procedureName}</span>
              </div>
              {selectedApt.treatmentStageTitle && (
                <div className="flex items-center justify-between">
                  <span className="text-bhon-muted">Etapa Clínica:</span>
                  <span className="font-mono-data text-bhon-teal-dark font-semibold">
                    {selectedApt.treatmentStageTitle}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Profissional Responsável:</span>
                <span className="font-semibold text-bhon-text">{selectedApt.professionalName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Consultório Designado:</span>
                <span className="font-mono-data text-bhon-text">{selectedApt.roomName}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-bhon-border">
                <span className="text-bhon-muted">Status Operacional:</span>
                <StatusBadge status={selectedApt.status} />
              </div>
            </div>

            {canChangeAppointmentStatus(currentUser.role) && <>
            {/* Ações Imediatas Requeridas pelo Master Prompt (Seção 16) */}
            <div>
              <p className="font-bold text-bhon-text uppercase tracking-wider text-[11px] mb-2">
                Ações Operacionais de Execução
              </p>

              <div className="grid grid-cols-2 gap-2">
                {canTransition(selectedApt, 'CONFIRMADO') && <button type="button" disabled={actionLoading} onClick={() => void changeStatus(selectedApt, 'CONFIRMADO')} className="rounded border border-teal-300 bg-teal-50 p-2.5 text-left text-xs font-semibold text-teal-950 disabled:opacity-40">Confirmar agendamento</button>}
                <button
                  type="button"
                  disabled={actionLoading || !canTransition(selectedApt, 'NA_RECEPCAO')}
                  onClick={() => void changeStatus(selectedApt, 'NA_RECEPCAO')}
                  className="p-2.5 text-left rounded border border-blue-200 bg-blue-50/80 hover:bg-blue-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                >
                  <p className="font-bold text-blue-950">Confirmar Presença</p>
                  <p className="text-[10px] text-blue-700">Paciente na recepção</p>
                </button>

                <button
                  type="button"
                  disabled={actionLoading || !canTransition(selectedApt, 'EM_ATENDIMENTO')}
                  onClick={() => void changeStatus(selectedApt, 'EM_ATENDIMENTO')}
                  className="p-2.5 text-left rounded border border-teal-300 bg-teal-50 hover:bg-teal-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                >
                  <p className="font-bold text-teal-950">Chamar Paciente</p>
                  <p className="text-[10px] text-teal-700">Iniciar no consultório</p>
                </button>

                <button
                  type="button"
                  disabled={actionLoading || !canTransition(selectedApt, 'CONCLUIDO')}
                  onClick={() => void changeStatus(selectedApt, 'CONCLUIDO')}
                  className="p-2.5 text-left rounded border border-slate-300 bg-slate-100 hover:bg-slate-200 transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                >
                  <p className="font-bold text-slate-800">Concluir Sessão</p>
                  <p className="text-[10px] text-slate-600">Finalizar atendimento</p>
                </button>

                <button
                  type="button"
                  disabled={actionLoading || !canTransition(selectedApt, 'FALTA')}
                  onClick={() => setConfirmFaltaId(selectedApt.id)}
                  className="p-2.5 text-left rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                >
                  <p className="font-bold text-rose-950">Registrar Falta</p>
                  <p className="text-[10px] text-rose-700">Gera follow-up imediato</p>
                </button>
              </div>
            </div>

            {/* Informar Atraso */}
            <div className="pt-3 border-t border-bhon-border">
              <label className="block font-bold text-bhon-text uppercase tracking-wider text-[11px] mb-1.5">
                Registrar Atraso de Consulta
              </label>
              <div className="flex items-center gap-2">
                <button
                  disabled={actionLoading || !canTransition(selectedApt, 'ATRASADO')}
                  onClick={() => void changeStatus(selectedApt, 'ATRASADO', 10)}
                  className="px-2.5 py-1 text-xs border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded font-mono-data disabled:cursor-not-allowed disabled:opacity-40"
                >
                  +10 min
                </button>
                <button
                  disabled={actionLoading || !canTransition(selectedApt, 'ATRASADO')}
                  onClick={() => void changeStatus(selectedApt, 'ATRASADO', 15)}
                  className="px-2.5 py-1 text-xs border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded font-mono-data"
                >
                  +15 min
                </button>
                <button
                  disabled={actionLoading || !canTransition(selectedApt, 'ATRASADO')}
                  onClick={() => void changeStatus(selectedApt, 'ATRASADO', 30)}
                  className="px-2.5 py-1 text-xs border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded font-mono-data"
                >
                  +30 min
                </button>
              </div>
            </div>
            </>}

            {canManageAppointments(currentUser.role) && <div className="grid grid-cols-2 gap-2 border-t border-bhon-border pt-3 text-xs">
              <button type="button" disabled={actionLoading || selectedApt.status === 'CONCLUIDO'} onClick={() => openForm(selectedApt)} className="rounded-lg border border-bhon-border p-3 font-semibold disabled:opacity-40">Editar ou reagendar</button>
              <button type="button" disabled={actionLoading || !canTransition(selectedApt, 'CANCELADO')} onClick={() => setConfirmCancelId(selectedApt.id)} className="rounded-lg border border-rose-200 p-3 font-semibold text-rose-800 disabled:opacity-40">Cancelar agendamento</button>
            </div>}

            {/* Links Rápidos Navegáveis */}
            <div className="pt-3 border-t border-bhon-border space-y-2">
              <button
                onClick={() => {
                  setLocation(`/clinic/patients/${selectedApt.patientId}`);
                  setSelectedApt(null);
                }}
                className="w-full py-2 bg-bhon-navy text-white text-xs font-semibold rounded hover:bg-bhon-navy-hover transition-colors flex items-center justify-center gap-1"
              >
                <span>Abrir Prontuário do Paciente</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => {
                  setLocation('/clinic/treatments');
                  setSelectedApt(null);
                }}
                className="w-full py-2 border border-bhon-border text-bhon-text text-xs font-semibold rounded hover:bg-slate-50 transition-colors"
              >
                Ver Tratamento e Etapas
              </button>
            </div>
          </div>
        )}
      </Drawer>

      {/* ============================================================
          DRAWER DE NOVO AGENDAMENTO
          ============================================================ */}
      <Drawer
        isOpen={isNewAptOpen}
        onClose={() => { if (!actionLoading) setIsNewAptOpen(false); }}
        title={editingId ? 'Editar ou reagendar' : 'Novo Agendamento Clínico'}
        subtitle="Vincule paciente, consultório e procedimento"
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
          {actionError && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-rose-900">{actionError}</p>}
          {editingId && <p className="rounded-lg bg-bhon-bg p-3 text-bhon-muted">O reagendamento preserva o status atual. Para retomar um atendimento cancelado ou uma falta, confirme-o depois de salvar.</p>}
          <fieldset disabled={actionLoading} className="space-y-4">
          <div>
            <label htmlFor="new-appointment-patient" className="block font-semibold text-bhon-text mb-1">Paciente</label>
            <select
              id="new-appointment-patient"
              name="patientId"
              disabled={!!editingId}
              value={newPatientId}
              onChange={(e) => setNewPatientId(e.target.value)}
              className="w-full px-2.5 py-2 border border-bhon-border rounded bg-white text-bhon-text"
            >
              {editingId && !patients.some((p) => p.id === newPatientId) && <option value={newPatientId}>{selectedApt?.patientName}</option>}
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.recordNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="col-span-2">
              <label htmlFor="appointment-form-date" className="mb-1 block font-semibold text-bhon-text">Data do atendimento</label>
              <input id="appointment-form-date" type="date" required value={formDate} onChange={(e) => setFormDate(e.target.value)} className="w-full rounded border border-bhon-border px-2.5 py-2" />
            </div>
            <div>
              <label htmlFor="new-appointment-time" className="block font-semibold text-bhon-text mb-1">Horário</label>
              <input
                id="new-appointment-time"
                name="time"
                type="time"
                required
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full px-2.5 py-2 border border-bhon-border rounded bg-white font-mono-data text-bhon-text"
              />
            </div>

            <div>
              <label htmlFor="new-appointment-room" className="block font-semibold text-bhon-text mb-1">Consultório</label>
              <select
                id="new-appointment-room"
                name="roomId"
                value={newRoomId}
                onChange={(e) => setNewRoomId(e.target.value)}
                className="w-full px-2.5 py-2 border border-bhon-border rounded bg-white text-bhon-text"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="new-appointment-professional" className="block font-semibold text-bhon-text mb-1">Profissional</label>
            <select
              id="new-appointment-professional"
              name="professionalId"
              value={newProfessionalId}
              onChange={(e) => setNewProfessionalId(e.target.value)}
              className="w-full px-2.5 py-2 border border-bhon-border rounded bg-white text-bhon-text"
            >
              {professionals.map((professional) => (
                <option key={professional.id} value={professional.id}>{professional.name}{professional.specialty ? ` (${professional.specialty})` : ''}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="new-appointment-procedure" className="block font-semibold text-bhon-text mb-1">Procedimento clínico</label>
            <input
              id="new-appointment-procedure"
              name="procedureName"
              type="text"
              value={newProcedure}
              onChange={(e) => setNewProcedure(e.target.value)}
              placeholder="Ex: Consulta de Avaliação Inicial / Ajuste Oclusal"
              required
              minLength={2}
              maxLength={240}
              className="w-full px-2.5 py-2 border border-bhon-border rounded text-bhon-text"
            />
          </div>

          <div>
            <label htmlFor="appointment-duration" className="mb-1 block font-semibold">Duração em minutos</label>
            <input id="appointment-duration" type="number" required min={5} max={480} value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full rounded border border-bhon-border px-2.5 py-2" />
          </div>
          <div>
            <label htmlFor="appointment-notes" className="mb-1 block font-semibold">Observações</label>
            <textarea id="appointment-notes" maxLength={5000} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full rounded border border-bhon-border px-2.5 py-2" />
          </div>

          <button
            type="submit"
            disabled={actionLoading || !newPatientId || !newRoomId || !newProfessionalId}
            className="w-full py-2.5 bg-bhon-teal hover:bg-bhon-teal-dark text-white font-bold rounded uppercase tracking-wider text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99]"
          >
            {actionLoading ? 'Salvando agendamento…' : editingId ? 'Salvar alterações' : 'Confirmar e Inserir na Agenda'}
          </button>
          </fieldset>
        </form>
      </Drawer>

      {/* Diálogo de Confirmação de Falta */}
      <ConfirmationDialog
        isOpen={!!confirmFaltaId}
        onClose={() => setConfirmFaltaId(null)}
        onConfirm={handleFaltaConfirm}
        title="Registrar Falta de Paciente"
        description="A consulta será mantida no slot de horário com o status de FALTA. Automaticamente, um chamado de retorno será aberto na fila de acompanhamentos da recepção e a ausência constará na linha do tempo do prontuário."
        confirmText="Confirmar Falta"
        isDestructive={true}
      />
      <ConfirmationDialog
        isOpen={!!confirmCancelId}
        onClose={() => setConfirmCancelId(null)}
        onConfirm={() => { const appointment = appointments.find((apt) => apt.id === confirmCancelId); if (appointment) void changeStatus(appointment, 'CANCELADO'); }}
        title="Cancelar agendamento"
        description="O horário será liberado e o atendimento continuará no histórico do paciente como cancelado."
        confirmText="Confirmar cancelamento"
        isDestructive
      />
    </div>
  );
};
