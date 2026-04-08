'use client';

import React, { useEffect, useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { 
  TrendingUp
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
import { useAuth, Operator } from '@/context/AuthContext';

const COLORS = ['#0066FF', '#00C2FF', '#FF6B00', '#FFC700', '#00E096'];

export default function DashboardOverview() {
  const auth = useAuth();
  const user = auth.user as Operator | null;
  const authLoading = auth.loading;
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState<any[]>([]);
  const [routineTypes, setRoutineTypes] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      console.log('Dashboard User Info:', {
        cpf: user.cpf,
        role: user.nivel_acesso,
        unit: user.unidade_cnes
      });
    }
  }, [user]);
  
  // Global Filters
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [filterTrimester, setFilterTrimester] = useState('all');
  const [filterRoutine, setFilterRoutine] = useState('all');

  // Set initial unit filter based on user
  useEffect(() => {
    if (user?.unidade_cnes && user.nivel_acesso !== 'Administrador') {
      setFilterUnit(user.unidade_cnes);
    }
  }, [user]);

  const fetchAll = async (table: string, select: string = '*', filter: string | null = null) => {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    let hasMore = true;

    while (hasMore) {
      let query = supabase.from(table).select(select).range(from, from + step - 1);
      if (filter) {
        query = query.or(filter);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      if (data) {
        allData = [...allData, ...data];
        if (data.length < step) hasMore = false;
        else from += step;
      } else {
        hasMore = false;
      }
    }
    return allData;
  };

  const [gestacoesData, setGestacoesData] = useState<any[]>([]);
  const [atendimentosData, setAtendimentosData] = useState<any[]>([]);
  const [examesData, setExamesData] = useState<any[]>([]);
  const [patientsData, setPatientsData] = useState<any[]>([]);
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

      const loadData = async () => {
        try {
          const unitFilter = (user?.nivel_acesso !== 'Administrador' && user?.unidade_cnes) 
            ? `unidade_cnes.eq.${user.unidade_cnes},unidade_cnes.is.null` 
            : null;

          const [gests, cons, exams, unitsRes, routinesRes, pacsRes] = await Promise.all([
            fetchAll('gestacoes', '*', unitFilter),
            fetchAll('atendimentos', '*', unitFilter),
            fetchAll('registro_rotinas', '*, rotinas(tipo)', unitFilter),
            user?.nivel_acesso !== 'Administrador' && user?.unidade_cnes 
              ? supabase.from('unidades_saude').select('*').eq('cnes', user.unidade_cnes)
              : supabase.from('unidades_saude').select('*'),
            supabase.from('rotinas').select('*'),
            fetchAll('pacientes', '*', unitFilter)
          ]);

          console.log('Dashboard Data Raw (Full):', {
            gestacoes: gests.length,
            atendimentos: cons.length,
            exames: exams.length,
            patients: pacsRes.length
          });

          setGestacoesData(gests);
          setAtendimentosData(cons);
          setExamesData(exams);
          setUnits(Array.isArray(unitsRes) ? unitsRes : (unitsRes.data || []));
          setRoutineTypes(routinesRes.data || []);
          setPatientsData(pacsRes);
          setStats({ 
            patients: pacsRes.length, 
            gestations: gests.length,
            consultations: cons.length,
            exams: exams.length,
            units: Array.isArray(unitsRes) ? unitsRes.length : (unitsRes.data?.length || 0)
          });
        } catch (err) {
          console.error('Critical error in dashboard data fetching:', err);
        } finally {
          setLoading(false);
        }
      };

      loadData();
    } else {
      // Mock data for demo - populate arrays so filters work
      setTimeout(() => {
        const mockGestacoes = Array.from({ length: 86 }).map((_, i) => ({
          id: `g-${i}`,
          sispn: `sis-${i}`,
          classificacao_pn: i % 3 === 0 ? 'RISCO' : 'HABITUAL',
          data_cadastro: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          unidade_cnes: '1'
        }));

        const mockAtendimentos = Array.from({ length: 150 }).map((_, i) => ({
          id: `c-${i}`,
          sispn: `sis-${Math.floor(Math.random() * 86)}`,
          data_consulta: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          trimestre_consulta: i % 3 === 0 ? '1º TRIMESTRE' : i % 3 === 1 ? '2º TRIMESTRE' : '3º TRIMESTRE',
          unidade_cnes: '1'
        }));

        const mockExames = Array.from({ length: 120 }).map((_, i) => ({
          id_registro: `e-${i}`,
          sispn: `sis-${Math.floor(Math.random() * 86)}`,
          data_realizacao: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
          trimestre_realizacao: i % 3 === 0 ? '1º TRIMESTRE' : i % 3 === 1 ? '2º TRIMESTRE' : '3º TRIMESTRE',
          id_rotina: '1',
          unidade_cnes: '1'
        }));

        setGestacoesData(mockGestacoes);
        setAtendimentosData(mockAtendimentos);
        setExamesData(mockExames);
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
    if (!mounted || loading) return { gestacoes: [], atendimentos: [], exames: [], pacientes: [] };

    const filterByUnit = (item: any) => {
      if (filterUnit === 'all') return true;
      if (!item.unidade_cnes) return false;
      return String(item.unidade_cnes).trim() === String(filterUnit).trim();
    };
    const filterByRisk = (item: any) => filterRisk === 'all' || item.classificacao_pn === filterRisk;
    const filterByTrimester = (trim: string) => filterTrimester === 'all' || trim === filterTrimester;
    const filterByRoutine = (item: any) => {
      if (filterRoutine === 'all') return true;
      // Handle both joined data and legacy data
      const itemType = item.rotinas?.tipo || item.tipo_rotina; 
      return itemType === filterRoutine;
    };

    // Filter Gestations
    const gests = gestacoesData.filter(g => {
      const matchesUnit = filterByUnit(g);
      const matchesRisk = filterByRisk(g);
      
      let matchesTrimester = true;
      if (filterTrimester !== 'all') {
        const hasAtendimento = atendimentosData.some(c => c.sispn === g.sispn && c.trimestre_consulta === filterTrimester);
        const hasExam = examesData.some(e => e.sispn === g.sispn && e.trimestre_realizacao === filterTrimester);
        matchesTrimester = hasAtendimento || hasExam;
      }

      return matchesUnit && matchesRisk && matchesTrimester;
    });

    // Filter Atendimentos
    const cons = atendimentosData.filter(c => {
      const matchesUnit = filterByUnit(c);
      const matchesTrimester = filterByTrimester(c.trimestre_consulta);
      
      // If filtering by risk, we need to find the gestation for this atendimento
      let matchesRisk = true;
      if (filterRisk !== 'all') {
        const gest = gestacoesData.find(g => g.sispn === c.sispn);
        matchesRisk = gest ? gest.classificacao_pn === filterRisk : false;
      }

      return matchesUnit && matchesTrimester && matchesRisk;
    });

    // Filter Exames
    const exams = examesData.filter(e => {
      const matchesUnit = filterByUnit(e);
      const matchesTrimester = filterByTrimester(e.trimestre_realizacao);
      const matchesRoutine = filterByRoutine(e);
      
      let matchesRisk = true;
      if (filterRisk !== 'all') {
        const gest = gestacoesData.find(g => g.sispn === e.sispn);
        matchesRisk = gest ? gest.classificacao_pn === filterRisk : false;
      }

      return matchesUnit && matchesTrimester && matchesRoutine && matchesRisk;
    });

    // Filter Patients
    const pacs = patientsData.filter(p => {
      const matchesUnit = filterByUnit(p);
      
      // Find activity for this patient
      const patientGests = gestacoesData.filter(g => g.cpf_paciente === p.cpf);
      
      let matchesTrimester = true;
      if (filterTrimester !== 'all') {
        const hasActivity = patientGests.some(g => 
          atendimentosData.some(c => c.sispn === g.sispn && c.trimestre_consulta === filterTrimester) ||
          examesData.some(e => e.sispn === g.sispn && e.trimestre_realizacao === filterTrimester)
        );
        matchesTrimester = hasActivity;
      }

      return matchesUnit && matchesTrimester;
    });

    return { gestacoes: gests, atendimentos: cons, exames: exams, pacientes: pacs };
  }, [mounted, loading, gestacoesData, atendimentosData, examesData, patientsData, filterUnit, filterRisk, filterTrimester, filterRoutine]);

  const routineOptions = useMemo(() => {
    const types = routineTypes.map(r => r.tipo).filter(Boolean);
    return Array.from(new Set(types)).sort();
  }, [routineTypes]);

  const filteredStats = {
    gestations: filteredData.gestacoes.length,
    patients: filteredData.pacientes.length,
    consultations: filteredData.atendimentos.length,
    exams: filteredData.exames.length
  };

  // Dynamic Data based on filters
  const getFilteredMonthlyData = () => {
    if (loading) return [];
    
    // Group by period
    const groups: Record<string, { name: string, atendimentos: number, exames: number }> = {};
    
    const formatDate = (dateStr: string) => {
      if (!dateStr) return '';
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
      return months[d.getMonth()];
    };

    // Initialize groups for the period to ensure all months are shown
    const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    months.forEach(m => groups[m] = { name: m, atendimentos: 0, exames: 0 });

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

  if (!mounted) return null;

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
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-3 w-full md:w-auto">
              <select 
                value={filterUnit}
                onChange={(e) => setFilterUnit(e.target.value)}
                disabled={user?.nivel_acesso !== 'Administrador'}
                className="w-full lg:w-auto bg-white text-primary border-2 border-primary/30 hover:shadow-primary/5 hover:border-primary rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {user?.nivel_acesso === 'Administrador' && (
                  <option key="unit-all" value="all">Todas as Unidades</option>
                )}
                {units.map((u) => (
                  <option key={`unit-opt-${u.cnes}`} value={u.cnes}>{u.nome_fantasia || u.nome}</option>
                ))}
              </select>

              <select 
                value={filterRoutine}
                onChange={(e) => setFilterRoutine(e.target.value)}
                className="w-full lg:w-auto bg-white text-primary border-2 border-primary/30 hover:shadow-primary/5 hover:border-primary rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
              >
                <option key="routine-all" value="all">Todas as Rotinas</option>
                {routineOptions.map((type) => (
                  <option key={`routine-opt-${type}`} value={type}>{type}</option>
                ))}
              </select>

              <select 
                value={filterTrimester}
                onChange={(e) => setFilterTrimester(e.target.value)}
                className="w-full lg:w-auto bg-white text-primary border-2 border-primary/30 hover:shadow-primary/5 hover:border-primary rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
              >
                <option key="trim-all" value="all">Filtrar Trimestre</option>
                <option key="trim-1" value="1º TRIMESTRE">1º Trimestre</option>
                <option key="trim-2" value="2º TRIMESTRE">2º Trimestre</option>
                <option key="trim-3" value="3º TRIMESTRE">3º Trimestre</option>
              </select>

              <select 
                value={filterRisk}
                onChange={(e) => setFilterRisk(e.target.value)}
                className="w-full lg:w-auto bg-white text-primary border-2 border-primary/30 hover:shadow-primary/5 hover:border-primary rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
              >
                <option key="risk-all" value="all">Grau de Risco</option>
                <option key="risk-habitual" value="HABITUAL">HABITUAL</option>
                <option key="risk-risco" value="RISCO">ALTO RISCO</option>
              </select>

              {(filterUnit !== 'all' || filterRisk !== 'all' || filterTrimester !== 'all' || filterRoutine !== 'all') && (
                <button 
                  onClick={() => {
                    setFilterUnit('all');
                    setFilterRisk('all');
                    setFilterTrimester('all');
                    setFilterRoutine('all');
                  }}
                   className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-error/10 text-error text-[9px] font-black uppercase tracking-widest hover:bg-error hover:text-white transition-all border border-error/20"
                >
                  <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                  Limpar
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard 
            title="Gestações" 
            value={filteredStats.gestations} 
            icon="ecg" 
            trend="+12%" 
            isUp={true} 
            loading={loading}
          />
          <StatCard 
            title="Pacientes" 
            value={filteredStats.patients} 
            icon="group" 
            trend="+5%" 
            isUp={true} 
            loading={loading}
          />
          <StatCard 
            title="Atendimentos" 
            value={filteredStats.consultations} 
            icon="medical_services" 
            trend="+18%" 
            isUp={true} 
            loading={loading}
          />
          <StatCard 
            title="Exames Realizados" 
            value={filteredStats.exams} 
            icon="lab_profile" 
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
                <span className="material-symbols-outlined text-4xl">trending_up</span>
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

function StatCard({ title, value, icon, trend, isUp, loading }: { title: string, value: number | string, icon: string, trend: string, isUp: boolean, loading: boolean }) {
  return (
    <div className="bg-surface-container-lowest p-6 rounded-[2rem] shadow-lg shadow-black/5 border border-outline-variant/10 hover:border-primary/30 transition-all group">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all duration-300">
          <span className="material-symbols-outlined text-2xl">{icon}</span>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-black ${isUp ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
          <span className="material-symbols-outlined text-[14px]">{isUp ? 'arrow_outward' : 'south_east'}</span>
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
