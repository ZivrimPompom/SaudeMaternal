'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface Operator {
  id: string;
  name: string;
  cpf: string;
  status: string;
  initials?: string;
}

interface AuthContextType {
  operator: Operator | null;
  login: (operator: Operator) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [operator, setOperator] = useState<Operator | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check for session in localStorage
    const savedOperator = localStorage.getItem('saude_maternal_operator');
    let parsed = null;
    if (savedOperator) {
      try {
        parsed = JSON.parse(savedOperator);
      } catch (e) {
        console.error('Erro ao ler sessão do operador', e);
        localStorage.removeItem('saude_maternal_operator');
      }
    }
    
    // Update state asynchronously to avoid lint error and ensure consistency
    setTimeout(() => {
      if (parsed) setOperator(parsed);
      setIsLoading(false);
    }, 0);
  }, []);

  useEffect(() => {
    if (!isLoading) {
      if (!operator && pathname !== '/login') {
        router.push('/login');
      } else if (operator && pathname === '/login') {
        router.push('/');
      }
    }
  }, [operator, isLoading, pathname, router]);

  const login = (newOperator: Operator) => {
    setOperator(newOperator);
    localStorage.setItem('saude_maternal_operator', JSON.stringify(newOperator));
    router.push('/');
  };

  const logout = () => {
    setOperator(null);
    localStorage.removeItem('saude_maternal_operator');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ operator, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
}
