'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import CSVImporter from '@/components/CSVImporter';
import Pagination from '@/components/Pagination';

interface Routine {
  id: string;
  descricao: string;
  tipo: string;
  trimestre: string;
}

interface ExamResult {
  id_registro: string;
  sispn: string;
  id_rotina: string;
  data_realizacao: string;
  resultado: string;
  observacoes?: string;
  trimestre_realizacao: string;
  cbo: string;
  cpf_profissional: string;
  cpf_operador?: string;
  created_at?: string;
  // Joins
  gestacoes?: {
    dum: string;
    dpp: string;
    equipe: string;
    data_cadastro: string;
    pacientes: {
      gestante: string;
      cpf: string;
    }
  };
  rotinas?: {
    descricao: string;
    tipo: string;
  };
}

interface Gestacao {
  sispn: string;
  dum: string;
  dpp: string;
  paciente_nome: string;
  paciente_cpf: string;
  equipe: string;
  data_cadastro: string;
}

const formatSispn = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1.$2')
    .replace(/(\.\d{2})\d+?$/, '$1');
};

export default function ExamesPage() {
  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen } = useSearch();
  const { user: authUser } = useAuth();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [gestacoes, setGestacoes] = useState<Gestacao[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allProfessionals, setAllProfessionals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('MEDICO');
  const [selectedProfessionalCpf, setSelectedProfessionalCpf] = useState('');
  
  // Patient Search in Form
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  // Professional Search in Form
  const [professionalSearch, setProfessionalSearch] = useState('');
  const [isProfessionalDropdownOpen, setIsProfessionalDropdownOpen] = useState(false);
  const professionalDropdownRef = useRef<HTMLDivElement>(null);

  // New states for multiple entries
  const [formEntries, setFormEntries] = useState<any[]>([
    {
      id: Math.random().toString(36).substr(2, 9),
      id_rotina: '',
      data_realizacao: new Date().toISOString().split('T')[0],
      resultado: 'NEGATIVO / NÃO REAGENTE',
      trimestre_realizacao: '1º TRIMESTRE'
    }
  ]);

  // Filters
  const [filters, setFilters] = useState({
    dpp: '',
    trimestre: '',
    exame: '',
    equipe: ''
  });

  const [formData, setFormData] = useState<Partial<ExamResult>>({
    sispn: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (!isFormOpen) {
      setEditingId(null);
      setFormData({
        sispn: '',
      });
      setFormEntries([
        {
          id: Math.random().toString(36).substr(2, 9),
          id_rotina: '',
          data_realizacao: new Date().toISOString().split('T')[0],
          resultado: 'NEGATIVO / NÃO REAGENTE',
          trimestre_realizacao: '1º TRIMESTRE'
        }
      ]);
      setPatientSearch('');
      setProfessionalSearch('');
      setSelectedProfessionalCpf('');
      setSelectedCategory('MEDICO');
      setError(null);
      setSuccess(null);
    }
  }, [isFormOpen]);

  useEffect(() => {
    fetchData();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node)) {
        setIsPatientDropdownOpen(false);
      }
      if (professionalDropdownRef.current && !professionalDropdownRef.current.contains(event.target as Node)) {
        setIsProfessionalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const [routinesRes, gestRes, resultsRes, catsRes, prosRes] = await Promise.all([
        supabase.from('rotinas').select('*').in('tipo', ['EXAME', 'VACINA']).order('descricao'),
        supabase.from('gestacoes').select(`
          sispn, dum, dpp, equipe, data_cadastro,
          pacientes (gestante, cpf)
        `),
        supabase.from('registro_rotinas').select(`
          *,
          rotinas (descricao, tipo)
        `).order('data_realizacao', { ascending: false }),
        supabase.from('categorias_profissionais').select('*').order('categoria'),
        supabase.from('profissionais').select('cpf, nome, cbo').eq('situacao', 'ATIVO').order('nome')
      ]);

      if (routinesRes.error) throw routinesRes.error;
      if (gestRes.error) throw gestRes.error;
      if (resultsRes.error) throw resultsRes.error;

      setRoutines(routinesRes.data || []);
      setCategories(catsRes.data || []);
      setAllProfessionals(prosRes.data || []);
      
      const formattedGest = gestRes.data?.map(g => {
        let pac: any = g.pacientes;
        if (Array.isArray(pac)) pac = pac[0];
        return {
          sispn: String(g.sispn || ''),
          dum: g.dum,
          dpp: g.dpp,
          equipe: g.equipe,
          data_cadastro: g.data_cadastro,
          paciente_nome: (pac as any)?.gestante || 'NÃO INFORMADO',
          paciente_cpf: String((pac as any)?.cpf || 'NÃO INFORMADO')
        };
      }) || [];
      setGestacoes(formattedGest);

      const enrichedResults = (resultsRes.data || []).map(r => {
        const gest = formattedGest.find(g => g.sispn === r.sispn);
        return {
          ...r,
          gestacoes: gest ? {
            dum: gest.dum,
            dpp: gest.dpp,
            equipe: gest.equipe,
            data_cadastro: gest.data_cadastro,
            pacientes: { gestante: gest.paciente_nome, cpf: gest.paciente_cpf }
          } : null
        };
      });
      setResults(enrichedResults);

    } catch (err: any) {
      console.error('Erro ao buscar dados:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const calculateTrimestre = (dum: string, dataExame: string) => {
    if (!dum || !dataExame) return '1º TRIMESTRE';
    const start = new Date(dum);
    const exam = new Date(dataExame);
    const diffTime = exam.getTime() - start.getTime();
    const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);

    if (diffWeeks <= 13) return '1º TRIMESTRE';
    if (diffWeeks <= 27) return '2º TRIMESTRE';
    return '3º TRIMESTRE';
  };

  const getStatusCaptacao = (dum: string, dataCadastro: string) => {
    if (!dum || !dataCadastro) return '---';
    const start = new Date(dum);
    const registration = new Date(dataCadastro);
    const diffWeeks = (registration.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7);
    return diffWeeks <= 12 ? 'PRECOCE' : 'TARDIA';
  };

  const getDppReferencia = (dpp: string) => {
    if (!dpp) return '---';
    const date = new Date(dpp);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const getExameReferencia = (data: string) => {
    if (!data) return '---';
    const date = new Date(data);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const selectedGestante = useMemo(() => {
    return gestacoes.find(g => g.sispn === formData.sispn);
  }, [formData.sispn, gestacoes]);

  const selectedPatientHistory = useMemo(() => {
    if (!formData.sispn) return [];
    return results.filter(r => r.sispn === formData.sispn);
  }, [formData.sispn, results]);

  const uniqueEquipes = Array.from(new Set(gestacoes.map(g => g.equipe))).filter(Boolean).sort();

  const getGestacaoStatus = (dpp: string) => {
    if (!dpp) return '---';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(dpp);
    end.setHours(0, 0, 0, 0);
    return now >= end ? 'VENCIDA' : 'ATIVA';
  };

  const professionalSearchResults = useMemo(() => {
    if (!professionalSearch || professionalSearch.length < 2) return [];
    const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    const queryText = normalize(professionalSearch);
    
    return allProfessionals.filter(p => {
      return normalize(p.nome).includes(queryText) || p.cpf.includes(professionalSearch);
    }).slice(0, 10);
  }, [professionalSearch, allProfessionals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isSupabaseConfigured) return;
    if (!formData.sispn) return setError('Selecione uma gestante.');
    if (!selectedProfessionalCpf) return setError('Selecione um profissional.');

    const gest = gestacoes.find(g => g.sispn === formData.sispn);
    if (!gest) return setError('Gestação não encontrada.');
    if (getGestacaoStatus(gest.dpp) === 'VENCIDA') return setError('Gestação VENCIDA.');

    try {
      const professional = allProfessionals.find(p => p.cpf === selectedProfessionalCpf);
      
      const payloads = formEntries.map(entry => {
        const trimestre = calculateTrimestre(gest.dum, entry.data_realizacao || '');
        return {
          sispn: formData.sispn,
          id_rotina: entry.id_rotina,
          data_realizacao: entry.data_realizacao,
          resultado: entry.resultado,
          trimestre_realizacao: trimestre,
          cbo: professional?.cbo || null,
          cpf_profissional: selectedProfessionalCpf,
          cpf_operador: authUser?.cpf || null
        };
      });

      if (payloads.some(p => !p.id_rotina)) return setError('Selecione o tipo de exame para todas as linhas.');

      if (editingId) {
        const { error: updateError } = await supabase.from('registro_rotinas').update(payloads[0]).eq('id_registro', editingId);
        if (updateError) throw updateError;
        setSuccess('Resultado atualizado!');
      } else {
        const { error: insertError } = await supabase.from('registro_rotinas').insert(payloads);
        if (insertError) throw insertError;
        setSuccess(`${payloads.length} resultados registrados!`);
      }

      setIsFormOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (res: ExamResult) => {
    setEditingId(res.id_registro);
    const gest = Array.isArray(res.gestacoes) ? res.gestacoes[0] : res.gestacoes;
    const pac = gest?.pacientes;
    const pacObj = Array.isArray(pac) ? pac[0] : pac;
    
    setPatientSearch((pacObj as any)?.gestante || res.sispn);
    setSelectedProfessionalCpf(res.cpf_profissional || '');
    
    const prof = allProfessionals.find(p => p.cpf === res.cpf_profissional);
    if (prof) {
      setProfessionalSearch(prof.nome);
      const cat = categories.find(c => prof.cbo.startsWith(c.cbo));
      if (cat) setSelectedCategory(cat.categoria);
    }

    setFormData({
      sispn: res.sispn,
    });
    
    setFormEntries([
      {
        id: Math.random().toString(36).substr(2, 9),
        id_rotina: res.id_rotina,
        data_realizacao: res.data_realizacao,
        resultado: res.resultado,
        trimestre_realizacao: res.trimestre_realizacao
      }
    ]);

    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error: delError } = await supabase.from('registro_rotinas').delete().eq('id_registro', id);
      if (delError) throw delError;
      setSuccess('Registro excluído!');
      setDeleteConfirmId(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredResults = useMemo(() => {
    return results.filter(r => {
      const query = searchQuery.toLowerCase().trim();
      const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
      const queryNormalizada = normalize(query);
      
      const gest = Array.isArray(r.gestacoes) ? r.gestacoes[0] : r.gestacoes;
      const pac = gest?.pacientes;
      const pacObj = Array.isArray(pac) ? pac[0] : pac;
      const pacienteNome = (pacObj as any)?.gestante || '';
      const exameNome = r.rotinas?.descricao || '';
      
      const matchesSearch = !query || (
        normalize(pacienteNome).includes(queryNormalizada) ||
        normalize(r.sispn).includes(queryNormalizada) ||
        normalize(exameNome).includes(queryNormalizada)
      );

      if (!matchesSearch) return false;
      if (filters.trimestre && r.trimestre_realizacao !== filters.trimestre) return false;
      if (filters.exame && r.id_rotina !== filters.exame) return false;
      if (filters.equipe && (gest as any)?.equipe !== filters.equipe) return false;

      return true;
    });
  }, [results, searchQuery, filters]);

  const patientSearchResults = useMemo(() => {
    if (!patientSearch || patientSearch.length < 2) return [];
    const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    const queryText = normalize(patientSearch);
    
    return gestacoes.filter(g => {
      if (getGestacaoStatus(g.dpp) !== 'ATIVA') return false;
      return normalize(g.paciente_nome).includes(queryText) || g.sispn.includes(patientSearch);
    }).slice(0, 10);
  }, [patientSearch, gestacoes]);

  const filteredProfessionals = useMemo(() => {
    if (!selectedCategory) return [];
    const category = categories.find(c => c.categoria === selectedCategory);
    if (!category) return [];
    return allProfessionals.filter(p => p.cbo.startsWith(category.cbo));
  }, [selectedCategory, categories, allProfessionals]);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 lg:p-10 pb-32 max-w-7xl mx-auto space-y-10">
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-1.5 bg-primary rounded-full"></div>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Movimento</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter font-headline text-primary uppercase leading-none">
              Rotinas de Exames e Vacinas
            </h2>
            <p className="text-lg text-on-surface-variant/60 font-body max-w-xl leading-relaxed">
              Registre e monitore as rotinas de exames e vacinas das gestantes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <CSVImporter 
              tableName="registro_rotinas"
              expectedColumns={['sispn', 'id_rotina', 'data_realizacao', 'resultado', 'cbo', 'cpf_profissional']}
              requiredColumns={['sispn', 'id_rotina', 'data_realizacao']}
              onSuccess={fetchData}
              title="Importar CSV"
            />
            <div className="flex items-center gap-3 bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant/20 shadow-sm">
              <span className="material-symbols-outlined text-primary text-xl">lab_research</span>
              <span className="text-sm font-bold font-label uppercase tracking-widest text-on-surface-variant">{filteredResults.length} Registros</span>
            </div>
          </div>
        </header>

        <AnimatePresence>
          {isFormOpen && (
            <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div className="bg-surface-container-lowest p-8 md:p-12 rounded-[40px] shadow-2xl border border-outline-variant/10 space-y-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">edit_note</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-primary uppercase tracking-tight">Novos Dados do Exame</h3>
                    <p className="text-sm text-on-surface-variant/60 font-body">Insira as informações do laudo laboratorial.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Patient Selection */}
                    <div className="space-y-2 relative" ref={patientDropdownRef}>
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">SISPN / Gestante <span className="text-error">*</span></label>
                      <div className="relative">
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none shadow-inner"
                          placeholder="Busque a gestante..."
                          value={patientSearch}
                          onChange={(e) => { setPatientSearch(e.target.value); setIsPatientDropdownOpen(true); }}
                          onFocus={() => setIsPatientDropdownOpen(true)}
                        />
                        <AnimatePresence>
                          {isPatientDropdownOpen && patientSearchResults.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border-4 border-primary z-50 overflow-hidden">
                              <div className="max-h-60 overflow-y-auto">
                                {patientSearchResults.map(g => (
                                  <button key={g.sispn} type="button" onClick={() => { setFormData({ ...formData, sispn: g.sispn }); setPatientSearch(g.paciente_nome); setIsPatientDropdownOpen(false); }} className="w-full px-6 py-4 text-left hover:bg-primary/5 border-b border-outline-variant/5 last:border-0">
                                    <p className="font-bold text-xs text-on-surface uppercase">{g.paciente_nome} ({g.sispn})</p>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Professional Search */}
                    <div className="space-y-2 relative" ref={professionalDropdownRef}>
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Profissional <span className="text-error">*</span></label>
                      <div className="relative">
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none shadow-inner"
                          placeholder="Busque o profissional..."
                          value={professionalSearch}
                          onChange={(e) => { setProfessionalSearch(e.target.value); setIsProfessionalDropdownOpen(true); }}
                          onFocus={() => setIsProfessionalDropdownOpen(true)}
                        />
                        <AnimatePresence>
                          {isProfessionalDropdownOpen && professionalSearchResults.length > 0 && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border-4 border-primary z-50 overflow-hidden">
                              <div className="max-h-60 overflow-y-auto">
                                {professionalSearchResults.map(p => (
                                  <button key={p.cpf} type="button" onClick={() => { 
                                    setSelectedProfessionalCpf(p.cpf); 
                                    setProfessionalSearch(p.nome); 
                                    setIsProfessionalDropdownOpen(false);
                                    const cat = categories.find(c => p.cbo.startsWith(c.cbo));
                                    if (cat) setSelectedCategory(cat.categoria);
                                  }} className="w-full px-6 py-4 text-left hover:bg-primary/5 border-b border-outline-variant/5 last:border-0">
                                    <p className="font-bold text-xs text-on-surface uppercase">{p.nome}</p>
                                    <p className="text-[9px] text-on-surface-variant/60 uppercase">{p.cbo}</p>
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Category (Automatic) */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Categoria Profissional (Automático)</label>
                      <input type="text" readOnly className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-sm outline-none text-primary font-bold uppercase" value={selectedCategory} />
                    </div>
                  </div>

                  {/* Patient Info Header */}
                  {selectedGestante && (
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-primary/5 rounded-[32px] border border-primary/10">
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Status</p>
                        <p className="text-xs font-black text-primary uppercase">{getStatusCaptacao(selectedGestante.dum, selectedGestante.data_cadastro)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">DUM</p>
                        <p className="text-xs font-black text-on-surface">{new Date(selectedGestante.dum).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">DPP</p>
                        <p className="text-xs font-black text-on-surface">{new Date(selectedGestante.dpp).toLocaleDateString('pt-BR')}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">DPP Ref.</p>
                        <p className="text-xs font-black text-on-surface">{getDppReferencia(selectedGestante.dpp)}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[9px] font-black text-primary/60 uppercase tracking-widest">Equipe</p>
                        <p className="text-xs font-black text-on-surface uppercase">{selectedGestante.equipe}</p>
                      </div>
                    </div>
                  )}

                  {/* Spreadsheet Grid */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-primary uppercase tracking-widest">Lançamento de Rotinas</h4>
                      {!editingId && (
                        <button 
                          type="button" 
                          onClick={() => {
                            const lastEntry = formEntries[formEntries.length - 1];
                            setFormEntries([...formEntries, {
                              id: Math.random().toString(36).substr(2, 9),
                              id_rotina: '',
                              data_realizacao: lastEntry?.data_realizacao || new Date().toISOString().split('T')[0],
                              resultado: 'NEGATIVO / NÃO REAGENTE',
                              trimestre_realizacao: '1º TRIMESTRE'
                            }]);
                          }}
                          className="flex items-center gap-2 text-primary hover:text-primary/70 transition-colors"
                        >
                          <span className="material-symbols-outlined text-lg">add_circle</span>
                          <span className="text-[10px] font-black uppercase tracking-widest">Adicionar Linha</span>
                        </button>
                      )}
                    </div>

                    <div className="bg-surface-container-low rounded-[32px] overflow-hidden border border-outline-variant/10">
                      <table className="w-full text-left border-separate border-spacing-0">
                        <thead className="bg-surface-container-high">
                          <tr>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Data Realização</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Tipo de Rotina</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Descrição + Trimestre</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Resultado</th>
                            {!editingId && <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 text-center">Ações</th>}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-outline-variant/5">
                          {formEntries.map((entry, index) => (
                            <tr key={entry.id} className="hover:bg-white/50 transition-colors">
                              <td className="px-6 py-4">
                                <input 
                                  type="date" 
                                  className="bg-transparent border-none p-0 text-xs font-bold outline-none focus:ring-0 w-full"
                                  value={entry.data_realizacao}
                                  onChange={(e) => {
                                    const newEntries = [...formEntries];
                                    newEntries[index].data_realizacao = e.target.value;
                                    setFormEntries(newEntries);
                                  }}
                                />
                              </td>
                              <td className="px-6 py-4">
                                <select 
                                  className="bg-transparent border-none p-0 text-xs font-bold outline-none focus:ring-0 w-full uppercase"
                                  value={entry.tipo_temp || routines.find(r => r.id === entry.id_rotina)?.tipo || ''}
                                  onChange={(e) => {
                                    const newEntries = [...formEntries];
                                    newEntries[index].tipo_temp = e.target.value;
                                    newEntries[index].id_rotina = ''; // Reset when type changes
                                    setFormEntries(newEntries);
                                  }}
                                >
                                  <option value="">Tipo</option>
                                  <option value="EXAME">EXAME</option>
                                  <option value="VACINA">VACINA</option>
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                <select 
                                  className="bg-transparent border-none p-0 text-xs font-bold outline-none focus:ring-0 w-full uppercase"
                                  value={entry.id_rotina}
                                  onChange={(e) => {
                                    const newEntries = [...formEntries];
                                    newEntries[index].id_rotina = e.target.value;
                                    setFormEntries(newEntries);
                                  }}
                                >
                                  <option value="">Selecione a Rotina</option>
                                  {routines
                                    .filter(r => !entry.tipo_temp || r.tipo === entry.tipo_temp)
                                    .map(r => (
                                      <option key={r.id} value={r.id}>{r.descricao} ({r.trimestre})</option>
                                    ))}
                                </select>
                              </td>
                              <td className="px-6 py-4">
                                <select 
                                  className="bg-transparent border-none p-0 text-xs font-bold outline-none focus:ring-0 w-full uppercase"
                                  value={entry.resultado}
                                  onChange={(e) => {
                                    const newEntries = [...formEntries];
                                    newEntries[index].resultado = e.target.value;
                                    setFormEntries(newEntries);
                                  }}
                                >
                                  <option value="POSITIVO / REAGENTE">POSITIVO / REAGENTE</option>
                                  <option value="NEGATIVO / NÃO REAGENTE">NEGATIVO / NÃO REAGENTE</option>
                                </select>
                              </td>
                              {!editingId && (
                                <td className="px-6 py-4 text-center">
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      if (formEntries.length > 1) {
                                        setFormEntries(formEntries.filter((_, i) => i !== index));
                                      }
                                    }}
                                    className="text-error hover:scale-110 transition-transform disabled:opacity-20"
                                    disabled={formEntries.length === 1}
                                  >
                                    <span className="material-symbols-outlined text-lg">delete</span>
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Movimento de Exames da Gestante Selecionada */}
                  {formData.sispn && selectedPatientHistory.length > 0 && (
                    <div className="space-y-4 pt-6 border-t border-outline-variant/10">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-sm">history</span>
                        <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Movimento de Exames Realizados</h4>
                      </div>
                      <div className="bg-surface-container-low rounded-3xl overflow-hidden border border-outline-variant/5">
                        <table className="w-full text-left text-[10px]">
                          <thead className="bg-surface-container-high">
                            <tr>
                              <th className="px-4 py-3 font-black uppercase tracking-widest text-on-surface-variant/60">Exame</th>
                              <th className="px-4 py-3 font-black uppercase tracking-widest text-on-surface-variant/60">Data</th>
                              <th className="px-4 py-3 font-black uppercase tracking-widest text-on-surface-variant/60">Resultado</th>
                              <th className="px-4 py-3 font-black uppercase tracking-widest text-on-surface-variant/60">Trimestre</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/5">
                            {selectedPatientHistory.map((h) => (
                              <tr key={h.id_registro} className="hover:bg-white/50 transition-colors">
                                <td className="px-4 py-3 font-bold uppercase">{h.rotinas?.descricao}</td>
                                <td className="px-4 py-3">{new Date(h.data_realizacao).toLocaleDateString('pt-BR')}</td>
                                <td className="px-4 py-3">
                                  <span className={`font-black uppercase ${h.resultado.includes('POSITIVO') || h.resultado.includes('REAGENTE') ? 'text-red-600' : 'text-green-600'}`}>
                                    {h.resultado}
                                  </span>
                                </td>
                                <td className="px-4 py-3 font-medium">{h.trimestre_realizacao}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end gap-4 pt-8 border-t border-outline-variant/10">
                    <button type="button" onClick={() => setIsFormOpen(false)} className="px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-high transition-colors">Cancelar</button>
                    <button type="submit" className="bg-primary text-white px-12 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                      <span className="material-symbols-outlined text-lg">save</span>
                      Salvar Resultado
                    </button>
                  </div>
                </form>
                {error && <div className="p-4 bg-error/10 rounded-2xl text-error text-xs font-bold">{error}</div>}
                {success && <div className="p-4 bg-green-500/10 rounded-2xl text-green-600 text-xs font-bold">{success}</div>}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
              <select className="bg-surface-container-low border-none rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none" value={filters.trimestre} onChange={(e) => setFilters({ ...filters, trimestre: e.target.value })}>
                <option value="">Trimestre</option>
                <option value="1º TRIMESTRE">1º TRIMESTRE</option>
                <option value="2º TRIMESTRE">2º TRIMESTRE</option>
                <option value="3º TRIMESTRE">3º TRIMESTRE</option>
              </select>
              <select className="bg-surface-container-low border-none rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none" value={filters.exame} onChange={(e) => setFilters({ ...filters, exame: e.target.value })}>
                <option value="">Tipo de Exame</option>
                {routines.map(r => <option key={r.id} value={r.id}>{r.descricao}</option>)}
              </select>
              <select className="bg-surface-container-low border-none rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none" value={filters.equipe} onChange={(e) => setFilters({ ...filters, equipe: e.target.value })}>
                <option value="">Equipe</option>
                {uniqueEquipes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>
            </div>
            <div className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
              Exibindo <span className="text-primary">{filteredResults.length}</span> registros
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-[40px] shadow-2xl border border-outline-variant/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-30 bg-surface-container-low">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Gestante</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">SISPN</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Exame</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Data</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Resultado</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Profissional</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {loading ? (
                    <tr><td colSpan={5} className="p-32 text-center"><div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div></td></tr>
                  ) : filteredResults.length === 0 ? (
                    <tr><td colSpan={5} className="p-32 text-center opacity-20 text-xl font-black uppercase tracking-widest">Nenhum resultado encontrado</td></tr>
                  ) : (
                    filteredResults.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((res) => (
                      <tr key={res.id_registro} className="hover:bg-primary/[0.02] transition-colors group">
                        <td className="px-8 py-6">
                          <p className="font-black text-sm text-on-surface uppercase tracking-tight group-hover:text-primary transition-colors">
                            {res.gestacoes?.pacientes?.gestante || 'NÃO INFORMADO'}
                          </p>
                          <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">{res.gestacoes?.equipe}</span>
                        </td>
                        <td className="px-8 py-6 text-[10px] font-bold text-on-surface-variant/60 font-mono">{res.sispn}</td>
                        <td className="px-8 py-6 text-xs font-bold text-on-surface uppercase">{res.rotinas?.descricao}</td>
                        <td className="px-8 py-6 text-xs font-bold text-on-surface">{new Date(res.data_realizacao).toLocaleDateString('pt-BR')}</td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${res.resultado.includes('POSITIVO') || res.resultado.includes('REAGENTE') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {res.resultado}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <p className="text-xs font-bold text-on-surface uppercase">
                            {allProfessionals.find(p => p.cpf === res.cpf_profissional)?.nome || '---'}
                          </p>
                          <p className="text-[10px] text-on-surface-variant/40 font-mono">{res.cbo}</p>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => handleEdit(res)} className="p-3 rounded-2xl bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all"><span className="material-symbols-outlined text-lg">edit</span></button>
                            <button onClick={() => setDeleteConfirmId(res.id_registro)} className="p-3 rounded-2xl bg-surface-container-high text-on-surface-variant hover:bg-error hover:text-white transition-all"><span className="material-symbols-outlined text-lg">delete</span></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredResults.length / itemsPerPage)} onPageChange={setCurrentPage} totalItems={filteredResults.length} itemsPerPage={itemsPerPage} itemName="resultados" />
          </div>
        </section>

        <AnimatePresence>
          {deleteConfirmId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-surface-container-lowest rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-outline-variant/10 text-center space-y-8">
                <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto"><span className="material-symbols-outlined text-red-600 text-4xl">delete_forever</span></div>
                <div className="space-y-2">
                  <h4 className="text-xl font-black font-headline text-on-surface uppercase tracking-tight">Confirmar Exclusão</h4>
                  <p className="text-sm text-on-surface-variant font-body">Esta ação é permanente. Deseja continuar?</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirmId(null)} className="flex-1 bg-surface-container-high text-on-surface font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]">Cancelar</button>
                  <button onClick={() => handleDelete(deleteConfirmId)} className="flex-1 bg-red-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]">Excluir</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
