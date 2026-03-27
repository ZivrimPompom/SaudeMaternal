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
  id: string;
  sispn: string;
  id_rotina: string;
  data_realizacao: string;
  resultado: string;
  observacoes?: string;
  trimestre_realizacao: '1º TRIMESTRE' | '2º TRIMESTRE' | '3º TRIMESTRE';
  cpf_operador?: string;
  created_at?: string;
  // Joins
  gestacoes?: {
    dum: string;
    dpp: string;
    equipe: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Patient Search in Form
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  // Filters
  const [filters, setFilters] = useState({
    dpp: '',
    trimestre: '',
    exame: '',
    equipe: ''
  });

  const [formData, setFormData] = useState<Partial<ExamResult>>({
    sispn: '',
    id_rotina: '',
    data_realizacao: new Date().toISOString().split('T')[0],
    resultado: 'NEGATIVO / NÃO REAGENTE',
    observacoes: '',
    trimestre_realizacao: '1º TRIMESTRE'
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
        id_rotina: '',
        data_realizacao: new Date().toISOString().split('T')[0],
        resultado: 'NEGATIVO / NÃO REAGENTE',
        observacoes: '',
        trimestre_realizacao: '1º TRIMESTRE'
      });
      setPatientSearch('');
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
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    try {
      const [routinesRes, gestRes, resultsRes] = await Promise.all([
        supabase.from('rotinas').select('*').eq('tipo', 'EXAME').order('descricao'),
        supabase.from('gestacoes').select(`
          sispn, dum, dpp, equipe, data_cadastro,
          pacientes (gestante, cpf)
        `),
        supabase.from('registro_exames').select(`
          *,
          rotinas (descricao, tipo)
        `).order('data_realizacao', { ascending: false })
      ]);

      if (routinesRes.error) throw routinesRes.error;
      if (gestRes.error) throw gestRes.error;
      if (resultsRes.error) throw resultsRes.error;

      setRoutines(routinesRes.data || []);
      
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

  const getGestacaoStatus = (dpp: string) => {
    if (!dpp) return '---';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(dpp);
    end.setHours(0, 0, 0, 0);
    return now >= end ? 'VENCIDA' : 'ATIVA';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isSupabaseConfigured) return;
    if (!formData.sispn) return setError('Selecione uma gestante.');
    if (!formData.id_rotina) return setError('Selecione o tipo de exame.');

    const gest = gestacoes.find(g => g.sispn === formData.sispn);
    if (!gest) return setError('Gestação não encontrada.');
    if (getGestacaoStatus(gest.dpp) === 'VENCIDA') return setError('Gestação VENCIDA.');

    try {
      const trimestre = calculateTrimestre(gest.dum, formData.data_realizacao || '');
      const payload = {
        sispn: formData.sispn,
        id_rotina: formData.id_rotina,
        data_realizacao: formData.data_realizacao,
        resultado: formData.resultado,
        observacoes: formData.observacoes,
        trimestre_realizacao: trimestre,
        cpf_operador: authUser?.cpf || null
      };

      if (editingId) {
        const { error: updateError } = await supabase.from('registro_exames').update(payload).eq('id', editingId);
        if (updateError) throw updateError;
        setSuccess('Resultado atualizado!');
      } else {
        const { error: insertError } = await supabase.from('registro_exames').insert([payload]);
        if (insertError) throw insertError;
        setSuccess('Resultado registrado!');
      }

      setIsFormOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (res: ExamResult) => {
    setEditingId(res.id);
    const gest = Array.isArray(res.gestacoes) ? res.gestacoes[0] : res.gestacoes;
    const pac = gest?.pacientes;
    const pacObj = Array.isArray(pac) ? pac[0] : pac;
    
    setPatientSearch((pacObj as any)?.gestante || res.sispn);
    setFormData({
      sispn: res.sispn,
      id_rotina: res.id_rotina,
      data_realizacao: res.data_realizacao,
      resultado: res.resultado,
      observacoes: res.observacoes,
      trimestre_realizacao: res.trimestre_realizacao
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error: delError } = await supabase.from('registro_exames').delete().eq('id', id);
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

  const selectedGestante = useMemo(() => gestacoes.find(g => g.sispn === formData.sispn), [formData.sispn, gestacoes]);
  const uniqueEquipes = Array.from(new Set(gestacoes.map(g => g.equipe))).filter(Boolean).sort();

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
              Resultados de Exames
            </h2>
            <p className="text-lg text-on-surface-variant/60 font-body max-w-xl leading-relaxed">
              Registre e monitore os resultados dos exames laboratoriais das gestantes.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <CSVImporter 
              tableName="registro_exames"
              expectedColumns={['sispn', 'id_rotina', 'data_realizacao', 'resultado', 'observacoes']}
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    <div className="space-y-6">
                      <div className="space-y-2 relative" ref={patientDropdownRef}>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Nome da Paciente <span className="text-error">*</span></label>
                        <div className="relative">
                          <input 
                            type="text"
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none shadow-inner"
                            placeholder="Selecione ou busque a gestante..."
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

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Tipo de Exame <span className="text-error">*</span></label>
                        <select 
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none"
                          value={formData.id_rotina}
                          onChange={(e) => setFormData({ ...formData, id_rotina: e.target.value })}
                          required
                        >
                          <option value="">Escolha o exame</option>
                          {routines.map(r => <option key={r.id} value={r.id}>{r.descricao}</option>)}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Trimestre (Automático)</label>
                        <input 
                          type="text" readOnly 
                          className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-sm outline-none text-on-surface-variant/60 uppercase"
                          value={calculateTrimestre(selectedGestante?.dum || '', formData.data_realizacao || '')}
                        />
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Data do Exame <span className="text-error">*</span></label>
                        <input 
                          type="date"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none"
                          value={formData.data_realizacao}
                          onChange={(e) => setFormData({ ...formData, data_realizacao: e.target.value })}
                          required
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Resultado</label>
                        <div className="flex flex-wrap gap-6">
                          {['POSITIVO / REAGENTE', 'NEGATIVO / NÃO REAGENTE'].map(res => (
                            <label key={res} className="flex items-center gap-3 cursor-pointer group">
                              <input 
                                type="radio" name="resultado" value={res}
                                checked={formData.resultado === res}
                                onChange={(e) => setFormData({ ...formData, resultado: e.target.value })}
                                className="w-5 h-5 accent-primary"
                              />
                              <span className="text-xs font-bold text-on-surface-variant group-hover:text-primary transition-colors uppercase tracking-tight">{res}</span>
                            </label>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Observações</label>
                        <textarea 
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none resize-none h-32"
                          placeholder="Insira observações relevantes sobre o resultado..."
                          value={formData.observacoes}
                          onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

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
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Exame</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Data</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Resultado</th>
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
                      <tr key={res.id} className="hover:bg-primary/[0.02] transition-colors group">
                        <td className="px-8 py-6">
                          <p className="font-black text-sm text-on-surface uppercase tracking-tight group-hover:text-primary transition-colors">
                            {res.gestacoes?.pacientes?.gestante || 'NÃO INFORMADO'}
                          </p>
                          <p className="text-[10px] font-bold text-on-surface-variant/40 font-mono">{res.sispn}</p>
                        </td>
                        <td className="px-8 py-6 text-xs font-bold text-on-surface uppercase">{res.rotinas?.descricao}</td>
                        <td className="px-8 py-6 text-xs font-bold text-on-surface">{new Date(res.data_realizacao).toLocaleDateString('pt-BR')}</td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${res.resultado.includes('POSITIVO') || res.resultado.includes('REAGENTE') ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                            {res.resultado}
                          </span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => handleEdit(res)} className="p-3 rounded-2xl bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all"><span className="material-symbols-outlined text-lg">edit</span></button>
                            <button onClick={() => setDeleteConfirmId(res.id)} className="p-3 rounded-2xl bg-surface-container-high text-on-surface-variant hover:bg-error hover:text-white transition-all"><span className="material-symbols-outlined text-lg">delete</span></button>
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
