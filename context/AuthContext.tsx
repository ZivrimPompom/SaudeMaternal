'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface Operator {
  id: string;
  nome: string;
  cpf: string;
  status: string;
  sigla: string;
  nivel_acesso?: string;
}

interface AuthContextType {
  user: Operator | null;
  loading: boolean;
  signInWithCpf: (cpf: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Operator | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const savedUser = localStorage.getItem('saude_maternal_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        // Fallback for older versions that might have 'name' instead of 'nome'
        if (parsed && !parsed.nome && parsed.name) {
          parsed.nome = parsed.name;
        }
        setUser(parsed);
      } catch (e) {
        localStorage.removeItem('saude_maternal_user');
      }
    }
    setLoading(false);
    setIsInitialized(true);
  }, []);

  const signInWithCpf = async (cpf: string, password: string) => {
    try {
      const { data, error } = await supabase
        .from('operadores')
        .select('*')
        .eq('cpf', cpf)
        .eq('senha', password)
        .single();

      if (error || !data) {
        return { error: 'CPF ou senha inválidos.' };
      }

      if (data.status === 'Bloqueado') {
        return { error: 'Este usuário está bloqueado.' };
      }

      const operator: Operator = {
        id: data.id,
        nome: data.nome,
        cpf: data.cpf,
        status: data.status,
        sigla: data.sigla,
        nivel_acesso: data.nivel_acesso
      };

      setUser(operator);
      localStorage.setItem('saude_maternal_user', JSON.stringify(operator));
      router.push('/');
      return { error: null };
    } catch (err) {
      return { error: 'Erro ao conectar com o servidor.' };
    }
  };

  const signOut = () => {
    setUser(null);
    localStorage.removeItem('saude_maternal_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signInWithCpf, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
