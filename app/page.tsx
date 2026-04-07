'use client';

import React, { useEffect, useState } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { Users, UserPlus, Shield, Activity, Briefcase, UserCheck, ClipboardList, Plus, Building2, HeartPulse, Stethoscope, FlaskConical } from 'lucide-react';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

export default function Page() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const [stats, setStats] = useState({ operators: 0, categories: 0, professionals: 0, routines: 0, patients: 0, units: 0, gestations: 0, consultations: 0, examResults: 0, outcomes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!mounted) return;
    if (isSupabaseConfigured) {
      setLoading(true);
      setError(null);
      Promise.all([
        supabase.from('operadores').select('*', { count: 'exact', head: true }),
        supabase.from('categorias_profissionais').select('*', { count: 'exact', head: true }),
        supabase.from('profissionais').select('*', { count: 'exact', head: true }),
        supabase.from('rotinas').select('*', { count: 'exact', head: true }),
        supabase.from('pacientes').select('*', { count: 'exact', head: true }),
        supabase.from('unidades_saude').select('*', { count: 'exact', head: true }),
        supabase.from('gestacoes').select('*', { count: 'exact', head: true }),
        supabase.from('atendimentos').select('*', { count: 'exact', head: true }),
        supabase.from('registro_rotinas').select('*', { count: 'exact', head: true }),
        supabase.from('desfechos_e_rn').select('*', { count: 'exact', head: true })
      ]).then(([ops, cats, pros, rots, pacs, units, gests, cons, exams, outcomes]) => {
        if (cons.error) {
          console.error('Erro específico ao buscar atendimentos:', cons.error);
        }

        const errors = [ops, cats, pros, rots, pacs, units, gests, cons, exams, outcomes].filter(r => r.error);
        if (errors.length > 0) {
          console.error('Alguns erros ao buscar estatísticas:', errors);
          // We still set what we got, but log errors
        }

        setStats({
          operators: ops.count || 0,
          categories: cats.count || 0,
          professionals: pros.count || 0,
          routines: rots.count || 0,
          patients: pacs.count || 0,
          units: units.count || 0,
          gestations: gests.count || 0,
          consultations: cons.count || 0,
          examResults: exams.count || 0,
          outcomes: outcomes.count || 0
        });
      }).catch(err => {
        console.error('Erro ao buscar estatísticas:', err);
        setError('Falha ao carregar dados do servidor.');
      }).finally(() => {
        setLoading(false);
      });
    } else {
      const timer = setTimeout(() => {
        setStats({ operators: 3, categories: 12, professionals: 8, routines: 15, patients: 42, units: 5, gestations: 28, consultations: 156, examResults: 84, outcomes: 12 });
        setLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mounted]);

  if (!mounted) return null;

  return (
    <DashboardLayout>
      <div className="p-2 md:p-4 pb-12 max-w-full mx-auto space-y-4 md:space-y-6">
        <header className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-primary rounded-full"></span>
            <span className="text-[6px] font-black text-primary uppercase tracking-[0.4em]">Dashboard Principal</span>
          </div>
          <h2 className="text-xl md:text-3xl font-black tracking-tight font-headline text-primary uppercase leading-tight">Painel de Controle</h2>
          <p className="text-xs md:text-sm text-on-surface-variant/60 font-body max-w-xl">Gerencie as operações clínicas e administrativas com precisão e segurança.</p>
          {error && (
            <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-xl flex items-center gap-3 text-error">
              <span className="material-symbols-outlined text-sm">error</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">{error}</span>
            </div>
          )}
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
          <Link href="/operadores" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full min-h-[120px]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <Shield className="text-primary group-hover:text-white w-6 h-6 transition-colors" />
            </div>
            <h3 className="text-lg md:text-xl font-black font-headline mb-2 text-on-surface tracking-tight leading-none">Operadores</h3>
            <p className="text-xs md:text-sm text-on-surface-variant/60 font-body mb-3 leading-tight line-clamp-1">Perfis e acessos.</p>
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Total</span>
                <span className="text-2xl md:text-3xl font-black text-primary font-headline leading-none">{loading ? '...' : stats.operators}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <UserPlus className="w-5 h-5 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/pacientes" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full min-h-[120px]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <Users className="text-primary group-hover:text-white w-6 h-6 transition-colors" />
            </div>
            <h3 className="text-lg md:text-xl font-black font-headline mb-2 text-on-surface tracking-tight leading-none">Pacientes</h3>
            <p className="text-xs md:text-sm text-on-surface-variant/60 font-body mb-3 leading-tight line-clamp-1">Cadastro de gestantes.</p>
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Total</span>
                <span className="text-2xl md:text-3xl font-black text-primary font-headline leading-none">{loading ? '...' : stats.patients}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-5 h-5 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/categorias" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full min-h-[120px]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:-rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <Briefcase className="text-primary group-hover:text-white w-6 h-6 transition-colors" />
            </div>
            <h3 className="text-lg md:text-xl font-black font-headline mb-2 text-on-surface tracking-tight leading-none">Categorias</h3>
            <p className="text-xs md:text-sm text-on-surface-variant/60 font-body mb-3 leading-tight line-clamp-1">Cargos e vínculos.</p>
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Total</span>
                <span className="text-2xl md:text-3xl font-black text-primary font-headline leading-none">{loading ? '...' : stats.categories}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Activity className="w-5 h-5 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/profissionais" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full min-h-[120px]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <UserCheck className="text-primary group-hover:text-white w-6 h-6 transition-colors" />
            </div>
            <h3 className="text-lg md:text-xl font-black font-headline mb-2 text-on-surface tracking-tight leading-none">Profissionais</h3>
            <p className="text-xs md:text-sm text-on-surface-variant/60 font-body mb-3 leading-tight line-clamp-1">Cadastro clínico.</p>
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Total</span>
                <span className="text-2xl md:text-3xl font-black text-primary font-headline leading-none">{loading ? '...' : stats.professionals}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <UserPlus className="w-5 h-5 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/rotinas" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full min-h-[120px]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:-rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <ClipboardList className="text-primary group-hover:text-white w-6 h-6 transition-colors" />
            </div>
            <h3 className="text-lg md:text-xl font-black font-headline mb-2 text-on-surface tracking-tight leading-none">Rotinas</h3>
            <p className="text-xs md:text-sm text-on-surface-variant/60 font-body mb-3 leading-tight line-clamp-1">Protocolos PN.</p>
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Total</span>
                <span className="text-2xl md:text-3xl font-black text-primary font-headline leading-none">{loading ? '...' : stats.routines}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-5 h-5 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/unidades" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full min-h-[120px]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <Building2 className="text-primary group-hover:text-white w-6 h-6 transition-colors" />
            </div>
            <h3 className="text-lg md:text-xl font-black font-headline mb-2 text-on-surface tracking-tight leading-none">Unidades</h3>
            <p className="text-xs md:text-sm text-on-surface-variant/60 font-body mb-3 leading-tight line-clamp-1">Estabelecimentos.</p>
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Total</span>
                <span className="text-2xl md:text-3xl font-black text-primary font-headline leading-none">{loading ? '...' : stats.units}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-5 h-5 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/gestacoes" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full min-h-[120px]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:-rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <HeartPulse className="text-primary group-hover:text-white w-6 h-6 transition-colors" />
            </div>
            <h3 className="text-lg md:text-xl font-black font-headline mb-2 text-on-surface tracking-tight leading-none">Gestações</h3>
            <p className="text-xs md:text-sm text-on-surface-variant/60 font-body mb-3 leading-tight line-clamp-1">Acompanhamento.</p>
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Total</span>
                <span className="text-2xl md:text-3xl font-black text-primary font-headline leading-none">{loading ? '...' : stats.gestations}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-5 h-5 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/atendimentos" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full min-h-[120px]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <Stethoscope className="text-primary group-hover:text-white w-6 h-6 transition-colors" />
            </div>
            <h3 className="text-lg md:text-xl font-black font-headline mb-2 text-on-surface tracking-tight leading-none">Atendimentos</h3>
            <p className="text-xs md:text-sm text-on-surface-variant/60 font-body mb-3 leading-tight line-clamp-1">Consultas.</p>
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Total</span>
                <span className="text-2xl md:text-3xl font-black text-primary font-headline leading-none">{loading ? '...' : stats.consultations}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-5 h-5 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/exames" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full min-h-[120px]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <FlaskConical className="text-primary group-hover:text-white w-6 h-6 transition-colors" />
            </div>
            <h3 className="text-lg md:text-xl font-black font-headline mb-2 text-on-surface tracking-tight leading-tight">Exames</h3>
            <p className="text-xs md:text-sm text-on-surface-variant/60 font-body mb-3 leading-tight line-clamp-1">Resultados.</p>
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Total</span>
                <span className="text-2xl md:text-3xl font-black text-primary font-headline leading-none">{loading ? '...' : stats.examResults}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-5 h-5 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/desfechos" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full min-h-[120px]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <ClipboardList className="text-primary group-hover:text-white w-6 h-6 transition-colors" />
            </div>
            <h3 className="text-lg md:text-xl font-black font-headline mb-2 text-on-surface tracking-tight leading-tight">Desfechos</h3>
            <p className="text-xs md:text-sm text-on-surface-variant/60 font-body mb-3 leading-tight line-clamp-1">Encerramentos.</p>
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Total</span>
                <span className="text-2xl md:text-3xl font-black text-primary font-headline leading-none">{loading ? '...' : stats.outcomes}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-5 h-5 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>

          <Link href="/dashboard/overview" className="bg-surface-container-lowest p-4 md:p-5 rounded-2xl shadow-xl shadow-black/5 border border-outline-variant/10 hover:border-primary/30 hover:shadow-primary/10 transition-all group relative overflow-hidden flex flex-col h-full min-h-[120px]">
            <div className="absolute top-0 right-0 w-16 h-16 bg-primary/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-700" />
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary group-hover:rotate-6 transition-all duration-500 shadow-lg shadow-primary/5">
              <Activity className="text-primary group-hover:text-white w-6 h-6 transition-colors" />
            </div>
            <h3 className="text-lg md:text-xl font-black font-headline mb-2 text-on-surface tracking-tight leading-none">Dashboard</h3>
            <p className="text-xs md:text-sm text-on-surface-variant/60 font-body mb-3 leading-tight line-clamp-1">Visão analítica.</p>
            <div className="mt-auto flex items-center justify-between pt-4 border-t border-outline-variant/10">
              <div className="flex flex-col">
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">Status</span>
                <span className="text-2xl md:text-3xl font-black text-primary font-headline leading-none">Ativo</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-surface-container-low flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                <Plus className="w-5 h-5 text-on-surface-variant/40 group-hover:text-primary transition-colors" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </DashboardLayout>
  );
}
