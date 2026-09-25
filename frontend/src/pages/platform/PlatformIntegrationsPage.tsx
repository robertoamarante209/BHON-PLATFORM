import React from 'react';
import { PlugZap } from 'lucide-react';
import { useOperationalData } from '../../context/OperationalDataContext';

export const PlatformIntegrationsPage: React.FC = () => {
  const { platformClinics, platformLoading, platformError, refreshPlatformData } = useOperationalData();
  const connected = platformClinics.filter((clinic) => clinic.secretaryStatus === 'CONNECTED').length;
  const pending = platformClinics.filter((clinic) => clinic.secretaryStatus === 'PENDING').length;
  return <main className="mx-auto max-w-5xl space-y-6" aria-labelledby="platform-integrations-title">
    <header>
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-bhon-teal">Plataforma BHON</p>
      <h1 id="platform-integrations-title" className="mt-2 text-3xl font-bold text-white">Integrações</h1>
      <p className="mt-2 max-w-2xl text-sm text-slate-300">Visão central das conexões por clínica. Nenhum número é compartilhado entre clínicas.</p>
    </header>
    <section className="rounded-2xl border border-slate-700 bg-slate-900 p-6">
      <div className="flex items-center justify-between gap-4"><div className="flex items-center gap-3"><PlugZap aria-hidden="true" className="h-7 w-7 text-bhon-teal" /><div><h2 className="text-lg font-semibold text-white">Secretária Sarah / WhatsApp</h2><p className="mt-1 text-sm text-slate-300">{connected} conectada{connected === 1 ? '' : 's'} · {pending} aguardando autorização</p></div></div><button onClick={() => void refreshPlatformData()} className="rounded border border-slate-600 px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-slate-800">Atualizar</button></div>
      {platformError ? <p role="alert" className="mt-4 rounded border border-rose-800 bg-rose-950/50 p-3 text-xs text-rose-200">{platformError}</p> : null}
      <div className="mt-6 overflow-x-auto"><table className="w-full text-left text-xs"><thead className="border-b border-slate-700 text-slate-400"><tr><th className="p-3">Clínica</th><th className="p-3">Canal</th><th className="p-3">Situação</th></tr></thead><tbody className="divide-y divide-slate-800">{platformClinics.map((clinic) => <tr key={clinic.id}><td className="p-3 font-semibold text-white">{clinic.name}</td><td className="p-3 text-slate-300">WhatsApp da clínica</td><td className="p-3"><span className="font-mono-data text-[10px] text-teal-300">{clinic.secretaryStatus || 'NOT_CONFIGURED'}</span></td></tr>)}{!platformLoading && platformClinics.length === 0 ? <tr><td colSpan={3} className="p-5 text-center text-slate-400">Nenhuma clínica provisionada ainda.</td></tr> : null}</tbody></table></div>
    </section>
  </main>;
};
