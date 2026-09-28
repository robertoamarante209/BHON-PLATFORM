import React from 'react';
import { ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import type { ActivationSnapshot } from '../../lib/onboarding';

type Props = {
  snapshot: ActivationSnapshot;
  onRefresh: () => void;
  onNavigate: (path: string) => void;
  onDismiss?: () => void;
};

const nextStepCopy = {
  PROFILE: { label: 'Confirmar dados da clínica', path: '/clinic/settings' },
  PATIENTS: { label: 'Importar pacientes', path: '/clinic/patients' },
  TEAM: { label: 'Cadastrar equipe', path: '/clinic/team' },
  AGENDA: { label: 'Abrir agenda', path: '/clinic/agenda' },
  OPPORTUNITY: { label: 'Ver oportunidades', path: '/clinic/opportunities' },
  SARAH_MESSAGE: { label: 'Preparar com Sarah', path: '/clinic/whatsapp' },
} as const;

export function ActivationChecklist({ snapshot, onNavigate, onDismiss }: Props) {
  if (snapshot.dismissed || !snapshot.nextStep) return null;
  const next = nextStepCopy[snapshot.nextStep.key];
  const progress = `${snapshot.completedSteps} de ${snapshot.totalSteps} etapas`;

  return <section aria-labelledby="activation-title" className="overflow-hidden rounded-2xl border border-bhon-teal/25 bg-gradient-to-r from-bhon-teal-subtle via-white to-white shadow-[0_8px_28px_rgba(31,49,60,0.045)]">
    <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-bhon-teal text-white"><Sparkles className="h-5 w-5" aria-hidden="true" /></span>
        <div>
          <p className="bhon-eyebrow text-bhon-teal-dark">Ativação da clínica</p>
          <h2 id="activation-title" className="mt-1 text-base font-bold text-bhon-navy">Primeiro resultado, sem complicação.</h2>
          <p className="mt-1 text-xs text-bhon-muted">{progress}. Próximo passo: {next.label.toLocaleLowerCase('pt-BR')}.</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button type="button" onClick={() => onNavigate(next.path)} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-bhon-navy px-4 text-xs font-semibold text-white hover:bg-bhon-navy-hover">{next.label}<ArrowRight className="h-3.5 w-3.5 text-bhon-teal" aria-hidden="true" /></button>
        {onDismiss ? <button type="button" onClick={onDismiss} className="min-h-10 rounded-xl px-3 text-xs font-semibold text-bhon-muted hover:bg-white">Agora não</button> : null}
      </div>
    </div>
    <div className="flex items-center gap-2 border-t border-teal-100 bg-white/70 px-5 py-2 text-[11px] text-bhon-muted"><CheckCircle2 className="h-3.5 w-3.5 text-bhon-teal" aria-hidden="true" />A Sarah só prepara mensagens: nenhum envio acontece sem revisão da equipe.</div>
  </section>;
}
