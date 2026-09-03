import React, { useState } from 'react';
import { useOperationalData } from '../../context/OperationalDataContext';
import { StatusBadge } from '../../components/common/StatusBadge';
import { MetricCard } from '../../components/common/MetricCard';
import { UserCheck, Clock, Stethoscope, Phone, Shield } from 'lucide-react';
import { TeamMember } from '../../types';

export const TeamPage: React.FC = () => {
  const { teamMembers, appointments } = useOperationalData();

  // Atendimentos em curso agora
  const inAttendance = teamMembers.filter((m) => m.status === 'EM_ATENDIMENTO').length;
  const availableCount = teamMembers.filter((m) => m.status === 'DISPONIVEL' || m.status === 'ATIVO').length;

  return (
    <div className="space-y-4 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-bhon-border gap-3">
        <div>
          <h1 className="text-lg font-bold text-bhon-text uppercase tracking-wide">
            Equipe Clínica e Operacional
          </h1>
          <p className="text-xs text-bhon-muted mt-0.5">
            Escala diária, ocupação de consultórios, carga horária e status em tempo real.
          </p>
        </div>

        <span className="font-mono-data text-xs text-bhon-muted self-start sm:self-auto">
          {teamMembers.length} profissionais ativos
        </span>
      </div>

      {/* Indicadores da Equipe */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <MetricCard
          label="Em Atendimento Agora"
          value={inAttendance}
          subtext="Consultórios ocupados"
          highlight={true}
        />
        <MetricCard
          label="Disponíveis na Clínica"
          value={availableCount}
          subtext="Prontos para acolhimento"
        />
        <MetricCard
          label="Atendimentos do Dia"
          value={appointments.length}
          subtext="Distribuídos na escala"
        />
        <MetricCard
          label="Carga Horária Média"
          value="7.8h"
          subtext="Por profissional / dia"
        />
      </div>

      {/* Tabela Mandatória do Master Prompt:
          Nome, Função, Especialidade, Agenda de hoje, Atendimentos, Carga, Consultório, Status */}
      <div className="bg-white border border-bhon-border rounded shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="bhon-table">
            <thead>
              <tr>
                <th>Profissional</th>
                <th>Função / Papel</th>
                <th>Especialidade / Registro</th>
                <th>Agenda de Hoje</th>
                <th>Concluídos</th>
                <th>Carga Diária</th>
                <th>Consultório Atual</th>
                <th>Status Operacional</th>
              </tr>
            </thead>
            <tbody>
              {teamMembers.map((member) => (
                <tr key={member.id} className="hover:bg-slate-50 transition-colors">
                  <td className="whitespace-nowrap">
                    <p className="font-bold text-bhon-text">{member.name}</p>
                    {member.phone && (
                      <span className="font-mono-data text-[10px] text-bhon-muted">
                        {member.phone}
                      </span>
                    )}
                  </td>
                  <td className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                    {member.roleLabel}
                  </td>
                  <td className="text-xs text-bhon-muted whitespace-nowrap">
                    <p>{member.specialty || 'Administração Clínica'}</p>
                    {member.cro && (
                      <span className="font-mono-data text-[10px] text-bhon-teal-dark font-semibold">
                        {member.cro}
                      </span>
                    )}
                  </td>
                  <td className="font-mono-data text-xs text-bhon-text whitespace-nowrap">
                    <strong>{member.todayAppointmentsCount}</strong> consultas
                  </td>
                  <td className="font-mono-data text-xs text-emerald-700 whitespace-nowrap font-semibold">
                    {member.completedAppointmentsCount} finalizadas
                  </td>
                  <td className="font-mono-data text-xs text-bhon-muted whitespace-nowrap">
                    {member.workloadHours}h / dia
                  </td>
                  <td className="font-mono-data text-xs font-semibold text-bhon-text whitespace-nowrap">
                    {member.currentRoomName || '—'}
                  </td>
                  <td className="whitespace-nowrap">
                    <span
                      className={`font-mono-data text-[10px] px-2 py-0.5 rounded border font-semibold ${
                        member.status === 'EM_ATENDIMENTO'
                          ? 'bg-teal-50 text-teal-800 border-teal-300'
                          : member.status === 'DISPONIVEL'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : member.status === 'PAUSA'
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}
                    >
                      {member.status.replace('_', ' ')}
                    </span>
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
