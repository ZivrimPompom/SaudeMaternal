'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  User, 
  Search, 
  Filter, 
  Plus, 
  X, 
  Save, 
  Trash2, 
  Edit2, 
  FileUp, 
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Stethoscope,
  ClipboardList,
  Clock,
  Baby
} from 'lucide-react';
import CSVImporter from '@/components/CSVImporter';
import Pagination from '@/components/Pagination';
import { useAuth } from '@/context/AuthContext';

interface Consulta {
  id_consulta: string;
  sispn: string;
  data_consulta: string;
  trimestre_consulta: '1º TRIMESTRE' | '2º TRIMESTRE' | '3º TRIMESTRE';
  cbo: string;
  cpf: string;
  data_proxima_consulta?: string;
  created_at?: string;
  // Joins
  gestacoes?: {
    dum: string;
    pacientes: {
      gestante: string;
    }
  };
  profissionais?: {
    nome: string;
    equipe: string;
  };
}

interface Gestacao {
  sispn: string;
  dum: string;
  paciente_nome: string;
  equipe: string;
}

const CBO_CATEGORIES: Record<string, string> = {
  '2235': 'ENFERMEIRO',
  '2251': 'MEDICO',
  '2252': 'MEDICO',
  '2253': 'MEDICO',
  '2232': 'DENTISTA',
  '3222': 'TECNICO ENFERMAGEM',
  '5151': 'ACS',
};

const getCboCategory = (cbo: any) => {
  if (!cbo) return 'NÃO INFORMADO';
  const cboStr = String(cbo);
  const prefix = cboStr.substring(0, 4);
  return CBO_CATEGORIES[prefix] || 'OUTROS';
};

export default function AtendimentosPage() {
  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen } = useSearch();
  const { user: authUser } = useAuth();
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [gestacoes, setGestacoes] = useState<Gestacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Filters
  const [filters, setFilters] = useState({
    mes: '',
    trimestre: '',
    categoria: '',
    equipe: ''
  });

  const [formData, setFormData] = useState<Partial<Consulta>>({
    sispn: '',
    data_consulta: new Date().toISOString().split('T')[0],
    cbo: '',
    cpf: 'NÃO INFORMADO',
    data_proxima_consulta: ''
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch Gestacoes for lookup
      const { data: gestData, error: gestError } = await supabase
        .from('gestacoes')
        .select(`
          sispn,
          dum,
          equipe,
          pacientes (gestante)
        `);
      
      if (gestError) {
        console.warn('Erro ao buscar gestações (join pacientes):', gestError);
        // Fallback without join
        const { data: fallbackGest } = await supabase.from('gestacoes').select('sispn, dum, equipe');
        setGestacoes(fallbackGest?.map(g => ({ ...g, paciente_nome: 'NÃO INFORMADO' })) || []);
      } else {
        const formattedGest = gestData?.map(g => {
          const pac = Array.isArray(g.pacientes) ? g.pacientes[0] : g.pacientes;
          return {
            sispn: g.sispn,
            dum: g.dum,
            equipe: g.equipe,
            paciente_nome: (pac as any)?.gestante || 'NÃO INFORMADO'
          };
        }) || [];
        setGestacoes(formattedGest);
      }

      // Fetch Consultas
      let { data: consData, error: consError } = await supabase
        .from('consultas')
        .select(`
          *,
          gestacoes (
            dum,
            pacientes (gestante)
          ),
          profissionais (
            nome,
            equipe
          )
        `)
        .order('data_consulta', { ascending: false });

      if (consError) {
        console.warn('Erro ao buscar consultas com joins, tentando sem joins:', consError);
        // Fallback: fetch without joins if relationship is missing
        const { data: fallbackCons, error: fallbackError } = await supabase
          .from('consultas')
          .select('*')
          .order('data_consulta', { ascending: false });
        
        if (fallbackError) throw fallbackError;
        setConsultas(fallbackCons || []);
      } else {
        setConsultas(consData || []);
      }
    } catch (err: any) {
      console.error('Erro crítico ao buscar dados:', err);
      setError(err.message || 'Erro desconhecido ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const calculateTrimestre = (dum: string, dataConsulta: string) => {
    if (!dum || !dataConsulta) return null;
    const start = new Date(dum);
    const consult = new Date(dataConsulta);
    const diffTime = consult.getTime() - start.getTime();
    const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);

    if (diffWeeks <= 13) return '1º TRIMESTRE';
    if (diffWeeks <= 27) return '2º TRIMESTRE';
    return '3º TRIMESTRE';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isSupabaseConfigured) return;

    try {
      const gest = gestacoes.find(g => g.sispn === formData.sispn);
      const trimestre = calculateTrimestre(gest?.dum || '', formData.data_consulta || '');

      const payload = {
        sispn: formData.sispn,
        data_consulta: formData.data_consulta,
        trimestre_consulta: trimestre,
        cbo: formData.cbo,
        cpf: formData.cpf || 'NÃO INFORMADO',
        data_proxima_consulta: formData.data_proxima_consulta || null,
        cpf_operador: authUser?.cpf || null
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('consultas')
          .update(payload)
          .eq('id_consulta', editingId);
        if (updateError) throw updateError;
        setSuccess('Atendimento atualizado com sucesso!');
      } else {
        const { error: insertError } = await supabase
          .from('consultas')
          .insert([payload]);
        if (insertError) throw insertError;
        setSuccess('Atendimento registrado com sucesso!');
      }

      setFormData({
        sispn: '',
        data_consulta: new Date().toISOString().split('T')[0],
        cbo: '',
        cpf: 'NÃO INFORMADO',
        data_proxima_consulta: ''
      });
      setEditingId(null);
      setIsFormOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (con: Consulta) => {
    setEditingId(con.id_consulta);
    setFormData({
      sispn: con.sispn,
      data_consulta: con.data_consulta,
      cbo: con.cbo,
      cpf: con.cpf,
      data_proxima_consulta: con.data_proxima_consulta || ''
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este atendimento?')) return;
    try {
      const { error: delError } = await supabase
        .from('consultas')
        .delete()
        .eq('id_consulta', id);
      if (delError) throw delError;
      setSuccess('Atendimento excluído!');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredConsultas = useMemo(() => {
    return consultas.filter(c => {
      const query = searchQuery.toLowerCase().trim();
      const normalize = (str: string) => 
        str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
      
      const queryNormalizada = normalize(query);
      
      const gest = Array.isArray(c.gestacoes) ? c.gestacoes[0] : c.gestacoes;
      const pac = gest?.pacientes;
      const pacObj = Array.isArray(pac) ? pac[0] : pac;
      const pacienteNome = (pacObj as any)?.gestante || '';
      const profissionalNome = c.profissionais?.nome || '';
      
      const matchesSearch = !query || (
        normalize(pacienteNome).includes(queryNormalizada) ||
        normalize(c.sispn).includes(queryNormalizada) ||
        normalize(profissionalNome).includes(queryNormalizada) ||
        normalize(c.cbo).includes(queryNormalizada)
      );

      if (!matchesSearch) return false;

      if (filters.mes && !c.data_consulta.startsWith(filters.mes)) return false;
      if (filters.trimestre && c.trimestre_consulta !== filters.trimestre) return false;
      if (filters.categoria && getCboCategory(c.cbo) !== filters.categoria) return false;
      
      const equipe = c.profissionais?.equipe || (gest as any)?.equipe || '';
      if (filters.equipe && equipe !== filters.equipe) return false;

      return true;
    });
  }, [consultas, searchQuery, filters]);

  const uniqueEquipes = Array.from(new Set(gestacoes.map(g => g.equipe))).filter(Boolean).sort();
  const uniqueCategorias = Array.from(new Set(consultas.map(c => getCboCategory(c.cbo)))).filter(Boolean).sort();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 lg:p-12 pb-32 max-w-7xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-12 h-1.5 bg-primary rounded-full"></span>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Assistência Pré-Natal</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight font-headline text-on-surface uppercase text-primary">Atendimentos</h2>
            <p className="text-lg text-on-surface-variant/60 font-body max-w-2xl">Registro e monitoramento de consultas e procedimentos clínicos.</p>
          </div>
          <div className="flex items-center gap-3">
            <CSVImporter 
              tableName="consultas"
              expectedColumns={['sispn', 'data_consulta', 'cbo', 'cpf', 'data_proxima_consulta']}
              requiredColumns={['sispn', 'data_consulta', 'cbo']}
              onSuccess={fetchData}
              title="Importar Atendimentos"
              transformData={(data) => {
                const existingSispns = new Set(gestacoes.map(g => g.sispn?.toString().replace(/\D/g, '') || ''));
                
                return data.filter(item => {
                  const sispn = item.sispn?.toString().replace(/\D/g, '');
                  if (!sispn || !existingSispns.has(sispn)) {
                    console.warn(`SISPN ${sispn} não encontrado na base de gestações. Pulando registro.`);
                    return false;
                  }
                  return true;
                }).map(item => {
                  const sispnClean = item.sispn?.toString().replace(/\D/g, '');
                  const gest = gestacoes.find(g => g.sispn?.toString().replace(/\D/g, '') === sispnClean);
                  
                  // Handle DD/MM/YYYY format
                  const formatDate = (dateStr: string) => {
                    if (!dateStr) return null;
                    if (typeof dateStr !== 'string') return dateStr;
                    if (dateStr.includes('/')) {
                      const parts = dateStr.split('/');
                      if (parts.length === 3) {
                        const [day, month, year] = parts;
                        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                      }
                    }
                    return dateStr;
                  };

                  const dataConsulta = formatDate(item.data_consulta) || '';
                  const dataProxima = formatDate(item.data_proxima_consulta);

                  return {
                    ...item,
                    data_consulta: dataConsulta,
                    data_proxima_consulta: dataProxima,
                    trimestre_consulta: calculateTrimestre(gest?.dum || '', dataConsulta),
                    cpf: item.cpf || 'NÃO INFORMADO'
                  };
                });
              }}
            />
            <button 
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="bg-primary text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
            >
              {isFormOpen ? <X className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
              {isFormOpen ? 'Fechar' : 'Novo Atendimento'}
            </button>
          </div>
        </header>

        <AnimatePresence>
          {isFormOpen && (
            <motion.section 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-surface-container-lowest p-8 rounded-3xl shadow-xl border border-outline-variant/10"
            >
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-2">SISPN da Gestante</label>
                  <select 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                    value={formData.sispn}
                    onChange={(e) => setFormData({ ...formData, sispn: e.target.value })}
                    required
                  >
                    <option value="">Selecione a gestante...</option>
                    {gestacoes.map(g => (
                      <option key={g.sispn} value={g.sispn}>{g.paciente_nome} ({g.sispn})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-2">Data da Consulta</label>
                  <input 
                    type="date"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                    value={formData.data_consulta}
                    onChange={(e) => setFormData({ ...formData, data_consulta: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-2">CBO do Profissional</label>
                  <input 
                    type="text"
                    placeholder="Ex: 225125"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                    value={formData.cbo}
                    onChange={(e) => setFormData({ ...formData, cbo: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-2">CPF do Profissional (Opcional)</label>
                  <input 
                    type="text"
                    placeholder="000.000.000-00"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant ml-2">Próxima Consulta (Opcional)</label>
                  <input 
                    type="date"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                    value={formData.data_proxima_consulta}
                    onChange={(e) => setFormData({ ...formData, data_proxima_consulta: e.target.value })}
                  />
                </div>

                <div className="flex items-end pb-1">
                  <button 
                    type="submit"
                    className="w-full bg-primary text-white font-black py-4 rounded-2xl shadow-lg hover:scale-[1.02] transition-transform flex items-center justify-center gap-2 uppercase tracking-widest text-[10px]"
                  >
                    <Save className="w-4 h-4" />
                    {editingId ? 'Atualizar Atendimento' : 'Salvar Atendimento'}
                  </button>
                </div>
              </form>
              {error && <p className="mt-4 text-error text-xs font-bold flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {error}</p>}
              {success && <p className="mt-4 text-green-600 text-xs font-bold flex items-center gap-2"><CheckCircle2 className="w-4 h-4" /> {success}</p>}
            </motion.section>
          )}
        </AnimatePresence>

        <section className="space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-3xl shadow-sm border border-outline-variant/10 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2 bg-surface-container-low px-4 py-2 rounded-full border border-outline-variant/10">
              <Filter className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant">Filtros</span>
            </div>
            
            <select 
              className="bg-surface-container-low border-none rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20"
              value={filters.mes}
              onChange={(e) => setFilters({ ...filters, mes: e.target.value })}
            >
              <option value="">Mês da Consulta</option>
              {Array.from(new Set(consultas.map(c => c.data_consulta.substring(0, 7)))).sort().reverse().map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select 
              className="bg-surface-container-low border-none rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20"
              value={filters.trimestre}
              onChange={(e) => setFilters({ ...filters, trimestre: e.target.value as any })}
            >
              <option value="">Trimestre</option>
              <option value="1º TRIMESTRE">1º TRIMESTRE</option>
              <option value="2º TRIMESTRE">2º TRIMESTRE</option>
              <option value="3º TRIMESTRE">3º TRIMESTRE</option>
            </select>

            <select 
              className="bg-surface-container-low border-none rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20"
              value={filters.categoria}
              onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
            >
              <option value="">Categoria Profissional</option>
              {uniqueCategorias.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>

            <select 
              className="bg-surface-container-low border-none rounded-full px-4 py-2 text-[10px] font-bold uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20"
              value={filters.equipe}
              onChange={(e) => setFilters({ ...filters, equipe: e.target.value })}
            >
              <option value="">Equipe</option>
              {uniqueEquipes.map(eq => (
                <option key={eq} value={eq}>{eq}</option>
              ))}
            </select>

            <button 
              onClick={() => setFilters({ mes: '', trimestre: '', categoria: '', equipe: '' })}
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline ml-auto"
            >
              Limpar Filtros
            </button>
          </div>

          <div className="bg-surface-container-lowest rounded-3xl shadow-xl border border-outline-variant/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead>
                  <tr className="bg-surface-container-low">
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-headline border-b border-outline-variant/5">Gestante / SISPN</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-headline border-b border-outline-variant/5">Data / Trimestre</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-headline border-b border-outline-variant/5">Profissional / CBO</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-headline border-b border-outline-variant/5">Próxima</th>
                    <th className="px-6 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-headline border-b border-outline-variant/5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {loading ? (
                    <tr><td colSpan={5} className="p-20 text-center"><div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto"></div></td></tr>
                  ) : filteredConsultas.length === 0 ? (
                    <tr><td colSpan={5} className="p-20 text-center text-on-surface-variant/40 font-bold italic">Nenhum atendimento encontrado.</td></tr>
                  ) : (
                    filteredConsultas
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((con) => (
                        <tr key={con.id_consulta} className="hover:bg-surface-container-low/30 transition-colors group">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-2xl bg-primary/5 flex items-center justify-center text-primary">
                                <Baby className="w-5 h-5" />
                              </div>
                              <div>
                                <p className="font-black text-xs text-on-surface uppercase tracking-tight">
                                  {(() => {
                                    const gest = Array.isArray(con.gestacoes) ? con.gestacoes[0] : con.gestacoes;
                                    const pac = gest?.pacientes;
                                    const pacObj = Array.isArray(pac) ? pac[0] : pac;
                                    return (pacObj as any)?.gestante || 'NÃO INFORMADO';
                                  })()}
                                </p>
                                <p className="text-[10px] font-bold text-on-surface-variant/60 font-mono">{con.sispn}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                                <Calendar className="w-3.5 h-3.5 text-primary" />
                                {new Date(con.data_consulta).toLocaleDateString('pt-BR')}
                              </div>
                              <span className="inline-block px-2 py-0.5 rounded-full bg-secondary/10 text-secondary text-[8px] font-black uppercase tracking-widest">
                                {con.trimestre_consulta}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                                <Stethoscope className="w-3.5 h-3.5 text-primary" />
                                {con.profissionais?.nome || 'NÃO INFORMADO'}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] font-black text-on-surface-variant/60 font-mono">{con.cbo}</span>
                                <span className="text-[8px] font-black uppercase tracking-widest text-primary/60">• {getCboCategory(con.cbo)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {con.data_proxima_consulta ? (
                              <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                                <Clock className="w-3.5 h-3.5 text-primary/40" />
                                {new Date(con.data_proxima_consulta).toLocaleDateString('pt-BR')}
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-on-surface-variant/30 italic">Não agendada</span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex items-center justify-center gap-2">
                              <button 
                                onClick={() => handleEdit(con)}
                                className="p-2 rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => handleDelete(con.id_consulta)}
                                className="p-2 rounded-xl bg-surface-container-high text-on-surface-variant hover:bg-error hover:text-white transition-all"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
            
            <Pagination 
              currentPage={currentPage}
              totalPages={Math.ceil(filteredConsultas.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              totalItems={filteredConsultas.length}
              itemsPerPage={itemsPerPage}
              itemName="atendimentos"
            />
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
