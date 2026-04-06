'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import Pagination from '@/components/Pagination';
import RecordsSummary from '@/components/RecordsSummary';
import SearchInput from '@/components/SearchInput';
import PatientBanner from '@/components/PatientBanner';

interface RecemNascido {
  id?: string;
  nome_rn: string;
  cpf_rn: string;
  data_nascimento: string;
  data_consulta_rn: string;
  comparecimento: boolean;
}

interface Desfecho {
  id: string;
  sispn: string;
  tipo_desfecho: 'PARTO' | 'ABORTO' | 'MUDOU-SE' | 'ÓBITO' | 'CONVÊNIO MÉDICO' | 'OUTROS';
  data_desfecho: string;
  unidade_cnes?: string;
  created_at?: string;
  // Joins
  gestacoes?: {
    sispn: string;
    dum: string;
    dpp: string;
    equipe: string;
    referencia_tecnica: string;
    acs: string;
    data_cadastro: string;
    pacientes: {
      gestante: string;
      cpf: string;
    }
  };
  recem_nascidos?: RecemNascido[];
}

interface Gestacao {
  sispn: string;
  dum: string;
  dpp: string;
  paciente_nome: string;
  paciente_cpf: string;
  paciente_cns?: string;
  paciente_nascimento?: string;
  equipe: string;
  referencia_tecnica: string;
  acs: string;
  data_cadastro: string;
  classificacao_pn?: string;
}

const TIPO_DESFECHO_OPTIONS = [
  'PARTO',
  'ABORTO',
  'MUDOU-SE',
  'ÓBITO',
  'CONVÊNIO MÉDICO',
  'OUTROS'
];

export default function DesfechosPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen, refreshTrigger, setOnExportCSV } = useSearch();
  const { user: authUser } = useAuth();
  
  const [desfechos, setDesfechos] = useState<Desfecho[]>([]);
  const [gestacoes, setGestacoes] = useState<Gestacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const [filters, setFilters] = useState({
    tipo_desfecho: '',
    status_gestacao: '',
  });

  const [formData, setFormData] = useState({
    sispn: '',
    tipo_desfecho: 'PARTO' as Desfecho['tipo_desfecho'],
    data_desfecho: new Date().toISOString().split('T')[0],
  });

  const [recemNascidos, setRecemNascidos] = useState<RecemNascido[]>([
    { nome_rn: '', cpf_rn: '', data_nascimento: '', data_consulta_rn: '', comparecimento: false }
  ]);

  const [selectedGestante, setSelectedGestante] = useState<Gestacao | null>(null);
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchData();
    
    const handleClickOutside = (event: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node)) {
        setIsPatientDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [refreshTrigger]);

  const fetchData = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch Gestacoes with Patient info
      const { data: gestData, error: gestError } = await supabase
        .from('gestacoes')
        .select(`
          sispn, dum, dpp, equipe, referencia_tecnica, acs, data_cadastro, classificacao_pn,
          pacientes (gestante, cpf, cns, data_nascimento)
        `)
        .order('created_at', { ascending: false });

      if (gestError) throw gestError;
      
      const formattedGestacoes = (gestData || []).map((g: any) => ({
        sispn: g.sispn,
        dum: g.dum,
        dpp: g.dpp,
        paciente_nome: g.pacientes?.gestante || 'NÃO INFORMADO',
        paciente_cpf: g.pacientes?.cpf || 'NÃO INFORMADO',
        paciente_cns: g.pacientes?.cns || '---',
        paciente_nascimento: g.pacientes?.data_nascimento || null,
        equipe: g.equipe,
        referencia_tecnica: g.referencia_tecnica,
        acs: g.acs,
        data_cadastro: g.data_cadastro,
        classificacao_pn: g.classificacao_pn || 'HABITUAL'
      }));
      setGestacoes(formattedGestacoes);

      // Fetch Desfechos with Joins
      const { data: desData, error: desError } = await supabase
        .from('desfechos')
        .select(`
          *,
          gestacoes (
            sispn, dum, dpp, equipe, referencia_tecnica, acs, data_cadastro, classificacao_pn,
            pacientes (gestante, cpf, cns, data_nascimento)
          ),
          recem_nascidos (*)
        `)
        .order('data_desfecho', { ascending: false });

      if (desError) throw desError;
      setDesfechos(desData || []);
    } catch (err: any) {
      console.error('Error fetching data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredPatientOptions = useMemo(() => {
    if (!patientSearch) return gestacoes.slice(0, 5);
    const query = patientSearch.toLowerCase();
    return gestacoes.filter(g => 
      g.paciente_nome.toLowerCase().includes(query) || 
      g.sispn.includes(query)
    ).slice(0, 10);
  }, [gestacoes, patientSearch]);

  const handleSelectGestante = (g: Gestacao) => {
    setSelectedGestante(g);
    setFormData(prev => ({ ...prev, sispn: g.sispn }));
    setPatientSearch(g.paciente_nome);
    setIsPatientDropdownOpen(false);
  };

  const handleAddRN = () => {
    setRecemNascidos([...recemNascidos, { nome_rn: '', cpf_rn: '', data_nascimento: '', data_consulta_rn: '', comparecimento: false }]);
  };

  const handleRemoveRN = (index: number) => {
    if (recemNascidos.length > 1) {
      setRecemNascidos(recemNascidos.filter((_, i) => i !== index));
    }
  };

  const handleRNChange = (index: number, field: keyof RecemNascido, value: any) => {
    const updated = [...recemNascidos];
    updated[index] = { ...updated[index], [field]: value };
    setRecemNascidos(updated);
  };

  const calculateDataLimite = (dataNasc: string) => {
    if (!dataNasc) return '';
    const date = new Date(dataNasc);
    date.setDate(date.getDate() + 9);
    return date.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (formData.tipo_desfecho === 'PARTO' && selectedGestante) {
      setRecemNascidos(prev => {
        const updated = [...prev];
        if (updated.length > 0) {
          if (!updated[0].nome_rn) updated[0].nome_rn = `RN ${selectedGestante.paciente_nome}`;
          if (!updated[0].data_nascimento) updated[0].data_nascimento = formData.data_desfecho;
        }
        return updated;
      });
    }
  }, [formData.tipo_desfecho, selectedGestante, formData.data_desfecho]);

  const getRNStatus = (dataNasc: string, dataConsulta: string) => {
    if (!dataNasc) return null;
    const limit = new Date(dataNasc);
    limit.setDate(limit.getDate() + 10);
    
    if (!dataConsulta) {
      const today = new Date();
      return today > limit ? 'ATRASADO' : 'EM DIA';
    }
    
    const consulta = new Date(dataConsulta);
    return consulta <= limit ? 'EM DIA' : 'ATRASADO';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGestante) {
      setError('Selecione uma gestante primeiro.');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 1. Insert Desfecho
      const { data: desfechoData, error: desfechoError } = await supabase
        .from('desfechos')
        .insert([{
          sispn: formData.sispn,
          tipo_desfecho: formData.tipo_desfecho,
          data_desfecho: formData.data_desfecho,
          unidade_cnes: authUser?.unidade_cnes
        }])
        .select()
        .single();

      if (desfechoError) throw desfechoError;

      // 2. Insert RNs if any
      if (recemNascidos.length > 0 && formData.tipo_desfecho === 'PARTO') {
        const rnsToInsert = recemNascidos.map(rn => ({
          id_desfecho: desfechoData.id,
          nome_rn: rn.nome_rn,
          cpf_rn: rn.cpf_rn,
          data_nascimento: rn.data_nascimento,
          data_consulta_rn: rn.data_consulta_rn || null,
          comparecimento: rn.comparecimento
        }));

        const { error: rnsError } = await supabase
          .from('recem_nascidos')
          .insert(rnsToInsert);

        if (rnsError) throw rnsError;
      }

      setSuccess('Desfecho registrado com sucesso!');
      setIsFormOpen(false);
      fetchData();
      resetForm();
    } catch (err: any) {
      console.error('Error saving desfecho:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      sispn: '',
      tipo_desfecho: 'PARTO',
      data_desfecho: new Date().toISOString().split('T')[0],
    });
    setRecemNascidos([{ nome_rn: '', cpf_rn: '', data_nascimento: '', data_consulta_rn: '', comparecimento: false }]);
    setSelectedGestante(null);
    setPatientSearch('');
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.from('desfechos').delete().eq('id', id);
      if (error) throw error;
      setSuccess('Desfecho excluído com sucesso!');
      fetchData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setDeleteConfirmId(null);
    }
  };

  const filteredDesfechos = useMemo(() => {
    return desfechos.filter(d => {
      const query = searchQuery.toLowerCase().trim();
      const pacienteNome = d.gestacoes?.pacientes?.gestante || '';
      
      const matchesSearch = !query || pacienteNome.toLowerCase().includes(query) || d.sispn.includes(query);
      if (!matchesSearch) return false;

      if (filters.tipo_desfecho && d.tipo_desfecho !== filters.tipo_desfecho) return false;

      if (filters.status_gestacao) {
        // Calculate status on the fly for filtering
        const dpp = d.gestacoes?.dpp;
        if (!dpp) return false;
        
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        const end = new Date(dpp);
        end.setHours(0, 0, 0, 0);
        const status = now >= end ? 'VENCIDA' : 'ATIVA';
        
        if (status !== filters.status_gestacao) return false;
      }

      return true;
    });
  }, [desfechos, searchQuery, filters]);

  const paginatedDesfechos = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDesfechos.slice(start, start + itemsPerPage);
  }, [filteredDesfechos, currentPage]);

  const handleExportCSV = useCallback(() => {
    const headers = ['SISPN', 'GESTANTE', 'DATA DESFECHO', 'DESFECHO', 'RN NOME', 'RN CPF', 'RN DATA NASC', 'RN CONSULTA', 'RN COMPARECEU'];
    const rows: any[] = [];
    
    filteredDesfechos.forEach(d => {
      const baseRow = [
        d.sispn,
        d.gestacoes?.pacientes?.gestante || 'N/A',
        new Date(d.data_desfecho).toLocaleDateString('pt-BR'),
        d.tipo_desfecho
      ];

      if (d.tipo_desfecho === 'PARTO' && d.recem_nascidos && d.recem_nascidos.length > 0) {
        d.recem_nascidos.forEach(rn => {
          rows.push([
            ...baseRow,
            rn.nome_rn,
            rn.cpf_rn,
            rn.data_nascimento ? new Date(rn.data_nascimento).toLocaleDateString('pt-BR') : '',
            rn.data_consulta_rn ? new Date(rn.data_consulta_rn).toLocaleDateString('pt-BR') : '',
            rn.comparecimento ? 'SIM' : 'NÃO'
          ]);
        });
      } else {
        rows.push([...baseRow, '', '', '', '', '']);
      }
    });

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "historico_desfechos.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredDesfechos]);

  useEffect(() => {
    setOnExportCSV(() => handleExportCSV);
    return () => setOnExportCSV(null);
  }, [handleExportCSV, setOnExportCSV]);

  if (!mounted) return null;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 lg:p-10 pb-32 max-w-7xl mx-auto space-y-10">
        
        {/* Topbar Pattern - Figura 1 */}
        <div className="bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary">analytics</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-primary uppercase tracking-tight">Desfechos</h1>
              <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Gestão de resultados gestacionais</p>
            </div>
          </div>

          <SearchInput className="w-full md:flex-1 md:mx-8" />

          <RecordsSummary 
            total={desfechos.length} 
            filtered={filteredDesfechos.length} 
          />
        </div>

        <AnimatePresence>
          {isFormOpen && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl border border-outline-variant/10 shadow-xl overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                
                {/* Localizar Gestante */}
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.2em] px-1">Localizar Gestante</label>
                  <div className="relative" ref={patientDropdownRef}>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/40 group-focus-within:text-primary transition-colors">person_search</span>
                      <input
                        type="text"
                        placeholder="Buscar por Nome da Gestante ou número SISPN..."
                        value={patientSearch}
                        onChange={(e) => {
                          setPatientSearch(e.target.value);
                          setIsPatientDropdownOpen(true);
                        }}
                        onFocus={() => setIsPatientDropdownOpen(true)}
                        className="w-full pl-12 pr-4 py-4 bg-surface-container-lowest border border-outline-variant/20 rounded-2xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                      />
                    </div>

                    <AnimatePresence>
                      {isPatientDropdownOpen && filteredPatientOptions.length > 0 && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="absolute z-50 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-outline-variant/10 overflow-hidden"
                        >
                          {filteredPatientOptions.map((g) => (
                            <button
                              key={g.sispn}
                              type="button"
                              onClick={() => handleSelectGestante(g)}
                              className="w-full flex items-center gap-4 px-6 py-4 hover:bg-primary/5 transition-colors text-left border-b border-outline-variant/5 last:border-none"
                            >
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                {g.paciente_nome.charAt(0)}
                              </div>
                              <div className="flex-1">
                                <p className="text-sm font-bold text-on-surface">{g.paciente_nome}</p>
                                <div className="flex items-center gap-2 text-[10px] text-on-surface-variant/60 font-medium">
                                  <span className="bg-surface-container-highest px-2 py-0.5 rounded">SISPN: {g.sispn}</span>
                                  <span className="bg-surface-container-highest px-2 py-0.5 rounded">CPF: {g.paciente_cpf}</span>
                                </div>
                              </div>
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Gestante Selecionada Card */}
                {selectedGestante && (
                  <PatientBanner 
                    patient={{
                      nome: selectedGestante.paciente_nome,
                      data_nascimento: selectedGestante.paciente_nascimento || '',
                      cpf: selectedGestante.paciente_cpf,
                      cns: selectedGestante.paciente_cns || '',
                      dum: selectedGestante.dum,
                      dpp: selectedGestante.dpp,
                      data_cadastro: selectedGestante.data_cadastro,
                      risco: selectedGestante.classificacao_pn || 'HABITUAL'
                    }}
                  />
                )}

                {/* Dados do Desfecho */}
                <div className="space-y-6">
                  <div className="flex items-center gap-3 border-b border-outline-variant/10 pb-4">
                    <span className="material-symbols-outlined text-primary">event_note</span>
                    <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Dados do Desfecho</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest px-1">Tipo de Desfecho</label>
                      <select
                        value={formData.tipo_desfecho}
                        onChange={(e) => setFormData({ ...formData, tipo_desfecho: e.target.value as any })}
                        className="w-full px-4 py-3.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none appearance-none"
                        required
                      >
                        {TIPO_DESFECHO_OPTIONS.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest px-1">Data do Desfecho</label>
                      <input
                        type="date"
                        value={formData.data_desfecho}
                        onChange={(e) => setFormData({ ...formData, data_desfecho: e.target.value })}
                        className="w-full px-4 py-3.5 bg-surface-container-lowest border border-outline-variant/20 rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                        required
                      />
                    </div>
                  </div>
                </div>

                {/* Dados do Recém-Nascido (RN) - Only if PARTO */}
                {formData.tipo_desfecho === 'PARTO' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between border-b border-outline-variant/10 pb-4">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-primary">child_care</span>
                        <h3 className="text-sm font-black text-on-surface uppercase tracking-widest">Dados do Recém-Nascido (RN)</h3>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddRN}
                        className="text-[10px] font-black text-primary uppercase tracking-widest hover:bg-primary/5 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        + Adicionar RN (Gemelar)
                      </button>
                    </div>

                    <div className="space-y-6">
                      {recemNascidos.map((rn, idx) => (
                        <div key={idx} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant/10 space-y-6 relative">
                          {recemNascidos.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveRN(idx)}
                              className="absolute top-4 right-4 text-error hover:bg-error/5 p-1.5 rounded-lg transition-colors"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          )}
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest px-1">Nome do Recém-Nascido</label>
                              <input
                                type="text"
                                placeholder="Nome completo"
                                value={rn.nome_rn}
                                onChange={(e) => handleRNChange(idx, 'nome_rn', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-outline-variant/20 rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest px-1">CPF do RN</label>
                              <input
                                type="text"
                                placeholder="000.000.000-00"
                                value={rn.cpf_rn}
                                onChange={(e) => handleRNChange(idx, 'cpf_rn', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-outline-variant/20 rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest px-1">Data de Nascimento</label>
                              <input
                                type="date"
                                value={rn.data_nascimento}
                                onChange={(e) => handleRNChange(idx, 'data_nascimento', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-outline-variant/20 rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                                required
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest px-1">Data Limite RN (10 DIAS)</label>
                              <input
                                type="date"
                                value={calculateDataLimite(rn.data_nascimento)}
                                readOnly
                                className="w-full px-4 py-3 bg-surface-container-highest/30 border border-outline-variant/10 rounded-xl text-sm text-on-surface-variant/60 outline-none cursor-not-allowed"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest px-1">Data Consulta RN</label>
                              <input
                                type="date"
                                value={rn.data_consulta_rn}
                                onChange={(e) => handleRNChange(idx, 'data_consulta_rn', e.target.value)}
                                className="w-full px-4 py-3 bg-white border border-outline-variant/20 rounded-xl text-sm focus:ring-4 focus:ring-primary/10 focus:border-primary transition-all outline-none"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest px-1">Status</label>
                              <div className="h-[46px] flex items-center px-4">
                                {rn.data_nascimento ? (
                                  <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                    getRNStatus(rn.data_nascimento, rn.data_consulta_rn) === 'EM DIA'
                                      ? 'bg-success/10 text-success'
                                      : 'bg-error/10 text-error'
                                  }`}>
                                    {getRNStatus(rn.data_nascimento, rn.data_consulta_rn)}
                                  </span>
                                ) : (
                                  <span className="text-[9px] text-on-surface-variant/40 font-bold uppercase tracking-widest">Aguardando Data</span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest px-1 block mb-3">Comparecimento</label>
                              <div className="flex items-center gap-6 h-[46px]">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="radio"
                                    checked={rn.comparecimento === true}
                                    onChange={() => handleRNChange(idx, 'comparecimento', true)}
                                    className="w-4 h-4 text-primary focus:ring-primary border-outline-variant/30"
                                  />
                                  <span className="text-xs font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">Sim</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="radio"
                                    checked={rn.comparecimento === false}
                                    onChange={() => handleRNChange(idx, 'comparecimento', false)}
                                    className="w-4 h-4 text-primary focus:ring-primary border-outline-variant/30"
                                  />
                                  <span className="text-xs font-bold text-on-surface-variant group-hover:text-on-surface transition-colors">Não</span>
                                </label>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Feedback Messages */}
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-error/10 border border-error/20 rounded-xl flex items-center gap-3 text-error text-sm font-bold">
                    <span className="material-symbols-outlined">error</span>
                    {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-success/10 border border-success/20 rounded-xl flex items-center gap-3 text-success text-sm font-bold">
                    <span className="material-symbols-outlined">check_circle</span>
                    {success}
                  </motion.div>
                )}

                {/* Submit Button */}
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-primary text-on-primary px-10 py-4 rounded-2xl font-headline text-sm font-black uppercase tracking-[0.2em] shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 transition-all flex items-center gap-3"
                  >
                    {loading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <span className="material-symbols-outlined">save</span>
                    )}
                    Salvar Desfecho
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filtros e Tabela Section */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-primary/10 px-5 py-2.5 rounded-full border border-primary/20 shrink-0">
                <span className="material-symbols-outlined text-primary text-sm">filter_alt</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary">Filtros Ativos</span>
              </div>
              
              <select 
                className="w-full lg:w-auto bg-white text-primary border-2 border-primary/30 hover:shadow-primary/5 hover:border-primary rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                value={filters.status_gestacao}
                onChange={(e) => setFilters({ ...filters, status_gestacao: e.target.value })}
              >
                <option value="">Status Gestação</option>
                <option value="ATIVA">GESTAÇÃO ATIVA</option>
                <option value="VENCIDA">GESTAÇÃO VENCIDA</option>
              </select>

              <select 
                className="w-full lg:w-auto bg-white text-primary border-2 border-primary/30 hover:shadow-primary/5 hover:border-primary rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                value={filters.tipo_desfecho}
                onChange={(e) => setFilters({ ...filters, tipo_desfecho: e.target.value })}
              >
                <option value="">Tipo de Desfecho</option>
                {TIPO_DESFECHO_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>

              {(filters.tipo_desfecho || filters.status_gestacao) && (
                <button 
                  onClick={() => setFilters({ tipo_desfecho: '', status_gestacao: '' })}
                  className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-error/10 text-error text-[9px] font-black uppercase tracking-widest hover:bg-error hover:text-white transition-all border border-error/20"
                >
                  <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                  Limpar
                </button>
              )}
            </div>
          </div>

          {/* History Table Card */}
          <div className="bg-white rounded-[2.5rem] border border-outline-variant/10 shadow-sm overflow-hidden">
            <div className="p-8 border-b border-outline-variant/5 bg-surface-container-lowest flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">history</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface tracking-tight">Histórico de Desfechos</h2>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold">Registros Recentes</p>
              </div>
            </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800">
                  <th className="px-6 py-4 text-xs font-black text-black dark:text-slate-200 uppercase tracking-wider">SISPN</th>
                  <th className="px-6 py-4 text-xs font-black text-black dark:text-slate-200 uppercase tracking-wider">Gestante</th>
                  <th className="px-6 py-4 text-xs font-black text-black dark:text-slate-200 uppercase tracking-wider">Data Desfecho</th>
                  <th className="px-6 py-4 text-xs font-black text-black dark:text-slate-200 uppercase tracking-wider">Desfecho</th>
                  <th className="px-6 py-4 text-xs font-black text-black dark:text-slate-200 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                {loading && desfechos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Carregando registros...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedDesfechos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nenhum desfecho encontrado</p>
                    </td>
                  </tr>
                ) : (
                  paginatedDesfechos.map((d) => (
                    <tr key={d.id} className="hover:bg-orange-50 dark:hover:bg-slate-800/50 transition-colors group">
                      <td className="px-6 py-5">
                        <span className="text-xs font-mono font-bold text-primary">{d.sispn}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-bold text-black dark:text-slate-100 uppercase">{d.gestacoes?.pacientes?.gestante || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-xs font-medium text-slate-700 dark:text-slate-400">{new Date(d.data_desfecho).toLocaleDateString('pt-BR')}</span>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide border ${
                          d.tipo_desfecho === 'PARTO' ? 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800' : 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/50 dark:text-red-300 dark:border-red-800'
                        }`}>
                          {d.tipo_desfecho}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setDeleteConfirmId(d.id)}
                            className="p-2 rounded-lg hover:bg-error/10 text-error transition-colors"
                            title="Excluir"
                          >
                            <span className="material-symbols-outlined text-lg">more_vert</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {filteredDesfechos.length > itemsPerPage && (
            <div className="p-6 border-t border-outline-variant/5 bg-surface-container-lowest">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredDesfechos.length / itemsPerPage)}
                onPageChange={setCurrentPage}
                totalItems={filteredDesfechos.length}
                itemsPerPage={itemsPerPage}
                itemName="desfechos"
              />
            </div>
          )}
          </div>
        </section>
      </div>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setDeleteConfirmId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl space-y-6"
            >
              <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center justify-center text-error mx-auto">
                <span className="material-symbols-outlined text-3xl">delete_forever</span>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-on-surface tracking-tight">Excluir Desfecho?</h3>
                <p className="text-sm text-on-surface-variant/70 leading-relaxed">
                  Esta ação não pode ser desfeita. Todos os dados do desfecho e recém-nascidos associados serão removidos permanentemente.
                </p>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 px-6 py-3 rounded-xl font-headline text-sm font-bold bg-surface-container-highest text-on-surface-variant hover:bg-surface-container-highest/80 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                  className="flex-1 px-6 py-3 rounded-xl font-headline text-sm font-bold bg-error text-on-error shadow-lg shadow-error/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
