import React, { useEffect, useState } from 'react';
import { useLocation } from 'wouter';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import { RecoveryQueue } from '../../components/recovery/RecoveryQueue';
import { Calendar } from 'lucide-react';
import type { Appointment, AppointmentStatus, Room } from '../../types';
import { appointmentTransitions, getSchedulingResources, listAppointments, rescheduleAppointment, updateAppointmentStatus } from '../../lib/clinic';

export const OverviewPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingAgenda, setLoadingAgenda] = useState(true);
  const [agendaError, setAgendaError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [agendaReload, setAgendaReload] = useState(0);
  // Estado para Drawer de Ação Rápida em Consulta
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState('17:00');
  const [rescheduleRoom, setRescheduleRoom] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const now = new Date();
    const date = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    setLoadingAgenda(true);
    setAgendaError('');
    void Promise.all([listAppointments(date, controller.signal), getSchedulingResources(controller.signal)])
      .then(([appointmentData, resources]) => {
        setAppointments(appointmentData);
        setRooms(resources.rooms);
        setRescheduleRoom((current) => current || resources.rooms[0]?.id || '');
      })
      .catch((requestError) => {
        if (requestError instanceof DOMException && requestError.name === 'AbortError') return;
        setAgendaError(requestError instanceof Error ? requestError.message : 'Não foi possível carregar a operação de hoje.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoadingAgenda(false); });
    return () => controller.abort();
  }, [agendaReload]);

  // Cálculos da Operação de Hoje baseados nos dados reais
  const todayAppointments = appointments;
  const totalPatientsToday = todayAppointments.length;
  const completedCount = todayAppointments.filter(a => a.status === 'CONCLUIDO').length;
  const inProgressCount = todayAppointments.filter(a => a.status === 'EM_ATENDIMENTO').length;
  const missedCount = todayAppointments.filter(a => a.status === 'FALTA').length;
  const upcomingCount = todayAppointments.filter(
    a => a.status === 'CONFIRMADO' || a.status === 'AGUARDANDO_CONFIRMACAO' || a.status === 'NA_RECEPCAO' || a.status === 'ENCAIXE'
  ).length;

  const handleStatusChange = async (appointment: Appointment, status: AppointmentStatus) => {
    if (actionLoading || !appointmentTransitions[appointment.status].includes(status)) return;
    setActionLoading(true);
    setAgendaError('');
    try {
      await updateAppointmentStatus(appointment.id, status);
      setSelectedAppointment((current) => current?.id === appointment.id ? { ...current, status } : current);
      setAgendaReload((value) => value + 1);
    } catch (requestError) {
      setAgendaError(requestError instanceof Error ? requestError.message : 'Não foi possível atualizar o atendimento.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment || !rescheduleRoom || actionLoading) return;
    const now = new Date();
    const date = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
    setActionLoading(true);
    setAgendaError('');
    try {
      await rescheduleAppointment(selectedAppointment.id, { scheduledAt: new Date(`${date}T${rescheduleTime}:00`).toISOString(), roomId: rescheduleRoom });
      setSelectedAppointment(null);
      setAgendaReload((value) => value + 1);
    } catch (requestError) {
      setAgendaError(requestError instanceof Error ? requestError.message : 'Não foi possível reagendar a consulta.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho da Visão Geral (Superfície de Comando) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-4 border-b border-bhon-border gap-2">
        <div>
          <h1 className="text-lg font-bold text-bhon-text uppercase tracking-wide">
            Visão Geral
          </h1>
          <p className="text-xs text-bhon-muted mt-0.5">
            Controle de fluxo operacional da clínica e fila de exceções prioritárias.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setLocation('/clinic/agenda')}
            className="px-3.5 py-1.5 bg-bhon-navy hover:bg-bhon-navy-hover text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Abrir Agenda de Hoje</span>
          </button>
        </div>
      </div>

      {agendaError && <div className="border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-900" role="alert">{agendaError}</div>}

      <RecoveryQueue onNavigate={setLocation} />

      {/* ============================================================
          2. OPERAÇÃO DE HOJE
          ============================================================ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-bhon-text uppercase tracking-wider">
            Operação de Hoje
          </h2>
          <span className="text-[11px] font-mono-data text-bhon-muted">
            {loadingAgenda ? 'Atualizando operação…' : `Status ao vivo de ${rooms.length} consultório${rooms.length === 1 ? '' : 's'}`}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <MetricCard
            label="Total Pacientes Hoje"
            value={totalPatientsToday}
            subtext="Fluxo previsto do dia"
          />
          <MetricCard
            label="Concluídos"
            value={completedCount}
            subtext="Procedimentos finalizados"
            delta={{ value: `${Math.round((completedCount / Math.max(1, totalPatientsToday)) * 100)}%`, isPositive: true }}
          />
          <MetricCard
            label="Em Atendimento"
            value={inProgressCount}
            subtext="Cadeira ocupada agora"
            highlight={true}
          />
          <MetricCard
            label="Próximos / Na Recepção"
            value={upcomingCount}
            subtext="Aguardando atendimento"
          />
          <MetricCard
            label="Faltas Registradas"
            value={missedCount}
            subtext="Contatos pendentes"
            delta={missedCount > 0 ? { value: `${missedCount} exceções`, isPositive: false } : undefined}
          />
        </div>
      </div>

      {/* ============================================================
          3. TABELA OPERACIONAL DE ATENDIMENTOS DE HOJE
          ============================================================ */}
      <div className="bg-white border border-bhon-border rounded">
        <div className="p-3 border-b border-bhon-border flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-xs font-bold text-bhon-text uppercase tracking-wider">
              Fluxo da Agenda do Dia
            </h3>
            <p className="text-[11px] text-bhon-muted">
              Clique em qualquer atendimento para acionar comandos operacionais imediatos.
            </p>
          </div>
          <span className="font-mono-data text-xs text-bhon-muted">
            {todayAppointments.length} consultas registradas
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="bhon-table">
            <thead>
              <tr>
                <th>Horário</th>
                <th>Paciente</th>
                <th>Prontuário</th>
                <th>Procedimento Clínico</th>
                <th>Profissional</th>
                <th>Consultório</th>
                <th>Status</th>
                <th className="text-right">Ação Imediata</th>
              </tr>
            </thead>
            <tbody>
              {loadingAgenda && todayAppointments.length === 0 && <tr><td colSpan={8} className="py-8 text-center text-xs text-bhon-muted">Carregando agenda de hoje…</td></tr>}
              {!loadingAgenda && todayAppointments.length === 0 && !agendaError && <tr><td colSpan={8} className="py-8 text-center text-xs text-bhon-muted">Nenhum atendimento agendado para hoje.</td></tr>}
              {todayAppointments.map((apt) => (
                <tr
                  key={apt.id}
                  onClick={() => setSelectedAppointment(apt)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="font-mono-data font-bold text-bhon-text whitespace-nowrap">
                    {apt.time}
                    {apt.delayMinutes > 0 && (
                      <span className="ml-1.5 text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-1 py-0.2 rounded font-mono-data">
                        +{apt.delayMinutes}m
                      </span>
                    )}
                  </td>
                  <td className="font-semibold text-bhon-text whitespace-nowrap">
                    {apt.patientName}
                  </td>
                  <td className="font-mono-data text-bhon-muted">
                    {apt.patientRecordNumber}
                  </td>
                  <td className="max-w-xs truncate" title={apt.procedureName}>
                    {apt.procedureName}
                  </td>
                  <td className="text-bhon-muted whitespace-nowrap">
                    {apt.professionalName}
                  </td>
                  <td className="font-mono-data text-xs whitespace-nowrap">
                    {apt.roomName}
                  </td>
                  <td className="whitespace-nowrap">
                    <StatusBadge status={apt.status} />
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedAppointment(apt);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-bhon-navy bg-slate-100 hover:bg-bhon-navy hover:text-white rounded border border-bhon-border transition-colors"
                    >
                      Comando
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================
          DRAWER DE COMANDOS OPERACIONAIS NA CONSULTA
          ============================================================ */}
      <Drawer
        isOpen={!!selectedAppointment}
        onClose={() => setSelectedAppointment(null)}
        title="Comando Operacional de Atendimento"
        subtitle={selectedAppointment ? `${selectedAppointment.time} • ${selectedAppointment.patientName} (${selectedAppointment.patientRecordNumber})` : ''}
      >
        {selectedAppointment && (
          <div className="space-y-4">
            {/* Resumo do Atendimento */}
            <div className="p-3 bg-slate-50 border border-bhon-border rounded space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Procedimento:</span>
                <span className="font-bold text-bhon-text">{selectedAppointment.procedureName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Profissional:</span>
                <span className="font-semibold text-bhon-text">{selectedAppointment.professionalName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Consultório:</span>
                <span className="font-mono-data text-bhon-text">{selectedAppointment.roomName}</span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-bhon-border">
                <span className="text-bhon-muted">Status Atual:</span>
                <StatusBadge status={selectedAppointment.status} />
              </div>
            </div>

            {/* Ações Imediatas de Fluxo de Atendimento */}
            <div>
              <label className="block font-bold text-bhon-text uppercase tracking-wider text-[11px] mb-2">
                Ações Imediatas de Fluxo
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={actionLoading || !appointmentTransitions[selectedAppointment.status].includes('NA_RECEPCAO')}
                  onClick={() => void handleStatusChange(selectedAppointment, 'NA_RECEPCAO')}
                  className="p-2 text-left rounded border border-blue-200 bg-blue-50/60 hover:bg-blue-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                >
                  <p className="font-bold text-blue-950">Confirmar Presença</p>
                  <p className="text-[10px] text-blue-700">Mover para Recepção</p>
                </button>

                <button
                  type="button"
                  disabled={actionLoading || !appointmentTransitions[selectedAppointment.status].includes('EM_ATENDIMENTO')}
                  onClick={() => void handleStatusChange(selectedAppointment, 'EM_ATENDIMENTO')}
                  className="p-2 text-left rounded border border-teal-300 bg-teal-50 hover:bg-teal-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                >
                  <p className="font-bold text-teal-950">Chamar Paciente</p>
                  <p className="text-[10px] text-teal-700">Iniciar no Consultório</p>
                </button>

                <button
                  type="button"
                  disabled={actionLoading || !appointmentTransitions[selectedAppointment.status].includes('CONCLUIDO')}
                  onClick={() => void handleStatusChange(selectedAppointment, 'CONCLUIDO')}
                  className="p-2 text-left rounded border border-slate-300 bg-slate-100 hover:bg-slate-200 transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                >
                  <p className="font-bold text-slate-800">Concluir Sessão</p>
                  <p className="text-[10px] text-slate-600">Avançar Tratamento</p>
                </button>

                <button
                  type="button"
                  disabled={actionLoading || !appointmentTransitions[selectedAppointment.status].includes('FALTA')}
                  onClick={() => void handleStatusChange(selectedAppointment, 'FALTA')}
                  className="p-2 text-left rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 transition-colors disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98]"
                >
                  <p className="font-bold text-rose-950">Registrar Falta</p>
                  <p className="text-[10px] text-rose-700">Abrir Fila de Exceção</p>
                </button>
              </div>
            </div>

            {/* Reagendamento Rápido */}
            <form onSubmit={handleRescheduleSubmit} className="pt-3 border-t border-bhon-border space-y-3">
              <label className="block font-bold text-bhon-text uppercase tracking-wider text-[11px]">
                Reagendar Horário
              </label>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-bhon-muted block mb-1">Novo Horário</label>
                  <input
                    type="time"
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-bhon-border rounded font-mono-data text-xs text-bhon-text"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-bhon-muted block mb-1">Consultório</label>
                  <select
                    value={rescheduleRoom}
                    onChange={(e) => setRescheduleRoom(e.target.value)}
                    className="w-full px-2 py-1.5 border border-bhon-border rounded text-xs text-bhon-text bg-white"
                  >
                    {rooms.map((room) => <option key={room.id} value={room.id}>{room.name}</option>)}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading || !rescheduleRoom}
                className="w-full py-2 bg-bhon-navy hover:bg-bhon-navy-hover text-white text-xs font-semibold rounded transition-colors disabled:cursor-not-allowed disabled:opacity-60 active:scale-[0.99]"
              >
                {actionLoading ? 'Salvando…' : 'Salvar Reagendamento'}
              </button>
            </form>

            {/* Links Rápidos */}
            <div className="pt-3 border-t border-bhon-border flex items-center justify-between text-xs">
              <button
                onClick={() => {
                  setLocation(`/clinic/patients/${selectedAppointment.patientId}`);
                  setSelectedAppointment(null);
                }}
                className="text-bhon-teal hover:underline font-semibold"
              >
                Abrir Prontuário do Paciente →
              </button>
              <button
                onClick={() => {
                  setLocation('/clinic/treatments');
                  setSelectedAppointment(null);
                }}
                className="text-bhon-muted hover:text-bhon-text"
              >
                Ver Tratamento
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

