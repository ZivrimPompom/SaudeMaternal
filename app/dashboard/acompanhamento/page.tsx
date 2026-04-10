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
  Filter,
  ChevronRight
} from 'lucide-react';
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

interface Rotina {
  id: string;
  tipo: string;
  descricao: string;
  trimestre: string;
  categoria: string;
}

interface RegistroRotina {
  sispn: string;
  id_rotina: string;
  data_realizacao: string;
  trimestre_realizacao: string;
  tipo?: string;
}

const COLORS = {
  primary: '#0D9488',
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  gray: '#6B7280'
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

const formatSispn = (value: string) => {
  if (!value) return '';
  const v = value.replace(/\D/g, '');
  if (v.length <= 5) return v;
  return `${v.slice(0, 5)}-${v.slice(5, 9)}`;
};

export default function AcompanhamentoDashboard() {
  const auth = useAuth();
  const user = auth.user as Operator | null;
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  const [gestacoes, setGestacoes] = useState<Gestacao[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [rotinas, setRotinas] = useState<Rotina[]>([]);
  const [registrosRotinas, setRegistrosRotinas] = useState<RegistroRotina[]>([]);
  const [unidades, setUnidades] = useState<{cnes: string; nome_fantasia: string}[]>([]);

  const [filterStatus, setFilterStatus] = useState<'ATIVA' | 'VENCIDA' | 'TODAS'>('ATIVA');
  const [filterTrimestre, setFilterTrimestre] = useState<number | 'TODOS'>(0);
  const [filterUnidade, setFilterUnidade] = useState<string>('all');
  const [filterTipoRotina, setFilterTipoRotina] = useState('all');
  const [filterRotina, setFilterRotina] = useState('all');
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
          supabase.from('pacientes').select('cpf, gestante, nome_mae'),
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

  const gestacoesFiltradas = useMemo(() => {
    let filtered = gestacoes.filter(g => {
      if (filterUnidade !== 'all') {
        const gUnidade = g.unidade_cnes ? String(g.unidade_cnes).trim() : '';
        const fUnidade = String(filterUnidade).trim();
        if (gUnidade !== fUnidade) return false;
      }
      if (filterStatus !== 'TODAS' && getGestacaoStatus(g.dum) !== filterStatus) return false;
      if (filterTrimestre !== 0 && getTrimestreAtual(g.dum) !== filterTrimestre) return false;
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
  }, [gestacoes, pacientes, filterUnidade, filterStatus, filterTrimestre, searchQuery]);

  const stats = useMemo(() => {
    const total = gestacoesFiltradas.length;
    const ativas = gestacoesFiltradas.filter(g => getGestacaoStatus(g.dum) === 'ATIVA').length;
    const vencidas = gestacoesFiltradas.filter(g => getGestacaoStatus(g.dum) === 'VENCIDA').length;

    const consultasPorTrimestre = [0, 0, 0];
    const consultasEsperadas = [0, 0, 0];

    gestacoesFiltradas.forEach(g => {
      const tri = getTrimestreAtual(g.dum);
      const consultas = registrosRotinas.filter(r => r.sispn === g.sispn && r.tipo === 'CONSULTA');
      const porTri = consultas.filter(a => {
        const triCons = TRIMESTRE_MAP[a.trimestre_realizacao];
        return triCons === tri;
      });
      
      if (tri >= 1) consultasEsperadas[tri - 1] += 3;
      consultasPorTrimestre[tri - 1] += porTri.length;
    });

    const totalConsultas = consultasPorTrimestre.reduce((a, b) => a + b, 0);
    const totalEsperadas = consultasEsperadas.reduce((a, b) => a + b, 0);
    const pctConsultas = totalEsperadas > 0 ? Math.round((totalConsultas / totalEsperadas) * 100) : 0;

    const examesPorTrimestre = [0, 0, 0];
    const examesEsperados = [0, 0, 0];

    rotinas.forEach(r => {
      const tri = TRIMESTRE_MAP[r.trimestre];
      if (tri) {
        examesEsperados[tri - 1] += gestacoesFiltradas.filter(g => getTrimestreAtual(g.dum) >= tri).length;
      }
    });

    registrosRotinas.forEach(rr => {
      const g = gestacoesFiltradas.find(g => g.sispn === rr.sispn);
      if (g) {
        const triReal = TRIMESTRE_MAP[rr.trimestre_realizacao];
        if (triReal) examesPorTrimestre[triReal - 1]++;
      }
    });

    const totalExames = examesPorTrimestre.reduce((a, b) => a + b, 0);
    const totalExamesEsp = examesEsperados.reduce((a, b) => a + b, 0);
    const pctExames = totalExamesEsp > 0 ? Math.round((totalExames / totalExamesEsp) * 100) : 0;

    return {
      total,
      ativas,
      vencidas,
      pctConsultas,
      pctExames,
      consultasPorTrimestre,
      examesPorTrimestre
    };
  }, [gestacoesFiltradas, registrosRotinas, rotinas]);

  if (!mounted) return null;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-6 max-w-full mx-auto space-y-6">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="w-4 h-1 bg-primary rounded-full"></span>
            <span className="text-[6px] font-black text-primary uppercase tracking-[0.4em]">Dashboard</span>
          </div>
          <h2 className="text-xl md:text-3xl font-black tracking-tight font-headline text-primary uppercase leading-tight">
            Acompanhamento Gestacional
          </h2>
          <p className="text-xs md:text-sm text-on-surface-variant/60 font-body max-w-xl">
            Monitoramento do cumprimento do plano terapêutico das gestantes.
          </p>
        </header>

        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative w-48">
            <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
              <Search className="w-4 h-4 text-on-surface-variant/40" />
            </div>
            <input
              type="text"
              placeholder="Buscar gestante..."
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
            <option value="ATIVA">ATIVAS</option>
            <option value="VENCIDA">VENCIDAS</option>
          </select>

          <select
            value={filterTrimestre}
            onChange={(e) => setFilterTrimestre(e.target.value === '0' ? 0 : parseInt(e.target.value))}
            className="px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            <option value="0">Todos os Trimestres</option>
            <option value="1">1º Trimestre</option>
            <option value="2">2º Trimestre</option>
            <option value="3">3º Trimestre</option>
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
            <option value="CONSULTA">CONSULTAS</option>
            <option value="EXAME">EXAMES</option>
            <option value="VACINA">VACINAS</option>
            <option value="MEDICACAO">MEDICAÇÕES</option>
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
              setFilterTrimestre(0);
              setFilterTipoRotina('all');
              setFilterRotina('all');
            }}
            className="px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl hover:bg-surface-container-low focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            Limpar
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60">Total</p>
                <p className="text-2xl font-black text-primary">{loading ? '...' : stats.total}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60">Ativas</p>
                <p className="text-2xl font-black text-green-500">{loading ? '...' : stats.ativas}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-500" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60">Vencidas</p>
                <p className="text-2xl font-black text-red-500">{loading ? '...' : stats.vencidas}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <CalendarCheck className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60">Consultas</p>
                <p className="text-2xl font-black text-amber-500">{loading ? '...' : `${stats.pctConsultas}%`}</p>
              </div>
            </div>
          </div>

          <div className="bg-surface-container-lowest p-4 rounded-2xl border border-outline-variant/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                <Activity className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60">Exames</p>
                <p className="text-2xl font-black text-blue-500">{loading ? '...' : `${stats.pctExames}%`}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant/10 overflow-hidden">
          <div className="p-4 border-b border-outline-variant/10 flex items-center justify-between">
            <h3 className="text-sm font-black uppercase tracking-wider text-on-surface-variant/60">Lista de Gestantes</h3>
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
                  }).map(g => {
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
        </div>
      </div>
    </DashboardLayout>
  );
}