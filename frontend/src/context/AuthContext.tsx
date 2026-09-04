import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Tenant } from '../types';

interface AuthContextType {
  currentUser: User;
  currentClinic: Tenant;
  isPlatformOwner: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  logout: () => Promise<void>;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<User | null>;
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

  const applySession = useCallback((user: User & { tenant?: Tenant }) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    if (user.tenant) setCurrentClinic(user.tenant);
  }, []);

  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/auth/me', { credentials: 'include', headers: { Accept: 'application/json' } });
      if (!response.ok) {
        setIsAuthenticated(false); setCurrentUser(EMPTY_USER); setCurrentClinic(EMPTY_CLINIC); return;
      }
      const data = await response.json();
      if (data.user) applySession(data.user);
      else { setIsAuthenticated(false); setCurrentUser(EMPTY_USER); setCurrentClinic(EMPTY_CLINIC); }
    } catch {
      setIsAuthenticated(false); setCurrentUser(EMPTY_USER); setCurrentClinic(EMPTY_CLINIC);
    } finally {
      setIsLoadingAuth(false);
    }
  }, [applySession]);

  useEffect(() => { void refreshSession(); }, [refreshSession]);

  const login = async (email: string, password: string, rememberMe = true): Promise<User | null> => {
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
  };

  const logout = async () => {
    try { await fetch('/auth/logout', { method: 'POST', credentials: 'include' }); }
    finally {
      setIsAuthenticated(false); setCurrentUser(EMPTY_USER); setCurrentClinic(EMPTY_CLINIC);
      window.location.href = '/login';
    }
  };

  return <AuthContext.Provider value={{ currentUser, currentClinic, isPlatformOwner: currentUser.role === 'PLATFORM_OWNER', isAuthenticated, isLoadingAuth, logout, login, refreshSession }}>
    {children}
  </AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  return context;
};
