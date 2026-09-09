import React from 'react';
import { Construction, DatabaseZap, ShieldCheck } from 'lucide-react';

interface PlatformUnavailablePageProps {
  title: string;
  description: string;
}

export const PlatformUnavailablePage: React.FC<PlatformUnavailablePageProps> = ({ title, description }) => (
  <div className="mx-auto flex min-h-[70vh] max-w-5xl items-center justify-center px-4 py-10 text-slate-100">
    <section className="w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl shadow-black/20">
      <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_42%)] px-6 py-8 sm:px-10 sm:py-12">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-teal-400/20 bg-teal-400/10 text-teal-300">
          <Construction aria-hidden="true" className="h-5 w-5" />
        </div>
        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400">Administração da plataforma</p>
        <h1 className="mt-2 text-balance text-2xl font-bold text-white sm:text-3xl">{title}</h1>
        <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-slate-400">{description}</p>
      </div>

      <div className="grid gap-4 px-6 py-7 sm:grid-cols-2 sm:px-10 sm:py-9">
        <section role="status" className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-5">
          <div className="flex items-center gap-2 text-amber-300">
            <DatabaseZap aria-hidden="true" className="h-4 w-4" />
            <h2 className="text-xs font-bold uppercase tracking-wider">Módulo não configurado</h2>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">Esta área ainda não possui um contrato de API persistente. Nenhum dado demonstrativo é exibido como se fosse informação real.</p>
        </section>

        <section className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
          <div className="flex items-center gap-2 text-teal-300">
            <ShieldCheck aria-hidden="true" className="h-4 w-4" />
            <h2 className="text-xs font-bold uppercase tracking-wider">Operação protegida</h2>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-slate-400">A ativação ocorrerá somente após isolamento por clínica, RBAC, auditoria e testes do fluxo completo.</p>
        </section>
      </div>
    </section>
  </div>
);
