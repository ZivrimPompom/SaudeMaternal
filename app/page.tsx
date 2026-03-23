'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { Users, UserPlus, Shield, Activity, Briefcase, UserCheck, ClipboardList, Plus, Building2 } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function Page() {
  const [stats, setStats] = useState({ operators: 0, categories: 0, professionals: 0, routines: 0, patients: 0, units: 0 });

  useEffect(() => {
    if (isSupabaseConfigured) {
      Promise.all([
        supabase.from('operadores').select('cpf', { count: 'exact', head: true }),
        supabase.from('categorias_profissionais').select('cbo', { count: 'exact', head: true }),
        supabase.from('profissionais').select('cpf', { count: 'exact', head: true }),
        supabase.from('rotinas').select('id', { count: 'exact', head: true }),
        supabase.from('pacientes').select('id', { count: 'exact', head: true }),
        supabase.from('unidades_saude').select('cnes', { count: 'exact', head: true })
      ]).then(([ops, cats, pros, rots, pacs, units]) => {
        setStats({
          operators: ops.count || 0,
          categories: cats.count || 0,
          professionals: pros.count || 0,
          routines: rots.count || 0,
          patients: pacs.count || 0,
          units: units.count || 0
        });
      });
    } else {
      // Use a small delay to avoid synchronous state update in effect
      const timer = setTimeout(() => {
        setStats({ operators: 3, categories: 12, professionals: 8, routines: 15, patients: 42, units: 5 }); // Sample count
      }, 0);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <DashboardLayout>
      <div className="p-6 md:p-10 lg:p-16 pb-32 max-w-7xl mx-auto space-y-10 md:space-y-16">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-1.5 bg-primary rounded-full"></span>
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Dashboard Principal</span>
          </div>
          <h2 className="text-4xl md:text-6xl font-black tracking-tight font-headline text-on-surface leading-tight">Painel de Controle</h2>
          <p className="text-lg md:text-xl text-on-surface-variant/60 font-body max-w-2xl">Bem-vindo ao ecossistema Saúde Maternal. Gerencie as operações clínicas e administrativas com precisão e segurança.</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-10">
          <Link href="/operadores" className="bg-surface-container-lowest p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-700" />
            
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 group-hover:bg-primary group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <Shield className="text-primary group-hover:text-white w-8 h-8 transition-colors" />
            </div>
            
            <h3 className="text-3xl font-black font-headline mb-3 text-on-surface tracking-tight">Operadores</h3>
            <p className="text-sm text-on-surface-variant/60 font-body mb-10 leading-relaxed">Gestão centralizada de perfis, credenciais e níveis de acesso para profissionais de saúde.</p>
            
            <div className="mt-auto flex items-center justify-between pt-8 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-1">Total Ativos</span>
                <span className="text-3xl font-black text-primary font-headline">{stats.operators}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <UserPlus className="w-6 h-6 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/pacientes" className="bg-surface-container-lowest p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-700" />
            
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 group-hover:bg-primary group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <Users className="text-primary group-hover:text-white w-8 h-8 transition-colors" />
            </div>
            
            <h3 className="text-3xl font-black font-headline mb-3 text-on-surface tracking-tight">Pacientes</h3>
            <p className="text-sm text-on-surface-variant/60 font-body mb-10 leading-relaxed">Cadastro de gestantes, acompanhamento de prontuários e histórico clínico.</p>
            
            <div className="mt-auto flex items-center justify-between pt-8 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-1">Gestantes</span>
                <span className="text-3xl font-black text-primary font-headline">{stats.patients}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-6 h-6 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/categorias" className="bg-surface-container-lowest p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full">
            <div className="absolute top-0 right-0 w-48 h-48 bg-secondary/5 rounded-full -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-700" />
            
            <div className="w-16 h-16 rounded-3xl bg-secondary/10 flex items-center justify-center mb-8 group-hover:bg-secondary group-hover:-rotate-6 transition-all duration-500 shadow-lg shadow-secondary/5">
              <Briefcase className="text-secondary group-hover:text-white w-8 h-8 transition-colors" />
            </div>
            
            <h3 className="text-3xl font-black font-headline mb-3 text-on-surface tracking-tight">Categorias</h3>
            <p className="text-sm text-on-surface-variant/60 font-body mb-10 leading-relaxed">Definição de cargos, vínculos empregatícios e carga horária semanal (CBO).</p>
            
            <div className="mt-auto flex items-center justify-between pt-8 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-1">CBOs Cadastrados</span>
                <span className="text-3xl font-black text-secondary font-headline">{stats.categories}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center group-hover:bg-secondary/10 transition-colors">
                <Activity className="w-6 h-6 text-on-surface-variant/40 group-hover:text-secondary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/profissionais" className="bg-surface-container-lowest p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-700" />
            
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 group-hover:bg-primary group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <UserCheck className="text-primary group-hover:text-white w-8 h-8 transition-colors" />
            </div>
            
            <h3 className="text-3xl font-black font-headline mb-3 text-on-surface tracking-tight">Profissionais</h3>
            <p className="text-sm text-on-surface-variant/60 font-body mb-10 leading-relaxed">Cadastro detalhado de profissionais de saúde, CNS, CBO e vínculos contratuais.</p>
            
            <div className="mt-auto flex items-center justify-between pt-8 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-1">Total Cadastrados</span>
                <span className="text-3xl font-black text-primary font-headline">{stats.professionals}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <UserPlus className="w-6 h-6 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/rotinas" className="bg-surface-container-lowest p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-700" />
            
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 group-hover:bg-primary group-hover:-rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <ClipboardList className="text-primary group-hover:text-white w-8 h-8 transition-colors" />
            </div>
            
            <h3 className="text-3xl font-black font-headline mb-3 text-on-surface tracking-tight">Rotinas</h3>
            <p className="text-sm text-on-surface-variant/60 font-body mb-10 leading-relaxed">Protocolos de Pré-natal: exames, vacinas e medicações por trimestre gestacional.</p>
            
            <div className="mt-auto flex items-center justify-between pt-8 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-1">Protocolos Ativos</span>
                <span className="text-3xl font-black text-primary font-headline">{stats.routines}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-6 h-6 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/unidades" className="bg-surface-container-lowest p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-2xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full">
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full -mr-24 -mt-24 group-hover:scale-125 transition-transform duration-700" />
            
            <div className="w-16 h-16 rounded-3xl bg-primary/10 flex items-center justify-center mb-8 group-hover:bg-primary group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <Building2 className="text-primary group-hover:text-white w-8 h-8 transition-colors" />
            </div>
            
            <h3 className="text-3xl font-black font-headline mb-3 text-on-surface tracking-tight">Unidades</h3>
            <p className="text-sm text-on-surface-variant/60 font-body mb-10 leading-relaxed">Gestão de estabelecimentos de saúde, CNES e endereços da rede.</p>
            
            <div className="mt-auto flex items-center justify-between pt-8 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40 mb-1">Total Unidades</span>
                <span className="text-3xl font-black text-primary font-headline">{stats.units}</span>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-6 h-6 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <div className="bg-surface-container-lowest/50 p-8 md:p-10 rounded-[2.5rem] md:rounded-[3rem] shadow-sm border border-outline-variant/5 opacity-60 flex flex-col h-full grayscale hover:grayscale-0 transition-all duration-500">
            <div className="w-16 h-16 rounded-3xl bg-surface-container-high flex items-center justify-center mb-8">
              <Shield className="text-on-surface-variant/30 w-8 h-8" />
            </div>
            <h3 className="text-3xl font-black font-headline mb-3 text-on-surface/40 tracking-tight">Segurança</h3>
            <p className="text-sm text-on-surface-variant/40 font-body mb-10 leading-relaxed">Auditoria avançada e logs de conformidade. Rastreabilidade total de operações.</p>
            <div className="mt-auto pt-8 border-t border-outline-variant/5 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-on-surface-variant/20"></span>
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/20">Em Homologação</span>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
