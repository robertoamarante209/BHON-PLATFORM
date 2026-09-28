import React, { useState } from 'react';
import { ArrowRight, Sparkles } from 'lucide-react';
import type { ActivationSnapshot } from '../../lib/onboarding';

type Props = {
  snapshot: ActivationSnapshot;
  onRefresh: () => void;
  onNavigate: (path: string) => void;
  onDismiss?: () => void;
  onLoadDemo?: () => Promise<void>;
};

const nextStepCopy = {
  PROFILE: { label: 'Confirmar dados da clínica', path: '/clinic/settings' },
  PATIENTS: { label: 'Importar pacientes', path: '/clinic/patients' },
  TEAM: { label: 'Cadastrar equipe', path: '/clinic/team' },
  AGENDA: { label: 'Abrir agenda', path: '/clinic/agenda' },
  OPPORTUNITY: { label: 'Ver oportunidades', path: '/clinic/opportunities' },
  SARAH_MESSAGE: { label: 'Preparar com Anna', path: '/clinic/whatsapp' },
} as const;

export function ActivationChecklist({ snapshot, onNavigate, onDismiss, onLoadDemo }: Props) {
  const [loadingDemo, setLoadingDemo] = useState(false);
  if (snapshot.dismissed || !snapshot.nextStep) return null;
  const next = nextStepCopy[snapshot.nextStep.key];
  const progress = `${snapshot.completedSteps} de ${snapshot.totalSteps} etapas`;

  return <section aria-labelledby="activation-title" className="rounded-2xl border border-bhon-border bg-bhon-surface shadow-[0_6px_22px_rgba(31,49,60,0.035)]">
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-bhon-teal-subtle text-bhon-teal-dark"><Sparkles className="h-4 w-4" aria-hidden="true" /></span>
        <div>
          <p className="bhon-eyebrow text-bhon-teal-dark">Ativação da clínica</p>
          <h2 id="activation-title" className="mt-0.5 text-sm font-bold text-bhon-navy">Primeiro resultado, sem complicação.</h2>
          <p className="mt-0.5 text-[11px] text-bhon-muted">{progress} · Próximo: {next.label.toLocaleLowerCase('pt-BR')}.</p>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <button type="button" onClick={() => onNavigate(next.path)} className="inline-flex min-h-9 items-center gap-2 rounded-xl bg-bhon-navy px-4 text-xs font-semibold text-white hover:bg-bhon-navy-hover">{next.label}<ArrowRight className="h-3.5 w-3.5 text-bhon-teal" aria-hidden="true" /></button>
        {snapshot.nextStep.key === 'PATIENTS' && onLoadDemo ? <button type="button" disabled={loadingDemo} onClick={() => { setLoadingDemo(true); void onLoadDemo().then(() => onNavigate('/clinic/opportunities')).finally(() => setLoadingDemo(false)); }} className="min-h-9 rounded-xl border border-bhon-border px-3 text-xs font-semibold text-bhon-teal-dark hover:bg-bhon-teal-subtle disabled:opacity-60">{loadingDemo ? 'Carregando exemplo…' : 'Continuar com dados de exemplo'}</button> : null}
        {onDismiss ? <button type="button" onClick={onDismiss} className="min-h-9 rounded-xl px-3 text-xs font-semibold text-bhon-muted hover:bg-bhon-teal-subtle">Agora não</button> : null}
      </div>
    </div>
  </section>;
}
