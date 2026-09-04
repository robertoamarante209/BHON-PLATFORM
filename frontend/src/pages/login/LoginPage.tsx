import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../../context/AuthContext';
import { Lock, Mail, ArrowRight } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [, setLocation] = useLocation();
  const { login } = useAuth();

  const [email, setEmail] = useState('roberto@odontoprime.com.br');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email || !password) {
      setError('Informe seu e-mail institucional e sua senha.');
      return;
    }
    const user = await login(email, password, rememberMe);
    if (!user) {
      setError('Não foi possível autenticar. Verifique suas credenciais ou contate o administrador.');
      return;
    }
    setLocation(user.role === 'PLATFORM_OWNER' ? '/platform/overview' : '/clinic/overview');
  };

  return (
    <div className="min-h-screen bg-bhon-navy flex flex-col items-center justify-center p-6 select-none relative">
      <div className="w-full max-w-md">
        {/* Card do Formulário de Acesso */}
        <div className="bg-white rounded-md border border-bhon-border shadow-2xl p-8">
          {/* Cabeçalho de Identidade */}
          <div className="text-center mb-6">
            <img
              src="/logo.png"
              alt="BHON — A clínica no controle."
              className="h-12 mx-auto mb-2"
            />
            <p className="text-xs text-bhon-muted font-medium">
              Sistema Operacional Clínico
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-bhon-text mb-1 uppercase tracking-wider text-[11px]">
                E-mail Institucional
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-bhon-muted absolute left-3 top-2.5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu.nome@clinica.com.br"
                  required
                  className="w-full pl-9 pr-3 py-2 border border-bhon-border rounded text-xs text-bhon-text focus:outline-none focus:border-bhon-teal focus:ring-1 focus:ring-bhon-teal"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-bhon-text uppercase tracking-wider text-[11px]">
                  Senha de Acesso
                </label>
                <span className="text-[11px] text-bhon-muted">Recuperação de acesso com o administrador</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-bhon-muted absolute left-3 top-2.5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-9 pr-3 py-2 border border-bhon-border rounded text-xs text-bhon-text focus:outline-none focus:border-bhon-teal focus:ring-1 focus:ring-bhon-teal font-mono"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-bhon-muted">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-bhon-border text-bhon-teal focus:ring-bhon-teal"
                />
                <span>Lembrar meu acesso</span>
              </label>
            </div>

            <button
              type="submit"
              className="w-full mt-2 py-2.5 bg-bhon-teal hover:bg-bhon-teal-dark text-white font-bold rounded transition-colors text-xs uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <span>Acessar Operação</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

        </div>

        {/* Rodapé de Segurança e Credibilidade */}
        <div className="text-center mt-6 text-[11px] text-slate-400 font-mono-data">
          <p>BHON Clinical Operating System • Multi-Tenant v2.4</p>
          <p className="text-[10px] text-slate-500 mt-1">Sessão autenticada com controle de acesso por perfil</p>
        </div>
      </div>
    </div>
  );
};
