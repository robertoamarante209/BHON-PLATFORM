import React, { useState } from 'react';
import { initialSubscriptionPlans } from '../../data/initialData';
import { CreditCard, Check, Sliders, CheckCircle2 } from 'lucide-react';
import { SubscriptionPlan } from '../../types';

export const PlatformSubscriptionsPage: React.FC = () => {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(initialSubscriptionPlans);
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null);

  const handleUpdatePrice = (planId: string, newMonthly: number) => {
    setPlans(prev =>
      prev.map(p => (p.id === planId ? { ...p, monthlyPrice: newMonthly, annualPrice: newMonthly * 10 } : p))
    );
    setEditingPlan(null);
  };

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

            <div className="pt-4 mt-4 border-t border-slate-800">
              <button
                onClick={() => {
                  const newPrice = prompt(`Novo valor mensal para ${plan.name}:`, String(plan.monthlyPrice));
                  if (newPrice && !isNaN(Number(newPrice))) {
                    handleUpdatePrice(plan.id, Number(newPrice));
                  }
                }}
                className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-semibold rounded flex items-center justify-center gap-1.5 transition-colors"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Ajustar Precificação</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
