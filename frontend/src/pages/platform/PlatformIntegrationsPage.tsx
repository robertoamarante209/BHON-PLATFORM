import React from 'react';
import { PlugZap } from 'lucide-react';

export const PlatformIntegrationsPage: React.FC = () => (
  <main className="mx-auto max-w-5xl space-y-6" aria-labelledby="platform-integrations-title">
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-bhon-teal">Plataforma BHON</p>
      <h1 id="platform-integrations-title" className="mt-2 text-3xl font-bold text-white">Integrações</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-300">Preparação exclusiva do proprietário da plataforma para uma etapa futura.</p>
    </header>
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-8 text-center">
      <PlugZap aria-hidden="true" className="mx-auto h-8 w-8 text-bhon-teal" />
      <h2 className="mt-4 text-lg font-semibold text-white">Nenhum conector ativado</h2>
      <p className="mt-2 text-sm text-slate-300">Conexões externas permanecem desativadas até configuração e validação em uma etapa dedicada.</p>
    </section>
  </main>
);
