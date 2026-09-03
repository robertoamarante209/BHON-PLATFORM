import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useOperationalData } from '../../context/OperationalDataContext';
import { MetricCard } from '../../components/common/MetricCard';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import {
  AlertCircle,
  Clock,
  ArrowRight,
  PhoneCall,
  Calendar,
  CheckCircle,
  FileCheck,
  UserCheck,
  AlertTriangle,
  Play
} from 'lucide-react';
import { Appointment } from '../../types';

export const OverviewPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const {
    appointments,
    followUps,
    budgets,
    treatments,
    opportunities,
    updateAppointmentStatus,
    rescheduleAppointment,
  } = useOperationalData();

  // Estado para Drawer de Ação Rápida em Consulta
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [rescheduleTime, setRescheduleTime] = useState('17:00');
  const [rescheduleRoom, setRescheduleRoom] = useState('room-1');

  // Cálculos da Operação de Hoje baseados nos dados reais
  const todayAppointments = appointments;
  const totalPatientsToday = todayAppointments.length;
  const completedCount = todayAppointments.filter(a => a.status === 'CONCLUIDO').length;
  const inProgressCount = todayAppointments.filter(a => a.status === 'EM_ATENDIMENTO').length;
  const missedCount = todayAppointments.filter(a => a.status === 'FALTA').length;
  const upcomingCount = todayAppointments.filter(
    a => a.status === 'CONFIRMADO' || a.status === 'AGUARDANDO_CONFIRMACAO' || a.status === 'NA_RECEPCAO' || a.status === 'ENCAIXE'
  ).length;

  // Fila de Exceções Reais
  const missedApts = todayAppointments.filter(a => a.status === 'FALTA');
  const inactiveBudgets = budgets.filter(b => b.status === 'NEGOTIATING' || b.status === 'NO_RESPONSE');
  const inactiveBudgetValue = inactiveBudgets.reduce((acc, b) => acc + b.finalAmount, 0);
  const atRiskTreatments = treatments.filter(t => t.status === 'RISK_OF_ABANDONMENT');
  const postOpFollowUps = followUps.filter(f => f.category === 'POS_OPERATORIO' && f.status === 'PENDENTE');

  const handleStatusChange = (id: string, status: any) => {
    updateAppointmentStatus(id, status);
    if (selectedAppointment && selectedAppointment.id === id) {
      setSelectedAppointment(prev => prev ? { ...prev, status } : null);
    }
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppointment) return;
    const today = new Date().toISOString().split('T')[0];
    rescheduleAppointment(selectedAppointment.id, today, rescheduleTime, rescheduleRoom);
    setSelectedAppointment(null);
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

      {/* ============================================================
          1. FILA DE EXCEÇÕES OPERACIONAIS (SEÇÃO PRIORITÁRIA)
          ============================================================ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-600 animate-pulse"></span>
            <h2 className="text-xs font-bold text-bhon-text uppercase tracking-wider">
              Fila de Exceções Operacionais
            </h2>
          </div>
          <span className="text-[11px] font-mono-data text-bhon-muted">
            Prioridade máxima • Requer ação imediata
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Card de Exceção 1: Faltas Críticas */}
          <div className="p-3.5 bg-white border border-rose-200 rounded border-l-4 border-l-rose-600 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <StatusBadge status="CRÍTICO" size="sm" />
                <span className="font-mono-data text-xs font-bold text-rose-700">
                  {missedCount} FALTA{missedCount !== 1 ? 'S' : ''}
                </span>
              </div>
              <p className="text-xs font-bold text-bhon-text">
                {missedCount} {missedCount === 1 ? 'paciente faltou' : 'pacientes faltaram'} hoje sem aviso prévio
              </p>
              <p className="text-[11px] text-bhon-muted mt-1 leading-snug">
                Risco de atraso no plano de tratamento e ociosidade de consultório.
              </p>
            </div>
            <button
              onClick={() => setLocation('/clinic/follow-ups')}
              className="mt-3 w-full py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Reagendar e contatar</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card de Exceção 2: Orçamentos Retidos */}
          <div className="p-3.5 bg-white border border-amber-200 rounded border-l-4 border-l-amber-500 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <StatusBadge status="ATENÇÃO" size="sm" />
                <span className="font-mono-data text-[11px] font-bold text-amber-800">
                  R$ {inactiveBudgetValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <p className="text-xs font-bold text-bhon-text">
                {inactiveBudgets.length} orçamentos sem resposta há mais de 3 dias
              </p>
              <p className="text-[11px] text-bhon-muted mt-1 leading-snug">
                Receita represada em negociação aguardando contato ativo da recepção.
              </p>
            </div>
            <button
              onClick={() => setLocation('/clinic/budgets')}
              className="mt-3 w-full py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Ver {inactiveBudgets.length} orçamentos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card de Exceção 3: Tratamentos sem Próxima Etapa */}
          <div className="p-3.5 bg-white border border-blue-200 rounded border-l-4 border-l-blue-600 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <StatusBadge status="ACOMPANHAMENTO" size="sm" />
                <span className="font-mono-data text-xs font-bold text-blue-700">
                  {atRiskTreatments.length} EM RISCO
                </span>
              </div>
              <p className="text-xs font-bold text-bhon-text">
                Tratamentos ativos sem próxima etapa agendada
              </p>
              <p className="text-[11px] text-bhon-muted mt-1 leading-snug">
                Mais de 15 dias sem retorno com risco imediato de abandono do paciente.
              </p>
            </div>
            <button
              onClick={() => setLocation('/clinic/treatments')}
              className="mt-3 w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Revisar tratamentos</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Card de Exceção 4: Protocolo Pós-Op 48h */}
          <div className="p-3.5 bg-white border border-teal-200 rounded border-l-4 border-l-bhon-teal flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <StatusBadge status="PROTOCOLO" size="sm" />
                <span className="font-mono-data text-xs font-bold text-bhon-teal-dark">
                  {postOpFollowUps.length} PENDENTE{postOpFollowUps.length !== 1 ? 'S' : ''}
                </span>
              </div>
              <p className="text-xs font-bold text-bhon-text">
                Pós-cirúrgicos com checagem 48h pendente
              </p>
              <p className="text-[11px] text-bhon-muted mt-1 leading-snug">
                Protocolo clínico de monitoramento de dor, edema e medicação.
              </p>
            </div>
            <button
              onClick={() => setLocation('/clinic/follow-ups')}
              className="mt-3 w-full py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
            >
              <span>Acompanhar pós-op</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================
          2. OPERAÇÃO DE HOJE
          ============================================================ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-bhon-text uppercase tracking-wider">
            Operação de Hoje
          </h2>
          <span className="text-[11px] font-mono-data text-bhon-muted">
            Status ao vivo dos 3 consultórios
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
          4. FILA OPERACIONAL DE AÇÕES DO DIA
          ============================================================ */}
      <div className="bg-white border border-bhon-border rounded">
        <div className="p-3 border-b border-bhon-border flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-xs font-bold text-bhon-text uppercase tracking-wider">
              Fila Operacional de Ações
            </h3>
            <p className="text-[11px] text-bhon-muted">
              Tarefas clínicas e de recepção com prazos de execução hoje.
            </p>
          </div>
          <span className="font-mono-data text-xs text-bhon-muted">
            {followUps.length} ações pendentes
          </span>
        </div>

        <div className="divide-y divide-bhon-border">
          {followUps.map((fol) => (
            <div
              key={fol.id}
              className="p-3.5 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50 transition-colors text-xs"
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5">
                  <StatusBadge status={fol.priority} size="sm" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-bhon-text">{fol.patientName}</span>
                    <span className="font-mono-data text-[11px] text-bhon-muted">
                      {fol.patientRecordNumber}
                    </span>
                    <span className="font-mono-data text-[10px] px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200 text-slate-700">
                      {fol.category.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-xs text-bhon-text font-medium mt-0.5">
                    {fol.reason}
                  </p>
                  <p className="text-[11px] text-bhon-muted mt-0.5">
                    Responsável: <span className="font-semibold text-bhon-text">{fol.responsibleUserName}</span> • Próximo passo: {fol.nextAction}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end md:self-center">
                <button
                  onClick={() => setLocation('/clinic/follow-ups')}
                  className="px-3 py-1 bg-bhon-navy text-white text-[11px] font-semibold rounded hover:bg-bhon-navy-hover transition-colors flex items-center gap-1"
                >
                  <PhoneCall className="w-3 h-3" />
                  <span>Executar Ação</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ============================================================
          5. INDICADORES DE APOIO DO DIA (MASTER PROMPT SEÇÃO 15)
          ============================================================ */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-bold text-bhon-text uppercase tracking-wider">
            Indicadores de Apoio do Dia
          </h2>
          <span className="text-[11px] font-mono-data text-bhon-muted">
            Métricas de continuidade e liquidez
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard
            label="Comparecimento"
            value="88%"
            subtext="Meta clínica: 85%"
            delta={{ value: '+3% vs média', isPositive: true }}
          />
          <MetricCard
            label="Em Negociação"
            value="14 / R$ 94.200,00"
            subtext="Orçamentos ativos"
            delta={{ value: 'R$ 42.800 crítico', isPositive: false }}
          />
          <MetricCard
            label="Tratamentos Ativos"
            value="68"
            subtext="Em curso na clínica"
            delta={{ value: '5 sem retorno', isPositive: false }}
          />
          <MetricCard
            label="Oportunidades"
            value="09 triagem"
            subtext="Novos contatos do mês"
            delta={{ value: '+4 esta semana', isPositive: true }}
          />
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
                  onClick={() => handleStatusChange(selectedAppointment.id, 'NA_RECEPCAO')}
                  className="p-2 text-left rounded border border-blue-200 bg-blue-50/60 hover:bg-blue-100 transition-colors"
                >
                  <p className="font-bold text-blue-950">Confirmar Presença</p>
                  <p className="text-[10px] text-blue-700">Mover para Recepção</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedAppointment.id, 'EM_ATENDIMENTO')}
                  className="p-2 text-left rounded border border-teal-300 bg-teal-50 hover:bg-teal-100 transition-colors"
                >
                  <p className="font-bold text-teal-950">Chamar Paciente</p>
                  <p className="text-[10px] text-teal-700">Iniciar no Consultório</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedAppointment.id, 'CONCLUIDO')}
                  className="p-2 text-left rounded border border-slate-300 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <p className="font-bold text-slate-800">Concluir Sessão</p>
                  <p className="text-[10px] text-slate-600">Avançar Tratamento</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange(selectedAppointment.id, 'FALTA')}
                  className="p-2 text-left rounded border border-rose-300 bg-rose-50 hover:bg-rose-100 transition-colors"
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
                    <option value="room-1">Consultório 01</option>
                    <option value="room-2">Consultório 02</option>
                    <option value="room-3">Consultório 03</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-bhon-navy hover:bg-bhon-navy-hover text-white text-xs font-semibold rounded transition-colors"
              >
                Salvar Reagendamento
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
