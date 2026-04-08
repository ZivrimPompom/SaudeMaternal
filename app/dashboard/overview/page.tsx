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
  AreaChart,
  Area
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
}

interface Atendimento {
  sispn: string;
  data_consulta: string;
  trimestre_consulta: string;
}

interface RegistroRotina {
  sispn: string;
  data_realizacao: string;
  trimestre_realizacao: string;
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
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [registrosRotinas, setRegistrosRotinas] = useState<RegistroRotina[]>([]);
  const [unidades, setUnidades] = useState<{cnes: string; nome_fantasia: string}[]>([]);

  const [filterUnidade, setFilterUnidade] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterTrimestre, setFilterTrimestre] = useState('all');
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
        const [g, p, a, rr, u] = await Promise.all([
          supabase.from('gestacoes').select('*'),
          supabase.from('pacientes').select('cpf, gestante, nome_mae'),
          supabase.from('atendimentos').select('sispn, data_consulta, trimestre_consulta'),
          supabase.from('registro_rotinas').select('sispn, data_realizacao, trimestre_realizacao'),
          supabase.from('unidades_saude').select('cnes, nome_fantasia')
        ]);

        if (g.data) setGestacoes(g.data);
        if (p.data) setPacientes(p.data);
        if (a.data) setAtendimentos(a.data);
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
      if (filterRisk !== 'all' && g.classificacao_pn !== filterRisk) return false;
      if (filterTrimestre !== 'all') {
        const tri = getTrimestreAtual(g.dum);
        const triFilter = TRIMESTRE_MAP[filterTrimestre];
        if (tri !== triFilter) return false;
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
  }, [gestacoes, pacientes, filterUnidade, filterRisk, filterTrimestre, searchQuery]);

  const stats = useMemo(() => {
    const ativas = gestacoesFiltradas.filter(g => getGestacaoStatus(g.dum) === 'ATIVA').length;
    const vencidas = gestacoesFiltradas.filter(g => getGestacaoStatus(g.dum) === 'VENCIDA').length;
    const habitual = gestacoesFiltradas.filter(g => g.classificacao_pn === 'HABITUAL').length;
    const risco = gestacoesFiltradas.filter(g => g.classificacao_pn === 'RISCO').length;

    const consultasPorTri = [0, 0, 0];
    const consultasEsperadas = [0, 0, 0];
    
    gestacoesFiltradas.forEach(g => {
      const tri = getTrimestreAtual(g.dum);
      const consultas = atendimentos.filter(a => a.sispn === g.sispn);
      
      [1, 2, 3].forEach(t => {
        const porTri = consultas.filter(a => TRIMESTRE_MAP[a.trimestre_consulta] === t);
        consultasPorTri[t - 1] += porTri.length;
        if (t <= tri) consultasEsperadas[t - 1] += 3;
      });
    });

    const totalConsultas = consultasPorTri.reduce((a, b) => a + b, 0);
    const totalEsperadas = consultasEsperadas.reduce((a, b) => a + b, 0);
    const pctConsultas = totalEsperadas > 0 ? Math.round((totalConsultas / totalEsperadas) * 100) : 0;

    const examesPorTri = [0, 0, 0];
    gestacoesFiltradas.forEach(g => {
      const triAtual = getTrimestreAtual(g.dum);
      const exams = registrosRotinas.filter(r => r.sispn === g.sispn);
      
      [1, 2, 3].forEach(t => {
        const porTri = exams.filter(r => TRIMESTRE_MAP[r.trimestre_realizacao] === t);
        examesPorTri[t - 1] += porTri.length;
      });
    });

    const totalExames = examesPorTri.reduce((a, b) => a + b, 0);

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
      examesPorTri
    };
  }, [gestacoesFiltradas, atendimentos, registrosRotinas]);

  const chartData = useMemo(() => {
    return [
      { name: '1º Tri', consultas: stats.consultasPorTri[0], exames: stats.examesPorTri[0], esperado: stats.ativas > 0 ? Math.floor(stats.ativas * 0.33) : 0 },
      { name: '2º Tri', consultas: stats.consultasPorTri[1], exames: stats.examesPorTri[1], esperado: stats.ativas > 0 ? Math.floor(stats.ativas * 0.33) : 0 },
      { name: '3º Tri', consultas: stats.consultasPorTri[2], exames: stats.examesPorTri[2], esperado: stats.ativas > 0 ? Math.floor(stats.ativas * 0.34) : 0 }
    ];
  }, [stats]);

  const pieData = useMemo(() => {
    const data = [];
    if (stats.habitual > 0) data.push({ name: 'Habitual', value: stats.habitual, color: COLORS[0] });
    if (stats.risco > 0) data.push({ name: 'Alto Risco', value: stats.risco, color: COLORS[2] });
    return data;
  }, [stats]);

  const pieStatusData = useMemo(() => {
    return [
      { name: 'Ativas', value: stats.ativas, color: COLORS[3] },
      { name: 'Vencidas', value: stats.vencidas, color: COLORS[4] }
    ];
  }, [stats]);

  if (!mounted) return null;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 lg:p-8 max-w-full mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-8 h-1 bg-primary rounded-full"></span>
            <span className="text-[8px] font-black text-primary uppercase tracking-[0.4em]">Dashboard</span>
          </div>
          <h2 className="text-2xl md:text-4xl font-black tracking-tight font-headline text-primary uppercase leading-tight">
            Gestações Ativas
          </h2>
          <p className="text-sm text-on-surface-variant/60 font-body max-w-xl">
            Monitoramento completo das gestantes em acompanhamento.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative md:col-span-2">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-on-surface-variant/40" />
            </div>
            <input
              type="text"
              placeholder="Buscar gestante por nome ou SISPN..."
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
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="all">Todos os Riscos</option>
            <option value="HABITUAL">Habitual</option>
            <option value="RISCO">Alto Risco</option>
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Baby className="w-4 h-4 text-primary" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">Total</p>
            <p className="text-2xl font-black text-primary">{loading ? '...' : stats.total}</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">Ativas</p>
            <p className="text-2xl font-black text-green-500">{loading ? '...' : stats.ativas}</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">Vencidas</p>
            <p className="text-2xl font-black text-red-500">{loading ? '...' : stats.vencidas}</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Stethoscope className="w-4 h-4 text-amber-500" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">Consultas</p>
            <p className="text-2xl font-black text-amber-500">{loading ? '...' : stats.consultas}</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <FileText className="w-4 h-4 text-blue-500" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">Exames</p>
            <p className="text-2xl font-black text-blue-500">{loading ? '...' : stats.exames}</p>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <CalendarCheck className="w-4 h-4 text-purple-500" />
              </div>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/40">% Consultas</p>
            <p className="text-2xl font-black text-purple-500">{loading ? '...' : `${stats.pctConsultas}%`}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/10">
            <h3 className="text-sm font-black uppercase tracking-wider text-on-surface-variant/60 mb-4">Atividades por Trimestre</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip 
                    contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="consultas" name="Consultas" fill={COLORS[0]} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exames" name="Exames" fill={COLORS[1]} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/10">
            <h3 className="text-sm font-black uppercase tracking-wider text-on-surface-variant/60 mb-4">Classificação de Risco</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant/10">
            <h3 className="text-sm font-black uppercase tracking-wider text-on-surface-variant/60 mb-4">Status das Gestações</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieStatusData.filter(d => d.value > 0)}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-primary p-5 rounded-2xl shadow-lg shadow-primary/20 text-white">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black uppercase tracking-wider mb-2">Cobertura de Pré-natal</h3>
                <p className="text-white/70 text-sm">
                  {filterRisk !== 'all' 
                    ? `Filtrado por risco ${filterRisk === 'HABITUAL' ? 'Habitual' : 'Alto Risco'}`
                    : 'Indicador geral de acompanhamento'
                  }
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
            </div>
            <div className="mt-6">
              <div className="flex items-end justify-between mb-2">
                <span className="text-4xl font-black">{stats.pctConsultas}%</span>
                <span className="text-white/60 text-sm">das consultas realizadas</span>
              </div>
              <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                <div className="bg-white h-full rounded-full" style={{ width: `${Math.min(stats.pctConsultas, 100)}%` }}></div>
              </div>
              <div className="flex justify-between mt-2 text-[10px] font-black uppercase tracking-widest text-white/60">
                <span>0%</span>
                <span>100%</span>
              </div>
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
                  <th className="px-4 py-3">Semanas</th>
                  <th className="px-4 py-3">Classificação</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-outline-variant/10">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant/60">Carregando...</td>
                  </tr>
                ) : gestacoesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant/60">Nenhuma gestação encontrada</td>
                  </tr>
                ) : (
                  gestacoesFiltradas.slice(0, 10).map(g => {
                    const paciente = pacientes.find(p => p.cpf === g.cpf_paciente);
                    const status = getGestacaoStatus(g.dum);
                    const weeks = getWeeksFromDum(g.dum);
                    
                    return (
                      <tr key={g.sispn} className="hover:bg-primary/5 transition-colors">
                        <td className="px-4 py-3 font-medium">{formatSispn(g.sispn)}</td>
                        <td className="px-4 py-3">{paciente?.gestante || '---'}</td>
                        <td className="px-4 py-3">{g.dum ? new Date(g.dum).toLocaleDateString('pt-BR') : '---'}</td>
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