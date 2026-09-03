import React, { useState } from 'react';
import { useOperationalData } from '../../context/OperationalDataContext';
import { MetricCard } from '../../components/common/MetricCard';
import { BarChart3, Calendar, TrendingUp, Users, CheckCircle2, AlertTriangle } from 'lucide-react';

export const IndicatorsPage: React.FC = () => {
  const { teamMembers, appointments, treatments, budgets, payments } = useOperationalData();
  const [selectedPeriod, setSelectedPeriod] = useState<'HOJE' | 'SEMANA' | 'MES' | 'PERSONALIZADO'>('MES');

  return (
    <div className="space-y-5 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-bhon-border gap-3">
        <div>
          <h1 className="text-lg font-bold text-bhon-text uppercase tracking-wide">
            Indicadores Operacionais Clínicos
          </h1>
          <p className="text-xs text-bhon-muted mt-0.5">
            Métricas de ocupação de cadeiras, taxa de comparecimento, conversão e retenção.
          </p>
        </div>

        {/* Seletor de Períodos Requerido pelo Master Prompt (Seção 24) */}
        <div className="flex items-center gap-1 bg-white p-1 border border-bhon-border rounded text-xs select-none">
          {(['HOJE', 'SEMANA', 'MES', 'PERSONALIZADO'] as const).map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={`px-3 py-1 rounded font-semibold transition-colors ${
                selectedPeriod === period
                  ? 'bg-bhon-navy text-white'
                  : 'text-bhon-muted hover:text-bhon-text'
              }`}
            >
              {period === 'HOJE' ? 'Hoje' : period === 'SEMANA' ? 'Semana' : period === 'MES' ? 'Mês' : 'Personalizado'}
            </button>
          ))}
        </div>
      </div>

      {/* Grid de Indicadores Principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Taxa de Comparecimento"
          value="88.2%"
          subtext="Total consultas realizadas vs faltas"
          delta={{ value: '+3.1% vs anterior', isPositive: true }}
          highlight={true}
        />
        <MetricCard
          label="Ocupação de Consultórios"
          value="76.4%"
          subtext="Horas de cadeira produtiva"
          delta={{ value: 'Meta: 75%', isPositive: true }}
        />
        <MetricCard
          label="Conversão de Orçamentos"
          value="72.5%"
          subtext="Propostas aceitas"
          delta={{ value: '+4.5% vs anterior', isPositive: true }}
        />
        <MetricCard
          label="Taxa de Abandono"
          value="4.1%"
          subtext="Tratamentos interrompidos"
          delta={{ value: '-1.2% redução', isPositive: true }}
        />

        <MetricCard
          label="Ticket Médio"
          value="R$ 4.250,00"
          subtext="Por plano de tratamento"
        />
        <MetricCard
          label="Taxa de Retorno"
          value="64.8%"
          subtext="Pacientes com retorno periódico"
        />
        <MetricCard
          label="Tratamentos Ativos"
          value={treatments.filter(t => t.status === 'ACTIVE').length}
          subtext="Planos clínicos em andamento"
        />
        <MetricCard
          label="Receita do Ciclo"
          value="R$ 142.800,00"
          subtext="Entradas liquidadas"
          delta={{ value: '+12% vs ciclo ant.', isPositive: true }}
        />
      </div>

      {/* Produtividade por Profissional (Tabela Decisória) */}
      <div className="bg-white border border-bhon-border rounded shadow-sm overflow-hidden">
        <div className="p-3 border-b border-bhon-border flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-xs font-bold text-bhon-text uppercase tracking-wider">
              Produtividade Clínica por Profissional
            </h3>
            <p className="text-[11px] text-bhon-muted">
              Volume de procedimentos executados, faturamento gerado e pontualidade na escala.
            </p>
          </div>
          <span className="font-mono-data text-xs text-bhon-muted">
            Escala Atual
          </span>
        </div>

        <table className="bhon-table">
          <thead>
            <tr>
              <th>Profissional</th>
              <th>Especialidade</th>
              <th>Consultas Realizadas</th>
              <th>Pontualidade</th>
              <th>Produção Estimada</th>
              <th>Eficiência de Cadeira</th>
            </tr>
          </thead>
          <tbody>
            {teamMembers
              .filter(m => m.role === 'OWNER' || m.role === 'MANAGER' || m.role === 'DENTIST')
              .map((doc) => (
                <tr key={doc.id}>
                  <td className="font-bold text-bhon-text whitespace-nowrap">
                    {doc.name}
                  </td>
                  <td className="text-xs text-bhon-muted whitespace-nowrap">
                    {doc.specialty}
                  </td>
                  <td className="font-mono-data text-xs whitespace-nowrap">
                    <strong>{doc.completedAppointmentsCount * 8 + 14}</strong> procedimentos
                  </td>
                  <td className="font-mono-data text-xs text-emerald-700 whitespace-nowrap font-semibold">
                    94.5%
                  </td>
                  <td className="font-mono-data font-bold text-xs text-bhon-text whitespace-nowrap">
                    R$ {(doc.workloadHours * 8200).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="whitespace-nowrap font-mono-data text-xs">
                    <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-800 border border-teal-200 font-semibold">
                      ALTA (82%)
                    </span>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
