import React, { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { StatusBadge } from '../../components/common/StatusBadge';
import { listAppointments } from '../../lib/clinic';
import { apiRequest } from '../../lib/api';
import { agendaBriefing, prioritizeRecovery, recoverableQuotes, type RecoveryItem } from '../../lib/overview';
import type { Appointment } from '../../types';

const actionClass = 'inline-flex min-h-11 items-center rounded-lg px-3 py-2 text-sm font-semibold text-bhon-navy hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-bhon-teal focus-visible:ring-offset-2';
const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const priorities = { URGENT: 'Urgente', HIGH: 'Alta', MEDIUM: 'Média', LOW: 'Baixa' };

function PanelError({ message, retry }: { message: string; retry: () => void }) {
  return <div className="rounded-lg border border-rose-200 bg-rose-50 p-4" role="alert">
    <p className="text-sm text-rose-900">{message}</p>
    <button type="button" className={`${actionClass} mt-2`} onClick={retry}>Tentar novamente</button>
  </div>;
}

export const OverviewPage: React.FC = () => {
  const [now, setNow] = useState(() => new Date());
  const date = new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [recovery, setRecovery] = useState<RecoveryItem[]>([]);
  const [agendaLoading, setAgendaLoading] = useState(true);
  const [recoveryLoading, setRecoveryLoading] = useState(true);
  const [agendaError, setAgendaError] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [agendaReload, setAgendaReload] = useState(0);
  const [recoveryReload, setRecoveryReload] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setAgendaLoading(true);
    setAgendaError('');
    void listAppointments(date, controller.signal).then(items => {
      if (!controller.signal.aborted) setAppointments(items);
    }).catch(() => {
      if (!controller.signal.aborted) setAgendaError('Não foi possível carregar a agenda de hoje.');
    }).finally(() => { if (!controller.signal.aborted) setAgendaLoading(false); });
    return () => controller.abort();
  }, [date, agendaReload]);
  useEffect(() => {
    const controller = new AbortController();
    setRecoveryLoading(true);
    setRecoveryError('');
    void apiRequest<{ items: RecoveryItem[] }>('/api/recovery', { signal: controller.signal }).then(data => {
      if (!controller.signal.aborted) setRecovery(data.items);
    }).catch(() => {
      if (!controller.signal.aborted) setRecoveryError('Não foi possível carregar as oportunidades de recuperação.');
    }).finally(() => { if (!controller.signal.aborted) setRecoveryLoading(false); });
    return () => controller.abort();
  }, [date, recoveryReload]);

  const agenda = agendaBriefing(appointments, now);
  const orderedRecovery = prioritizeRecovery(recovery);
  const potential = recoverableQuotes(recovery);

  return <div className="mx-auto flex max-w-7xl min-w-0 flex-col gap-8 text-bhon-text">
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div><p className="text-sm capitalize text-bhon-muted">{now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        <h1 className="mt-2 font-display text-3xl font-semibold tracking-tight">Hoje na clínica</h1>
        <p className="mt-2 text-sm leading-relaxed text-bhon-muted">Acompanhe os atendimentos e organize as próximas ações da equipe.</p></div>
      <Link href="/clinic/agenda" className={`${actionClass} border border-bhon-border bg-bhon-surface`}>Abrir agenda →</Link>
    </header>
    <section aria-labelledby="today-agenda" aria-busy={agendaLoading} className="min-w-0 rounded-xl border border-bhon-border bg-bhon-surface">
      <div className="border-b border-bhon-border p-4 sm:p-6">
        <h2 id="today-agenda" className="font-display text-xl font-semibold">Agenda de hoje</h2>
        {!agendaLoading && !agendaError && <>
          <p className="mt-2 text-sm text-bhon-muted">{agenda.appointments.length} atendimentos · {agenda.patientCount} pacientes distintos</p>
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm"><span>{agenda.reception} na recepção</span><span>{agenda.inProgress} em atendimento</span><span>{agenda.pending.length} aguardando confirmação</span><span>{agenda.missed.length} faltas registradas</span></div>
          <p className="mt-4 break-words text-sm leading-relaxed text-bhon-muted">{agenda.next ? `Próximo horário: ${agenda.next.time} · ${agenda.next.patientName} · ${agenda.next.professionalName}` : 'Nenhum próximo horário pendente a partir de agora.'}</p>
        </>}
      </div>
      {agendaLoading ? <p role="status" className="p-6 text-sm text-bhon-muted">Carregando os atendimentos de hoje…</p>
        : agendaError ? <div className="p-4 sm:p-6"><PanelError message={agendaError} retry={() => setAgendaReload(value => value + 1)} /></div>
        : agenda.appointments.length === 0 ? <div className="p-6"><p className="text-sm text-bhon-muted">Nenhum atendimento agendado para hoje.</p><Link href="/clinic/agenda" className={`${actionClass} mt-3`}>Organizar agenda</Link></div>
        : <ol className="divide-y divide-bhon-border">{agenda.appointments.map(appointment => <li key={appointment.id} className="grid min-w-0 gap-3 p-4 sm:grid-cols-[5rem_minmax(0,1fr)_auto] sm:gap-4 sm:p-6">
          <div><time dateTime={appointment.scheduledAt} className="text-lg font-semibold tabular-nums">{appointment.time}</time>{appointment.delayMinutes > 0 && <p className="mt-1 text-sm text-amber-800">+{appointment.delayMinutes} min</p>}</div>
          <div className="min-w-0 break-words"><p className="font-semibold">{appointment.patientName}</p><p className="mt-1 text-sm leading-relaxed text-bhon-muted">{appointment.procedureName}</p><p className="mt-1 text-sm leading-relaxed text-bhon-muted">{appointment.professionalName} · {appointment.roomName}</p>
            <Link href={`/clinic/patients/${encodeURIComponent(appointment.patientId)}`} className={`${actionClass} -ml-3 mt-1`}>Abrir prontuário<span className="sr-only"> de {appointment.patientName}</span></Link></div>
          <div className="self-start"><StatusBadge status={appointment.status} /></div>
        </li>)}</ol>}
    </section>
    <section aria-labelledby="today-recovery" aria-busy={recoveryLoading} className="min-w-0">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 id="today-recovery" className="font-display text-xl font-semibold">Recuperar e dar continuidade</h2><p className="mt-2 text-sm leading-relaxed text-bhon-muted">Prioridade por urgência, prazo, valor conhecido e tempo sem avanço.</p></div><Link href="/clinic/follow-ups" className={actionClass}>Abrir acompanhamentos →</Link></div>
      {recoveryLoading ? <p role="status" className="py-6 text-sm text-bhon-muted">Carregando ações de recuperação…</p>
        : recoveryError ? <div className="mt-4"><PanelError message={recoveryError} retry={() => setRecoveryReload(value => value + 1)} /></div>
        : <><div className="my-5 border-l-2 border-bhon-teal py-1 pl-4"><p className="text-sm text-bhon-muted">Potencial dos orçamentos retornados</p><p className="mt-1 font-display text-2xl font-semibold tabular-nums">{potential.count > 0 && potential.unknown === potential.count ? 'Valor não informado' : currency.format(potential.value)}</p>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-bhon-muted">Soma dos valores conhecidos de {potential.count} orçamentos únicos nesta consulta. Não representa receita garantida nem inclui tratamentos ou pagamentos. {potential.unknown > 0 ? `${potential.unknown} sem valor informado. ` : ''}A consulta retorna até 50 acompanhamentos e 25 registros por outra origem; não é o total da clínica.</p></div>
          {orderedRecovery.length === 0 ? <p className="rounded-xl border border-bhon-border bg-bhon-surface p-6 text-sm text-bhon-muted">Nenhuma ação de recuperação retornada nesta consulta. Continue acompanhando os pacientes pela agenda.</p>
            : <ol className="divide-y divide-bhon-border rounded-xl border border-bhon-border bg-bhon-surface">{orderedRecovery.slice(0, 8).map(item => <li key={item.id} className="grid min-w-0 gap-4 p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_16rem]">
              <div className="min-w-0 break-words"><p className="text-sm font-semibold text-bhon-muted">Prioridade {priorities[item.priority].toLowerCase()} · {item.ageDays} dias</p><h3 className="mt-2 font-semibold">{item.patient.name} · {item.signal}</h3><p className="mt-2 text-sm leading-relaxed text-bhon-muted">{item.reason}</p><p className="mt-2 text-sm text-bhon-muted">{item.responsible?.name || 'Sem responsável definido'} · {item.deadline ? `Prazo: ${new Date(item.deadline).toLocaleDateString('pt-BR')}` : 'Sem prazo definido'}</p></div>
              <div className="min-w-0 break-words"><p className="text-sm leading-relaxed">{item.nextAction}</p><Link href={item.href} className={`${actionClass} -ml-3 mt-2`}>Abrir acompanhamento<span className="sr-only"> de {item.patient.name}: {item.signal}</span> →</Link></div>
            </li>)}</ol>}
          {orderedRecovery.length > 8 && <p className="mt-3 text-sm text-bhon-muted">Exibindo as 8 primeiras de {orderedRecovery.length} ações retornadas. Consulte os acompanhamentos e os módulos de origem para continuar.</p>}
        </>}
    </section>
  </div>;
};
