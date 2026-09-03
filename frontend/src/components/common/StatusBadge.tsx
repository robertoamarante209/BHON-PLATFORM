import React from 'react';

interface StatusBadgeProps {
  status: string;
  className?: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, className = '', size = 'sm' }) => {
  const normalized = status.toUpperCase().replace(/\s+/g, '_');

  let colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status;

  switch (normalized) {
    // Status de Agenda
    case 'CONFIRMADO':
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      label = 'CONFIRMADO';
      break;
    case 'AGUARDANDO_CONFIRMACAO':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
      label = 'AGUARDANDO';
      break;
    case 'NA_RECEPCAO':
      colorClasses = 'bg-blue-50 text-blue-800 border-blue-200 font-semibold';
      label = 'NA RECEPÇÃO';
      break;
    case 'EM_ATENDIMENTO':
      colorClasses = 'bg-teal-50 text-teal-800 border-teal-300 font-bold';
      label = 'EM ATENDIMENTO';
      break;
    case 'CONCLUIDO':
    case 'CONCLUÍDO':
    case 'COMPLETED':
      colorClasses = 'bg-slate-100 text-slate-700 border-slate-300';
      label = 'CONCLUÍDO';
      break;
    case 'ATRASADO':
      colorClasses = 'bg-amber-100 text-amber-900 border-amber-300 font-semibold';
      label = 'ATRASADO';
      break;
    case 'FALTA':
      colorClasses = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      label = 'FALTA';
      break;
    case 'CANCELADO':
    case 'CANCELLED':
      colorClasses = 'bg-slate-100 text-slate-500 border-slate-200 line-through';
      label = 'CANCELADO';
      break;
    case 'ENCAIXE':
      colorClasses = 'bg-purple-50 text-purple-800 border-purple-200 font-medium';
      label = 'ENCAIXE';
      break;

    // Status de Tratamento
    case 'ACTIVE':
    case 'ATIVO':
      colorClasses = 'bg-teal-50 text-teal-800 border-teal-200';
      label = 'ATIVO';
      break;
    case 'RISK_OF_ABANDONMENT':
    case 'RISCO_DE_ABANDONO':
      colorClasses = 'bg-rose-50 text-rose-800 border-rose-200 font-medium';
      label = 'RISCO DE ABANDONO';
      break;
    case 'PAUSED':
    case 'PAUSADO':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
      label = 'PAUSADO';
      break;

    // Status de Orçamento
    case 'ACCEPTED':
    case 'APROVADO':
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold';
      label = 'APROVADO';
      break;
    case 'NEGOTIATING':
    case 'NEGOCIACAO':
    case 'NEGOCIAÇÃO':
      colorClasses = 'bg-blue-50 text-blue-800 border-blue-200';
      label = 'NEGOCIAÇÃO';
      break;
    case 'SENT':
    case 'ENVIADO':
      colorClasses = 'bg-sky-50 text-sky-800 border-sky-200';
      label = 'ENVIADO';
      break;
    case 'DRAFT':
    case 'RASCUNHO':
      colorClasses = 'bg-slate-100 text-slate-600 border-slate-200';
      label = 'RASCUNHO';
      break;
    case 'REJECTED':
    case 'RECUSADO':
      colorClasses = 'bg-rose-50 text-rose-700 border-rose-200';
      label = 'RECUSADO';
      break;
    case 'NO_RESPONSE':
    case 'SEM_RESPOSTA':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
      label = 'SEM RESPOSTA';
      break;

    // Status de Pagamento
    case 'PAGO':
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      label = 'PAGO';
      break;
    case 'PENDENTE':
    case 'PENDING':
      colorClasses = 'bg-amber-50 text-amber-800 border-amber-200';
      label = 'PENDENTE';
      break;

    // Prioridades
    case 'URGENT':
    case 'CRITICAL':
    case 'CRÍTICO':
      colorClasses = 'bg-rose-100 text-rose-800 border-rose-300 font-bold';
      label = 'CRÍTICO';
      break;
    case 'HIGH':
    case 'ALTA':
      colorClasses = 'bg-amber-100 text-amber-800 border-amber-300';
      label = 'ALTA';
      break;
    case 'MEDIUM':
    case 'MEDIA':
    case 'MÉDIA':
      colorClasses = 'bg-slate-100 text-slate-700 border-slate-200';
      label = 'MÉDIA';
      break;

    // Clínicas
    case 'ATIVA':
      colorClasses = 'bg-emerald-50 text-emerald-800 border-emerald-200';
      label = 'ATIVA';
      break;
    case 'TESTE':
      colorClasses = 'bg-blue-50 text-blue-800 border-blue-200';
      label = 'TESTE';
      break;
    case 'PAGAMENTO_PENDENTE':
      colorClasses = 'bg-amber-100 text-amber-800 border-amber-300 font-medium';
      label = 'PAGAMENTO PENDENTE';
      break;
    case 'SUSPENSA':
      colorClasses = 'bg-rose-100 text-rose-800 border-rose-300 font-medium';
      label = 'SUSPENSA';
      break;

    default:
      label = status;
  }

  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center font-mono-data border tracking-wide rounded ${sizeClass} ${colorClasses} ${className}`}
    >
      {label}
    </span>
  );
};
