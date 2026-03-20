'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { Users, UserPlus, Shield, Activity } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function Page() {
  const [stats, setStats] = useState({ operators: 0 });

  useEffect(() => {
    if (isSupabaseConfigured) {
      supabase.from('operadores').select('cpf', { count: 'exact', head: true })
        .then(({ count }) => setStats({ operators: count || 0 }));
    } else {
      // Use a small delay to avoid synchronous state update in effect
      const timer = setTimeout(() => {
        setStats({ operators: 3 }); // Sample count
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="p-8 lg:p-12 pb-32 max-w-7xl mx-auto space-y-12">
        <header className="space-y-2">
          <h2 className="text-5xl font-black tracking-tight font-headline text-slate-900">Menu Inicial</h2>
          <p className="text-lg text-slate-500 font-body">Bem-vindo ao sistema Saúde Maternal</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Link href="/operadores" className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 hover:border-primary hover:shadow-xl hover:shadow-primary/5 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 group-hover:scale-110 transition-transform" />
            
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
              <Users className="text-primary group-hover:text-white w-7 h-7" />
            </div>
            
            <h3 className="text-2xl font-bold font-headline mb-2 text-slate-900">Operadores</h3>
            <p className="text-sm text-slate-500 font-body mb-6 leading-relaxed">Gerencie os perfis de acesso e operadores do sistema.</p>
            
            <div className="flex items-center justify-between pt-6 border-t border-slate-50">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cadastrados</span>
                <span className="text-xl font-black text-primary">{stats.operators}</span>
              </div>
              <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <UserPlus className="w-5 h-5 text-slate-400 group-hover:text-primary" />
              </div>
            </div>
          </Link>

          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 opacity-50 cursor-not-allowed">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex-none flex items-center justify-center mb-6">
              <Activity className="text-slate-400 w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold font-headline mb-2 text-slate-900">Movimentação</h3>
            <p className="text-sm text-slate-500 font-body">Módulo em desenvolvimento.</p>
          </div>

          <div className="bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 opacity-50 cursor-not-allowed">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex-none flex items-center justify-center mb-6">
              <Shield className="text-slate-400 w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold font-headline mb-2 text-slate-900">Segurança</h3>
            <p className="text-sm text-slate-500 font-body">Auditoria e logs do sistema.</p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
