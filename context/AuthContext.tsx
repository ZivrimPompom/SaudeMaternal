'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface User {
  id: string;
  cpf: string;
  nome: string;
  perfil: 'ADMINISTRADOR' | 'OPERADOR';
  unidade_id?: string;
  unidade_cnes?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (cpf: string, senha: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkUser = () => {
      const storedUser = localStorage.getItem('mae_paulistana_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }
      setLoading(false);
    };
    checkUser();
  }, []);

  const signIn = async (cpf: string, senha: string) => {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase não configurado.');
    }

    const { data, error } = await supabase
      .from('operadores')
      .select('*')
      .eq('cpf', cpf.replace(/\D/g, ''))
      .eq('senha', senha)
      .eq('ativo', true)
      .single();

    if (error || !data) {
      throw new Error('CPF ou senha incorretos, ou usuário inativo.');
    }

    const userData: User = {
      id: data.id,
      cpf: data.cpf,
      nome: data.nome,
      perfil: data.perfil,
      unidade_id: data.unidade_id,
      unidade_cnes: data.unidade_cnes
    };

    setUser(userData);
    localStorage.setItem('mae_paulistana_user', JSON.stringify(userData));
    router.push('/');
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem('mae_paulistana_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
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
