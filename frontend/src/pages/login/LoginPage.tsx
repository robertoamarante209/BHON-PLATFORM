import React, { useCallback, useState } from 'react';
import { ArrowRight, Lock, Mail } from 'lucide-react';
import { useLocation } from 'wouter';
import { useAuth } from '../../context/AuthContext';
import { BrandIntro } from '../../components/brand/BrandIntro';

const INTRO_SESSION_KEY = 'bhon:intro-seen';

function shouldShowBrandIntro() {
  try { return window.sessionStorage.getItem(INTRO_SESSION_KEY) !== 'true'; }
  catch { return true; }
}

export const LoginPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('roberto@odontoprime.com.br');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showBrandIntro, setShowBrandIntro] = useState(shouldShowBrandIntro);

  const finishBrandIntro = useCallback(() => {
    try { window.sessionStorage.setItem(INTRO_SESSION_KEY, 'true'); } catch { /* armazenamento opcional */ }
    setShowBrandIntro(false);
  }, []);

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

  if (showBrandIntro) return <BrandIntro onComplete={finishBrandIntro} />;

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-bhon-navy px-4 py-8 sm:p-6">
      <div className="w-full max-w-md">
        <main className="overflow-hidden rounded-xl border border-white/10 bg-white shadow-2xl shadow-black/30">
          <header className="border-b border-white/10 bg-bhon-navy px-6 py-7 text-center sm:px-8 sm:py-8">
            <div className="mx-auto h-28 w-full max-w-sm overflow-hidden rounded-lg bg-bhon-navy">
              <img
                src="/brand-lockup.webp"
                alt="BHON — A clínica no controle."
                className="h-full w-full object-cover object-center"
              />
            </div>
            <p className="mt-3 text-xs font-medium tracking-wide text-slate-300">
              Sistema Operacional Clínico
            </p>
          </header>

          <div className="p-5 sm:p-8">
            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="mb-4 rounded-md border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800"
              >
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-bhon-text">
                  E-mail Institucional
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-bhon-muted" />
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="seu.nome@clinica.com.br"
                    autoComplete="username"
                    autoCapitalize="none"
                    spellCheck={false}
                    required
                    className="w-full rounded border border-bhon-border py-2 pl-9 pr-3 text-xs text-bhon-text focus:border-bhon-teal focus:outline-none focus:ring-1 focus:ring-bhon-teal"
                  />
                </div>
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between">
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-bhon-text">
                    Senha de Acesso
                  </label>
                  <span className="ml-4 text-right text-[10px] leading-tight text-bhon-muted sm:text-[11px]">
                    Recuperação com o administrador
                  </span>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-bhon-muted" />
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    required
                    className="w-full rounded border border-bhon-border py-2 pl-9 pr-3 font-mono text-xs text-bhon-text focus:border-bhon-teal focus:outline-none focus:ring-1 focus:ring-bhon-teal"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2 pt-1 text-bhon-muted">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                  className="rounded border-bhon-border text-bhon-teal focus:ring-bhon-teal"
                />
                <span>Lembrar meu acesso</span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded bg-bhon-teal py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-[background-color,transform] duration-150 ease-out hover:bg-bhon-teal-dark active:scale-[0.98] disabled:cursor-wait disabled:opacity-70"
              >
                <span>{isSubmitting ? 'Autenticando…' : 'Acessar Operação'}</span>
                {!isSubmitting && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </div>
        </main>

        <footer className="mt-6 text-center font-mono-data text-[11px] text-slate-400">
          <p>BHON Clinical Operating System • Multi-Tenant v2.4</p>
          <p className="mt-1 text-[10px] text-slate-500">
            Sessão autenticada com controle de acesso por perfil
          </p>
        </footer>
      </div>
    </div>
  );
};
