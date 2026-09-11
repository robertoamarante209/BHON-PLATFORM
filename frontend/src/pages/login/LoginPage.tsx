import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '../../context/AuthContext';

type GoogleIdentity = { accounts: { id: {
  initialize: (config: { client_id: string; callback: (response: { credential: string }) => void }) => void;
  renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
} } };

declare global { interface Window { google?: GoogleIdentity } }

const GOOGLE_SCRIPT_ID = 'bhon-google-identity-script';
const BRAND_INTRO_KEY = 'bhon-brand-intro-seen';

export const GOOGLE_BUTTON_OPTIONS = {
  type: 'standard', theme: 'filled_black', size: 'large', text: 'continue_with',
  shape: 'pill', width: 398, logo_alignment: 'left', locale: 'pt-BR',
} as const;

const shouldShowBrandIntro = () => {
  if (typeof window === 'undefined') return false;
  return !window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    && sessionStorage.getItem(BRAND_INTRO_KEY) !== 'true';
};

export const LoginPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { login, loginWithGoogle } = useAuth();
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [showIntro, setShowIntro] = useState(shouldShowBrandIntro);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!showIntro) return;
    const timer = window.setTimeout(() => {
      sessionStorage.setItem(BRAND_INTRO_KEY, 'true');
      setShowIntro(false);
    }, 1400);
    return () => window.clearTimeout(timer);
  }, [showIntro]);

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) return;
    const initializeGoogle = () => {
      if (!window.google || !googleButtonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async ({ credential }) => {
          setError(''); setIsSubmitting(true);
          try {
            const user = await loginWithGoogle(credential, rememberMe);
            if (!user) {
              setError('Não foi possível concluir o login com Google. A conta selecionada não está autorizada na BHON.');
              return;
            }
            setLocation(user.role === 'PLATFORM_OWNER' ? '/platform/overview' : '/clinic/overview');
          } finally { setIsSubmitting(false); }
        },
      });
      googleButtonRef.current.replaceChildren();
      window.google.accounts.id.renderButton(googleButtonRef.current, GOOGLE_BUTTON_OPTIONS);
    };
    if (window.google) { initializeGoogle(); return; }
    let script = document.getElementById(GOOGLE_SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script'); script.id = GOOGLE_SCRIPT_ID;
      script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', initializeGoogle, { once: true });
    return () => script?.removeEventListener('load', initializeGoogle);
  }, [googleClientId, loginWithGoogle, rememberMe, setLocation]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setError('');
    if (!email || !password) { setError('Informe seu e-mail institucional e sua senha.'); return; }
    setIsSubmitting(true);
    try {
      const user = await login(email, password, rememberMe);
      if (!user) { setError('Não foi possível autenticar. Verifique suas credenciais ou contate o administrador.'); return; }
      setLocation(user.role === 'PLATFORM_OWNER' ? '/platform/overview' : '/clinic/overview');
    } finally { setIsSubmitting(false); }
  };

  return (
    <div className="bhon-login-shell min-h-[100dvh] overflow-hidden bg-[#F9E6E6] text-[#101827]">
      {showIntro && (
        <div data-testid="brand-intro" aria-hidden="true" className="bhon-brand-intro fixed inset-0 z-50 grid place-items-center bg-[#F9E6E6]">
          <img src="/logo-bhon-dark.svg" alt="" className="bhon-brand-intro-logo w-[min(68vw,360px)]" />
        </div>
      )}

      <main className="mx-auto grid min-h-[100dvh] w-full max-w-[1440px] lg:grid-cols-[minmax(430px,0.78fr)_1.22fr]">
        <section className="bhon-login-form relative flex min-h-[100dvh] flex-col px-6 py-8 sm:px-12 lg:px-16 xl:px-24" aria-labelledby="login-title">
          <img src="/logo-bhon-dark.svg" alt="BHON" width="620" height="190" className="h-auto w-[142px] object-contain lg:absolute lg:right-10 lg:top-7 lg:w-[122px] xl:right-14" />
          <div className="my-auto w-full max-w-[430px] py-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#D94F70]">Área segura</p>
            <h1 id="login-title" className="mt-4 font-display text-4xl font-semibold tracking-[-0.045em] sm:text-5xl">
              Oi, seja bem - vindo! <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-3 text-sm text-[#706670]">Entre para cuidar da sua clínica.</p>
            {error && <div id="login-error" role="alert" aria-live="polite" className="mt-6 rounded-2xl border border-[#D94F70]/25 bg-white/55 px-4 py-3 text-sm text-[#8E2641]">{error}</div>}

            <div className="mt-7">
              {googleClientId ? (
                <div className="flex min-h-12 w-full items-center justify-center overflow-hidden rounded-full bg-[#111827]">
                  <div ref={googleButtonRef} className="flex min-h-12 w-full justify-center" aria-label="Continuar com Google" />
                </div>
              ) : <div className="rounded-full border border-[#101827]/10 bg-white/45 px-4 py-3 text-center text-xs text-[#786D76]">Login com Google aguardando configuração.</div>}
            </div>

            <div className="my-6 flex items-center gap-3" aria-hidden="true">
              <div className="h-px flex-1 bg-[#101827]/10" /><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B7D86]">ou entre com e-mail</span><div className="h-px flex-1 bg-[#101827]/10" />
            </div>

            <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="space-y-5">
              <div>
                <label htmlFor="login-email" className="block text-xs font-bold text-[#342B32]">E-mail Institucional</label>
                <input id="login-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nome@clinica.com.br" autoComplete="username" autoCapitalize="none" spellCheck={false} required aria-invalid={error ? true : undefined} aria-describedby={error ? 'login-error' : undefined} className="bhon-login-input mt-2 h-12 w-full rounded-2xl border border-transparent bg-white/75 px-4 text-base outline-none placeholder:text-[#A4939C] focus:border-[#D94F70]/50 focus:ring-4 focus:ring-[#D94F70]/10" />
              </div>
              <div>
                <label htmlFor="login-password" className="block text-xs font-bold text-[#342B32]">Senha de Acesso</label>
                <div className="relative mt-2">
                  <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" autoComplete="current-password" required aria-invalid={error ? true : undefined} aria-describedby={error ? 'login-error' : undefined} className="bhon-login-input h-12 w-full rounded-2xl border border-transparent bg-white/75 px-4 pr-12 text-base outline-none placeholder:text-[#A4939C] focus:border-[#D94F70]/50 focus:ring-4 focus:ring-[#D94F70]/10" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute inset-y-0 right-1 flex w-11 items-center justify-center rounded-xl text-[#776B73] hover:text-[#101827]">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              <label htmlFor="remember-access" className="flex min-h-10 cursor-pointer items-center gap-3 text-sm text-[#665B63]">
                <input id="remember-access" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-[#101827]/20 bg-white text-[#D94F70] focus:ring-[#D94F70] focus:ring-offset-[#F9E6E6]" /><span>Lembrar meu acesso</span>
              </label>
              <button type="submit" disabled={isSubmitting} className="bhon-login-action min-h-12 w-full rounded-full px-6 py-3 text-sm font-bold text-white disabled:cursor-wait disabled:opacity-60">{isSubmitting ? 'Entrando…' : 'Entrar na clínica'}</button>
            </form>
          </div>
        </section>

        <aside className="bhon-login-visual relative hidden min-h-[100dvh] items-center justify-center overflow-hidden p-12 lg:flex" aria-label="Organização clínica inteligente">
          <div aria-hidden="true" className="absolute inset-10 rounded-[3rem] bg-white/28 shadow-[0_32px_100px_rgba(117,69,84,0.12)] backdrop-blur-sm" />
          <img src="/figma-login-illustration.png" alt="Organização clínica inteligente" className="relative z-10 h-auto w-full max-w-[720px] object-contain drop-shadow-[0_30px_45px_rgba(117,69,84,0.14)]" />
        </aside>
      </main>
    </div>
  );
};
