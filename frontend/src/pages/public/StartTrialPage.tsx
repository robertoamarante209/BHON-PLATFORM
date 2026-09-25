import React, { FormEvent, useState } from 'react';
import { ArrowUpRight, Check, ShieldCheck } from 'lucide-react';
import { startCheckout, startTrial } from '../../lib/billing';

const fieldClass = 'mt-2 w-full rounded-xl border border-[#cad9d2] bg-white px-4 py-3 text-sm text-[#12231c] outline-none transition placeholder:text-[#789087] focus:border-[#15987e] focus:ring-4 focus:ring-[#15987e]/10';

export const StartTrialPage = () => {
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setStatus('loading');
    setMessage('');

    try {
      const response = await startTrial({
        clinicName: String(form.get('clinicName') || ''),
        ownerName: String(form.get('ownerName') || ''),
        ownerEmail: String(form.get('ownerEmail') || ''),
        clinicPhone: String(form.get('clinicPhone') || ''),
        ownerPhone: String(form.get('ownerPhone') || ''),
        username: String(form.get('username') || ''),
        password: String(form.get('password') || ''),
        billingCycle: String(form.get('billingCycle') || 'MONTHLY') as 'MONTHLY' | 'ANNUAL',
        termsVersion: '2026-09',
        privacyVersion: '2026-09',
        acceptedTerms: form.get('acceptedTerms') === 'on',
        acceptedPrivacy: form.get('acceptedPrivacy') === 'on',
      });

      if (response.next === 'CHECKOUT') {
        const checkout = await startCheckout(response.id);
        window.location.assign(checkout.checkoutUrl);
        return;
      }
      window.location.assign('/entrar');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Não foi possível iniciar o teste. Tente novamente.');
    }
  };

  return (
    <main className="min-h-screen bg-[#edf4f0] px-5 py-8 text-[#12231c] sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section className="pt-4 lg:sticky lg:top-8">
          <a href="/" className="text-xl font-black tracking-[0.17em] text-[#12231c]">BHON</a>
          <h2 className="mt-12 text-xs font-bold uppercase tracking-[0.18em] text-[#14826d]">Comece com 14 dias</h2>
          <h1 className="mt-4 max-w-xl text-4xl font-medium leading-[1.02] tracking-[-0.055em] sm:text-6xl">Sua clínica no controle, desde o primeiro dia.</h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#4a6258]">Você terá 14 dias para conhecer a BHON. Cadastre os contatos certos e deixe a estrutura pronta para sua operação.</p>
          <ul className="mt-9 space-y-4 text-sm text-[#334a40]">
            <li className="flex gap-3"><Check className="mt-0.5 size-4 text-[#15987e]" />WhatsApp da clínica preparado para a conexão da Secretária Sarah</li>
            <li className="flex gap-3"><Check className="mt-0.5 size-4 text-[#15987e]" />Contato do responsável separado para assuntos administrativos</li>
            <li className="flex gap-3"><Check className="mt-0.5 size-4 text-[#15987e]" />Sem cobrança hoje; cancelamento antes do fim do teste</li>
          </ul>
        </section>

        <section className="rounded-[2rem] border border-[#d6e3dc] bg-white p-6 shadow-[0_24px_70px_rgba(23,62,48,0.12)] sm:p-9">
          <div className="flex items-start gap-3 border-b border-[#e2ebe6] pb-6"><ShieldCheck className="mt-0.5 size-5 text-[#15987e]" /><div><h2 className="font-semibold">Crie o acesso da clínica</h2><p className="mt-1 text-sm text-[#647b70]">Os dados são usados somente para montar sua conta BHON.</p></div></div>
          <form className="mt-7 grid gap-5 sm:grid-cols-2" onSubmit={handleSubmit}>
            <label className="text-sm font-medium">Nome da clínica<input required name="clinicName" className={fieldClass} placeholder="Ex.: Clínica Horizonte" /></label>
            <label className="text-sm font-medium">Seu nome<input required name="ownerName" className={fieldClass} placeholder="Nome do responsável" /></label>
            <label className="text-sm font-medium">E-mail administrativo<input required type="email" name="ownerEmail" className={fieldClass} placeholder="voce@clinica.com.br" /></label>
            <label className="text-sm font-medium">WhatsApp do responsável<input required type="tel" name="ownerPhone" className={fieldClass} placeholder="(11) 99999-9999" /><span className="mt-1 block text-xs font-normal text-[#6f857b]">Para avisos administrativos. Não atende pacientes.</span></label>
            <label className="text-sm font-medium sm:col-span-2">WhatsApp da clínica<input required type="tel" name="clinicPhone" className={fieldClass} placeholder="(11) 99999-9999" /><span className="mt-1 block text-xs font-normal text-[#6f857b]">Este é o número que será vinculado à Secretária Sarah após a autorização oficial do WhatsApp Business.</span></label>
            <label className="text-sm font-medium">Usuário de acesso<input required name="username" className={fieldClass} placeholder="clinica-horizonte" /></label>
            <label className="text-sm font-medium">Crie uma senha<input required minLength={8} type="password" name="password" className={fieldClass} placeholder="Mínimo de 8 caracteres" /></label>
            <fieldset className="sm:col-span-2"><legend className="text-sm font-medium">Plano após o teste</legend><div className="mt-2 grid gap-3 sm:grid-cols-2"><label className="rounded-xl border border-[#cad9d2] p-4 text-sm"><input className="mr-2 accent-[#15987e]" type="radio" name="billingCycle" value="MONTHLY" defaultChecked />Mensal — R$ 290/mês</label><label className="rounded-xl border border-[#cad9d2] p-4 text-sm"><input className="mr-2 accent-[#15987e]" type="radio" name="billingCycle" value="ANNUAL" />Anual — R$ 240/mês</label></div></fieldset>
            <label className="flex gap-3 text-sm leading-5 text-[#4a6258] sm:col-span-2"><input required name="acceptedTerms" type="checkbox" className="mt-1 size-4 accent-[#15987e]" />Li e aceito os <a className="underline" href="/termos">Termos de Uso</a>.</label>
            <label className="flex gap-3 text-sm leading-5 text-[#4a6258] sm:col-span-2"><input required name="acceptedPrivacy" type="checkbox" className="mt-1 size-4 accent-[#15987e]" />Li e aceito a <a className="underline" href="/privacidade">Política de Privacidade</a>.</label>
            {status === 'error' && <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 sm:col-span-2">{message}</p>}
            <button disabled={status === 'loading'} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#10251c] px-5 py-4 text-sm font-bold text-white transition hover:bg-[#1c3c2e] disabled:cursor-wait disabled:opacity-70 sm:col-span-2">{status === 'loading' ? 'Preparando seu teste…' : 'Começar teste gratuito'}<ArrowUpRight className="size-4" /></button>
          </form>
        </section>
      </div>
    </main>
  );
};
