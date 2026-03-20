'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { motion } from 'motion/react';
import { Lock, User, AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCpf(e.target.value);
    setCpf(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const cleanCpf = cpf.replace(/\D/g, '');

    if (cleanCpf.length !== 11) {
      setError('CPF inválido. Deve conter 11 dígitos.');
      setIsSubmitting(false);
      return;
    }

    if (!password) {
      setError('A senha é obrigatória.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Tenta encontrar o operador pelo CPF (formatado ou limpo)
      let { data, error: supabaseError } = await supabase
        .from('operadores')
        .select('*')
        .eq('cpf', cpf)
        .maybeSingle();

      if (!data) {
        const { data: dataClean } = await supabase
          .from('operadores')
          .select('*')
          .eq('cpf', cleanCpf)
          .maybeSingle();
        data = dataClean;
      }

      if (!data) {
        setError('CPF ou senha incorretos.');
        setIsSubmitting(false);
        return;
      }

      // Verifica a senha (pode ser 'password' ou 'senha')
      const dbPassword = data.password || data.senha;
      
      if (dbPassword === password) {
        if (data.status === 'Bloqueado') {
          setError('Este operador está bloqueado. Entre em contato com o administrador.');
        } else {
          // Mapeia os dados para o formato esperado pelo AuthContext
          const operatorToLogin = {
            id: data.id,
            name: data.name || data.nome,
            cpf: data.cpf,
            status: data.status,
            initials: data.initials || data.sigla
          };
          login(operatorToLogin);
        }
      } else {
        setError('CPF ou senha incorretos.');
      }
    } catch (err) {
      console.error('Erro no login:', err);
      setError('Ocorreu um erro ao tentar entrar. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 font-body">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-surface-container-lowest p-8 rounded-2xl shadow-xl border border-outline-variant/15 space-y-8">
          <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Lock className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight font-headline text-on-surface">Saúde Maternal</h1>
            <p className="text-on-secondary-container opacity-70">Acesse o sistema com seu CPF e senha</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="cpf" className="text-sm font-medium text-on-surface/80 ml-1">
                  CPF
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-on-surface/40 group-focus-within:text-primary transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={handleCpfChange}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl py-3.5 pl-12 pr-4 text-on-surface placeholder:text-on-surface/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-on-surface/80 ml-1">
                  Senha
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-on-surface/40 group-focus-within:text-primary transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl py-3.5 pl-12 pr-4 text-on-surface placeholder:text-on-surface/30 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-error/10 border border-error/20 text-error text-sm"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p>{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-on-primary font-bold py-4 rounded-xl shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Entrar no Sistema
                </>
              )}
            </button>
          </form>

          <div className="pt-4 text-center">
            <p className="text-xs text-on-surface/40">
              Sistema Restrito para Operadores Autorizados
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
