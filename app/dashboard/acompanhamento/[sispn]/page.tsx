'use client';

import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  Users, 
  CalendarCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Search,
  ArrowLeft,
  ChevronRight,
  Stethoscope,
  FileText,
  TestTube,
  UserCheck
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth, Operator } from '@/context/AuthContext';

interface Gestacao {
  sispn: string;
  cpf_paciente: string;
  dum: string;
  dpp: string;
  data_cadastro: string;
  operador: string;
  acs: string;
  equipe: string;
  unidade_cnes?: string;
}

interface Paciente {
  cpf: string;
  gestante: string;
  nome_mae?: string;
  data_nascimento?: string;
}

interface Rotina {
  id: string;
  tipo: string;
  descricao: string;
  trimestre: string;
  categoria: string;
  quantidade?: number;
  grupo?: string;
}

interface RegistroRotina {
  id_registro: string;
  sispn: string;
  id_rotina: string;
  data_realizacao: string;
  trimestre_realizacao: string;
  resultado?: string;
  tipo?: string;
  cpf_profissional: string;
  cbo?: string;
}

interface Profissional {
  cpf: string;
  cbo: string;
  nome: string;
}

interface CategoriaProfissional {
  cbo: string;
  categoria: string;
}

const COLORS = {
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gray: '#9CA3AF',
  primary: '#0D9488'
};

const TRIMESTRE_MAP: Record<string, number> = {
  'PRIMEIRO': 1,
  'SEGUNDO': 2,
  'TERCEIRO': 3,
  '1º TRIMESTRE': 1,
  '2º TRIMESTRE': 2,
  '3º TRIMESTRE': 3
};

const getGestacaoStatus = (dum: string): 'ATIVA' | 'VENCIDA' => {
  if (!dum) return 'ATIVA';
  const dumDate = new Date(dum);
  const today = new Date();
  const limitDate = new Date(dumDate);
  limitDate.setDate(limitDate.getDate() + 280);
  return today >= limitDate ? 'VENCIDA' : 'ATIVA';
};

const getWeeksFromDum = (dum: string): number => {
  if (!dum) return 0;
  const start = new Date(dum);
  const now = new Date();
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.floor(diffDays / 7);
};

const getTrimestreAtual = (dum: string): number => {
  const weeks = getWeeksFromDum(dum);
  if (weeks <= 12) return 1;
  if (weeks <= 24) return 2;
  return 3;
};

const getTrimestreSemana = (weeks: number): string => {
  if (weeks <= 12) return '1º TRIMESTRE';
  if (weeks <= 24) return '2º TRIMESTRE';
  return '3º TRIMESTRE';
};

const formatSispn = (value: string) => {
  if (!value) return '';
  const v = value.replace(/\D/g, '');
  if (v.length <= 5) return v;
  return `${v.slice(0, 5)}-${v.slice(5, 9)}`;
};

const formatCpf = (value: string) => {
  if (!value) return '';
  const v = value.replace(/\D/g, '');
  if (v.length <= 3) return v;
  if (v.length <= 6) return `${v.slice(0, 3)}.${v.slice(3)}`;
  if (v.length <= 9) return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6)}`;
  return `${v.slice(0, 3)}.${v.slice(3, 6)}.${v.slice(6, 9)}-${v.slice(9, 11)}`;
};

export default function AcompanhamentoIndividual() {
  const params = useParams();
  const router = useRouter();
  const auth = useAuth();
  const user = auth.user as Operator | null;
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const sispn = params.sispn as string;
  const [gestacao, setGestacao] = useState<Gestacao | null>(null);
  const [paciente, setPaciente] = useState<Paciente | null>(null);
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [registrosRotinas, setRegistrosRotinas] = useState<RegistroRotina[]>([]);
  const [categorias, setCategorias] = useState<CategoriaProfissional[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  const [todasGestacoes, setTodasGestacoes] = useState<Gestacao[]>([]);
  const [todosPacientes, setTodosPacientes] = useState<Paciente[]>([]);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);

  const isAdmin = user?.nivel_acesso === 'Administrador';

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [g, p, r, rr, tg, tp, cat, pr] = await Promise.all([
          sispn ? supabase.from('gestacoes').select('*').eq('sispn', sispn).single() : Promise.resolve({ data: null }),
          sispn ? supabase.from('pacientes').select('*').eq('cpf', '').single() : Promise.resolve({ data: null }),
          supabase.from('rotinas').select('*').eq('categoria', 'OBRIGATORIO'),
          sispn ? supabase.from('registro_rotinas').select('*').eq('sispn', sispn) : Promise.resolve({ data: [] }),
          supabase.from('gestacoes').select('*'),
          supabase.from('pacientes').select('*'),
          supabase.from('categorias_profissionais').select('*'),
          supabase.from('profissionais').select('*')
        ]);

        if (g.data) {
          setGestacao(g.data);
          const pac = await supabase.from('pacientes').select('*').eq('cpf', g.data.cpf_paciente).single();
          if (pac.data) setPaciente(pac.data);
        }

        if (r.data) setRotinas(r.data);
        if (rr.data) setRegistrosRotinas(rr.data);
        if (tg.data) setTodasGestacoes(tg.data);
        if (tp.data) setTodosPacientes(tp.data);
        if (cat.data) setCategorias(cat.data);
        if (pr.data) setProfissionais(pr.data);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mounted, sispn]);

  useEffect(() => {
    if (!mounted || loading || !sispn) return;
    
    const interval = setInterval(() => {
      const fetchData = async () => {
        try {
          const [g, p, r, rr, tg, tp, cat, pr] = await Promise.all([
            sispn ? supabase.from('gestacoes').select('*').eq('sispn', sispn).single() : Promise.resolve({ data: null }),
            sispn ? supabase.from('pacientes').select('*').eq('cpf', '').single() : Promise.resolve({ data: null }),
            supabase.from('rotinas').select('*').eq('categoria', 'OBRIGATORIO'),
            sispn ? supabase.from('registro_rotinas').select('*').eq('sispn', sispn) : Promise.resolve({ data: [] }),
            supabase.from('gestacoes').select('*'),
            supabase.from('pacientes').select('*'),
            supabase.from('categorias_profissionais').select('*'),
            supabase.from('profissionais').select('*')
          ]);

          if (g.data) setGestacao(g.data);
          if (p.data) setPaciente(p.data);
          if (r.data) setRotinas(r.data);
          if (rr.data) setRegistrosRotinas(rr.data);
          if (tg.data) setTodasGestacoes(tg.data);
          if (tp.data) setTodosPacientes(tp.data);
          if (cat.data) setCategorias(cat.data);
          if (pr.data) setProfissionais(pr.data);
        } catch (err) {
          console.error('Erro ao buscar dados:', err);
        }
      };

      fetchData();
    }, 30000);

    return () => clearInterval(interval);
  }, [mounted, loading, sispn]);

  const gestacoesFiltradas = useMemo(() => {
    if (!searchQuery) return todasGestacoes.slice(0, 10);
    const q = searchQuery.toLowerCase();
    return todasGestacoes.filter(g => {
      const pac = todosPacientes.find(p => p.cpf === g.cpf_paciente);
      const nome = pac?.gestante?.toLowerCase() || '';
      return g.sispn.toLowerCase().includes(q) || nome.includes(q);
    }).slice(0, 10);
  }, [todasGestacoes, todosPacientes, searchQuery]);

  const gestacaoInfo = useMemo(() => {
    if (!gestacao) return null;
    const status = getGestacaoStatus(gestacao.dum);
    const weeks = getWeeksFromDum(gestacao.dum);
    const triAtual = getTrimestreAtual(gestacao.dum);
    
    const consultasPorTri = [0, 0, 0];
    const consultasEsperadas = [0, 0, 0];
    
    const consultas = registrosRotinas.filter(r => r.tipo === 'CONSULTA');
    consultas.forEach(c => {
      const tri = TRIMESTRE_MAP[c.trimestre_realizacao];
      if (tri) consultasPorTri[tri - 1]++;
    });
    
    rotinas.filter(r => r.tipo === 'CONSULTA').forEach(r => {
      const tri = TRIMESTRE_MAP[r.trimestre];
      if (tri) {
        consultasEsperadas[tri - 1] += r.quantidade || 0;
      }
    });

    const inicioTri = triAtual === 1 ? 0 : triAtual === 2 ? 13 : 25;
    const fimTri = triAtual === 1 ? 12 : triAtual === 2 ? 24 : 40;
    const semanaAtual = Math.min(weeks, 40);
    const diasTotaisTri = (fimTri - inicioTri) * 7;
    const diasDecorridos = (semanaAtual - inicioTri) * 7;
    const diasRestantes = Math.max(0, diasTotaisTri - diasDecorridos);
    
    const consultasRestantes = Math.max(0, consultasEsperadas[triAtual - 1] - consultasPorTri[triAtual - 1]);

    const rotinasPorTri: Record<number, { total: number; realizadas: number; pendentes: number; vencidas: number; rotinasPendentes: string[] }> = {
      1: { total: 0, realizadas: 0, pendentes: 0, vencidas: 0, rotinasPendentes: [] },
      2: { total: 0, realizadas: 0, pendentes: 0, vencidas: 0, rotinasPendentes: [] },
      3: { total: 0, realizadas: 0, pendentes: 0, vencidas: 0, rotinasPendentes: [] }
    };

    rotinas.filter(r => r.tipo !== 'CONSULTA').forEach(r => {
      const triRotina = TRIMESTRE_MAP[r.trimestre];
      if (triRotina) {
        const registros = registrosRotinas.filter(rr => {
          const rRotina = rotinas.find(rot => rot.id === rr.id_rotina);
          return rRotina && TRIMESTRE_MAP[rRotina.trimestre] === triRotina;
        });
        
        const realizadas = registros.length;
        const totalEsperado = r.quantidade || 1;
        
        rotinasPorTri[triRotina].total += totalEsperado;
        rotinasPorTri[triRotina].realizadas += Math.min(realizadas, totalEsperado);
        
        if (realizadas < totalEsperado) {
          if (triAtual > triRotina) {
            rotinasPorTri[triRotina].vencidas += (totalEsperado - realizadas);
          } else {
            rotinasPorTri[triRotina].pendentes += (totalEsperado - realizadas);
          }
        }
      }
    });

    return {
      status,
      weeks,
      triAtual,
      consultasPorTri,
      consultasEsperadas,
      consultasRestantes,
      rotinasPorTri
    };
  }, [gestacao, registrosRotinas, rotinas]);

  const examsPorTrimestre = useMemo(() => {
    if (!gestacao) return { 1: [], 2: [], 3: [] };
    
    const result: Record<number, { descricao: string; grupo?: string; status: 'realizado' | 'pendente' | 'vencido' | 'nao_realizado'; data?: string; resultado?: string; semanasRestantes?: number }[]> = {
      1: [],
      2: [],
      3: []
    };

    const triAtual = gestacaoInfo?.triAtual || 1;
    const weeks = gestacaoInfo?.weeks || 0;

    const limitesTri: Record<number, number> = { 1: 12, 2: 24, 3: 40 };
    const inicioTri: Record<number, number> = { 1: 0, 2: 13, 3: 25 };

    rotinas.filter(r => r.tipo !== 'CONSULTA').forEach(r => {
      const triRotina = TRIMESTRE_MAP[r.trimestre];
      if (!triRotina) return;

      const registro = registrosRotinas.find(rr => {
        const rrRotina = rotinas.find(rot => rot.id === rr.id_rotina);
        return rrRotina && rrRotina.id === r.id;
      });

      let status: 'realizado' | 'pendente' | 'vencido' | 'nao_realizado';
      let semanasRestantes: number | undefined;

      if (registro) {
        status = 'realizado';
      } else if (triAtual > triRotina) {
        status = 'vencido';
        semanasRestantes = 0;
      } else if (triAtual === triRotina) {
        status = 'pendente';
        const limite = limitesTri[triRotina];
        semanasRestantes = Math.max(0, limite - weeks);
      } else {
        status = 'pendente';
        const limite = limitesTri[triRotina];
        const inicio = inicioTri[triRotina];
        semanasRestantes = Math.max(0, limite - inicio);
      }

      result[triRotina].push({
        descricao: r.descricao,
        status,
        data: registro?.data_realizacao,
        resultado: registro?.resultado,
        semanasRestantes
      });
    });

    Object.keys(result).forEach(tri => {
      result[parseInt(tri)].sort((a, b) => a.descricao.localeCompare(b.descricao));
    });

    return result;
  }, [gestacao, gestacaoInfo, rotinas, registrosRotinas]);

  if (!mounted) return null;

  if (!sispn || showSearch) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 max-w-3xl mx-auto space-y-6">
          <button 
            onClick={() => router.push('/dashboard/acompanhamento')}
            className="flex items-center gap-2 text-sm text-on-surface-variant/60 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>

          <header className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-4 h-1 bg-primary rounded-full"></span>
              <span className="text-[6px] font-black text-primary uppercase tracking-[0.4em]">Busca</span>
            </div>
            <h2 className="text-xl md:text-3xl font-black tracking-tight font-headline text-primary uppercase leading-tight">
              Buscar Gestante
            </h2>
            <p className="text-xs md:text-sm text-on-surface-variant/60 font-body">
              Digite o SISPN ou nome da gestante para visualizar o acompanhamento.
            </p>
          </header>

          <div className="relative">
            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
              <Search className="w-5 h-5 text-on-surface-variant/40" />
            </div>
            <input
              type="text"
              placeholder="Buscar por SISPN ou nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
              className="w-full pl-14 pr-4 py-4 text-lg bg-surface-container-lowest border-2 border-outline-variant/20 rounded-2xl focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10"
            />
          </div>

          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
            <div className="p-3 border-b border-outline-variant/10 bg-surface-container-low text-xs font-black uppercase tracking-wider text-on-surface-variant/40">
              Resultados ({gestacoesFiltradas.length})
            </div>
            <div className="divide-y divide-outline-variant/10">
              {gestacoesFiltradas.length === 0 ? (
                <div className="p-8 text-center text-on-surface-variant/60">
                  {searchQuery ? 'Nenhuma gestação encontrada' : 'Digite para buscar'}
                </div>
              ) : (
                gestacoesFiltradas.map(g => {
                  const pac = todosPacientes.find(p => p.cpf === g.cpf_paciente);
                  const status = getGestacaoStatus(g.dum);
                  const weeks = getWeeksFromDum(g.dum);
                  
                  return (
                    <Link
                      key={g.sispn}
                      href={`/dashboard/acompanhamento/${g.sispn}`}
                      className="flex items-center justify-between p-4 hover:bg-primary/5 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                          <Users className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-on-surface">{pac?.gestante || 'Gestante'}</p>
                          <p className="text-xs text-on-surface-variant/60">SISPN: {formatSispn(g.sispn)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">{weeks} sem</p>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            status === 'ATIVA' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                          }`}>
                            {status}
                          </span>
                        </div>
                        <ChevronRight className="w-5 h-5 text-on-surface-variant/40" />
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 max-w-full mx-auto">
          <button 
            onClick={() => router.push('/dashboard/acompanhamento')}
            className="flex items-center gap-2 text-sm text-on-surface-variant/60 hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="flex items-center justify-center py-20">
            <span className="material-symbols-outlined w-8 h-8 animate-spin text-primary">progress_activity</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!gestacao) {
    return (
      <DashboardLayout>
        <div className="p-4 md:p-6 max-w-3xl mx-auto">
          <button 
            onClick={() => router.push('/dashboard/acompanhamento')}
            className="flex items-center gap-2 text-sm text-on-surface-variant/60 hover:text-primary transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar
          </button>
          <div className="text-center py-20">
            <p className="text-lg font-medium text-on-surface">Gestação não encontrada</p>
            <button 
              onClick={() => setShowSearch(true)}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-lg"
            >
              Buscar outra gestante
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const info = gestacaoInfo!;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full mx-auto space-y-6">
        <button 
          onClick={() => router.push('/dashboard/acompanhamento')}
          className="flex items-center gap-2 text-sm text-on-surface-variant/60 hover:text-primary transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar ao Dashboard
        </button>

        <header className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-4 h-1 bg-primary rounded-full"></span>
              <span className="text-[6px] font-black text-primary uppercase tracking-[0.4em]">Acompanhamento</span>
            </div>
            <h2 className="text-xl md:text-3xl font-black tracking-tight font-headline text-primary uppercase leading-tight">
              {paciente?.gestante || 'Gestante'}
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <span className="text-sm text-on-surface-variant/60">SISPN: {formatSispn(gestacao.sispn)}</span>
              <span className="text-on-surface-variant/20">|</span>
              <span className="text-sm text-on-surface-variant/60">CPF: {formatCpf(paciente?.cpf || '')}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowSearch(true)}
              className="px-4 py-2 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-sm hover:bg-primary/5 transition-colors flex items-center gap-2"
            >
              <Search className="w-4 h-4" /> Nova Busca
            </button>
          </div>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60">Status</p>
            <div className="flex items-center gap-2 mt-1">
              {info.status === 'ATIVA' ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-500" />
              )}
              <span className={`text-lg font-black ${info.status === 'ATIVA' ? 'text-green-500' : 'text-red-500'}`}>
                {info.status}
              </span>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60">Semanas</p>
            <p className="text-2xl font-black text-primary mt-1">{info.weeks}</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60">Trimestre</p>
            <p className="text-2xl font-black text-primary mt-1">{info.triAtual}º</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60">DUM</p>
            <p className="text-lg font-bold text-on-surface mt-1">
              {gestacao.dum ? new Date(gestacao.dum).toLocaleDateString('pt-BR') : '---'}
            </p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60">DPP</p>
            <p className="text-lg font-bold text-on-surface mt-1">
              {gestacao.dpp ? new Date(gestacao.dpp).toLocaleDateString('pt-BR') : '---'}
            </p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60">ACS</p>
            <p className="text-sm font-medium text-on-surface mt-1 truncate">{gestacao.acs || '---'}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(tri => {
            const consultasRealizadas = info.consultasPorTri[tri - 1];
            const consultasMeta = info.consultasEsperadas[tri - 1] || 0;
            const consultasStatus = consultasRealizadas >= consultasMeta ? 'completo' : consultasRealizadas > 0 ? 'parcial' : 'pendente';
            const exams = examsPorTrimestre[tri as keyof typeof examsPorTrimestre];
            const realizado = exams.filter(e => e.status === 'realizado').length;
            const pendente = exams.filter(e => e.status === 'pendente').length;
            const vencido = exams.filter(e => e.status === 'vencido').length;

            return (
              <div 
                key={tri} 
                className={`bg-surface-container-lowest rounded-2xl border-2 overflow-hidden flex flex-col ${
                  tri === info.triAtual ? 'border-primary/30' : 'border-outline-variant/10'
                }`}
              >
                <div className={`p-2 border-b ${tri === info.triAtual ? 'bg-primary/10' : 'bg-surface-container-low'}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-black text-on-surface uppercase">{tri}º Trimestre</h3>
                    {tri === info.triAtual && (
                      <span className="px-2 py-1 bg-primary text-white text-[10px] font-bold uppercase rounded-full">Atual</span>
                    )}
                  </div>
                </div>

                <div className="p-2 space-y-1 flex-1 flex flex-col">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center justify-between text-sm font-black uppercase tracking-wider text-on-surface-variant/60 pl-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5" />
                        <span>Rotinas Obrigatórias</span>
                      </div>
                      <span className="text-[12px] font-black">PRAZO</span>
                    </div>
                    <div className="space-y-0.5">
                      {exams.length === 0 ? (
                        <p className="text-xs text-on-surface-variant/40 py-1">Nenhum exame esperado</p>
                      ) : (
                        exams.map((exam, idx) => (
                          <div 
                            key={idx} 
                            className="grid grid-cols-[auto_1fr_auto_auto] items-center gap-2 p-1.5 rounded-lg text-sm"
                          >
                            <div className="flex items-center justify-center w-3">
                              <span className={`w-2 h-2 rounded-full ${
                                exam.status === 'realizado' ? 'bg-green-500' :
                                exam.status === 'vencido' ? 'bg-red-500' :
                                exam.status === 'pendente' ? 'bg-amber-500' : 'bg-gray-400'
                              }`}></span>
                            </div>
                            <div className="text-on-surface truncate text-[12px] font-medium">
                              {exam.descricao}
                            </div>
                            {exam.grupo && (
                              <span className="text-[10px] font-bold bg-secondary/10 px-1.5 py-0.5 rounded text-on-surface-variant">
                                {exam.grupo}
                              </span>
                            )}
                            <div className="text-right">
                              {exam.status === 'realizado' ? (
                                <span className="text-[12px] font-bold text-green-600">OK</span>
                              ) : exam.semanasRestantes === 0 ? (
                                <span className="text-[12px] font-bold text-red-600">VENCIDO</span>
                              ) : (
                                <span className={`text-[12px] font-bold ${
                                  exam.status === 'pendente' ? 'text-amber-600' : 'text-gray-400'
                                }`}>
                                  {exam.semanasRestantes} sem
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-1 pt-1 border-t border-outline-variant/10 mt-auto">
                    <div className="text-center p-2 bg-green-500/10 rounded-lg">
                      <p className="text-xl font-black text-green-500">{realizado}</p>
                      <p className="text-[10px] font-bold uppercase text-green-600">Feitos</p>
                    </div>
                    <div className="text-center p-2 bg-amber-500/10 rounded-lg">
                      <p className="text-xl font-black text-amber-500">{pendente}</p>
                      <p className="text-[10px] font-bold uppercase text-amber-600">Pendente</p>
                    </div>
                    <div className="text-center p-2 bg-red-500/10 rounded-lg">
                      <p className="text-xl font-black text-red-500">{vencido}</p>
                      <p className="text-[10px] font-bold uppercase text-red-600">Vencido</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {registrosRotinas.filter(r => r.tipo === 'CONSULTA').length > 0 && (
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
            <div className="p-4 border-b border-outline-variant/10">
              <h3 className="text-sm font-black uppercase tracking-wider text-on-surface-variant/60">Histórico de Consultas</h3>
            </div>
            <div className="overflow-x-auto" style={{ paddingLeft: '16px', paddingRight: '16px' }}>
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low text-xs font-black uppercase tracking-wider text-on-surface-variant/40">
                    <th style={{ width: '16px' }}></th>
                    <th className="px-4 py-2">Data</th>
                    <th className="px-4 py-2">Trimestre</th>
                    <th className="px-4 py-2">Profissional</th>
                    <th className="px-4 py-2">Observações</th>
                    <th style={{ width: '16px' }}></th>
                  </tr>
                </thead>
                <tbody className="text-sm divide-y divide-outline-variant/10">
                  {registrosRotinas.filter(r => r.tipo === 'CONSULTA').map((a, idx) => {
                    const prof = profissionais.find(p => p.cpf === a.cpf_profissional);
                    const cat = categorias.find(c => c.cbo === prof?.cbo);
                    return (
                      <tr key={a.id_registro || `consulta-${idx}`} className="hover:bg-primary/5">
                        <td style={{ width: '16px' }}></td>
                        <td className="px-4 py-2 text-[10px] font-bold text-on-surface">{a.data_realizacao ? new Date(a.data_realizacao).toLocaleDateString('pt-BR') : '---'}</td>
                        <td className="px-4 py-2">{a.trimestre_realizacao}</td>
                        <td className="px-4 py-2">{cat?.categoria || prof?.nome || a.cpf_profissional || '---'}</td>
                        <td className="px-4 py-2 text-on-surface-variant/60 truncate max-w-xs">
                          {(a as any).observacoes || '---'}
                        </td>
                        <td style={{ width: '16px' }}></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}