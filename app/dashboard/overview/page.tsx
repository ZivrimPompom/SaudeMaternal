'use client';

import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';
import { 
  Users, 
  CalendarCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock,
  Activity,
  Search,
  FileText,
  Stethoscope,
  Baby,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList
} from 'recharts';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth, Operator } from '@/context/AuthContext';

interface Gestacao {
  sispn: string;
  cpf_paciente: string;
  dum: string;
  dpp: string;
  data_cadastro: string;
  classificacao_pn: string;
  unidade_cnes?: string;
}

interface Paciente {
  cpf: string;
  gestante: string;
  nome_mae?: string;
  data_nascimento?: string;
}

const calculateAgeAndPhase = (dataNascimento: string, dataReferencia?: string): { phase: string } => {
  if (!dataNascimento) return { phase: 'Não informado' };
  
  const birth = new Date(dataNascimento);
  const ref = dataReferencia ? new Date(dataReferencia) : new Date();
  
  if (isNaN(birth.getTime())) return { phase: 'Não informado' };
  
  let age = ref.getFullYear() - birth.getFullYear();
  const monthDiff = ref.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birth.getDate())) {
    age--;
  }
  
  if (age >= 60) return { phase: 'VELHICE' };
  if (age >= 20) return { phase: 'ADULTO' };
  if (age >= 12) return { phase: 'ADOLESCENTE' };
  if (age >= 2) return { phase: 'CRIANÇA' };
  return { phase: 'BEBÊ' };
};

interface Rotina {
  id: string;
  tipo: string;
  descricao: string;
  trimestre: string;
  quantidade?: number;
}

interface RegistroRotina {
  id_registro: string;
  sispn: string;
  id_rotina: string;
  data_realizacao: string;
  trimestre_realizacao: string;
  tipo?: string;
}

const COLORS = ['#0D9488', '#0066FF', '#F59E0B', '#10B981', '#EF4444'];

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

const formatSispn = (value: string) => {
  if (!value) return '';
  const v = value.replace(/\D/g, '');
  if (v.length <= 5) return v;
  return `${v.slice(0, 5)}-${v.slice(5, 9)}`;
};

export default function GestacoesAtivasDashboard() {
  const auth = useAuth();
  const user = auth.user as Operator | null;
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [gestacoes, setGestacoes] = useState<Gestacao[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [registrosRotinas, setRegistrosRotinas] = useState<RegistroRotina[]>([]);
  const [unidades, setUnidades] = useState<{cnes: string; nome_fantasia: string}[]>([]);

  const [filterUnidade, setFilterUnidade] = useState('all');
  const [filterStatus, setFilterStatus] = useState<'ATIVA' | 'VENCIDA' | 'TODAS'>('ATIVA');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterTrimestre, setFilterTrimestre] = useState('all');
  const [filterTipoRotina, setFilterTipoRotina] = useState('all');
  const [filterRotina, setFilterRotina] = useState('all');
  const [filterFaseVida, setFilterFaseVida] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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
        const [g, p, r, rr, u] = await Promise.all([
          supabase.from('gestacoes').select('*'),
          supabase.from('pacientes').select('cpf, gestante, nome_mae, data_nascimento'),
          supabase.from('rotinas').select('*'),
          supabase.from('registro_rotinas').select('*'),
          supabase.from('unidades_saude').select('cnes, nome_fantasia')
        ]);

        if (g.data) setGestacoes(g.data);
        if (p.data) setPacientes(p.data);
        if (r.data) setRotinas(r.data);
        if (rr.data) setRegistrosRotinas(rr.data);
        if (u.data) setUnidades(u.data);
      } catch (err) {
        console.error('Erro ao buscar dados:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [mounted]);

  useEffect(() => {
    if (user?.unidade_cnes && !isAdmin) {
      setFilterUnidade(user.unidade_cnes);
    }
  }, [user, isAdmin]);

  const TRIMESTRE_MAP: Record<string, number> = {
    'PRIMEIRO': 1,
    'SEGUNDO': 2,
    'TERCEIRO': 3,
    '1º TRIMESTRE': 1,
    '2º TRIMESTRE': 2,
    '3º TRIMESTRE': 3
  };

  const gestacoesFiltradas = useMemo(() => {
    let filtered = gestacoes.filter(g => {
      if (filterUnidade !== 'all') {
        const gUnidade = g.unidade_cnes ? String(g.unidade_cnes).trim() : '';
        const fUnidade = String(filterUnidade).trim();
        if (gUnidade !== fUnidade) return false;
      }
      if (filterStatus !== 'TODAS' && getGestacaoStatus(g.dum) !== filterStatus) return false;
      if (filterRisk !== 'all' && g.classificacao_pn !== filterRisk) return false;
      if (filterTrimestre !== 'all') {
        const tri = getTrimestreAtual(g.dum);
        const triFilter = TRIMESTRE_MAP[filterTrimestre];
        if (tri !== triFilter) return false;
      }
      if (filterFaseVida !== 'all') {
        const paciente = pacientes.find(p => p.cpf === g.cpf_paciente);
        const { phase } = calculateAgeAndPhase(paciente?.data_nascimento || '');
        if (phase !== filterFaseVida) return false;
      }
      return true;
    });

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(g => {
        const paciente = pacientes.find(p => p.cpf === g.cpf_paciente);
        const nome = paciente?.gestante?.toLowerCase() || '';
        const nomeMae = paciente?.nome_mae?.toLowerCase() || '';
        return g.sispn.toLowerCase().includes(q) || nome.includes(q) || nomeMae.includes(q);
      });
    }

    return filtered;
  }, [gestacoes, pacientes, filterUnidade, filterStatus, filterRisk, filterTrimestre, searchQuery]);

  const stats = useMemo(() => {
    const ativas = gestacoesFiltradas.filter(g => getGestacaoStatus(g.dum) === 'ATIVA').length;
    const vencidas = gestacoesFiltradas.filter(g => getGestacaoStatus(g.dum) === 'VENCIDA').length;
    const habitual = gestacoesFiltradas.filter(g => g.classificacao_pn === 'HABITUAL').length;
    const risco = gestacoesFiltradas.filter(g => g.classificacao_pn === 'RISCO').length;

    const faseVidaCounts: Record<string, number> = {};
    gestacoesFiltradas.forEach(g => {
      const paciente = pacientes.find(p => p.cpf === g.cpf_paciente);
      const { phase } = calculateAgeAndPhase(paciente?.data_nascimento || '');
      faseVidaCounts[phase] = (faseVidaCounts[phase] || 0) + 1;
    });

    let registrosFiltrados = registrosRotinas.filter(r => 
      gestacoesFiltradas.some(g => g.sispn === r.sispn)
    );

    if (filterTipoRotina !== 'all') {
      registrosFiltrados = registrosFiltrados.filter(r => r.tipo === filterTipoRotina);
    }

    if (filterRotina !== 'all') {
      registrosFiltrados = registrosFiltrados.filter(r => r.id_rotina === filterRotina);
    }

    const consultasPorTri = [0, 0, 0];
    registrosFiltrados
      .filter(r => r.tipo === 'CONSULTA')
      .forEach(c => {
        const triCons = TRIMESTRE_MAP[c.trimestre_realizacao];
        if (triCons >= 1 && triCons <= 3) {
          consultasPorTri[triCons - 1]++;
        }
      });

    const totalConsultas = consultasPorTri.reduce((a, b) => a + b, 0);

    const examesPorTri = [0, 0, 0];
    registrosFiltrados
      .filter(r => r.tipo !== 'CONSULTA')
      .forEach(r => {
        const triExam = TRIMESTRE_MAP[r.trimestre_realizacao];
        if (triExam >= 1 && triExam <= 3) {
          examesPorTri[triExam - 1]++;
        }
      });

    const totalExames = examesPorTri.reduce((a, b) => a + b, 0);

    let rotinasFiltradas = rotinas;
    if (filterTipoRotina !== 'all') {
      rotinasFiltradas = rotinasFiltradas.filter(r => r.tipo === filterTipoRotina);
    }
    if (filterRotina !== 'all') {
      rotinasFiltradas = rotinasFiltradas.filter(r => r.id === filterRotina);
    }

    const consultasEsperadas = rotinasFiltradas
      .filter(r => r.tipo === 'CONSULTA')
      .reduce((acc, r) => acc + (r.quantidade || 1), 0) * ativas;
    const pctConsultas = consultasEsperadas > 0 ? Math.round((totalConsultas / consultasEsperadas) * 100) : 0;

    return {
      total: gestacoesFiltradas.length,
      ativas,
      vencidas,
      habitual,
      risco,
      consultas: totalConsultas,
      exames: totalExames,
      pctConsultas,
      consultasPorTri,
      examesPorTri,
      faseVidaCounts
    };
  }, [gestacoesFiltradas, pacientes, registrosRotinas, rotinas, filterTipoRotina, filterRotina]);

  const chartData = useMemo(() => {
    return [
      { name: '1º Tri', consultas: stats.consultasPorTri[0], exames: stats.examesPorTri[0], esperado: stats.ativas > 0 ? Math.floor(stats.ativas * 0.33) : 0 },
      { name: '2º Tri', consultas: stats.consultasPorTri[1], exames: stats.examesPorTri[1], esperado: stats.ativas > 0 ? Math.floor(stats.ativas * 0.33) : 0 },
      { name: '3º Tri', consultas: stats.consultasPorTri[2], exames: stats.examesPorTri[2], esperado: stats.ativas > 0 ? Math.floor(stats.ativas * 0.34) : 0 }
    ];
  }, [stats]);

  const pieData = useMemo(() => {
    const data = [];
    if (stats.habitual > 0) data.push({ name: 'HABITUAL', value: stats.habitual, color: COLORS[0] });
    if (stats.risco > 0) data.push({ name: 'ALTO RISCO', value: stats.risco, color: COLORS[2] });
    return data;
  }, [stats]);

  const pieStatusData = useMemo(() => {
    return [
      { name: 'ATIVAS', value: stats.ativas, color: COLORS[3] },
      { name: 'VENCIDAS', value: stats.vencidas, color: COLORS[4] }
    ];
  }, [stats]);

  const getStatusFilter = (name: string): 'ATIVA' | 'VENCIDA' | 'TODAS' => {
    if (name === 'ATIVAS') return 'ATIVA';
    if (name === 'VENCIDAS') return 'VENCIDA';
    return 'TODAS';
  };

  if (!mounted) return null;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-full mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-1 bg-primary rounded-full"></span>
            <span className="text-[8px] font-black text-primary uppercase tracking-[0.4em]">Dashboard</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black tracking-tight font-headline text-primary uppercase leading-tight">
            Gestações Ativas
          </h2>
          <p className="text-sm text-on-surface-variant/60 font-body max-w-xl">
            Monitoramento completo das gestantes em acompanhamento.
          </p>
        </header>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative w-48">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-on-surface-variant/40" />
            </div>
            <input
              type="text"
              placeholder="Buscar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {isAdmin && (
            <select
              value={filterUnidade}
              onChange={(e) => setFilterUnidade(e.target.value)}
              className="px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">Todas as Unidades</option>
              {unidades.map(u => (
                <option key={u.cnes} value={u.cnes}>{u.nome_fantasia}</option>
              ))}
            </select>
          )}

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="TODAS">Todos os Status</option>
            <option value="ATIVA">Ativas</option>
            <option value="VENCIDA">Vencidas</option>
          </select>

          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Todos os Riscos</option>
            <option value="HABITUAL">Habitual</option>
            <option value="RISCO">Alto Risco</option>
          </select>

          <select
            value={filterTrimestre}
            onChange={(e) => setFilterTrimestre(e.target.value)}
            className="px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Todos os Trimestres</option>
            <option value="PRIMEIRO">1º Trimestre</option>
            <option value="SEGUNDO">2º Trimestre</option>
            <option value="TERCEIRO">3º Trimestre</option>
          </select>

          <select
            value={filterTipoRotina}
            onChange={(e) => {
              setFilterTipoRotina(e.target.value);
              setFilterRotina('all');
            }}
            className="px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Todos os Tipos</option>
            <option value="CONSULTA">Consultas</option>
            <option value="EXAME">Exames</option>
            <option value="VACINA">Vacinas</option>
            <option value="MEDICACAO">Medicações</option>
          </select>

          <select
            value={filterRotina}
            onChange={(e) => setFilterRotina(e.target.value)}
            disabled={filterTipoRotina === 'all'}
            className="px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
          >
            <option value="all">Todas as Rotinas</option>
            {filterTipoRotina !== 'all' && rotinas
              .filter(r => r.tipo === filterTipoRotina)
              .reduce((acc, r) => {
                if (!acc.find((item: Rotina) => item.descricao === r.descricao)) {
                  acc.push(r);
                }
                return acc;
              }, [] as Rotina[])
              .map(r => (
                <option key={r.id} value={r.id}>{r.descricao}</option>
              ))}
          </select>

          <button
            onClick={() => {
              setSearchQuery('');
              setFilterUnidade('all');
              setFilterStatus('ATIVA');
              setFilterRisk('all');
              setFilterTrimestre('all');
              setFilterTipoRotina('all');
              setFilterRotina('all');
            }}
            className="px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            Limpar
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Baby className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">Total</p>
            <p className="text-xl font-black text-primary">{loading ? '...' : stats.total}</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">Ativas</p>
            <p className="text-xl font-black text-green-500">{loading ? '...' : stats.ativas}</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">Vencidas</p>
            <p className="text-xl font-black text-red-500">{loading ? '...' : stats.vencidas}</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">Consultas</p>
            <p className="text-xl font-black text-amber-500">{loading ? '...' : stats.consultas}</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">Exames</p>
            <p className="text-xl font-black text-blue-500">{loading ? '...' : stats.exames}</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4 text-purple-500" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">% Consultas</p>
            <p className="text-xl font-black text-purple-500">{loading ? '...' : `${stats.pctConsultas}%`}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60 mb-3">Atividades por Trimestre</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar
                    dataKey="consultas"
                    name="CONSULTAS"
                    fill={COLORS[0]}
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => {
                      const triMap: Record<string, string> = { '1º Tri': 'PRIMEIRO', '2º Tri': 'SEGUNDO', '3º Tri': 'TERCEIRO' };
                      setFilterTrimestre((data.name && triMap[data.name]) || 'all');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <LabelList dataKey="consultas" position="top" style={{ fontSize: 11, fill: '#666', fontWeight: 'bold' }} />
                  </Bar>
                  <Bar
                    dataKey="exames"
                    name="EXAMES"
                    fill={COLORS[1]}
                    radius={[4, 4, 0, 0]}
                    onClick={(data) => {
                      const triMap: Record<string, string> = { '1º Tri': 'PRIMEIRO', '2º Tri': 'SEGUNDO', '3º Tri': 'TERCEIRO' };
                      setFilterTrimestre((data.name && triMap[data.name]) || 'all');
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <LabelList dataKey="exames" position="top" style={{ fontSize: 11, fill: '#666', fontWeight: 'bold' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-1 bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/10">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60 mb-2">Risco</h3>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={42}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${value}`}
                    labelLine={false}
                    onClick={(entry) => setFilterRisk(entry.name as string)}
                    style={{ cursor: 'pointer' }}
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-1 bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/10">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60 mb-2">Status</h3>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieStatusData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={42}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${value}`}
                    labelLine={false}
                    onClick={(entry) => entry.name && setFilterStatus(getStatusFilter(entry.name))}
                    style={{ cursor: 'pointer' }}
                  >
                    {pieStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-1 bg-surface-container-lowest p-3 rounded-2xl border border-outline-variant/10">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60 mb-2">Fase Vida</h3>
            <div className="h-[120px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={Object.entries(stats.faseVidaCounts).map(([name, value]) => ({ name, value }))}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={42}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, value }) => `${value}`}
                    labelLine={false}
                    onClick={(entry) => setFilterFaseVida(entry.name as string)}
                    style={{ cursor: 'pointer' }}
                  >
                    {Object.entries(stats.faseVidaCounts).map(([name], index) => (
                      <Cell key={`cell-${index}`} fill={['#10B981', '#F59E0B', '#3B82F6', '#EF4444', '#8B5CF6', '#EC4899'][index % 6]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
          <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-on-surface-variant/60">Lista de Gestações</h3>
            <span className="text-xs text-on-surface-variant/40">{gestacoesFiltradas.length} registros</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-surface-container-low border-b border-outline-variant/10 text-xs font-black uppercase tracking-wider text-on-surface-variant/40">
                  <th className="px-4 py-3">SISPN</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">DUM</th>
                  <th className="px-4 py-3">DPP</th>
                  <th className="px-4 py-3">Semanas</th>
                  <th className="px-4 py-3">Classificação</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-outline-variant/10">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-on-surface-variant/60">Carregando...</td>
                  </tr>
                ) : gestacoesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-on-surface-variant/60">Nenhuma gestação encontrada</td>
                  </tr>
                ) : (
                  [...gestacoesFiltradas].sort((a, b) => {
                    const aPaciente = pacientes.find(p => p.cpf === a.cpf_paciente);
                    const bPaciente = pacientes.find(p => p.cpf === b.cpf_paciente);
                    const aNome = aPaciente?.gestante?.toLowerCase() || '';
                    const bNome = bPaciente?.gestante?.toLowerCase() || '';
                    
                    if (!a.dpp && !b.dpp) return aNome.localeCompare(bNome);
                    if (!a.dpp) return 1;
                    if (!b.dpp) return -1;
                    
                    const diffDpp = new Date(a.dpp).getTime() - new Date(b.dpp).getTime();
                    if (diffDpp !== 0) return diffDpp;
                    
                    return aNome.localeCompare(bNome);
                  }).slice(0, 10).map(g => {
                    const paciente = pacientes.find(p => p.cpf === g.cpf_paciente);
                    const status = getGestacaoStatus(g.dum);
                    const weeks = getWeeksFromDum(g.dum);
                    
                    return (
                      <tr key={g.sispn} className="hover:bg-primary/5 transition-colors">
                        <td className="px-4 py-3 font-medium">{formatSispn(g.sispn)}</td>
                        <td className="px-4 py-3">{paciente?.gestante || '---'}</td>
                        <td className="px-4 py-3">{g.dum ? new Date(g.dum).toLocaleDateString('pt-BR') : '---'}</td>
                        <td className="px-4 py-3">{g.dpp ? new Date(g.dpp).toLocaleDateString('pt-BR') : '---'}</td>
                        <td className="px-4 py-3">{weeks} sem</td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            g.classificacao_pn === 'HABITUAL' ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'
                          }`}>
                            {g.classificacao_pn || '---'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${
                            status === 'ATIVA' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'
                          }`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            href={`/dashboard/acompanhamento/${g.sispn}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary rounded-lg hover:bg-primary/20 transition-colors"
                          >
                            Ver <ChevronRight className="w-3 h-3" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {gestacoesFiltradas.length > 10 && (
            <div className="p-4 border-t border-outline-variant/10 text-center">
              <Link 
                href="/dashboard/acompanhamento"
                className="text-sm font-medium text-primary hover:underline"
              >
                Ver todas as {gestacoesFiltradas.length} gestações →
              </Link>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}