import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Tenant, UserRole } from '../types';
import { initialUsers, initialClinics } from '../data/initialData';

interface AuthContextType {
  currentUser: User;
  currentClinic: Tenant;
  availableClinics: Tenant[];
  availableUsers: User[];
  setCurrentUser: (user: User) => void;
  setCurrentClinic: (clinic: Tenant) => void;
  switchRole: (role: UserRole) => void;
  isPlatformOwner: boolean;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  logout: () => Promise<void>;
  login: (email: string, password: string) => Promise<boolean>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const saved = localStorage.getItem('bhon_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return initialUsers[0]; // Fallback inicial seguro
  });

  const [currentClinic, setCurrentClinic] = useState<Tenant>(() => {
    const saved = localStorage.getItem('bhon_clinic');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // fallback
      }
    }
    return initialClinics[0]; // Fallback inicial seguro
  });

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return !!localStorage.getItem('bhon_authenticated');
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);

  // Validação real de sessão no backend via Cookie HttpOnly
  const refreshSession = useCallback(async () => {
    try {
      const response = await fetch('/auth/me', {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setCurrentUser(data.user);
          setIsAuthenticated(true);
          localStorage.setItem('bhon_user', JSON.stringify(data.user));
          localStorage.setItem('bhon_authenticated', 'true');

          if (data.user.tenant) {
            setCurrentClinic(data.user.tenant);
            localStorage.setItem('bhon_clinic', JSON.stringify(data.user.tenant));
          }
        }
      } else if (response.status === 401) {
        // Sessão expirada ou não autenticado
        setIsAuthenticated(false);
        localStorage.removeItem('bhon_authenticated');
      }
    } catch {
      // Offline ou erro de rede: preserva estado local para resiliência operacional
    } finally {
      setIsLoadingAuth(false);
    }
  }, []);

  useEffect(() => {
    refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    localStorage.setItem('bhon_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('bhon_clinic', JSON.stringify(currentClinic));
  }, [currentClinic]);

  // Função mantida com aviso seguro para compatibilidade
  const switchRole = (role: UserRole) => {
    const targetUser = initialUsers.find(u => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
      if (role !== 'PLATFORM_OWNER' && currentClinic.id === 'platform-bhon') {
        setCurrentClinic(initialClinics[0]);
      }
    }
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });

      if (!response.ok) return false;

      const data = await response.json();
      if (data.user) {
        setCurrentUser(data.user);
        setIsAuthenticated(true);
        localStorage.setItem('bhon_user', JSON.stringify(data.user));
        localStorage.setItem('bhon_authenticated', 'true');

        if (data.user.tenant) {
          setCurrentClinic(data.user.tenant);
          localStorage.setItem('bhon_clinic', JSON.stringify(data.user.tenant));
        }
      }

      return true;
    } catch {
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch {
      // Ignora erro de rede no logout
    } finally {
      setIsAuthenticated(false);
      localStorage.removeItem('bhon_authenticated');
      window.location.href = '/login';
    }
  };

  const isPlatformOwner = currentUser.role === 'PLATFORM_OWNER';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        currentClinic,
        availableClinics: initialClinics,
        availableUsers: initialUsers,
        setCurrentUser,
        setCurrentClinic,
        switchRole,
        isPlatformOwner,
        isAuthenticated,
        isLoadingAuth,
        logout,
        login,
        refreshSession
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
};
