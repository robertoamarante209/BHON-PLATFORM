import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useOperationalData } from '../../context/OperationalDataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { Target, Search, Clock, ArrowRight, DollarSign, AlertTriangle } from 'lucide-react';
import { Opportunity, OpportunityStatus } from '../../types';

export const OpportunitiesPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { opportunities, advanceOpportunityStage } = useOperationalData();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('ALL');

  const stages: { code: OpportunityStatus; label: string }[] = [
    { code: 'NEW_CONTACT', label: 'Novo Contato' },
    { code: 'TRIAGEM', label: 'Triagem' },
    { code: 'AVALIACAO', label: 'Avaliação' },
    { code: 'PLANO_APRESENTADO', label: 'Plano Apresentado' },
    { code: 'ORCAMENTO', label: 'Orçamento' },
    { code: 'NEGOCIACAO', label: 'Negociação' },
    { code: 'CONVERTIDO', label: 'Convertido' },
    { code: 'PERDIDO', label: 'Perdido' },
  ];

  const filteredOpportunities = opportunities.filter((opp) => {
    const matchesSearch =
      opp.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (opp.treatmentTitle && opp.treatmentTitle.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStage = selectedStage === 'ALL' || opp.status === selectedStage;
    return matchesSearch && matchesStage;
  });

  // Total potencial em negociação ativa
  const activePotential = opportunities
    .filter((o) => o.status !== 'CONVERTIDO' && o.status !== 'PERDIDO')
    .reduce((acc, o) => acc + (o.potentialValue || 0), 0);

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-bhon-border gap-3">
        <div>
          <h1 className="text-lg font-bold text-bhon-text uppercase tracking-wide">
            Funil de Oportunidades Clínicas
          </h1>
          <p className="text-xs text-bhon-muted mt-0.5">
            Gestão ativa de conversão terapêutica, dias de inatividade e valores potenciais.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-50 border border-bhon-border rounded text-right">
            <span className="text-[10px] text-bhon-muted uppercase block font-bold">Total em Negociação</span>
            <span className="font-mono-data font-bold text-sm text-bhon-teal-dark">
              R$ {activePotential.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>

      {/* Seletor de Estágios do Funil (8 Estágios do Master Prompt) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 select-none">
        <button
          onClick={() => setSelectedStage('ALL')}
          className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-colors ${
            selectedStage === 'ALL'
              ? 'bg-bhon-navy text-white'
              : 'bg-white border border-bhon-border text-bhon-muted hover:text-bhon-text'
          }`}
        >
          Todos ({opportunities.length})
        </button>

        {stages.map((st) => {
          const count = opportunities.filter((o) => o.status === st.code).length;
          const isSelected = selectedStage === st.code;

          return (
            <button
              key={st.code}
              onClick={() => setSelectedStage(st.code)}
              className={`px-3 py-1.5 rounded text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                isSelected
                  ? 'bg-bhon-teal text-white'
                  : 'bg-white border border-bhon-border text-bhon-muted hover:text-bhon-text'
              }`}
            >
              <span>{st.label}</span>
              <span className="font-mono-data text-[10px] opacity-80">({count})</span>
            </button>
          );
        })}
      </div>

      {/* Tabela de Oportunidades com Campos Requeridos */}
      <div className="bg-white border border-bhon-border rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="bhon-table">
            <thead>
              <tr>
                <th>Paciente</th>
                <th>Origem</th>
                <th>Tratamento Previsto</th>
                <th>Valor Potencial</th>
                <th>Responsável</th>
                <th>Último Contato</th>
                <th>Dias Inativo</th>
                <th>Próximo Passo</th>
                <th>Estágio Atual</th>
                <th className="text-right">Mover Estágio</th>
              </tr>
            </thead>
            <tbody>
              {filteredOpportunities.map((opp) => (
                <tr key={opp.id} className="hover:bg-slate-50 transition-colors">
                  <td className="font-bold text-bhon-text whitespace-nowrap">
                    <span
                      onClick={() => setLocation(`/clinic/patients/${opp.patientId}`)}
                      className="hover:underline hover:text-bhon-teal cursor-pointer"
                    >
                      {opp.patientName}
                    </span>
                    {opp.patientPhone && (
                      <span className="block font-mono-data text-[10px] text-bhon-muted">
                        {opp.patientPhone}
                      </span>
                    )}
                  </td>
                  <td className="text-xs text-bhon-muted whitespace-nowrap">
                    {opp.source || 'Indicação'}
                  </td>
                  <td className="text-xs font-semibold text-bhon-text max-w-xs truncate" title={opp.treatmentTitle}>
                    {opp.treatmentTitle || 'Avaliação Geral'}
                  </td>
                  <td className="font-mono-data font-bold text-xs text-bhon-text whitespace-nowrap">
                    {opp.potentialValue
                      ? `R$ ${opp.potentialValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
                      : 'Em dimensionamento'}
                  </td>
                  <td className="text-xs text-bhon-muted whitespace-nowrap">
                    {opp.assignedToName || 'Equipe Geral'}
                  </td>
                  <td className="font-mono-data text-xs text-bhon-muted whitespace-nowrap">
                    {opp.lastContactAt
                      ? new Date(opp.lastContactAt).toLocaleDateString('pt-BR')
                      : '—'}
                  </td>
                  <td className="whitespace-nowrap font-mono-data text-xs">
                    {opp.daysInactive > 5 ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 font-bold text-[11px] inline-flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {opp.daysInactive} dias
                      </span>
                    ) : (
                      <span className="text-slate-600">{opp.daysInactive} dias</span>
                    )}
                  </td>
                  <td className="text-xs text-bhon-text max-w-xs truncate font-medium" title={opp.nextStep}>
                    {opp.nextStep || 'Aguardando contato'}
                  </td>
                  <td className="whitespace-nowrap">
                    <span className="font-mono-data text-[11px] px-2 py-0.5 rounded border bg-slate-100 border-slate-200 text-slate-800 font-semibold">
                      {opp.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <select
                      value={opp.status}
                      onChange={(e) => advanceOpportunityStage(opp.id, e.target.value as any)}
                      className="px-2 py-1 border border-bhon-border rounded text-[11px] text-bhon-text bg-white cursor-pointer focus:outline-none focus:border-bhon-teal"
                    >
                      {stages.map((st) => (
                        <option key={st.code} value={st.code}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
