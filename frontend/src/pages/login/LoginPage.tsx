import React, { useState } from 'react';
import { ArrowRight, CheckCircle2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '../../context/AuthContext';

export const LoginPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email || !password) {
      setError('Informe seu e-mail institucional e sua senha.');
      return;
    }

    setIsSubmitting(true);
    try {
      const user = await login(email, password, rememberMe);
      if (!user) {
        setError('Não foi possível autenticar. Verifique suas credenciais ou contate o administrador.');
        return;
      }
      setLocation(user.role === 'PLATFORM_OWNER' ? '/platform/overview' : '/clinic/overview');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bhon-login-shell relative min-h-[100dvh] overflow-x-hidden bg-[#F3F6F3] px-4 py-5 sm:px-6 sm:py-8 lg:flex lg:items-center lg:justify-center lg:px-10">
      <div aria-hidden="true" className="pointer-events-none absolute -left-28 top-16 h-80 w-80 rounded-full bg-bhon-teal/[0.06] blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 bottom-0 h-96 w-96 rounded-full bg-bhon-navy/[0.055] blur-3xl" />

      <main className="relative mx-auto grid w-full max-w-[1180px] overflow-hidden rounded-[26px] border border-[#DFE7E1] bg-white shadow-[0_28px_90px_rgba(18,39,34,0.09)] lg:min-h-[680px] lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative flex flex-col border-b border-[#E5EBE6] px-6 pb-7 pt-5 sm:px-10 sm:pt-7 lg:border-b-0 lg:border-r lg:px-14 lg:py-12">
          <div className="bhon-brand-lockup bhon-login-brand w-52 sm:w-64 lg:w-72">
            <img src="/logo-official.jpg" alt="BHON — A clínica no controle." width="1920" height="1280" fetchPriority="high" />
          </div>

          <div className="bhon-login-copy mt-5 lg:my-auto lg:mt-12">
            <p className="bhon-eyebrow">A clínica no controle</p>
            <h1 className="mt-3 max-w-xl text-balance font-display text-3xl leading-[1.05] text-bhon-navy sm:text-4xl lg:text-6xl">Sua clínica em perfeita sintonia.</h1>
            <p className="mt-4 max-w-lg text-pretty text-sm leading-6 text-bhon-muted lg:mt-6">Uma operação mais leve para que sua equipe cuide de cada paciente com atenção, clareza e continuidade.</p>

            <div className="mt-7 hidden grid-cols-3 gap-3 lg:grid">
              {['Agenda coordenada', 'Cuidado contínuo', 'Gestão segura'].map((benefit) => (
                <div key={benefit} className="border-t border-[#DDE6DF] pt-3">
                  <CheckCircle2 aria-hidden="true" className="h-4 w-4 text-bhon-teal" />
                  <p className="mt-2 text-[11px] font-semibold text-bhon-navy">{benefit}</p>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-8 hidden text-[10px] uppercase tracking-[0.2em] text-bhon-muted/70 lg:block">Clareza para cuidar. Controle para crescer.</p>
        </section>

        <section className="bhon-login-form flex items-center bg-[#FAFBF9] px-6 py-8 sm:px-10 lg:px-14 lg:py-12" aria-labelledby="login-title">
          <div className="w-full">
            <div className="flex items-center gap-2 text-bhon-teal-dark">
              <ShieldCheck aria-hidden="true" className="h-4 w-4" />
              <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Acesso protegido</span>
            </div>
            <h2 id="login-title" className="mt-4 font-display text-3xl text-bhon-navy sm:text-4xl">Bem-vindo de volta.</h2>
            <p className="mt-2 text-sm leading-relaxed text-bhon-muted">Entre para começar o dia clínico com tudo em ordem.</p>

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="mt-6 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="mt-7 space-y-5 text-xs">
              <div>
                <label htmlFor="login-email" className="mb-2 block text-[10px] font-bold uppercase tracking-[0.16em] text-bhon-text">
                  E-mail Institucional
                </label>
                <div className="relative rounded-xl border border-bhon-border bg-white shadow-sm focus-within:border-bhon-teal focus-within:ring-2 focus-within:ring-bhon-teal/15">
                  <Mail aria-hidden="true" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-bhon-muted" />
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="seu.nome@clinica.com.br…"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    className="h-12 w-full rounded-xl border-0 bg-transparent pl-11 pr-4 text-sm text-bhon-text outline-none"
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label htmlFor="login-password" className="text-[10px] font-bold uppercase tracking-[0.16em] text-bhon-text">
                    Senha de Acesso
                  </label>
                  <span className="ml-4 text-right text-[10px] leading-tight text-bhon-muted">Recuperação com o administrador</span>
                </div>
                <div className="relative rounded-xl border border-bhon-border bg-white shadow-sm focus-within:border-bhon-teal focus-within:ring-2 focus-within:ring-bhon-teal/15">
                  <Lock aria-hidden="true" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-bhon-muted" />
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Sua senha…"
                    autoComplete="current-password"
                    required
                    className="h-12 w-full rounded-xl border-0 bg-transparent pl-11 pr-4 font-mono text-sm text-bhon-text outline-none"
                  />
                </div>
              </div>

              <label className="flex min-h-11 cursor-pointer items-center gap-2 text-bhon-muted">
                <input
                  name="remember-me"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="h-4 w-4 rounded border-bhon-border text-bhon-teal focus:ring-bhon-teal"
                />
                <span>Lembrar meu acesso</span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-bhon-navy px-5 py-3 text-xs font-bold uppercase tracking-[0.12em] text-white shadow-[0_12px_30px_rgba(18,27,42,0.16)] transition-[background-color,transform] duration-150 ease-out hover:bg-bhon-navy-hover active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
              >
                <span>{isSubmitting ? 'Preparando sua clínica…' : 'Entrar na clínica'}</span>
                {!isSubmitting ? <ArrowRight aria-hidden="true" className="h-4 w-4 text-bhon-teal" /> : null}
              </button>
            </form>

            <p className="mt-8 text-center text-[10px] leading-relaxed text-bhon-muted">Seu acesso é individual e protegido. Em caso de dúvida, fale com o responsável pela clínica.</p>
          </div>
        </section>
      </main>
    </div>
  );
};
