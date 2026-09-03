import React, { useState } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useOperationalData } from '../../context/OperationalDataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import {
  User,
  Phone,
  Mail,
  Calendar,
  FileText,
  DollarSign,
  AlertTriangle,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Plus,
  ChevronRight,
  ShieldAlert
} from 'lucide-react';

export const PatientDetailPage: React.FC = () => {
  const [, params] = useRoute('/clinic/patients/:id');
  const [, setLocation] = useLocation();
  const {
    patients,
    treatments,
    budgets,
    payments,
    followUps,
    appointments,
    timelineEvents,
    createAppointment,
    rooms,
  } = useOperationalData();

  const patientId = params?.id;
  const patient = patients.find((p) => p.id === patientId);

  const [activeTab, setActiveTab] = useState<
    'RESUMO' | 'HISTORICO' | 'TRATAMENTOS' | 'ORCAMENTOS' | 'FINANCEIRO' | 'ACOMPANHAMENTOS' | 'DOCUMENTOS'
  >('RESUMO');

  // Estado para agendamento rápido direto do prontuário
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [schedTime, setSchedTime] = useState('15:00');
  const [schedRoom, setSchedRoom] = useState('room-1');
  const [schedProcedure, setSchedProcedure] = useState('');

  if (!patient) {
    return (
      <div className="p-8 text-center text-xs text-bhon-muted max-w-xl mx-auto">
        <p className="text-sm font-bold text-bhon-text">Paciente não encontrado</p>
        <p className="mt-1">O prontuário solicitado não existe ou não pertence a esta clínica.</p>
        <button
          onClick={() => setLocation('/clinic/patients')}
          className="mt-4 px-3 py-1.5 bg-bhon-navy text-white rounded font-semibold"
        >
          Voltar para Lista de Pacientes
        </button>
      </div>
    );
  }

  // Registros relacionados
  const patientTreatments = treatments.filter((t) => t.patientId === patient.id);
  const patientBudgets = budgets.filter((b) => b.patientId === patient.id);
  const patientPayments = payments.filter((p) => p.patientId === patient.id);
  const patientFollowUps = followUps.filter((f) => f.patientId === patient.id);
  const patientAppointments = appointments.filter((a) => a.patientId === patient.id);
  const patientTimeline = timelineEvents.filter((t) => t.patientId === patient.id);

  // Cálculos financeiros do paciente
  const totalBudgeted = patientBudgets.reduce((acc, b) => acc + b.finalAmount, 0);
  const totalPaid = patientPayments
    .filter((p) => p.status === 'PAGO')
    .reduce((acc, p) => acc + p.amount, 0);
  const totalPending = patientPayments
    .filter((p) => p.status === 'PENDENTE' || p.status === 'ATRASADO')
    .reduce((acc, p) => acc + p.amount, 0);

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!schedProcedure) return;
    const room = rooms.find((r) => r.id === schedRoom);
    createAppointment({
      patientId: patient.id,
      patientName: patient.name,
      patientRecordNumber: patient.recordNumber,
      professionalId: 'user-1',
      professionalName: 'Dr. Roberto Carlos Fagundes',
      roomId: schedRoom,
      roomName: room ? room.name : 'Consultório 01',
      time: schedTime,
      scheduledAt: `2026-09-03T${schedTime}:00Z`,
      durationMinutes: 45,
      procedureName: schedProcedure,
      status: 'CONFIRMADO',
      delayMinutes: 0,
    });
    setIsScheduleOpen(false);
    setSchedProcedure('');
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Botão de Retorno e Ações */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setLocation('/clinic/patients')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-bhon-muted hover:text-bhon-navy transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para Lista de Pacientes</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsScheduleOpen(true)}
            className="px-3.5 py-1.5 bg-bhon-navy hover:bg-bhon-navy-hover text-white text-xs font-semibold rounded flex items-center gap-1.5 transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Agendar Próxima Consulta</span>
          </button>
        </div>
      </div>

      {/* Cartão de Identidade do Paciente (Prontuário) */}
      <div className="bg-white border border-bhon-border rounded p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded bg-bhon-navy text-white flex items-center justify-center font-bold text-lg">
              {patient.name.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base font-bold text-bhon-text">{patient.name}</h1>
                <span className="font-mono-data text-xs px-2 py-0.5 rounded bg-slate-100 border border-slate-200 font-bold text-slate-800">
                  {patient.recordNumber}
                </span>
                <StatusBadge status={patient.status} />
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-bhon-muted mt-2">
                <span className="font-mono-data">CPF: {patient.cpf || 'Não informado'}</span>
                <span>•</span>
                <span className="font-mono-data flex items-center gap-1">
                  <Phone className="w-3 h-3 text-bhon-teal" />
                  {patient.phone || 'Sem telefone'}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <Mail className="w-3 h-3 text-bhon-muted" />
                  {patient.email || 'Sem e-mail'}
                </span>
                <span>•</span>
                <span>Origem: <strong className="text-bhon-text">{patient.source || 'Geral'}</strong></span>
              </div>
            </div>
          </div>

          {/* Destaque Clínico e Alerta de Alergias */}
          {patient.allergies && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded text-xs flex items-start gap-2 max-w-sm">
              <AlertTriangle className="w-4 h-4 text-rose-700 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-900">Alerta de Alergia / Condição:</p>
                <p className="text-[11px] text-rose-800 mt-0.5 leading-tight font-medium">
                  {patient.allergies}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Linha do Tempo Obrigatória: Last Event → Current State → Next Step */}
        <div className="mt-5 pt-4 border-t border-bhon-border grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-3 bg-slate-50 border border-bhon-border rounded">
            <span className="text-[10px] font-bold text-bhon-muted uppercase tracking-wider block">
              Último Evento Registrado
            </span>
            <p className="text-xs font-semibold text-bhon-text mt-1">
              {patient.lastAppointmentAt
                ? `Consulta em ${new Date(patient.lastAppointmentAt).toLocaleDateString('pt-BR')}`
                : 'Cadastro inicial no sistema'}
            </p>
          </div>

          <div className="p-3 bg-slate-50 border border-bhon-border rounded">
            <span className="text-[10px] font-bold text-bhon-muted uppercase tracking-wider block">
              Estado Clínico Atual
            </span>
            <p className="text-xs font-semibold text-bhon-teal-dark mt-1">
              {patient.currentTreatment || 'Sem tratamento ativo'}
            </p>
            <p className="text-[10px] text-bhon-muted mt-0.5">
              Resp: {patient.responsibleName || 'Dr. Roberto Carlos Fagundes'}
            </p>
          </div>

          <div className="p-3 bg-teal-50/50 border border-teal-200 rounded">
            <span className="text-[10px] font-bold text-teal-800 uppercase tracking-wider block">
              Próxima Ação Prevista
            </span>
            <p className="text-xs font-bold text-bhon-text mt-1">
              {patient.nextAction || 'Definir plano terapêutico'}
            </p>
          </div>
        </div>
      </div>

      {/* Abas de Dossiê do Paciente */}
      <div className="border-b border-bhon-border flex items-center gap-6 text-xs font-semibold select-none overflow-x-auto">
        {[
          { key: 'RESUMO', label: 'Resumo Clínico' },
          { key: 'HISTORICO', label: `Linha do Tempo (${patientAppointments.length + patientTimeline.length})` },
          { key: 'TRATAMENTOS', label: `Tratamentos (${patientTreatments.length})` },
          { key: 'ORCAMENTOS', label: `Orçamentos (${patientBudgets.length})` },
          { key: 'FINANCEIRO', label: `Financeiro (${patientPayments.length})` },
          { key: 'ACOMPANHAMENTOS', label: `Acompanhamentos (${patientFollowUps.length})` },
          { key: 'DOCUMENTOS', label: 'Documentos' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as any)}
            className={`pb-2.5 transition-colors whitespace-nowrap ${
              activeTab === tab.key
                ? 'border-b-2 border-bhon-teal text-bhon-teal font-bold'
                : 'text-bhon-muted hover:text-bhon-text'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ============================================================
          CONTEÚDO DAS ABAS
          ============================================================ */}

      {/* ABA: RESUMO */}
      {activeTab === 'RESUMO' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 space-y-4">
            <div className="bg-white border border-bhon-border rounded p-4">
              <h3 className="text-xs font-bold text-bhon-text uppercase tracking-wider mb-2">
                Observações Clínicas e Anamnese
              </h3>
              <p className="text-xs text-bhon-text leading-relaxed bg-slate-50 p-3 rounded border border-bhon-border font-mono-data">
                {patient.observations || 'Nenhuma observação clínica adicional registrada.'}
              </p>
            </div>

            {/* Tratamentos Ativos */}
            <div className="bg-white border border-bhon-border rounded p-4">
              <h3 className="text-xs font-bold text-bhon-text uppercase tracking-wider mb-3">
                Tratamentos Vinculados
              </h3>
              {patientTreatments.length === 0 ? (
                <p className="text-xs text-bhon-muted">Nenhum plano de tratamento cadastrado.</p>
              ) : (
                <div className="space-y-3">
                  {patientTreatments.map((t) => (
                    <div key={t.id} className="p-3 border border-bhon-border rounded bg-slate-50">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-bhon-text">{t.name}</span>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="text-xs text-bhon-muted mt-1">{t.description}</p>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="font-mono-data text-bhon-muted">
                          Progresso: <strong className="text-bhon-text">{t.progressPercent}%</strong>
                        </span>
                        <span className="font-mono-data font-bold text-bhon-text">
                          R$ {t.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Coluna Lateral: Métricas Financeiras */}
          <div className="space-y-3">
            <div className="bg-white border border-bhon-border rounded p-4">
              <h3 className="text-xs font-bold text-bhon-text uppercase tracking-wider mb-3">
                Posição Financeira do Paciente
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between pb-1.5 border-b border-bhon-border">
                  <span className="text-bhon-muted">Total Orçado:</span>
                  <span className="font-mono-data font-bold text-bhon-text">
                    R$ {totalBudgeted.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-bhon-border">
                  <span className="text-bhon-muted">Total Pago:</span>
                  <span className="font-mono-data font-bold text-emerald-700">
                    R$ {totalPaid.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="flex justify-between pt-1">
                  <span className="text-bhon-muted">Saldo Devedor / A Vencer:</span>
                  <span className="font-mono-data font-bold text-amber-700">
                    R$ {totalPending.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABA: HISTÓRICO / LINHA DO TEMPO */}
      {activeTab === 'HISTORICO' && (
        <div className="bg-white border border-bhon-border rounded p-4">
          <h3 className="text-xs font-bold text-bhon-text uppercase tracking-wider mb-4">
            Histórico Cronológico de Atendimentos e Eventos
          </h3>
          <div className="relative pl-6 border-l-2 border-slate-200 space-y-6">
            {patientAppointments.map((apt) => (
              <div key={apt.id} className="relative">
                <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-bhon-teal border-2 border-white" />
                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-data font-bold text-bhon-text">
                      {new Date(apt.scheduledAt).toLocaleDateString('pt-BR')} às {apt.time}
                    </span>
                    <StatusBadge status={apt.status} size="sm" />
                  </div>
                  <p className="font-semibold text-bhon-text mt-1">{apt.procedureName}</p>
                  <p className="text-bhon-muted text-[11px] mt-0.5">
                    {apt.professionalName} • {apt.roomName} {apt.notes ? `• "${apt.notes}"` : ''}
                  </p>
                </div>
              </div>
            ))}

            {patientTimeline.map((ev) => (
              <div key={ev.id} className="relative">
                <div className="absolute -left-[31px] top-0 w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white" />
                <div className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono-data font-bold text-bhon-text">
                      {new Date(ev.createdAt).toLocaleDateString('pt-BR')}
                    </span>
                    <span className="font-mono-data text-[10px] px-1.5 py-0.2 bg-slate-100 rounded text-slate-700">
                      {ev.type}
                    </span>
                  </div>
                  <p className="text-bhon-text mt-1">{ev.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA: TRATAMENTOS */}
      {activeTab === 'TRATAMENTOS' && (
        <div className="bg-white border border-bhon-border rounded p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-bhon-text uppercase tracking-wider">
              Planos e Etapas Clínicas
            </h3>
            <button
              onClick={() => setLocation('/clinic/treatments')}
              className="text-xs text-bhon-teal hover:underline font-semibold"
            >
              Ir para Módulo de Tratamentos →
            </button>
          </div>

          <div className="space-y-4">
            {patientTreatments.map((t) => (
              <div key={t.id} className="border border-bhon-border rounded p-4 bg-slate-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-bold text-sm text-bhon-text">{t.name}</h4>
                    <p className="text-xs text-bhon-muted mt-0.5">{t.description}</p>
                  </div>
                  <StatusBadge status={t.status} />
                </div>

                {t.stages.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-bhon-border space-y-2">
                    <p className="text-[11px] font-bold text-bhon-muted uppercase tracking-wider">
                      Etapas do Plano
                    </p>
                    {t.stages.map((st) => (
                      <div
                        key={st.id}
                        className="p-2.5 bg-white border border-bhon-border rounded flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-mono-data font-bold text-bhon-muted">
                            Sessão {st.stageNumber}:
                          </span>
                          <span className="font-semibold text-bhon-text">{st.title}</span>
                        </div>
                        <StatusBadge status={st.status} size="sm" />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ABA: ORÇAMENTOS */}
      {activeTab === 'ORCAMENTOS' && (
        <div className="bg-white border border-bhon-border rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-bhon-text uppercase tracking-wider">
              Orçamentos Vinculados ao Paciente
            </h3>
            <button
              onClick={() => setLocation('/clinic/budgets')}
              className="text-xs text-bhon-teal hover:underline font-semibold"
            >
              Ver Todos os Orçamentos →
            </button>
          </div>

          {patientBudgets.map((b) => (
            <div key={b.id} className="p-3.5 border border-bhon-border rounded bg-slate-50 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-bhon-text">{b.treatmentTitle}</h4>
                  <p className="text-[11px] text-bhon-muted mt-0.5">
                    Condição: {b.paymentMethod || 'A combinar'}
                  </p>
                </div>
                <div className="text-right">
                  <div className="font-mono-data font-bold text-sm text-bhon-text">
                    R$ {b.finalAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </div>
                  <StatusBadge status={b.status} size="sm" className="mt-1" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ABA: FINANCEIRO */}
      {activeTab === 'FINANCEIRO' && (
        <div className="bg-white border border-bhon-border rounded p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-bhon-text uppercase tracking-wider">
              Contas e Pagamentos do Paciente
            </h3>
            <button
              onClick={() => setLocation('/clinic/finance')}
              className="text-xs text-bhon-teal hover:underline font-semibold"
            >
              Abrir Módulo Financeiro →
            </button>
          </div>

          <table className="bhon-table">
            <thead>
              <tr>
                <th>Referência</th>
                <th>Categoria</th>
                <th>Vencimento</th>
                <th>Valor</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {patientPayments.map((p) => (
                <tr key={p.id}>
                  <td className="font-semibold text-bhon-text">{p.referenceDescription}</td>
                  <td className="text-bhon-muted">{p.category}</td>
                  <td className="font-mono-data">{p.dueDate}</td>
                  <td className="font-mono-data font-bold">
                    R$ {p.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td>
                    <StatusBadge status={p.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ABA: ACOMPANHAMENTOS */}
      {activeTab === 'ACOMPANHAMENTOS' && (
        <div className="bg-white border border-bhon-border rounded p-4 space-y-3">
          <h3 className="text-xs font-bold text-bhon-text uppercase tracking-wider">
            Filas de Acompanhamento (Pós-op, Retorno, Reativação)
          </h3>
          {patientFollowUps.map((f) => (
            <div key={f.id} className="p-3 border border-bhon-border rounded bg-slate-50 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-bhon-text">{f.reason}</span>
                <StatusBadge status={f.status} size="sm" />
              </div>
              <p className="text-[11px] text-bhon-muted mt-1">
                Responsável: <strong>{f.responsibleUserName}</strong> • Próxima Ação: {f.nextAction}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ABA: DOCUMENTOS */}
      {activeTab === 'DOCUMENTOS' && (
        <div className="bg-white border border-bhon-border rounded p-6 text-center text-xs text-bhon-muted">
          <FileText className="w-8 h-8 mx-auto text-slate-400 mb-2" />
          <p className="font-bold text-bhon-text">Repositório de Exames e Radiografias</p>
          <p className="mt-1">Tomografias cone beam, radiografias panorâmicas e termos de consentimento assinados.</p>
        </div>
      )}

      {/* Drawer de Agendamento Rápido Direto do Prontuário */}
      <Drawer
        isOpen={isScheduleOpen}
        onClose={() => setIsScheduleOpen(false)}
        title="Agendar Consulta para Paciente"
        subtitle={`${patient.name} (${patient.recordNumber})`}
      >
        <form onSubmit={handleScheduleSubmit} className="space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-bhon-text mb-1">Procedimento Clínico *</label>
            <input
              type="text"
              value={schedProcedure}
              onChange={(e) => setSchedProcedure(e.target.value)}
              placeholder="Ex: Próxima Etapa de Implante / Prova Protética"
              required
              className="w-full px-2.5 py-2 border border-bhon-border rounded text-bhon-text"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block font-semibold text-bhon-text mb-1">Horário</label>
              <input
                type="time"
                value={schedTime}
                onChange={(e) => setSchedTime(e.target.value)}
                className="w-full px-2.5 py-2 border border-bhon-border rounded font-mono-data text-bhon-text"
              />
            </div>
            <div>
              <label className="block font-semibold text-bhon-text mb-1">Consultório</label>
              <select
                value={schedRoom}
                onChange={(e) => setSchedRoom(e.target.value)}
                className="w-full px-2 py-2 border border-bhon-border rounded bg-white text-bhon-text"
              >
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-bhon-teal hover:bg-bhon-teal-dark text-white font-bold rounded uppercase tracking-wider text-xs transition-colors"
          >
            Confirmar e Inserir na Agenda
          </button>
        </form>
      </Drawer>
    </div>
  );
};
