import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'wouter';
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
  CalendarCheck2,
  Clock3,
  ShieldCheck,
} from 'lucide-react';
import type { Appointment, AppointmentStatus, Patient, Room } from '../../types';
import { appointmentTransitions, createAppointment, getSchedulingResources, listAppointments, listPatients, updateAppointmentStatus } from '../../lib/clinic';
import type { ProfessionalOption } from '../../lib/clinic';
import { clinicCalendarDate, zonedLocalDateTimeToIso } from '../../lib/datetime';
import { useAuth } from '../../context/AuthContext';
import { hasClinicPermission } from '../../lib/permissions';

function moveDate(value: string, days: number): string {
  const date = new Date(`${value}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function minutesFromTime(value: string): number {
  const [hours, minutes] = value.split(':').map(Number);
  return hours * 60 + minutes;
}

function overlaps(startA: number, durationA: number, startB: number, durationB: number): boolean {
  return startA < startB + durationB && startB < startA + durationA;
}

const timeSlots = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
  '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
  '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
  '17:00', '17:30', '18:00',
];

const appointmentCardTones: Record<AppointmentStatus, { tone: string; label: string; className: string }> = {
  CONFIRMADO: { tone: 'teal', label: 'Confirmado', className: 'border-teal-300 bg-teal-50/90' },
  AGUARDANDO_CONFIRMACAO: { tone: 'amber', label: 'Aguardando confirmação', className: 'border-amber-300 bg-amber-50/90' },
  NA_RECEPCAO: { tone: 'blue', label: 'Na recepção', className: 'border-blue-300 bg-blue-50/90' },
  EM_ATENDIMENTO: { tone: 'blue', label: 'Em atendimento', className: 'border-cyan-300 bg-cyan-50/90 shadow-[0_8px_20px_rgba(8,145,178,0.14)]' },
  CONCLUIDO: { tone: 'green', label: 'Concluído', className: 'border-emerald-300 bg-emerald-50/90' },
  ATRASADO: { tone: 'amber', label: 'Atrasado', className: 'border-amber-400 bg-amber-100/90' },
  FALTA: { tone: 'rose', label: 'Falta', className: 'border-rose-300 bg-rose-50/90' },
  CANCELADO: { tone: 'rose', label: 'Cancelado', className: 'border-slate-300 bg-slate-100/90 opacity-80' },
  ENCAIXE: { tone: 'blue', label: 'Encaixe', className: 'border-violet-300 bg-violet-50/90' },
};

export const AgendaPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { currentUser } = useAuth();
  const canCreateAppointment = hasClinicPermission(currentUser, 'agenda.create') && hasClinicPermission(currentUser, 'patients.view');
  const canEditAgenda = hasClinicPermission(currentUser, 'agenda.edit');
  const canCancelAppointment = hasClinicPermission(currentUser, 'agenda.cancel');
  const canOpenPatient = hasClinicPermission(currentUser, 'patients.view');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [professionals, setProfessionals] = useState<ProfessionalOption[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [selectedDate, setSelectedDate] = useState(clinicCalendarDate());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [isNewAptOpen, setIsNewAptOpen] = useState(false);
  const [confirmFaltaId, setConfirmFaltaId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  // Filtros operacionais
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Formulário de Nova Consulta
  const [newPatientId, setNewPatientId] = useState('');
  const [newRoomId, setNewRoomId] = useState('');
  const [newTime, setNewTime] = useState('14:30');
  const [newProcedure, setNewProcedure] = useState('');
  const [newProfessionalId, setNewProfessionalId] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    void Promise.all([
      listAppointments(selectedDate, controller.signal),
      getSchedulingResources(controller.signal),
      canCreateAppointment
        ? listPatients({ status: 'ACTIVE', limit: 50 }, controller.signal)
        : Promise.resolve({ data: [] as Patient[], pagination: { page: 1, limit: 50, total: 0, totalPages: 0 } }),
    ]).then(([appointmentData, resources, patientData]) => {
      setAppointments(appointmentData);
      setRooms(resources.rooms);
      setProfessionals(resources.professionals);
      setPatients(patientData.data);
      setNewPatientId((current) => current || patientData.data[0]?.id || '');
      setNewRoomId((current) => current || resources.rooms[0]?.id || '');
      setNewProfessionalId((current) => current || resources.professionals[0]?.id || '');
    }).catch((requestError) => {
      if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a agenda.');
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [canCreateAppointment, selectedDate, reloadKey]);

  const dateLabel = useMemo(() => new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(`${selectedDate}T12:00:00`)), [selectedDate]);
  const appointmentsBySlot = useMemo(() => new Map(appointments.map((appointment) => [`${appointment.professionalId}-${appointment.time}`, appointment])), [appointments]);
  const visibleAppointments = statusFilter === 'ALL' ? appointments : appointments.filter((appointment) => appointment.status === statusFilter);
  const canTransition = (appointment: Appointment, status: AppointmentStatus) => appointmentTransitions[appointment.status].includes(status);
  const pendingConfirmations = appointments.filter((appointment) => appointment.status === 'AGUARDANDO_CONFIRMACAO');
  const schedulingAssistant = useMemo(() => {
    const candidateStart = minutesFromTime(newTime);
    const activeAppointments = appointments.filter((appointment) => !['CANCELADO', 'FALTA'].includes(appointment.status));
    const conflictsAt = (time: string) => activeAppointments.filter((appointment) => {
      const sharesResource = appointment.roomId === newRoomId || appointment.professionalId === newProfessionalId;
      return sharesResource && overlaps(minutesFromTime(appointment.time), appointment.durationMinutes, minutesFromTime(time), 30);
    });
    const conflicts = conflictsAt(newTime);
    const suggestions = timeSlots.filter((time) => time !== newTime && conflictsAt(time).length === 0).slice(0, 3);
    return { conflicts, suggestions };
  }, [appointments, newProfessionalId, newRoomId, newTime]);

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreateAppointment) return;
    const patient = patients.find(p => p.id === newPatientId);
    const room = rooms.find(r => r.id === newRoomId);
    const professional = professionals.find(value => value.id === newProfessionalId);
    if (!patient || !room || !professional || !newProcedure.trim() || actionLoading) return;
    if (schedulingAssistant.conflicts.length > 0) {
      setError('Escolha um horário sugerido. A BHON bloqueou este agendamento para evitar conflito de sala ou profissional.');
      return;
    }
    setActionLoading(true);
    setError('');
    try {
      await createAppointment({
        patientId: patient.id,
        professionalId: professional.id,
        roomId: room.id,
        scheduledAt: zonedLocalDateTimeToIso(selectedDate, newTime),
        durationMinutes: 30,
        procedureName: newProcedure.trim(),
      });
      setIsNewAptOpen(false);
      setNewProcedure('');
      setReloadKey((value) => value + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível criar o agendamento.');
    } finally {
      setActionLoading(false);
    }
  };

  const changeStatus = async (appointment: Appointment, status: AppointmentStatus, delayMinutes?: number) => {
    if (actionLoading) return;
    const permitted = status === 'CANCELADO' ? canCancelAppointment : canEditAgenda;
    if (!permitted) { setError('Seu acesso não permite executar esta ação.'); return; }
    setActionLoading(true);
    setError('');
    try {
      await updateAppointmentStatus(appointment.id, status, delayMinutes);
      setSelectedApt((current) => current?.id === appointment.id ? { ...current, status, delayMinutes: delayMinutes ?? current.delayMinutes } : current);
      setReloadKey((value) => value + 1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar o atendimento.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleFaltaConfirm = async () => {
    if (confirmFaltaId) {
      const appointment = appointments.find((value) => value.id === confirmFaltaId);
      if (appointment) await changeStatus(appointment, 'FALTA');
      setConfirmFaltaId(null);
    }
  };

  const handleCancelConfirm = async () => {
    if (!confirmCancelId) return;
    const appointment = appointments.find((value) => value.id === confirmCancelId) || (selectedApt?.id === confirmCancelId ? selectedApt : null);
    if (appointment) await changeStatus(appointment, 'CANCELADO');
    setConfirmCancelId(null);
    setSelectedApt(null);
  };

  return (
    <div className="mx-auto max-w-[1480px] space-y-5">
      <section className="bhon-panel overflow-hidden rounded-[24px] bg-[#FBFCF9]">
        <div className="flex flex-col gap-5 px-5 py-5 sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:px-8 lg:py-7">
          <div>
            <p className="bhon-eyebrow">Ritual do dia</p>
            <h1 className="mt-2 text-balance font-display text-3xl text-bhon-navy sm:text-4xl">Agenda clínica</h1>
            <p className="mt-2 max-w-xl text-pretty text-xs leading-relaxed text-bhon-muted">Cada horário, ambiente e profissional reunidos em uma única linha de cuidado.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-full border border-bhon-border bg-[#FEFFFC] p-1 shadow-sm">
              <button type="button" aria-label="Dia anterior" onClick={() => setSelectedDate((value) => moveDate(value, -1))} className="flex h-9 w-9 items-center justify-center rounded-full text-bhon-muted transition-colors hover:bg-bhon-bg hover:text-bhon-navy"><ChevronLeft aria-hidden="true" className="h-4 w-4" /></button>
              <label className="sr-only" htmlFor="agenda-date">Data da agenda</label>
              <input id="agenda-date" name="agenda-date" type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.target.value)} className="min-w-0 border-0 bg-transparent px-2 text-xs font-semibold text-bhon-navy" />
              <button type="button" aria-label="Próximo dia" onClick={() => setSelectedDate((value) => moveDate(value, 1))} className="flex h-9 w-9 items-center justify-center rounded-full text-bhon-muted transition-colors hover:bg-bhon-bg hover:text-bhon-navy"><ChevronRight aria-hidden="true" className="h-4 w-4" /></button>
            </div>
            <label className="sr-only" htmlFor="agenda-status">Filtrar por status</label>
            <select id="agenda-status" name="agenda-status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="h-11 rounded-full border border-bhon-border bg-[#FEFFFC] px-4 text-xs text-bhon-text shadow-sm">
            <option value="ALL">Todos os status</option>
            <option value="EM_ATENDIMENTO">Em Atendimento</option>
            <option value="NA_RECEPCAO">Na Recepção</option>
            <option value="AGUARDANDO_CONFIRMACAO">Aguardando confirmação</option>
            <option value="CONFIRMADO">Confirmados</option>
            <option value="FALTA">Faltas</option>
          </select>

          {canCreateAppointment ? <button type="button" onClick={() => setIsNewAptOpen(true)} disabled={loading || rooms.length === 0 || professionals.length === 0 || patients.length === 0} className="flex h-11 items-center gap-2 rounded-full bg-bhon-navy px-5 text-xs font-semibold text-white shadow-[0_10px_28px_rgba(18,27,42,0.2)] transition-[background-color,transform,opacity] hover:bg-bhon-navy-hover active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45">
            <Plus aria-hidden="true" className="h-4 w-4 text-bhon-teal" />
            <span>Novo agendamento</span>
          </button> : null}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-bhon-border bg-[#F0F4F0] px-5 py-3 text-[10px] text-bhon-muted sm:px-6 lg:px-8">
          <span className="capitalize font-semibold text-bhon-navy">{dateLabel}</span>
          <span><strong className="font-mono-data text-bhon-navy">{visibleAppointments.length}</strong> atendimentos visíveis</span>
          <span><strong className="font-mono-data text-bhon-navy">{rooms.length}</strong> ambientes clínicos</span>
          <span><strong className="font-mono-data text-bhon-navy">{professionals.length}</strong> profissionais disponíveis</span>
          {pendingConfirmations.length > 0 ? <button type="button" onClick={() => setStatusFilter('AGUARDANDO_CONFIRMACAO')} className="inline-flex items-center gap-1.5 rounded-lg font-semibold text-amber-800 underline-offset-2 transition-colors hover:text-amber-950 hover:underline"><CalendarCheck2 aria-hidden="true" className="h-3.5 w-3.5" />{pendingConfirmations.length} {pendingConfirmations.length === 1 ? 'confirmação pendente' : 'confirmações pendentes'}</button> : null}
        </div>
      </section>

      {error ? (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-900" role="alert" aria-live="polite">
          <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button type="button" onClick={() => setReloadKey((value) => value + 1)} className="flex items-center gap-1 border border-rose-300 bg-white px-2.5 py-1.5 font-semibold transition-transform duration-150 active:scale-[0.97]"><RefreshCw className="h-3.5 w-3.5" /> Recarregar</button>
        </div>
      ) : null}

      {loading && appointments.length === 0 ? <div className="bhon-panel rounded-2xl px-4 py-12 text-center text-xs text-bhon-muted">Preparando agenda e ambientes clínicos…</div> : null}

      {/* ============================================================
          MATRIZ DA AGENDA: EIXO VERTICAL DE HORÁRIOS + COLUNAS DE SALAS
          ============================================================ */}
      {!loading && rooms.length === 0 ? (
        <section className="bhon-panel rounded-[22px] px-6 py-14 text-center sm:px-10" aria-labelledby="empty-rooms-title">
          <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-bhon-border bg-[#F8F5EF] text-bhon-teal">
            <Building2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <h2 id="empty-rooms-title" className="mt-5 font-display text-2xl text-bhon-navy">Prepare os ambientes da clínica</h2>
          <p className="mx-auto mt-2 max-w-lg text-pretty text-xs leading-relaxed text-bhon-muted">A agenda está conectada e pronta para uso. Cadastre ao menos uma sala de atendimento para liberar os horários e novos agendamentos.</p>
          <p className="mt-5 font-mono-data text-[10px] uppercase tracking-[0.14em] text-bhon-muted">Nenhum dado demonstrativo foi inserido</p>
        </section>
      ) : null}

      {!loading && rooms.length > 0 ? <div className="space-y-3">
        <section aria-label="Agenda do dia no celular" className="space-y-5 sm:hidden">
          {visibleAppointments.length === 0 ? <div className="bhon-panel rounded-2xl p-8 text-center text-sm text-bhon-muted">Nenhum atendimento para este filtro.</div> : professionals.map((professional) => {
            const professionalAppointments = visibleAppointments.filter((appointment) => appointment.professionalId === professional.id);
            if (professionalAppointments.length === 0) return null;
            return <section key={professional.id} aria-labelledby={`professional-${professional.id}`}><div className="mb-2 flex items-center gap-2"><span className="h-7 w-1 rounded-full bg-bhon-teal" /><div><h2 id={`professional-${professional.id}`} className="text-sm font-semibold text-bhon-text">{professional.name}</h2><p className="text-[11px] text-bhon-muted">{professional.specialty || `${professionalAppointments.length} atendimento${professionalAppointments.length === 1 ? '' : 's'}`}</p></div></div><div className="space-y-2">{professionalAppointments.map((apt) => <button key={apt.id} type="button" onClick={() => setSelectedApt(apt)} className="bhon-panel flex w-full items-start gap-3 rounded-2xl p-4 text-left"><span className="rounded-xl bg-bhon-teal-subtle px-2.5 py-2 font-mono-data text-xs font-bold text-bhon-teal-dark">{apt.time}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold text-bhon-text">{apt.patientName}</span><span className="mt-1 block truncate text-xs text-bhon-muted">{apt.procedureName}</span><span className="mt-2 flex items-center gap-2"><StatusBadge status={apt.status} size="sm" /><span className="truncate text-[10px] text-bhon-muted">{apt.roomName}</span></span></span></button>)}</div></section>;
          })}
        </section>
        <div role="table" aria-label="Agenda diária por profissional" className="hidden overflow-x-auto rounded-2xl border border-bhon-border bg-[#EDF3EF] shadow-[0_12px_32px_rgba(31,49,60,0.045)] sm:block">
        {/* Cabeçalho das Colunas de Consultórios */}
        <div role="row" style={{ gridTemplateColumns: `86px repeat(${Math.max(professionals.length, 1)}, minmax(240px, 1fr))` }} className="sticky top-0 z-10 grid min-w-max border-b border-bhon-border bg-[#E6EFEA] text-[10px] font-bold text-bhon-text">
          <div role="columnheader" className="border-r border-bhon-border p-4 text-center font-mono-data text-bhon-muted">
            Horário
          </div>
          {professionals.map((professional) => (
            <div
              role="columnheader"
              key={professional.id}
              className="flex items-center justify-between border-r border-bhon-border p-4 last:border-r-0"
            >
              <span>{professional.name}</span>
              <span className="text-[10px] font-normal text-bhon-muted">
                {professional.specialty || 'Profissional'}
              </span>
            </div>
          ))}
        </div>

        {/* Grade de Horários */}
        <div className="bhon-long-list divide-y divide-bhon-border">
          {timeSlots.map((time, index) => {
            return (
              <div role="row" key={time} style={{ gridTemplateColumns: `86px repeat(${Math.max(professionals.length, 1)}, minmax(240px, 1fr))` }} className={`grid min-h-[82px] min-w-max ${index % 2 === 0 ? 'bg-[#FCFDFC]' : 'bg-[#F7FAF7]'}`}>
                {/* Eixo Vertical de Tempo */}
                <div className="flex items-center justify-center border-r border-bhon-border bg-[#EEF3EF] p-3 text-center font-mono-data text-[11px] font-semibold text-bhon-muted">
                  {time}
                </div>

                {/* Colunas dos Consultórios */}
                {professionals.map((professional) => {
                  const apt = appointmentsBySlot.get(`${professional.id}-${time}`);

                  const isVisible =
                    !apt || statusFilter === 'ALL' || apt.status === statusFilter;
                  const cardTone = apt ? appointmentCardTones[apt.status] : null;

                  return (
                    <div
                      role="cell"
                      key={professional.id}
                      className="relative border-r border-bhon-border p-2 last:border-r-0 hover:bg-[#EAF4EE]"
                    >
                      {apt && isVisible ? (
                        <button type="button" data-testid="agenda-appointment-card" data-tone={cardTone?.tone} onClick={() => setSelectedApt(apt)} className={`flex h-full w-full flex-col justify-between rounded-xl border p-3 text-left text-xs transition-[border-color,box-shadow,background-color] hover:shadow-sm ${cardTone?.className}`}
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
                                <span className="rounded-full bg-white/75 px-2 py-0.5 text-[10px] font-semibold text-bhon-text">{cardTone?.label}</span>
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
                      ) : null}
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
        isOpen={!!selectedApt}
        onClose={() => setSelectedApt(null)}
        title="Detalhes do atendimento"
        subtitle={selectedApt ? `${selectedApt.time} • ${selectedApt.patientName} (${selectedApt.patientRecordNumber})` : ''}
      >
        {selectedApt && (
          <div className="space-y-4">
            {/* Detalhes Clínicos da Consulta */}
            <div className="p-3 bg-slate-50 border border-bhon-border rounded space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Tipo de atendimento:</span>
                <span className="font-bold text-bhon-text">{selectedApt.procedureName}</span>
              </div>
              {selectedApt.treatmentStageTitle && (
                <div className="flex items-center justify-between">
                  <span className="text-bhon-muted">Etapa do cuidado:</span>
                  <span className="font-mono-data text-bhon-teal-dark font-semibold">
                    {selectedApt.treatmentStageTitle}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Profissional:</span>
                <span className="font-semibold text-bhon-text">{selectedApt.professionalName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Ambiente:</span>
                <span className="font-mono-data text-bhon-text">{selectedApt.roomName}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-bhon-border">
                <span className="text-bhon-muted">Status:</span>
                <StatusBadge status={selectedApt.status} />
              </div>
            </div>

            {/* Ações Imediatas Requeridas pelo Master Prompt (Seção 16) */}
            {canEditAgenda ? <div>
              <p className="font-bold text-bhon-text uppercase tracking-wider text-[11px] mb-2">
                Atualizar atendimento
              </p>

              <div className="grid grid-cols-2 gap-2">
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
                  <p className="text-[10px] text-teal-700">Iniciar atendimento</p>
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
            </div> : null}

            {canEditAgenda && selectedApt.status === 'AGUARDANDO_CONFIRMACAO' ? <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-950">Confirmação de consulta</p>
              <p className="mt-1 text-[11px] leading-relaxed text-amber-800">Registre a resposta do paciente. Quando a integração de mensagens estiver ativa, a BHON atualizará este status automaticamente.</p>
              <button
                type="button"
                disabled={actionLoading || !canTransition(selectedApt, 'CONFIRMADO')}
                onClick={() => void changeStatus(selectedApt, 'CONFIRMADO')}
                className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-amber-900 px-3 text-[11px] font-bold text-white transition-colors hover:bg-amber-950 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CalendarCheck2 aria-hidden="true" className="h-3.5 w-3.5" /> Confirmar consulta
              </button>
            </div> : null}

            {/* Informar Atraso */}
            {canEditAgenda ? <div className="pt-3 border-t border-bhon-border">
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
            </div> : null}

            {canCancelAppointment && canTransition(selectedApt, 'CANCELADO') ? <button
              type="button"
              aria-label="Cancelar agendamento"
              onClick={() => setConfirmCancelId(selectedApt.id)}
              className="min-h-11 w-full rounded-xl border border-rose-200 bg-rose-50 px-4 text-xs font-semibold text-rose-800 transition-colors hover:bg-rose-100"
            >
              Cancelar agendamento
            </button> : null}

            {/* Links Rápidos Navegáveis */}
            <div className="pt-3 border-t border-bhon-border space-y-2">
              {canOpenPatient ? <button
                onClick={() => {
                  setLocation(`/clinic/patients/${selectedApt.patientId}`);
                  setSelectedApt(null);
                }}
                className="w-full py-2 bg-bhon-navy text-white text-xs font-semibold rounded hover:bg-bhon-navy-hover transition-colors flex items-center justify-center gap-1"
              >
                <span>Abrir Prontuário do Paciente</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button> : null}

              {canOpenPatient ? <button
                onClick={() => {
                  setLocation('/clinic/treatments');
                  setSelectedApt(null);
                }}
                className="w-full py-2 border border-bhon-border text-bhon-text text-xs font-semibold rounded hover:bg-slate-50 transition-colors"
              >
                Ver Tratamento e Etapas
              </button> : null}
            </div>
          </div>
        )}
      </Drawer>

      {/* ============================================================
          DRAWER DE NOVO AGENDAMENTO
          ============================================================ */}
      <Drawer
        isOpen={canCreateAppointment && isNewAptOpen}
        onClose={() => setIsNewAptOpen(false)}
        title="Novo Agendamento Clínico"
        subtitle="Vincule paciente, sala e tipo de atendimento"
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
          <div>
            <label htmlFor="new-appointment-patient" className="block font-semibold text-bhon-text mb-1">Paciente</label>
            <select
              id="new-appointment-patient"
              name="patientId"
              value={newPatientId}
              onChange={(e) => setNewPatientId(e.target.value)}
              className="w-full px-2.5 py-2 border border-bhon-border rounded bg-white text-bhon-text"
            >
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.recordNumber})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="new-appointment-time" className="block font-semibold text-bhon-text mb-1">Horário</label>
              <select
                id="new-appointment-time"
                name="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                className="w-full px-2.5 py-2 border border-bhon-border rounded bg-white font-mono-data text-bhon-text"
              >
                {timeSlots.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="new-appointment-room" className="block font-semibold text-bhon-text mb-1">Sala</label>
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

          <section aria-label="Assistente de agenda" className={`rounded-xl border p-3 ${schedulingAssistant.conflicts.length > 0 ? 'border-rose-200 bg-rose-50' : 'border-teal-200 bg-teal-50/70'}`}>
            {schedulingAssistant.conflicts.length > 0 ? <>
              <div className="flex items-start gap-2 text-rose-900" role="alert">
                <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" />
                <div><p className="font-bold">Conflito de agenda detectado</p><p className="mt-0.5 text-[11px] leading-relaxed">Este horário já utiliza {schedulingAssistant.conflicts.some((appointment) => appointment.professionalId === newProfessionalId) ? 'o profissional selecionado' : 'a sala selecionada'}.</p></div>
              </div>
              {schedulingAssistant.suggestions.length > 0 ? <div className="mt-3"><p className="text-[10px] font-bold uppercase tracking-wider text-rose-800">Horários sugeridos</p><div className="mt-2 flex flex-wrap gap-2">{schedulingAssistant.suggestions.map((time) => <button key={time} type="button" onClick={() => setNewTime(time)} className="inline-flex min-h-8 items-center gap-1 rounded-lg border border-rose-300 bg-white px-2.5 font-mono-data text-[11px] font-bold text-rose-900 transition-colors hover:bg-rose-100"><Clock3 aria-hidden="true" className="h-3 w-3" />{time}</button>)}</div></div> : null}
            </> : <div className="flex items-start gap-2 text-teal-950" role="status"><ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-teal-700" /><div><p className="font-bold">Horário disponível</p><p className="mt-0.5 text-[11px] leading-relaxed text-teal-800">Sala e profissional estão livres para este atendimento de 30 minutos.</p></div></div>}
          </section>

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
            <label htmlFor="new-appointment-procedure" className="block font-semibold text-bhon-text mb-1">Tipo de atendimento</label>
            <input
              id="new-appointment-procedure"
              name="procedureName"
              type="text"
              value={newProcedure}
              onChange={(e) => setNewProcedure(e.target.value)}
              placeholder="Ex: Avaliação inicial ou sessão de acompanhamento"
              required
              className="w-full px-2.5 py-2 border border-bhon-border rounded text-bhon-text"
            />
          </div>

          <button
            type="submit"
            disabled={actionLoading || !newPatientId || !newRoomId || !newProfessionalId || schedulingAssistant.conflicts.length > 0}
            className="w-full py-2.5 bg-bhon-teal hover:bg-bhon-teal-dark text-white font-bold rounded uppercase tracking-wider text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99]"
          >
            {actionLoading ? 'Salvando agendamento…' : 'Confirmar e Inserir na Agenda'}
          </button>
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
        onConfirm={handleCancelConfirm}
        title="Cancelar agendamento"
        description="O horário será marcado como cancelado e continuará registrado no histórico do paciente."
        confirmText="Cancelar agendamento"
        isDestructive={true}
      />
    </div>
  );
};
