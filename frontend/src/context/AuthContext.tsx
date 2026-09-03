import React, { createContext, useContext, useState, useEffect } from 'react';
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
  logout: () => void;
  login: (email: string, password: string) => Promise<boolean>;
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
    return initialUsers[0]; // Dr. Roberto Carlos Fagundes (OWNER)
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
    return initialClinics[0]; // OdontoPrime Especialidades
  });

  useEffect(() => {
    localStorage.setItem('bhon_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('bhon_clinic', JSON.stringify(currentClinic));
  }, [currentClinic]);

  const switchRole = (role: UserRole) => {
    const targetUser = initialUsers.find(u => u.role === role);
    if (targetUser) {
      setCurrentUser(targetUser);
      if (role === 'PLATFORM_OWNER') {
        // Switch to platform context
      } else {
        // Ensure clinic context
        if (currentClinic.id === 'platform-bhon') {
          setCurrentClinic(initialClinics[0]);
        }
      }
    }
    return true;
  };

  const login = async (email: string, password: string): Promise<boolean> => {
    const response = await fetch('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    if (!response.ok) return false;
    const data = await response.json();
    setCurrentUser(data.user);

    return true;
  };
  const logout = () => {
    // Para conveniência do operador, redireciona para a tela de login
    window.location.href = '/login';
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
        logout,
        login,
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
