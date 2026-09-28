import React, { useMemo, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { ArrowRight, CalendarDays, Check, Clock3, MoreHorizontal, Sparkles, Users } from 'lucide-react';
import { Drawer } from '../../components/common/Drawer';
import { StatusBadge } from '../../components/common/StatusBadge';
import { RecoveryQueue } from '../../components/recovery/RecoveryQueue';
import type { Appointment, AppointmentStatus } from '../../types';
import { appointmentTransitions, updateAppointmentStatus } from '../../lib/clinic';
import { useDailyAppointments } from '../../context/DailyAppointmentsContext';

const actionable: AppointmentStatus[] = ['AGUARDANDO_CONFIRMACAO', 'CONFIRMADO', 'NA_RECEPCAO', 'ENCAIXE', 'EM_ATENDIMENTO'];

export const OverviewPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const daily = useDailyAppointments();
  const appointments = daily.appointments || [];
  const [selected, setSelected] = useState<Appointment | null>(null);
  const loading = daily.loading;
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const loadFailed = !!daily.error;

  const summary = useMemo(() => ({
    total: appointments.length,
    waiting: appointments.filter((item) => ['NA_RECEPCAO', 'AGUARDANDO_CONFIRMACAO'].includes(item.status)).length,
    inProgress: appointments.filter((item) => item.status === 'EM_ATENDIMENTO').length,
    completed: appointments.filter((item) => item.status === 'CONCLUIDO').length,
  }), [appointments]);
  const nextAppointments = appointments.filter((item) => actionable.includes(item.status)).slice(0, 7);
  const confirmationQueue = appointments.filter((item) => item.status === 'AGUARDANDO_CONFIRMACAO');
  const nextPriority = confirmationQueue[0] || nextAppointments[0] || null;

  const changeStatus = async (status: AppointmentStatus) => {
    if (!selected || actionLoading || !appointmentTransitions[selected.status].includes(status)) return;
    const appointmentId = selected.id;
    setActionLoading(true);
    setError('');
    try {
      await updateAppointmentStatus(appointmentId, status);
      setSelected((current) => current?.id === appointmentId ? null : current);
      await daily.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível atualizar o atendimento.');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-[1320px] space-y-5" aria-label="Visão Geral">
      <header className="flex flex-col gap-4 border-b border-bhon-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 className="font-display text-3xl text-bhon-navy sm:text-4xl">Sua operação de hoje, em um só lugar.</h1><p className="mt-2 max-w-xl text-sm text-bhon-muted">Veja quem chega agora, o que precisa de atenção e siga o atendimento sem perder contexto.</p></div>
        <Link href="/clinic/agenda" className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-bhon-navy px-5 text-xs font-semibold text-white">Abrir agenda <ArrowRight className="h-4 w-4 text-bhon-teal" aria-hidden="true" /></Link>
      </header>

      {error || daily.error ? <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs text-rose-800"><span>{error || daily.error}</span>{loadFailed ? <button type="button" onClick={() => void daily.refresh()} className="font-semibold underline underline-offset-2">Tentar novamente</button> : null}</div> : null}

      {!loadFailed ? <section aria-label="Resumo do dia" className="flex gap-6 overflow-x-auto rounded-2xl border border-bhon-border bg-white px-5 py-4 shadow-[0_8px_28px_rgba(31,49,60,0.045)] sm:gap-10">
        {[
          { label: 'Agendados', value: summary.total, icon: CalendarDays }, { label: 'Aguardando', value: summary.waiting, icon: Clock3 },
          { label: 'Em atendimento', value: summary.inProgress, icon: Users }, { label: 'Concluídos', value: summary.completed, icon: Check },
        ].map(({ label, value, icon: Icon }) => <div key={label} className="flex min-w-max items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-bhon-teal-subtle text-bhon-teal-dark"><Icon className="h-4 w-4" aria-hidden="true" /></span><div><p className="font-mono-data text-lg font-semibold text-bhon-navy">{value}</p><p className="text-[10px] font-medium text-bhon-muted">{label}</p></div></div>)}
      </section> : null}

      {!loadFailed ? <section aria-labelledby="secretary-title" className="overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-r from-bhon-teal-subtle via-white to-white shadow-[0_8px_28px_rgba(31,49,60,0.045)]">
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bhon-teal text-white shadow-sm"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <p className="bhon-eyebrow text-bhon-teal-dark">Secretária Sarah</p>
              <h2 id="secretary-title" className="mt-1 text-base font-bold text-bhon-navy">{confirmationQueue.length > 0 ? `${confirmationQueue.length} confirmação${confirmationQueue.length === 1 ? '' : 'ões'} precisa${confirmationQueue.length === 1 ? '' : 'm'} de atenção` : nextPriority ? 'O próximo atendimento está organizado' : 'Sua agenda está em ordem'}</h2>
              <p className="mt-1 max-w-2xl text-xs leading-5 text-bhon-muted">{confirmationQueue.length > 0 ? 'Revise a confirmação antes de acionar a comunicação com o paciente.' : nextPriority ? `${nextPriority.patientName} é a próxima pessoa na jornada de hoje.` : 'Quando houver uma confirmação, retorno ou atendimento prioritário, ele aparecerá aqui.'}</p>
            </div>
          </div>
          {nextPriority ? <button type="button" onClick={() => setSelected(nextPriority)} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-bhon-navy px-4 text-xs font-semibold text-white transition-colors hover:bg-bhon-navy-hover">{confirmationQueue.length > 0 ? 'Revisar confirmação' : 'Abrir próximo atendimento'} <ArrowRight className="h-3.5 w-3.5 text-bhon-teal" aria-hidden="true" /></button> : <Link href="/clinic/agenda" className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-bhon-border bg-white px-4 text-xs font-semibold text-bhon-navy hover:border-bhon-teal">Abrir agenda <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></Link>}
        </div>
        <p className="border-t border-teal-100/80 bg-white/70 px-5 py-2 text-[11px] text-bhon-muted">Sugestões baseadas na agenda atual. Nenhuma mensagem ou mudança é executada sem uma ação da equipe.</p>
      </section> : null}

      <div className="grid gap-5 2xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,.75fr)]">
        <section aria-labelledby="next-title" className="bhon-panel overflow-hidden rounded-2xl">
          <div className="flex items-center justify-between border-b border-bhon-border px-5 py-4"><div><p className="bhon-eyebrow">Fluxo de atendimento</p><h2 id="next-title" className="mt-1 font-display text-xl text-bhon-navy">Próximos atendimentos</h2></div><span className="font-mono-data text-[10px] text-bhon-muted">{nextAppointments.length} em andamento</span></div>
          <div className="divide-y divide-bhon-border">
            {loading ? <p className="p-8 text-center text-sm text-bhon-muted">Organizando o dia…</p> : null}
            {!loading && !loadFailed && nextAppointments.length === 0 ? <div className="p-8 text-center"><p className="font-medium text-bhon-text">Nenhuma pendência agora.</p><p className="mt-1 text-xs text-bhon-muted">Os próximos atendimentos aparecerão nesta lista.</p></div> : null}
            {nextAppointments.map((appointment) => <article key={appointment.id} className="grid grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3.5 sm:grid-cols-[64px_minmax(0,1fr)_150px_auto] sm:px-5"><time className="font-mono-data text-sm font-semibold text-bhon-navy">{appointment.time}</time><div className="min-w-0"><p className="truncate text-sm font-semibold text-bhon-text">{appointment.patientName}</p><p className="mt-0.5 truncate text-[11px] text-bhon-muted">{appointment.procedureName} · {appointment.professionalName}</p></div><div className="hidden sm:block"><StatusBadge status={appointment.status} size="sm" /></div><button type="button" onClick={() => setSelected(appointment)} aria-label={`Abrir atendimento de ${appointment.patientName}`} className="flex h-10 w-10 items-center justify-center rounded-full text-bhon-muted hover:bg-bhon-bg hover:text-bhon-navy"><MoreHorizontal className="h-5 w-5" aria-hidden="true" /></button></article>)}
          </div>
        </section>
        <aside className="min-w-0"><RecoveryQueue onNavigate={setLocation} /></aside>
      </div>

      <Drawer isOpen={!!selected} onClose={() => setSelected(null)} title="Atendimento" subtitle={selected ? `${selected.time} · ${selected.patientName}` : ''}>
        {selected ? <div className="space-y-5"><div className="rounded-2xl bg-bhon-bg p-4"><p className="text-sm font-semibold text-bhon-text">{selected.procedureName}</p><p className="mt-1 text-xs text-bhon-muted">{selected.professionalName} · {selected.roomName}</p><div className="mt-3"><StatusBadge status={selected.status} /></div></div><div className="grid gap-2">{([['NA_RECEPCAO', 'Confirmar chegada'], ['EM_ATENDIMENTO', 'Iniciar atendimento'], ['CONCLUIDO', 'Concluir atendimento'], ['FALTA', 'Registrar falta']] as [AppointmentStatus, string][]).map(([status, label]) => <button key={status} type="button" disabled={actionLoading || !appointmentTransitions[selected.status].includes(status)} onClick={() => void changeStatus(status)} className="min-h-11 rounded-xl border border-bhon-border px-4 text-left text-sm font-semibold text-bhon-text transition-colors hover:border-bhon-teal hover:bg-bhon-teal-subtle disabled:cursor-not-allowed disabled:opacity-35">{label}</button>)}</div><button type="button" onClick={() => { const patientId = selected.patientId; setSelected(null); setLocation(`/clinic/patients/${patientId}`); }} className="text-xs font-semibold text-bhon-teal-dark">Abrir perfil do paciente →</button></div> : null}
      </Drawer>
    </main>
  );
};
