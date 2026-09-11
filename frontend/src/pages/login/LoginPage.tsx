import React, { useEffect, useRef, useState } from 'react';
import { Eye, EyeOff, KeyRound, Mail } from 'lucide-react';
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
    <div className="bhon-login-shell min-h-[100dvh] overflow-hidden bg-white text-[#171725]">
      {showIntro && (
        <div data-testid="brand-intro" aria-hidden="true" className="bhon-brand-intro fixed inset-0 z-50 grid place-items-center bg-[#f8f7f4]">
          <img src="/figma-login-asset-2.png" alt="" className="bhon-brand-intro-logo w-[min(32vw,160px)] rounded-2xl" />
        </div>
      )}

      <main className="grid min-h-[100dvh] w-full lg:grid-cols-[44%_56%]">
        <section className="bhon-login-form relative z-10 flex min-h-[100dvh] items-center bg-white px-6 py-10 sm:px-12 lg:px-[clamp(4rem,8.5vw,8rem)]" aria-labelledby="login-title">
          <div className="w-full max-w-[403px]">
            <img src="/figma-login-asset-2.png" alt="BHON" width="400" height="400" className="mb-8 h-16 w-16 rounded-xl object-cover lg:hidden" />
            <h1 id="login-title" className="font-display text-[30px] font-semibold tracking-[0.1px]">Login</h1>
            {error && <div id="login-error" role="alert" aria-live="polite" className="mt-6 rounded-2xl border border-[#D94F70]/25 bg-white/55 px-4 py-3 text-sm text-[#8E2641]">{error}</div>}

            <form onSubmit={handleSubmit} aria-busy={isSubmitting} className="mt-10 space-y-4">
              <div>
                <label htmlFor="login-email" className="sr-only">E-mail</label>
                <div className="flex h-[46px] items-center gap-4 rounded-lg border border-[#e0e2e9] px-5 transition focus-within:border-[#00b894] focus-within:ring-4 focus-within:ring-[#00b894]/10">
                  <Mail size={19} className="shrink-0 text-[#969ab8]" aria-hidden="true" />
                  <input id="login-email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com.br" autoComplete="username" autoCapitalize="none" spellCheck={false} required aria-invalid={error ? true : undefined} aria-describedby={error ? 'login-error' : undefined} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#969ab8]" />
                </div>
              </div>
              <div>
                <label htmlFor="login-password" className="sr-only">Senha</label>
                <div className="flex h-[46px] items-center gap-4 rounded-lg border border-[#e0e2e9] px-5 transition focus-within:border-[#00b894] focus-within:ring-4 focus-within:ring-[#00b894]/10">
                  <KeyRound size={19} className="shrink-0 text-[#969ab8]" aria-hidden="true" />
                  <input id="login-password" name="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Sua senha" autoComplete="current-password" required aria-invalid={error ? true : undefined} aria-describedby={error ? 'login-error' : undefined} className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#969ab8]" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="text-[#969ab8] transition hover:text-[#0f1115]">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
                </div>
              </div>
              <button type="submit" disabled={isSubmitting} className="min-h-[48px] w-full rounded-lg bg-[#0f1115] px-6 py-3 text-[15px] font-semibold text-white transition hover:-translate-y-0.5 hover:bg-[#00a98b] hover:shadow-lg disabled:cursor-wait disabled:opacity-60">{isSubmitting ? 'Entrando…' : 'Entrar'}</button>
              <div className="flex items-center justify-between gap-4 pt-1 text-xs">
                <label htmlFor="remember-access" className="flex cursor-pointer items-center gap-2 text-[#697080]"><input id="remember-access" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 rounded border-[#d8dbe4] text-[#00b894] focus:ring-[#00b894]" />Lembrar meu acesso</label>
                <span className="font-semibold text-[#00a98b]">Esqueci minha senha</span>
              </div>
            </form>
          </div>
        </section>

        <aside className="relative hidden min-h-[100dvh] overflow-hidden bg-[#f7f7f7] lg:block" aria-label="Ambiente clínico minimalista">
          <img src="/figma-login-office.jpg" alt="Ambiente clínico minimalista" className="absolute inset-0 h-full w-full object-cover object-center" />
          <div className="absolute left-0 top-[12%] flex max-w-[610px] items-start gap-0">
            <img src="/figma-login-asset-2.png" alt="BHON" width="400" height="400" className="h-[108px] w-[108px] shrink-0 object-cover shadow-[0_14px_40px_rgba(15,17,21,0.08)]" />
            <blockquote className="relative pt-7 text-[#3a424a]">
              <span aria-hidden="true" className="absolute -left-2 -top-7 font-serif text-[110px] leading-none text-[#dce0e3]">“</span>
              <p className="relative font-display text-[clamp(1.2rem,1.75vw,1.75rem)] leading-[1.55] tracking-[-0.02em]">Acreditar no futuro da saúde é transformar a gestão em um ato de cuidado.</p>
              <footer className="mt-1 text-right font-display text-lg font-medium">— Roberto Amarante</footer>
            </blockquote>
          </div>
        </aside>
      </main>
    </div>
  );
};
