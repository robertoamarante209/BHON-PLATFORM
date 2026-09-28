import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { SubscriptionPlan } from '../../types';
import { loadSubscriptionPlans } from '../../lib/platform-owner';

export const PlatformSubscriptionsPage: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [error, setError] = useState('');
  useEffect(() => { void loadSubscriptionPlans().then(setPlans).catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Não foi possível carregar os planos.')); }, []);

  return (
    <div className="space-y-6 max-w-7xl mx-auto text-slate-100">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div>
          <h1 className="text-lg font-bold uppercase tracking-wide text-white">
            Planos de Assinatura BHON
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Precificação, limites operacionais de consultórios e profissionais para clínicas parceiras.
          </p>
        </div>
      </div>
      {error ? <p role="alert" className="rounded border border-rose-800 bg-rose-950/50 p-3 text-xs text-rose-200">{error}</p> : null}

      {/* Cards dos Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="p-5 bg-slate-950 border border-slate-800 rounded flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono-data text-xs text-amber-400 font-bold tracking-wider">
                  {plan.code}
                </span>
                <span className="font-mono-data text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  ATIVO
                </span>
              </div>

              <h3 className="text-base font-bold text-white mb-2">{plan.name}</h3>

              <div className="py-3 border-y border-slate-800 my-3">
                <span className="text-xs text-slate-400">Mensalidade:</span>
                <div className="font-mono-data text-2xl font-bold text-white mt-0.5">
                  R$ {plan.monthlyPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  <span className="text-xs text-slate-400 font-normal"> /mês</span>
                </div>
                <p className="text-[11px] text-slate-400 font-mono-data mt-1">
                  Anual: R$ {plan.annualPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (2 meses off)
                </p>
              </div>

              {/* Limites da Licença */}
              <div className="space-y-1.5 text-xs text-slate-300 mb-4 font-mono-data">
                <p>• Até <strong>{plan.maxRooms}</strong> consultórios simultâneos</p>
                <p>• Até <strong>{plan.maxProfessionals}</strong> profissionais cadastrados</p>
              </div>

              {/* Recursos inclusos */}
              <div className="space-y-2 text-xs border-t border-slate-800/80 pt-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Funcionalidades
                </span>
                {plan.features.map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-300">
                    <Check className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-[11px] leading-snug">{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-slate-800 text-[11px] text-slate-400">Valores sincronizados com o catálogo de assinatura da BHON.</div>
          </div>
        ))}
      </div>
    </div>
  );
};
