import React, { useEffect, useRef, useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../../context/AuthContext';

type GoogleIdentity = {
  accounts: {
    id: {
      initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
      renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
    };
  };
};

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

const GOOGLE_SCRIPT_ID = 'bhon-google-identity-script';

export const GOOGLE_BUTTON_OPTIONS = {
  type: 'standard',
  theme: 'filled_black',
  size: 'large',
  text: 'continue_with',
  shape: 'pill',
  width: 398,
  logo_alignment: 'left',
  locale: 'pt-BR',
} as const;

export const LoginPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { login, loginWithGoogle } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;

    const initializeGoogle = () => {
      if (!window.google || !googleButtonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          setError('');
          setIsSubmitting(true);
          try {
            const user = await loginWithGoogle(credential, rememberMe);
            if (!user) {
              setError('Não foi possível concluir o login com Google. A conta selecionada não está autorizada na BHON.');
              return;
            }
            setLocation(user.role === 'PLATFORM_OWNER' ? '/platform/overview' : '/clinic/overview');
          } finally {
            setIsSubmitting(false);
          }
        },
      });

      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButtonRef.current, GOOGLE_BUTTON_OPTIONS);
    };

    if (window.google) {
      initializeGoogle();
      return;
    }

    let script = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = GOOGLE_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }

    script.addEventListener('load', initializeGoogle, { once: true });
    return () => script?.removeEventListener('load', initializeGoogle);
  }, [googleClientId, loginWithGoogle, rememberMe, setLocation]);

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
    <div className="bhon-login-shell relative min-h-[100dvh] overflow-hidden bg-[#0C1725] text-white">
      <div aria-hidden="true" className="bhon-login-glow bhon-login-glow-left absolute -left-40 -top-32 h-[34rem] w-[34rem] rounded-full bg-bhon-teal/20 blur-[110px]" />
      <div aria-hidden="true" className="bhon-login-glow bhon-login-glow-right absolute -bottom-48 -right-36 h-[38rem] w-[38rem] rounded-full bg-[#28525B]/40 blur-[130px]" />
      <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,12,21,0.3)_70%,rgba(5,12,21,0.58)_100%)]" />

      <main className="bhon-login-stage relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-[430px] flex-col justify-center px-6 py-10">
        <img src="/logo-bhon-light.svg" alt="BHON" width="620" height="190" className="bhon-login-logo mx-auto h-auto w-full max-w-[310px] object-contain" />

        <section className="bhon-login-form mt-10" aria-labelledby="login-title">
          <h1 id="login-title" className="text-center font-display text-2xl font-medium tracking-[-0.02em] text-[#F8F5EE] sm:text-3xl">
            Acesse sua clínica
          </h1>

          {error && (
            <div id="login-error" role="alert" aria-live="polite" className="mt-7 rounded-xl border border-rose-300/20 bg-rose-300/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="mt-8 space-y-7">
            <div>
              <label htmlFor="login-email" className="block text-xs font-semibold tracking-[0.08em] text-slate-300">E-mail Institucional</label>
              <input id="login-email" name="email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="seu.nome@clinica.com.br…" autoComplete="username" autoCapitalize="none" spellCheck={false} required aria-invalid={error ? true : undefined} aria-describedby={error ? 'login-error' : undefined} className="mt-2 h-12 w-full rounded-t-lg border-0 border-b border-white/30 bg-white/[0.025] px-2 text-base text-white outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-slate-500 focus:border-bhon-teal focus:bg-white/[0.045] focus:ring-2 focus:ring-bhon-teal/20" />
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold tracking-[0.08em] text-slate-300">Senha de Acesso</label>
              <input id="login-password" name="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Sua senha…" autoComplete="current-password" required aria-invalid={error ? true : undefined} aria-describedby={error ? 'login-error' : undefined} className="mt-2 h-12 w-full rounded-t-lg border-0 border-b border-white/30 bg-white/[0.025] px-2 text-base text-white outline-none transition-[border-color,background-color,box-shadow] duration-200 placeholder:text-slate-500 focus:border-bhon-teal focus:bg-white/[0.045] focus:ring-2 focus:ring-bhon-teal/20" />
            </div>

            <label htmlFor="remember-access" className="flex min-h-11 cursor-pointer items-center gap-3 text-sm text-slate-400">
              <input id="remember-access" name="remember-me" type="checkbox" checked={rememberMe} onChange={(event) => setRememberMe(event.target.checked)} className="h-4 w-4 rounded border-white/30 bg-transparent text-bhon-teal focus:ring-bhon-teal focus:ring-offset-[#0C1725]" />
              <span>Lembrar meu acesso</span>
            </label>

            <button type="submit" disabled={isSubmitting} className="bhon-login-action min-h-12 w-full px-6 py-3 text-xs font-bold uppercase tracking-[0.2em] text-[#EAFBF8] disabled:cursor-wait disabled:opacity-60">
              {isSubmitting ? 'Entrando…' : 'Entrar na clínica'}
            </button>
          </form>

          <div className="my-7 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-white/10" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">ou</span>
            <div className="h-px flex-1 bg-white/10" />
          </div>

          {googleClientId ? (
            <div ref={googleButtonRef} className="flex min-h-12 w-full justify-center overflow-hidden rounded-full bg-transparent" aria-label="Continuar com Google" />
          ) : (
            <div className="rounded-full border border-white/10 bg-white/[0.02] px-4 py-3 text-center text-xs text-slate-500">
              Login com Google aguardando configuração da credencial BHON.
            </div>
          )}
        </section>
      </main>
    </div>
  );
};
