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
    <div className="min-h-screen bg-surface flex items-center justify-center p-6 font-body relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-[0.03] pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-tertiary rounded-full blur-[120px]"></div>
      </div>
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md relative z-10"
      >
        <div className="bg-surface-container-lowest p-10 rounded-[2.5rem] shadow-2xl shadow-black/5 border border-outline-variant/10 space-y-10">
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-primary shadow-xl shadow-primary/20 rotate-3 hover:rotate-0 transition-transform duration-500">
              <Lock className="w-10 h-10 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight font-headline text-on-surface leading-tight">Saúde Maternal</h1>
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary font-black mt-2">Curadoria Clínica • Acesso Restrito</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="cpf" className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest ml-1">
                  Identificação (CPF)
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-on-surface-variant/30 group-focus-within:text-primary transition-colors">
                    <User className="w-5 h-5" />
                  </div>
                  <input
                    id="cpf"
                    type="text"
                    placeholder="000.000.000-00"
                    value={cpf}
                    onChange={handleCpfChange}
                    className="w-full bg-surface-container-low border border-transparent rounded-2xl py-4 pl-14 pr-5 text-on-surface font-bold placeholder:text-on-surface-variant/20 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all text-lg tracking-tight"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label htmlFor="password" className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest ml-1">
                  Senha de Acesso
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none text-on-surface-variant/30 group-focus-within:text-primary transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-container-low border border-transparent rounded-2xl py-4 pl-14 pr-5 text-on-surface font-bold placeholder:text-on-surface-variant/20 focus:outline-none focus:ring-4 focus:ring-primary/5 focus:bg-white focus:border-primary/20 transition-all text-lg tracking-tight"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-4 p-5 rounded-2xl bg-error/5 border border-error/10 text-error text-sm font-bold"
              >
                <AlertCircle className="w-6 h-6 flex-shrink-0" />
                <p className="leading-tight">{error}</p>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/50 text-on-primary font-black py-5 rounded-2xl shadow-2xl shadow-primary/30 transition-all flex items-center justify-center gap-3 group active:scale-[0.98]"
            >
              {isSubmitting ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <>
                  <span className="text-lg">Entrar no Sistema</span>
                  <motion.span 
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="material-symbols-outlined"
                  >
                    arrow_forward
                  </motion.span>
                </>
              )}
            </button>
          </form>

          <div className="pt-6 text-center border-t border-outline-variant/10">
            <p className="text-[9px] text-on-surface-variant/40 font-black uppercase tracking-[0.2em]">
              © 2026 Saúde Maternal • Protocolo de Segurança Ativo
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
