import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { User, Tenant } from '../types';

interface AuthContextType {
  currentUser: User;
  currentClinic: Tenant;
  isPlatformOwner: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  sessionIssue: SessionIssue;
  logout: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User | null>;
  loginWithGoogle: (credential: string, rememberMe?: boolean) => Promise<User | null>;
  refreshSession: () => Promise<void>;
}

export type SessionIssue = 'SESSION_RECOVERY_FAILED' | 'USER_BLOCKED' | 'TENANT_UNAVAILABLE' | null;

const EMPTY_USER: User = { id: '', tenantId: '', name: '', email: '', role: 'VIEWER', status: 'INACTIVE' };
const EMPTY_CLINIC: Tenant = { id: '', name: '', slug: '', email: '', status: 'ACTIVE', planCode: '', createdAt: '', activeRoomsCount: 0 };
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(EMPTY_USER);
  const [currentClinic, setCurrentClinic] = useState<Tenant>(EMPTY_CLINIC);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [sessionIssue, setSessionIssue] = useState<SessionIssue>(null);
  const authRevision = useRef(0);

  const applySession = useCallback((user: User & { tenant?: Tenant }) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setSessionIssue(null);
    if (user.tenant) setCurrentClinic(user.tenant);
  }, []);

  const clearSession = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentUser(EMPTY_USER);
    setCurrentClinic(EMPTY_CLINIC);
    setSessionIssue(null);
  }, []);

  const refreshSession = useCallback(async () => {
    const revision = authRevision.current;
    try {
      const response = await fetch('/auth/me', { credentials: 'include', headers: { Accept: 'application/json' } });
      if (revision !== authRevision.current) return;
      if (!response.ok) {
        if (response.status === 401) {
          clearSession();
          return;
        }
        if (response.status === 403) {
          const data = await response.json().catch(() => ({})) as { code?: string };
          if (revision !== authRevision.current) return;
          setSessionIssue(data.code === 'USER_BLOCKED' ? 'USER_BLOCKED' : data.code === 'TENANT_UNAVAILABLE' ? 'TENANT_UNAVAILABLE' : 'SESSION_RECOVERY_FAILED');
          return;
        }
        setSessionIssue('SESSION_RECOVERY_FAILED');
        return;
      }
      const data = await response.json();
      if (revision !== authRevision.current) return;
      if (data.user) applySession(data.user);
      else setSessionIssue('SESSION_RECOVERY_FAILED');
    } catch {
      if (revision !== authRevision.current) return;
      setSessionIssue('SESSION_RECOVERY_FAILED');
    } finally {
      setIsLoadingAuth(false);
    }
  }, [applySession, clearSession]);

  useEffect(() => { void refreshSession(); }, [refreshSession]);

  const login = useCallback(async (email: string, password: string, rememberMe = true): Promise<User | null> => {
    authRevision.current += 1;
    try {
      const response = await fetch('/auth/login', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email, password, rememberMe }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.user) return null;
      applySession(data.user);
      return data.user;
    } catch { return null; }
  }, [applySession]);

  const loginWithGoogle = useCallback(async (credential: string, rememberMe = true): Promise<User | null> => {
    authRevision.current += 1;
    try {
      const response = await fetch('/auth/google', {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ credential, rememberMe }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.user) return null;
      applySession(data.user);
      return data.user;
    } catch { return null; }
  }, [applySession]);

  const logout = useCallback(async () => {
    authRevision.current += 1;
    try { await fetch('/auth/logout', { method: 'POST', credentials: 'include' }); }
    finally {
      clearSession();
      window.location.href = '/login';
    }
  }, [clearSession]);

  return <AuthContext.Provider value={{ currentUser, currentClinic, isPlatformOwner: currentUser.role === 'PLATFORM_OWNER', isAuthenticated, isLoadingAuth, sessionIssue, logout, login, loginWithGoogle, refreshSession }}>
    {children}
  </AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  return context;
};
