'use client';

import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  Users, 
  HeartPulse, 
  Stethoscope, 
  FlaskConical, 
  TrendingUp, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Building2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell,
  LabelList
} from 'recharts';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

const COLORS = ['#0066FF', '#00C2FF', '#FF6B00', '#FFC700', '#00E096'];

export default function DashboardOverview() {
  const { user, loading: authLoading } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<any[]>([]);
  const [routineTypes, setRoutineTypes] = useState<any[]>([]);
  
  // Global Filters
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterPeriod, setFilterPeriod] = useState('30d');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterTrimester, setFilterTrimester] = useState('all');
  const [filterRoutine, setFilterRoutine] = useState('all');

  // Set initial unit filter based on user
  useEffect(() => {
    if (user?.unidade_cnes && user.nivel_acesso !== 'Administrador') {
      setFilterUnit(user.unidade_cnes);
    }
  }, [user]);

  const [gestacoesData, setGestacoesData] = useState<any[]>([]);
  const [atendimentosData, setAtendimentosData] = useState<any[]>([]);
  const [examesData, setExamesData] = useState<any[]>([]);
  const [stats, setStats] = useState({
    patients: 0,
    gestations: 0,
    consultations: 0,
    exams: 0,
    units: 0
  });

  useEffect(() => {
    setMounted(true);
    if (authLoading) return;

    if (isSupabaseConfigured) {
      setLoading(true);

      // Prepare queries
      let gestsQuery = supabase.from('gestacoes').select('*');
      let consQuery = supabase.from('atendimentos').select('*');
      let examsQuery = supabase.from('registro_rotinas').select('*');
      let unitsQuery = supabase.from('unidades_saude').select('*');
      let pacsQuery = supabase.from('pacientes').select('*', { count: 'exact', head: true });
      
      // Apply unit filter at database level for non-admins
      if (user?.nivel_acesso !== 'Administrador' && user?.unidade_cnes) {
        gestsQuery = gestsQuery.eq('unidade_cnes', user.unidade_cnes);
        consQuery = consQuery.eq('unidade_cnes', user.unidade_cnes);
        examsQuery = examsQuery.eq('unidade_cnes', user.unidade_cnes);
        unitsQuery = unitsQuery.eq('cnes', user.unidade_cnes);
        pacsQuery = pacsQuery.eq('unidade_cnes', user.unidade_cnes);
      }

      Promise.all([
        gestsQuery,
        consQuery,
        examsQuery,
        unitsQuery,
        supabase.from('rotinas').select('*'),
        pacsQuery
      ]).then(([gests, cons, exams, unitsRes, routinesRes, pacs]) => {
        setGestacoesData(gests.data || []);
        setAtendimentosData(cons.data || []);
        setExamesData(exams.data || []);
        setUnits(unitsRes.data || []);
        setRoutineTypes(routinesRes.data || []);
        setStats(prev => ({ ...prev, patients: pacs.count || 0, units: unitsRes.count || 0 }));
      }).finally(() => setLoading(false));
    } else {
      // Mock data for demo
      setTimeout(() => {
        setStats({
          patients: 124,
          gestations: 86,
          consultations: 452,
          exams: 312,
          units: 8
        });
        setUnits([
          { cnes: '1', nome_fantasia: 'UBS Centro' },
          { cnes: '2', nome_fantasia: 'UBS Vila Nova' },
          { cnes: '3', nome_fantasia: 'Hospital Regional' }
        ]);
        setRoutineTypes([
          { id: '1', descricao: 'Pré-Natal Habitual' },
          { id: '2', descricao: 'Alto Risco' },
          { id: '3', descricao: 'Puerpério' }
        ]);
        setLoading(false);
      }, 800);
    }
  }, [authLoading, user]);

  // Real filtering logic
  const filteredData = useMemo(() => {
    if (!mounted || loading) return { gestacoes: [], atendimentos: [], exames: [] };

    const now = new Date();
    const periodLimit = new Date();
    if (filterPeriod === '30d') periodLimit.setDate(now.getDate() - 30);
    else if (filterPeriod === '90d') periodLimit.setDate(now.getDate() - 90);
    else if (filterPeriod === 'ytd') periodLimit.setMonth(0, 1); // Jan 1st

    const filterByUnit = (item: any) => filterUnit === 'all' || item.unidade_cnes === filterUnit;
    const filterByPeriod = (dateStr: string) => !dateStr || new Date(dateStr) >= periodLimit;
    const filterByRisk = (item: any) => filterRisk === 'all' || item.classificacao_pn === filterRisk;
    const filterByTrimester = (trim: string) => filterTrimester === 'all' || trim === filterTrimester;

    // Filter Gestations
    const gests = gestacoesData.filter(g => {
      const matchesUnit = filterByUnit(g);
      const matchesPeriod = filterByPeriod(g.data_cadastro);
      const matchesRisk = filterByRisk(g);
      return matchesUnit && matchesPeriod && matchesRisk;
    });

    // Filter Atendimentos
    const cons = atendimentosData.filter(c => {
      const matchesUnit = filterByUnit(c);
      const matchesPeriod = filterByPeriod(c.data_consulta);
      const matchesTrimester = filterByTrimester(c.trimestre_consulta);
      
      // If filtering by risk, we need to find the gestation for this atendimento
      let matchesRisk = true;
      if (filterRisk !== 'all') {
        const gest = gestacoesData.find(g => g.sispn === c.sispn);
        matchesRisk = gest ? gest.classificacao_pn === filterRisk : false;
      }

      return matchesUnit && matchesPeriod && matchesTrimester && matchesRisk;
    });

    // Filter Exames
    const exams = examesData.filter(e => {
      const matchesUnit = filterByUnit(e);
      const matchesPeriod = filterByPeriod(e.data_realizacao);
      const matchesTrimester = filterByTrimester(e.trimestre_realizacao);
      const matchesRoutine = filterRoutine === 'all' || e.id_rotina === filterRoutine || (filterRoutine === 'Exames' && e.id_rotina);
      
      let matchesRisk = true;
      if (filterRisk !== 'all') {
        const gest = gestacoesData.find(g => g.sispn === e.sispn);
        matchesRisk = gest ? gest.classificacao_pn === filterRisk : false;
      }

      return matchesUnit && matchesPeriod && matchesTrimester && matchesRoutine && matchesRisk;
    });

    return { gestacoes: gests, atendimentos: cons, exames: exams };
  }, [mounted, loading, gestacoesData, atendimentosData, examesData, filterUnit, filterPeriod, filterRisk, filterTrimester, filterRoutine]);

  if (!mounted) return null;

  const filteredStats = {
    gestations: filteredData.gestacoes.length,
    patients: filteredData.gestacoes.length, // Based on gestations as requested
    consultations: filteredData.atendimentos.length,
    exams: filteredData.exames.length
  };

  // Dynamic Data based on filters
  const getFilteredMonthlyData = () => {
    if (loading) return [];
    
    // Group by period
    const groups: Record<string, { name: string, atendimentos: number, exames: number }> = {};
    
    const formatDate = (dateStr: string) => {
      const d = new Date(dateStr);
      if (filterPeriod === '30d') return `Semana ${Math.ceil(d.getDate() / 7)}`;
      if (filterPeriod === '90d') return d.toLocaleDateString('pt-BR', { month: 'short' });
      return d.toLocaleDateString('pt-BR', { month: 'short' });
    };

    // Initialize groups for the period to ensure all months/weeks are shown
    const now = new Date();
    if (filterPeriod === '30d') {
      for (let i = 1; i <= 4; i++) groups[`Semana ${i}`] = { name: `Semana ${i}`, atendimentos: 0, exames: 0 };
    } else if (filterPeriod === '90d') {
      for (let i = 2; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const name = d.toLocaleDateString('pt-BR', { month: 'short' });
        groups[name] = { name, atendimentos: 0, exames: 0 };
      }
    } else {
      const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      months.forEach(m => groups[m] = { name: m, atendimentos: 0, exames: 0 });
    }

    filteredData.atendimentos.forEach(c => {
      const key = formatDate(c.data_consulta);
      if (groups[key]) groups[key].atendimentos++;
    });

    filteredData.exames.forEach(e => {
      const key = formatDate(e.data_realizacao);
      if (groups[key]) groups[key].exames++;
    });

    return Object.values(groups);
  };

  const getFilteredGestationStatus = () => {
    if (loading) return [];
    const total = filteredData.gestacoes.length || 1;
    const habitual = filteredData.gestacoes.filter(g => g.classificacao_pn === 'HABITUAL').length;
    const altoRisco = filteredData.gestacoes.filter(g => g.classificacao_pn === 'RISCO').length;
    
    return [
      { name: 'HABITUAL', value: Math.round((habitual / total) * 100) },
      { name: 'RISCO', value: Math.round((altoRisco / total) * 100) },
    ];
  };

  const getFilteredTrimesterData = () => {
    if (loading) return [];
    
    const counts = {
      '1º TRIMESTRE': filteredData.atendimentos.filter(c => c.trimestre_consulta === '1º TRIMESTRE').length + filteredData.exames.filter(e => e.trimestre_realizacao === '1º TRIMESTRE').length,
      '2º TRIMESTRE': filteredData.atendimentos.filter(c => c.trimestre_consulta === '2º TRIMESTRE').length + filteredData.exames.filter(e => e.trimestre_realizacao === '2º TRIMESTRE').length,
      '3º TRIMESTRE': filteredData.atendimentos.filter(c => c.trimestre_consulta === '3º TRIMESTRE').length + filteredData.exames.filter(e => e.trimestre_realizacao === '3º TRIMESTRE').length,
    };

    return [
      { name: '1º TRIMESTRE', value: counts['1º TRIMESTRE'] },
      { name: '2º TRIMESTRE', value: counts['2º TRIMESTRE'] },
      { name: '3º TRIMESTRE', value: counts['3º TRIMESTRE'] },
    ];
  };

  const monthlyData = getFilteredMonthlyData();
  const gestationStatus = getFilteredGestationStatus();
  const trimesterData = getFilteredTrimesterData();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 lg:p-12 pb-32 max-w-7xl mx-auto space-y-10">
        {/* Header & Filters */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <header className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-12 h-1.5 bg-primary rounded-full"></span>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Analytics & Insights</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight font-headline text-on-surface uppercase text-primary">Visão Geral</h2>
            <p className="text-lg text-on-surface-variant/60 font-body max-w-2xl">Monitoramento em tempo real dos indicadores de saúde materna.</p>
          </header>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-4 bg-surface-container-low p-4 rounded-[2rem] border border-outline-variant/10 shadow-sm">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-2">Unidade</label>
              <select 
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                disabled={user?.nivel_acesso !== 'Administrador'}
                className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {user?.nivel_acesso === 'Administrador' && (
                  <option key="unit-all" value="all">Todas as Unidades</option>
                )}
                {units.map((u) => (
                  <option key={`unit-opt-${u.cnes}`} value={u.cnes}>{u.nome_fantasia || u.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-2">Período</label>
              <select 
                value={filterPeriod}
                onChange={(e) => setFilterPeriod(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option key="per-30" value="30d">Últimos 30 dias</option>
                <option key="per-90" value="90d">Últimos 90 dias</option>
                <option key="per-ytd" value="ytd">Este Ano</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-2">Rotina</label>
              <select 
                value={filterRoutine}
                onChange={(e) => setFilterRoutine(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option key="routine-all" value="all">Todas as Rotinas</option>
                {routineTypes.map((r) => (
                  <option key={`routine-opt-${r.id}`} value={r.id || r.descricao}>{r.descricao}</option>
                ))}
                {/* Ensure "Exames" is visible if not in database */}
                {!routineTypes.find(r => r.descricao === 'Exames') && (
                  <option key="routine-exames-opt" value="Exames">Exames</option>
                )}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-2">Trimestre</label>
              <select 
                value={filterTrimester}
                onChange={(e) => setFilterTrimester(e.target.value)}
                className="bg-surface-container-lowest border border-outline-variant/20 rounded-xl px-4 py-2 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all"
              >
                <option key="trim-all" value="all">Todos</option>
                <option key="trim-1" value="1º TRIMESTRE">1º Trimestre</option>
                <option key="trim-2" value="2º TRIMESTRE">2º Trimestre</option>
                <option key="trim-3" value="3º TRIMESTRE">3º Trimestre</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-on-surface-variant/50 ml-2">Risco</label>
              <div className="flex bg-surface-container-lowest p-1 rounded-xl border border-outline-variant/20">
                {['all', 'HABITUAL', 'RISCO'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setFilterRisk(r)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all ${
                      filterRisk === r 
                        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                        : 'text-on-surface-variant/60 hover:bg-primary/5'
                    }`}
                  >
                    {r === 'all' ? 'Todos' : r === 'HABITUAL' ? 'Habitual' : 'Alto Risco'}
                  </button>
                ))}
              </div>
            </div>

            {(filterUnit !== 'all' || filterPeriod !== '30d' || filterRisk !== 'all' || filterTrimester !== 'all' || filterRoutine !== 'all') && (
              <button 
                onClick={() => {
                  setFilterUnit('all');
                  setFilterPeriod('30d');
                  setFilterRisk('all');
                  setFilterTrimester('all');
                  setFilterRoutine('all');
                }}
                className="mt-auto mb-1 px-4 py-2 text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 rounded-xl transition-all border border-primary/20"
              >
                Limpar Tudo
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Gestações" 
            value={filteredStats.gestations} 
            icon={<HeartPulse className="w-6 h-6" />} 
            trend="+12%" 
            isUp={true} 
            loading={loading}
          />
          <StatCard 
            title="Pacientes" 
            value={filteredStats.patients} 
            icon={<Users className="w-6 h-6" />} 
            trend="+5%" 
            isUp={true} 
            loading={loading}
          />
          <StatCard 
            title="Atendimentos" 
            value={filteredStats.consultations} 
            icon={<Stethoscope className="w-6 h-6" />} 
            trend="+18%" 
            isUp={true} 
            loading={loading}
          />
          <StatCard 
            title="Exames Realizados" 
            value={filteredStats.exams} 
            icon={<FlaskConical className="w-6 h-6" />} 
            trend="-2%" 
            isUp={false} 
            loading={loading}
          />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-12 gap-8">
          {/* Main Chart - Line Chart */}
          <div className="col-span-12 lg:col-span-8 bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-xl shadow-black/5 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black font-headline text-on-surface uppercase tracking-tight">Produtividade Mensal</h3>
                <p className="text-xs text-on-surface-variant font-body opacity-60">
                  {filterRisk !== 'all' ? `Filtrado por: ${filterRisk}` : 'Comparativo entre atendimentos e exames'}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Atendimentos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary-container"></div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Exames</span>
                </div>
              </div>
            </div>
            <div className="h-[350px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyData}>
                  <defs>
                    <linearGradient id="colorAtend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0066FF" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#0066FF" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} 
                    dy={10}
                  />
                  <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} 
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', padding: '12px' }}
                  />
                  <Area type="monotone" dataKey="atendimentos" stroke="#0066FF" strokeWidth={4} fillOpacity={1} fill="url(#colorAtend)">
                    <LabelList dataKey="atendimentos" position="top" offset={10} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#0066FF' }} />
                  </Area>
                  <Area type="monotone" dataKey="exames" stroke="#00C2FF" strokeWidth={4} fillOpacity={0}>
                    <LabelList dataKey="exames" position="top" offset={10} style={{ fontSize: '10px', fontWeight: 'bold', fill: '#00C2FF' }} />
                  </Area>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Side Chart - Pie Chart */}
          <div className="col-span-12 lg:col-span-4 bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-xl shadow-black/5 border border-outline-variant/10 flex flex-col">
            <h3 className="text-2xl font-black font-headline text-on-surface uppercase tracking-tight mb-2">Classificação</h3>
            <p className="text-xs text-on-surface-variant font-body opacity-60 mb-8">Clique em uma fatia para filtrar os outros gráficos</p>
            
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={gestationStatus.filter(d => d.value > 0)}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                      onClick={(data) => {
                        if (data && data.name) {
                          if (filterRisk === data.name) setFilterRisk('all');
                          else setFilterRisk(data.name);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {gestationStatus.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={COLORS[index % COLORS.length]} 
                          stroke={filterRisk === entry.name ? '#000' : 'none'}
                          strokeWidth={2}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="w-full space-y-3 mt-6">
                {gestationStatus.map((item, index) => (
                  <button 
                    key={item.name} 
                    onClick={() => setFilterRisk(item.name === filterRisk ? 'all' : item.name)}
                    className={`w-full flex items-center justify-between p-2 rounded-xl transition-all ${filterRisk === item.name ? 'bg-primary/5 ring-1 ring-primary/20' : 'hover:bg-surface-container-low'}`}
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index] }}></div>
                      <span className={`text-xs font-bold ${filterRisk === item.name ? 'text-primary' : 'text-on-surface-variant'}`}>{item.name}</span>
                    </div>
                    <span className="text-sm font-black text-on-surface">{item.value}%</span>
                  </button>
                ))}
                {filterRisk !== 'all' && (
                  <button 
                    onClick={() => setFilterRisk('all')}
                    className="w-full text-[10px] font-black uppercase tracking-widest text-primary mt-2 hover:underline"
                  >
                    Limpar Filtro de Risco
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bottom Chart - Bar Chart */}
          <div className="col-span-12 md:col-span-6 bg-surface-container-lowest p-8 rounded-[2.5rem] shadow-xl shadow-black/5 border border-outline-variant/10">
            <h3 className="text-2xl font-black font-headline text-on-surface uppercase tracking-tight mb-2">Gestações por Trimestre</h3>
            <p className="text-xs text-on-surface-variant font-body opacity-60 mb-8">Clique em uma barra para filtrar por trimestre</p>
            
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={trimesterData.filter(d => d.value > 0)}
                  onClick={(data) => {
                    if (data && data.activeLabel) {
                      const label = String(data.activeLabel);
                      if (filterTrimester === label) setFilterTrimester('all');
                      else setFilterTrimester(label);
                    }
                  }}
                  className="cursor-pointer"
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{ fontSize: 10, fill: '#64748B', fontWeight: 700 }} 
                  />
                  <YAxis axisLine={false} tickLine={false} hide />
                  <Tooltip cursor={{fill: 'transparent'}} />
                  <Bar dataKey="value" fill="#0066FF" radius={[10, 10, 0, 0]} barSize={40}>
                    <LabelList dataKey="value" position="top" style={{ fontSize: '12px', fontWeight: 'bold', fill: '#0066FF' }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Info Card */}
          <div className="col-span-12 md:col-span-6 bg-primary p-8 rounded-[2.5rem] shadow-xl shadow-primary/20 text-white relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 group-hover:scale-110 transition-transform duration-700"></div>
            <div className="relative z-10 space-y-6 h-full flex flex-col">
              <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
                <TrendingUp className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-3xl font-black font-headline uppercase tracking-tight leading-none mb-2">Meta de Cobertura</h3>
                <p className="text-white/70 font-body text-sm leading-relaxed">
                  {filterUnit !== 'all' 
                    ? `Análise específica para a unidade selecionada. O desempenho está acima da média regional.`
                    : `Você atingiu 85% da meta de consultas de pré-natal este mês. Faltam apenas 15 atendimentos para bater o recorde trimestral.`
                  }
                </p>
              </div>
              <div className="mt-auto pt-6">
                <div className="w-full bg-white/20 h-3 rounded-full overflow-hidden">
                  <div className="bg-white h-full w-[85%] rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)]"></div>
                </div>
                <div className="flex justify-between mt-3 text-[10px] font-black uppercase tracking-widest">
                  <span>Progresso Atual</span>
                  <span>85%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

function StatCard({ title, value, icon, trend, isUp, loading }: { title: string, value: number | string, icon: React.ReactNode, trend: string, isUp: boolean, loading: boolean }) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-lg shadow-black/5 border border-outline-variant/10 hover:border-primary/30 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
          {icon}
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ${isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
          {trend}
        </div>
      </div>
      <div className="space-y-1">
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/40">{title}</p>
        <h4 className="text-3xl font-black text-on-surface font-headline leading-none">
          {loading ? '...' : value}
        </h4>
      </div>
    </div>
  );
}
