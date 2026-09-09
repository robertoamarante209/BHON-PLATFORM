import React, { useEffect, useState } from 'react';
import { BarChart3, CalendarDays, Clock3, Loader2, RefreshCw, Users } from 'lucide-react';
import { MetricCard } from '../../components/common/MetricCard';
import { SectionState } from '../../components/common/SectionState';
import { getIndicators, type ClinicIndicators, type IndicatorPeriod } from '../../lib/clinic';

const periods: Array<{ value: IndicatorPeriod; label: string }> = [
  { value: 'TODAY', label: 'Hoje' },
  { value: 'WEEK', label: 'Semana' },
  { value: 'MONTH', label: 'Mês' },
];
const percentFormatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 });
const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function percent(value: number | null) {
  return value == null ? '—' : `${percentFormatter.format(value)}%`;
}

function duration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  return rest ? `${hours}h ${rest}min` : `${hours}h`;
}

export const IndicatorsPage: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<IndicatorPeriod>('MONTH');
  const [data, setData] = useState<ClinicIndicators | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    getIndicators(selectedPeriod, controller.signal)
      .then(setData)
      .catch((loadError) => {
        if ((loadError as Error).name !== 'AbortError') setError((loadError as Error).message || 'Não foi possível carregar os indicadores.');
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [reloadKey, selectedPeriod]);

  const metricHint = (value: number | null, fallback: string) => value == null ? 'Sem base suficiente' : fallback;

  return (
    <div className="page-enter mx-auto max-w-7xl space-y-5">
      <header className="flex flex-col justify-between gap-4 border-b border-bhon-border pb-4 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.22em] text-bhon-gold">Leitura Operacional</p>
          <h1 className="text-balance font-display text-2xl text-bhon-navy sm:text-3xl">Indicadores clínicos</h1>
          <p className="mt-1 max-w-2xl text-pretty text-sm text-bhon-muted">Métricas calculadas exclusivamente com registros persistidos da clínica.</p>
        </div>
        <div className="flex w-full rounded-xl border border-bhon-border bg-white p-1 shadow-sm sm:w-auto" aria-label="Período dos indicadores">
          {periods.map((period) => (
            <button key={period.value} type="button" aria-pressed={selectedPeriod === period.value} onClick={() => setSelectedPeriod(period.value)} className={`min-h-10 flex-1 rounded-lg px-4 text-xs font-bold transition-[background-color,color,transform] duration-200 active:scale-[0.98] sm:flex-none ${selectedPeriod === period.value ? 'bg-bhon-navy text-white shadow-sm' : 'text-bhon-muted hover:bg-bhon-ivory hover:text-bhon-navy focus-visible:ring-2 focus-visible:ring-bhon-teal'}`}>
              {period.label}
            </button>
          ))}
        </div>
      </header>

      {error ? <div role="alert" className="flex flex-col items-start justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900 sm:flex-row sm:items-center"><span>{error}</span><button type="button" onClick={() => setReloadKey((value) => value + 1)} className="inline-flex min-h-10 items-center gap-2 rounded-lg px-3 font-bold text-rose-900 hover:bg-rose-100 focus-visible:ring-2 focus-visible:ring-rose-500"><RefreshCw className="h-4 w-4" aria-hidden="true" />Tentar novamente</button></div> : null}

      {loading ? (
        <div className="flex min-h-64 items-center justify-center gap-3 rounded-2xl border border-bhon-border bg-white text-sm text-bhon-muted" aria-live="polite"><Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden="true" />Carregando indicadores…</div>
      ) : data ? (
        <>
          <section aria-labelledby="indicator-summary-title">
            <h2 id="indicator-summary-title" className="sr-only">Resumo dos indicadores</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Comparecimento" value={percent(data.metrics.attendanceRate)} subtext={metricHint(data.metrics.attendanceRate, 'Consultas concluídas versus faltas')} highlight />
              <MetricCard label="Ocupação dos ambientes" value={percent(data.metrics.roomOccupancyRate)} subtext={metricHint(data.metrics.roomOccupancyRate, 'Tempo clínico disponível utilizado')} />
              <MetricCard label="Conversão de orçamentos" value={percent(data.metrics.quoteConversionRate)} subtext={metricHint(data.metrics.quoteConversionRate, 'Propostas aceitas entre as encerradas')} />
              <MetricCard label="Abandono de tratamentos" value={percent(data.metrics.abandonmentRate)} subtext={metricHint(data.metrics.abandonmentRate, 'Abandonados entre os tratamentos encerrados')} />
              <MetricCard label="Ticket médio aceito" value={data.metrics.averageTicket == null ? '—' : currencyFormatter.format(data.metrics.averageTicket)} subtext={metricHint(data.metrics.averageTicket, 'Valor final dos orçamentos aceitos')} />
              <MetricCard label="Tratamentos em curso" value={data.metrics.activeTreatments} subtext="Ativos, agendados ou em atendimento" />
              <MetricCard label="Receita recebida" value={currencyFormatter.format(data.metrics.receivedRevenue)} subtext="Recibos liquidados no período" />
              <MetricCard label="Tempo agendado" value={duration(data.metrics.scheduledMinutes)} subtext={`${data.metrics.activeRoomsCount} ${data.metrics.activeRoomsCount === 1 ? 'ambiente ativo' : 'ambientes ativos'}`} />
            </div>
          </section>

          {data.metrics.roomOccupancyRate == null ? <p className="flex items-start gap-2 rounded-xl border border-bhon-gold/30 bg-amber-50/70 px-4 py-3 text-xs leading-5 text-amber-900"><Clock3 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />{data.metrics.roomOccupancyReason}</p> : null}

          <section className="overflow-hidden rounded-2xl border border-bhon-border bg-white shadow-sm" aria-labelledby="productivity-title">
            <div className="flex flex-col justify-between gap-2 border-b border-bhon-border bg-bhon-ivory/60 px-4 py-4 sm:flex-row sm:items-center sm:px-5">
              <div><h2 id="productivity-title" className="font-display text-lg text-bhon-navy">Ritmo por profissional</h2><p className="mt-0.5 text-xs text-bhon-muted">Agenda e comparecimento calculados por pessoa no período.</p></div>
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-bhon-muted"><CalendarDays className="h-4 w-4" aria-hidden="true" />{new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(data.range.start))} — {new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(new Date(data.range.end))}</span>
            </div>
            {data.productivity.length === 0 ? <SectionState icon={Users} title="Nenhuma produção clínica registrada no período" description="Assim que a agenda receber atendimentos reais, o ritmo da equipe aparecerá aqui." /> : (
              <>
                <div className="divide-y divide-bhon-border md:hidden">{data.productivity.map((professional) => <article key={professional.id} className="p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><h3 className="truncate font-bold text-bhon-navy">{professional.name}</h3><p className="truncate text-xs text-bhon-muted">{professional.specialty || 'Especialidade não informada'}</p></div><span className="rounded-full bg-teal-50 px-2.5 py-1 font-mono-data text-xs font-bold text-teal-800">{percent(professional.attendanceRate)}</span></div><dl className="mt-4 grid grid-cols-3 gap-2 text-center"><div><dt className="text-[10px] uppercase tracking-wide text-bhon-muted">Agenda</dt><dd className="mt-1 font-mono-data font-bold">{professional.scheduledCount}</dd></div><div><dt className="text-[10px] uppercase tracking-wide text-bhon-muted">Concluídos</dt><dd className="mt-1 font-mono-data font-bold text-emerald-700">{professional.completedCount}</dd></div><div><dt className="text-[10px] uppercase tracking-wide text-bhon-muted">Tempo</dt><dd className="mt-1 font-mono-data font-bold">{duration(professional.scheduledMinutes)}</dd></div></dl></article>)}</div>
                <div className="hidden overflow-x-auto md:block"><table className="bhon-table"><thead><tr><th>Profissional</th><th>Especialidade</th><th>Agenda</th><th>Concluídos</th><th>Faltas</th><th>Comparecimento</th><th>Tempo agendado</th></tr></thead><tbody>{data.productivity.map((professional) => <tr key={professional.id}><td className="font-bold text-bhon-navy">{professional.name}</td><td className="text-bhon-muted">{professional.specialty || '—'}</td><td className="font-mono-data">{professional.scheduledCount}</td><td className="font-mono-data text-emerald-700">{professional.completedCount}</td><td className="font-mono-data">{professional.noShowCount}</td><td className="font-mono-data font-bold">{percent(professional.attendanceRate)}</td><td className="font-mono-data">{duration(professional.scheduledMinutes)}</td></tr>)}</tbody></table></div>
              </>
            )}
          </section>
        </>
      ) : <SectionState icon={BarChart3} title="Indicadores indisponíveis" description="Atualize a página para consultar novamente os registros clínicos." />}
    </div>
  );
};

