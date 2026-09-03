import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useOperationalData } from '../../context/OperationalDataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Drawer } from '../../components/common/Drawer';
import { Stethoscope, Search, AlertTriangle, CheckCircle, ArrowRight, Calendar, Plus } from 'lucide-react';
import { Treatment, TreatmentStatus } from '../../types';

export const TreatmentsPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { treatments, patients } = useOperationalData();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedTreatment, setSelectedTreatment] = useState<Treatment | null>(null);

  const filteredTreatments = treatments.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.patientRecordNumber.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-bhon-border gap-3">
        <div>
          <h1 className="text-lg font-bold text-bhon-text uppercase tracking-wide">
            Planos de Tratamento e Continuidade
          </h1>
          <p className="text-xs text-bhon-muted mt-0.5">
            Acompanhamento de etapas terapêuticas, sessões clínicas e prevenção de abandono.
          </p>
        </div>

        <span className="font-mono-data text-xs text-bhon-muted self-start sm:self-auto">
          {treatments.length} tratamentos em curso
        </span>
      </div>

      {/* Barra de Filtros */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 border border-bhon-border rounded">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-bhon-muted absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por tratamento, paciente ou prontuário..."
            className="w-full pl-9 pr-3 py-1.5 border border-bhon-border rounded text-xs text-bhon-text placeholder:text-bhon-muted focus:outline-none focus:border-bhon-teal"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 border border-bhon-border rounded text-xs text-bhon-text bg-white"
          >
            <option value="ALL">Todos os status</option>
            <option value="ACTIVE">Ativo</option>
            <option value="RISK_OF_ABANDONMENT">Risco de Abandono</option>
            <option value="PAUSED">Pausado</option>
            <option value="COMPLETED">Concluído</option>
          </select>
        </div>
      </div>

      {/* Tabela Mandatória do Master Prompt (Seção 18) */}
      <div className="bg-white border border-bhon-border rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="bhon-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Tratamento</th>
                <th>Profissional</th>
                <th>Etapa Atual</th>
                <th>Progresso</th>
                <th>Último Atendimento</th>
                <th>Próxima Etapa</th>
                <th>Status</th>
                <th className="text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {filteredTreatments.map((t) => (
                <tr
                  key={t.id}
                  onClick={() => setSelectedTreatment(t)}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                >
                  <td className="whitespace-nowrap">
                    <p className="font-bold text-bhon-text">{t.patientName}</p>
                    <span className="font-mono-data text-[10px] text-bhon-muted">
                      {t.patientRecordNumber}
                    </span>
                  </td>
                  <td className="font-semibold text-bhon-text max-w-xs truncate" title={t.name}>
                    {t.name}
                  </td>
                  <td className="text-xs text-bhon-muted whitespace-nowrap">
                    {t.responsibleUserName || 'Dr. Roberto Carlos Fagundes'}
                  </td>
                  <td className="text-xs font-mono-data text-bhon-text whitespace-nowrap">
                    {t.currentStageTitle || 'Sessão Inicial'}
                  </td>
                  <td className="whitespace-nowrap font-mono-data text-xs">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${
                            t.status === 'RISK_OF_ABANDONMENT' ? 'bg-rose-500' : 'bg-bhon-teal'
                          }`}
                          style={{ width: `${t.progressPercent}%` }}
                        />
                      </div>
                      <span className="font-bold text-[11px]">{t.progressPercent}%</span>
                    </div>
                  </td>
                  <td className="font-mono-data text-xs text-bhon-muted whitespace-nowrap">
                    {t.lastAppointmentAt
                      ? new Date(t.lastAppointmentAt).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="font-mono-data text-xs text-bhon-text whitespace-nowrap">
                    {t.nextStageDate
                      ? new Date(t.nextStageDate).toLocaleDateString('pt-BR')
                      : (
                        <span className="text-rose-600 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Sem data definida
                        </span>
                      )}
                  </td>
                  <td className="whitespace-nowrap">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTreatment(t);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-bhon-navy bg-slate-100 hover:bg-bhon-navy hover:text-white rounded border border-bhon-border transition-colors"
                    >
                      Dossiê
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer de Detalhamento de Tratamento */}
      <Drawer
        isOpen={!!selectedTreatment}
        onClose={() => setSelectedTreatment(null)}
        title="Dossiê do Plano Terapêutico"
        subtitle={selectedTreatment ? `${selectedTreatment.name} • ${selectedTreatment.patientName}` : ''}
        width="max-w-lg"
      >
        {selectedTreatment && (
          <div className="space-y-4 text-xs">
            {/* Contexto do Paciente e Tratamento */}
            <div className="p-3 bg-slate-50 border border-bhon-border rounded space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Paciente:</span>
                <span
                  onClick={() => {
                    setLocation(`/clinic/patients/${selectedTreatment.patientId}`);
                    setSelectedTreatment(null);
                  }}
                  className="font-bold text-bhon-teal hover:underline cursor-pointer"
                >
                  {selectedTreatment.patientName} ({selectedTreatment.patientRecordNumber}) →
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Profissional Responsável:</span>
                <span className="font-semibold text-bhon-text">{selectedTreatment.responsibleUserName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-bhon-muted">Investimento Total:</span>
                <span className="font-mono-data font-bold text-sm text-bhon-text">
                  R$ {selectedTreatment.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1 border-t border-bhon-border">
                <span className="text-bhon-muted">Status do Tratamento:</span>
                <StatusBadge status={selectedTreatment.status} />
              </div>
            </div>

            {/* Alerta de Risco de Abandono */}
            {selectedTreatment.status === 'RISK_OF_ABANDONMENT' && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                <div>
                  <p className="font-bold">Atenção: Paciente em Risco de Abandono</p>
                  <p className="text-[11px] mt-0.5 leading-snug">
                    Mais de 15 dias sem retorno após a última sessão cirúrgica. Necessita agendamento prioritário da próxima etapa protética.
                  </p>
                </div>
              </div>
            )}

            {/* Etapas Clínicas Cadastradas */}
            <div>
              <p className="font-bold text-bhon-text uppercase tracking-wider text-[11px] mb-2">
                Cronograma de Etapas e Sessões Clínicas
              </p>

              <div className="space-y-2">
                {selectedTreatment.stages.length === 0 ? (
                  <p className="text-bhon-muted p-3 bg-slate-50 rounded border border-bhon-border">
                    Etapas em definição no planejamento digital.
                  </p>
                ) : (
                  selectedTreatment.stages.map((st) => (
                    <div
                      key={st.id}
                      className="p-3 bg-white border border-bhon-border rounded flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-data font-bold text-bhon-muted">
                            Sessão {st.stageNumber}
                          </span>
                          <span className="font-bold text-bhon-text">{st.title}</span>
                        </div>
                        {st.description && (
                          <p className="text-[11px] text-bhon-muted mt-0.5">{st.description}</p>
                        )}
                      </div>
                      <StatusBadge status={st.status} size="sm" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Ação Imediata: Agendar Próxima Consulta */}
            <div className="pt-3 border-t border-bhon-border space-y-2">
              <button
                onClick={() => {
                  setLocation('/clinic/agenda');
                  setSelectedTreatment(null);
                }}
                className="w-full py-2 bg-bhon-navy hover:bg-bhon-navy-hover text-white font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Agendar Próxima Sessão na Agenda</span>
              </button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};
