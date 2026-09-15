import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Tenant } from '../types';

interface AuthContextType {
  currentUser: User;
  currentClinic: Tenant;
  isPlatformOwner: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  sessionError: string;
  logout: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User | null>;
  loginWithGoogle: (credential: string, rememberMe?: boolean) => Promise<User | null>;
  refreshSession: () => Promise<void>;
}

const EMPTY_USER: User = { id: '', tenantId: '', name: '', email: '', role: 'VIEWER', status: 'INACTIVE' };
const EMPTY_CLINIC: Tenant = { id: '', name: '', slug: '', email: '', status: 'ACTIVE', planCode: '', createdAt: '', activeRoomsCount: 0 };
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(EMPTY_USER);
  const [currentClinic, setCurrentClinic] = useState<Tenant>(EMPTY_CLINIC);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [sessionError, setSessionError] = useState('');
  const authRevision = useRef(0);
  const logoutInFlight = useRef<Promise<void> | null>(null);

  const applySession = useCallback((user: User & { tenant?: Tenant }) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    if (user.tenant) setCurrentClinic(user.tenant);
  }, []);

  const refreshSession = useCallback(async () => {
    const revision = authRevision.current;
    try {
      const response = await fetch('/auth/me', { credentials: 'include', headers: { Accept: 'application/json' } });
      if (revision !== authRevision.current) return;
      if (!response.ok) {
        let code = '';
        try { code = (await response.json() as { code?: string }).code || ''; } catch { /* resposta inválida é transitória */ }
        if (response.status === 401 || (response.status === 403 && ['USER_BLOCKED', 'TENANT_UNAVAILABLE'].includes(code))) {
          setIsAuthenticated(false); setCurrentUser(EMPTY_USER); setCurrentClinic(EMPTY_CLINIC); setSessionError('');
        } else setSessionError('Não foi possível verificar sua sessão. Tente novamente.');
        return;
      }
      const data = await response.json();
      if (revision !== authRevision.current) return;
      if (data.user) { applySession(data.user); setSessionError(''); }
      else setSessionError('Não foi possível verificar sua sessão. Tente novamente.');
    } catch {
      if (revision !== authRevision.current) return;
      setSessionError('Não foi possível verificar sua sessão. Tente novamente.');
    } finally {
      setIsLoadingAuth(false);
    }
  }, [applySession]);

  useEffect(() => { void refreshSession(); }, [refreshSession]);

  const login = useCallback(async (email: string, password: string, rememberMe = true): Promise<User | null> => {
    const revision = ++authRevision.current;
    try {
      await logoutInFlight.current;
      if (revision !== authRevision.current) return null;
      const response = await fetch('/auth/login', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      if (revision !== authRevision.current || !response.ok) return null;
      const data = await response.json();
      if (revision !== authRevision.current || !data.user) return null;
      applySession(data.user);
      setSessionError('');
      return data.user;
    } catch { return null; }
  }, [applySession]);

  const loginWithGoogle = useCallback(async (credential: string, rememberMe = true): Promise<User | null> => {
    const revision = ++authRevision.current;
    try {
      await logoutInFlight.current;
      if (revision !== authRevision.current) return null;
      const response = await fetch('/auth/google', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ credential, rememberMe }),
      });
      if (revision !== authRevision.current || !response.ok) return null;
      const data = await response.json();
      if (revision !== authRevision.current || !data.user) return null;
      applySession(data.user);
      setSessionError('');
      return data.user;
    } catch { return null; }
  }, [applySession]);

  const logout = useCallback(() => {
    if (logoutInFlight.current) return logoutInFlight.current;
    const revision = ++authRevision.current;
    const operation = (async () => {
      try { await fetch('/auth/logout', { method: 'POST', credentials: 'include' }); }
      catch { /* logout local continua mesmo se o servidor estiver indisponível */ }
      finally {
        if (revision !== authRevision.current) return;
        setIsAuthenticated(false); setCurrentUser(EMPTY_USER); setCurrentClinic(EMPTY_CLINIC);
        window.location.href = '/login';
      }
    })();
    logoutInFlight.current = operation;
    void operation.finally(() => { if (logoutInFlight.current === operation) logoutInFlight.current = null; });
    return operation;
  }, []);

  return <AuthContext.Provider value={{ currentUser, currentClinic, isPlatformOwner: currentUser.role === 'PLATFORM_OWNER', isAuthenticated, isLoadingAuth, sessionError, logout, login, loginWithGoogle, refreshSession }}>
    {children}
  </AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  return context;
};
