import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useOperationalData } from '../../context/OperationalDataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import { ConfirmationDialog } from '../../components/common/ConfirmationDialog';
import {
  Calendar,
  Clock,
  User,
  Plus,
  Filter,
  CheckCircle2,
  AlertOctagon,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight
} from 'lucide-react';
import { Appointment, AppointmentStatus } from '../../types';

export const AgendaPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const {
    rooms,
    appointments,
    updateAppointmentStatus,
    rescheduleAppointment,
    createAppointment,
    patients,
  } = useOperationalData();

  const [selectedApt, setSelectedApt] = useState<Appointment | null>(null);
  const [isNewAptOpen, setIsNewAptOpen] = useState(false);
  const [confirmFaltaId, setConfirmFaltaId] = useState<string | null>(null);

  // Filtros operacionais
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  // Horários operacionais clínicos: 08:00 até 18:30 a cada 30 min
  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
    '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30',
    '17:00', '17:30', '18:00'
  ];

  // Formulário de Nova Consulta
  const [newPatientId, setNewPatientId] = useState(patients[0]?.id || '');
  const [newRoomId, setNewRoomId] = useState(rooms[0]?.id || 'room-1');
  const [newTime, setNewTime] = useState('14:30');
  const [newProcedure, setNewProcedure] = useState('');
  const [newDoctor, setNewDoctor] = useState('Dr. Roberto Carlos Fagundes');

  const handleCreateAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === newPatientId);
    const room = rooms.find(r => r.id === newRoomId);
    if (!patient || !room || !newProcedure) return;

    createAppointment({
      patientId: patient.id,
      patientName: patient.name,
      patientRecordNumber: patient.recordNumber,
      professionalId: 'user-1',
      professionalName: newDoctor,
      roomId: room.id,
      roomName: room.name,
      time: newTime,
      scheduledAt: `2026-09-03T${newTime}:00Z`,
      durationMinutes: 30,
      procedureName: newProcedure,
      status: 'CONFIRMADO',
      delayMinutes: 0,
    });

    setIsNewAptOpen(false);
    setNewProcedure('');
  };

  const handleFaltaConfirm = () => {
    if (confirmFaltaId) {
      updateAppointmentStatus(confirmFaltaId, 'FALTA');
      setConfirmFaltaId(null);
      if (selectedApt && selectedApt.id === confirmFaltaId) {
        setSelectedApt(prev => prev ? { ...prev, status: 'FALTA' } : null);
      }
    }
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Barra de Controle Superior da Agenda */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-bhon-border gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-bhon-text uppercase tracking-wide">
              Agenda da Clínica
            </h1>
            <span className="font-mono-data text-xs px-2 py-0.5 rounded bg-slate-100 text-bhon-navy border border-bhon-border font-semibold">
              Hoje • 03 Setembro 2026
            </span>
          </div>
          <p className="text-xs text-bhon-muted mt-0.5">
            Coordenação de fluxo por consultórios e horários cirúrgicos/clínicos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-bhon-border rounded text-xs text-bhon-text bg-white"
          >
            <option value="ALL">Todos os status</option>
            <option value="EM_ATENDIMENTO">Em Atendimento</option>
            <option value="NA_RECEPCAO">Na Recepção</option>
            <option value="CONFIRMADO">Confirmados</option>
            <option value="FALTA">Faltas</option>
          </select>

          <button
            onClick={() => setIsNewAptOpen(true)}
            className="px-3.5 py-1.5 bg-bhon-teal hover:bg-bhon-teal-dark text-white text-xs font-bold rounded flex items-center gap-1.5 transition-colors uppercase tracking-wider"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Agendamento</span>
          </button>
        </div>
      </div>

      {/* ============================================================
          MATRIZ DA AGENDA: EIXO VERTICAL DE HORÁRIOS + COLUNAS DE SALAS
          ============================================================ */}
      <div className="bg-white border border-bhon-border rounded shadow-sm overflow-hidden">
        {/* Cabeçalho das Colunas de Consultórios */}
        <div className="grid grid-cols-[80px_repeat(3,1fr)] border-b border-bhon-border bg-slate-50 text-xs font-bold text-bhon-text uppercase tracking-wider sticky top-0 z-10">
          <div className="p-3 text-center border-r border-bhon-border text-bhon-muted font-mono-data">
            Hora
          </div>
          {rooms.map((room) => (
            <div
              key={room.id}
              className="p-3 border-r last:border-r-0 border-bhon-border flex items-center justify-between"
            >
              <span>{room.name}</span>
              <span className="font-mono-data text-[10px] text-bhon-muted font-normal lowercase">
                {room.description}
              </span>
            </div>
          ))}
        </div>

        {/* Grade de Horários */}
        <div className="divide-y divide-bhon-border">
          {timeSlots.map((time) => {
            return (
              <div key={time} className="grid grid-cols-[80px_repeat(3,1fr)] min-h-[72px]">
                {/* Eixo Vertical de Tempo */}
                <div className="p-2.5 text-center font-mono-data text-xs font-semibold text-bhon-muted bg-slate-50/50 border-r border-bhon-border flex items-center justify-center">
                  {time}
                </div>

                {/* Colunas dos Consultórios */}
                {rooms.map((room) => {
                  const apt = appointments.find(
                    (a) => a.roomId === room.id && a.time === time
                  );

                  const isVisible =
                    !apt || statusFilter === 'ALL' || apt.status === statusFilter;

                  return (
                    <div
                      key={room.id}
                      className="p-1.5 border-r last:border-r-0 border-bhon-border relative hover:bg-slate-50/70 transition-colors"
                    >
                      {apt && isVisible && (
                        <div
                          onClick={() => setSelectedApt(apt)}
                          className={`h-full p-2 rounded border cursor-pointer transition-all text-xs flex flex-col justify-between ${
                            apt.status === 'EM_ATENDIMENTO'
                              ? 'bg-teal-50/80 border-teal-400 shadow-sm'
                              : apt.status === 'NA_RECEPCAO'
                              ? 'bg-blue-50/80 border-blue-400'
                              : apt.status === 'FALTA'
                              ? 'bg-rose-50/80 border-rose-300 opacity-90'
                              : apt.status === 'ATRASADO'
                              ? 'bg-amber-50 border-amber-300'
                              : 'bg-white border-bhon-border hover:border-bhon-teal'
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
                            {apt.treatmentStageTitle && (
                              <p className="text-[10px] font-mono-data text-bhon-teal-dark truncate">
                                {apt.treatmentStageTitle}
                              </p>
                            )}
                          </div>

                          {/* Rodapé do Card: Profissional e Atraso */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 mt-1 text-[10px] text-bhon-muted">
                            <span className="truncate">{apt.professionalName}</span>
                            {apt.delayMinutes > 0 && (
                              <span className="font-mono-data text-amber-800 font-bold">
                                +{apt.delayMinutes}m atraso
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          DRAWER DE AÇÕES DA CONSULTA DA AGENDA
          ============================================================ */}
      <Drawer
        isOpen={!!selectedApt}
        onClose={() => setSelectedApt(null)}
        title="Controle de Atendimento da Agenda"
        subtitle={selectedApt ? `${selectedApt.time} • ${selectedApt.patientName} (${selectedApt.patientRecordNumber})` : ''}
      >
        {selectedApt && (
          <div className="space-y-4">
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

            {/* Ações Imediatas Requeridas pelo Master Prompt (Seção 16) */}
            <div>
              <p className="font-bold text-bhon-text uppercase tracking-wider text-[11px] mb-2">
                Ações Operacionais de Execução
              </p>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => updateAppointmentStatus(selectedApt.id, 'NA_RECEPCAO')}
                  className="p-2.5 text-left rounded border border-blue-200 bg-blue-50/80 hover:bg-blue-100 transition-colors"
                >
                  <p className="font-bold text-blue-950">Confirmar Presença</p>
                  <p className="text-[10px] text-blue-700">Paciente na recepção</p>
                </button>

                <button
                  type="button"
                  onClick={() => updateAppointmentStatus(selectedApt.id, 'EM_ATENDIMENTO')}
                  className="p-2.5 text-left rounded border border-teal-300 bg-teal-50 hover:bg-teal-100 transition-colors"
                >
                  <p className="font-bold text-teal-950">Chamar Paciente</p>
                  <p className="text-[10px] text-teal-700">Iniciar no consultório</p>
                </button>

                <button
                  type="button"
                  onClick={() => updateAppointmentStatus(selectedApt.id, 'CONCLUIDO')}
                  className="p-2.5 text-left rounded border border-slate-300 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <p className="font-bold text-slate-800">Concluir Sessão</p>
                  <p className="text-[10px] text-slate-600">Finalizar atendimento</p>
                </button>

                <button
                  type="button"
                  onClick={() => setConfirmFaltaId(selectedApt.id)}
                  className="p-2.5 text-left rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 transition-colors"
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
                  onClick={() => updateAppointmentStatus(selectedApt.id, 'ATRASADO', 10)}
                  className="px-2.5 py-1 text-xs border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded font-mono-data"
                >
                  +10 min
                </button>
                <button
                  onClick={() => updateAppointmentStatus(selectedApt.id, 'ATRASADO', 15)}
                  className="px-2.5 py-1 text-xs border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded font-mono-data"
                >
                  +15 min
                </button>
                <button
                  onClick={() => updateAppointmentStatus(selectedApt.id, 'ATRASADO', 30)}
                  className="px-2.5 py-1 text-xs border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 rounded font-mono-data"
                >
                  +30 min
                </button>
              </div>
            </div>

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
        onClose={() => setIsNewAptOpen(false)}
        title="Novo Agendamento Clínico"
        subtitle="Vincule paciente, consultório e procedimento"
      >
        <form onSubmit={handleCreateAppointment} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-bhon-text mb-1">Paciente</label>
            <select
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
              <label className="block font-semibold text-bhon-text mb-1">Horário</label>
              <select
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
              <label className="block font-semibold text-bhon-text mb-1">Consultório</label>
              <select
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
            <label className="block font-semibold text-bhon-text mb-1">Profissional</label>
            <select
              value={newDoctor}
              onChange={(e) => setNewDoctor(e.target.value)}
              className="w-full px-2.5 py-2 border border-bhon-border rounded bg-white text-bhon-text"
            >
              <option value="Dr. Roberto Carlos Fagundes">Dr. Roberto Carlos Fagundes (Cirurgia)</option>
              <option value="Dra. Mariana Vasconcellos">Dra. Mariana Vasconcellos (Ortodontia)</option>
              <option value="Dr. Eduardo Prado">Dr. Eduardo Prado (Prótese & Implantes)</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-bhon-text mb-1">Procedimento Clínico</label>
            <input
              type="text"
              value={newProcedure}
              onChange={(e) => setNewProcedure(e.target.value)}
              placeholder="Ex: Consulta de Avaliação Inicial / Ajuste Oclusal"
              required
              className="w-full px-2.5 py-2 border border-bhon-border rounded text-bhon-text"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-bhon-teal hover:bg-bhon-teal-dark text-white font-bold rounded uppercase tracking-wider text-xs transition-colors"
          >
            Confirmar e Inserir na Agenda
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
    </div>
  );
};
