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
  nome_rn?: string;
  cpf_rn?: string;
  data_nascimento?: string;
  data_consulta_rn?: string;
  comparecimento?: boolean;
  unidade_cnes?: string;
  operador?: string;
  created_at?: string;
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
    tipo_desfecho: 'PARTO',
    unidade: authUser?.unidade_cnes || ''
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

  useEffect(() => {
    if (!isFormOpen) {
      setPatientSearch('');
      setSelectedGestante(null);
    }
  }, [isFormOpen]);

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
        .from('desfechos_e_rn')
        .select(`
          *,
          gestacoes (
            sispn, dum, dpp, equipe, referencia_tecnica, acs, data_cadastro, classificacao_pn,
            pacientes (gestante, cpf, cns, data_nascimento)
          )
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
    setPatientSearch(`${g.paciente_nome} (SISPN: ${g.sispn})`);
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
        const updated = prev.map((rn, idx) => ({
          ...rn,
          nome_rn: !rn.nome_rn ? `RN ${selectedGestante.paciente_nome}` : rn.nome_rn,
          data_nascimento: !rn.data_nascimento || rn.data_nascimento === '' ? formData.data_desfecho : rn.data_nascimento
        }));
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
      const rnData = recemNascidos.length > 0 && formData.tipo_desfecho === 'PARTO' ? recemNascidos[0] : null;

      const { error: desfechoError } = await supabase
        .from('desfechos_e_rn')
        .insert([{
          sispn: formData.sispn,
          tipo_desfecho: formData.tipo_desfecho,
          data_desfecho: formData.data_desfecho,
          nome_rn: rnData?.nome_rn || null,
          cpf_rn: rnData?.cpf_rn || null,
          data_nascimento: rnData?.data_nascimento || null,
          data_consulta_rn: rnData?.data_consulta_rn || null,
          comparecimento: rnData?.comparecimento || false,
          unidade_cnes: authUser?.unidade_cnes,
          cpf_operador: authUser?.cpf || null
        }]);

      if (desfechoError) throw desfechoError;

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
      const { error } = await supabase.from('desfechos_e_rn').delete().eq('id', id);
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

  const handleEdit = (d: Desfecho) => {
    setFormData({
      sispn: d.sispn,
      tipo_desfecho: d.tipo_desfecho,
      data_desfecho: d.data_desfecho,
    });
    if (d.tipo_desfecho === 'PARTO' && d.nome_rn) {
      setRecemNascidos([{
        nome_rn: d.nome_rn || '',
        cpf_rn: d.cpf_rn || '',
        data_nascimento: d.data_nascimento || '',
        data_consulta_rn: d.data_consulta_rn || '',
        comparecimento: d.comparecimento || false
      }]);
    }
    const gestacao = gestacoes.find(g => g.sispn === d.sispn);
    if (gestacao) {
      setSelectedGestante(gestacao);
      setPatientSearch(gestacao.paciente_nome);
    }
    setIsFormOpen(true);
  };

  const filteredDesfechos = useMemo(() => {
    return desfechos.filter(d => {
      const query = searchQuery.toLowerCase().trim();
      const pacienteNome = d.gestacoes?.pacientes?.gestante || '';
      
      const matchesSearch = !query || pacienteNome.toLowerCase().includes(query) || d.sispn.includes(query);
      if (!matchesSearch) return false;

      if (filters.tipo_desfecho && d.tipo_desfecho !== filters.tipo_desfecho) return false;

      // Filter by unidade (only for non-admin users)
      if (authUser?.nivel_acesso !== 'Administrador' && authUser?.unidade_cnes) {
        if ((d.gestacoes as any)?.unidade_cnes !== authUser.unidade_cnes) return false;
      }

      return true;
    });
  }, [desfechos, searchQuery, filters]);

  const paginatedDesfechos = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDesfechos.slice(start, start + itemsPerPage);
  }, [filteredDesfechos, currentPage]);

  const handleExportCSV = useCallback(() => {
    const headers = ['sispn', 'data_desfecho', 'tipo_desfecho', 'rn_nome', 'rn_cpf', 'rn_consulta'];
    const rows: any[] = [];
    
    filteredDesfechos.forEach(d => {
      const baseRow = [
        d.sispn,
        d.data_desfecho ? new Date(d.data_desfecho).toISOString().split('T')[0] : '',
        d.tipo_desfecho
      ];

      if (d.tipo_desfecho === 'PARTO') {
        rows.push([
          ...baseRow,
          d.nome_rn || '',
          d.cpf_rn || '',
          d.data_consulta_rn || ''
        ]);
      } else {
        rows.push([...baseRow, '', '', '']);
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
                
                {/* Gestante Selecionada Card - Above Search */}
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
                              <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest px-1">Data Limite RN (10 DIAS)</label>
                              <input
                                type="date"
                                value={calculateDataLimite(rn.data_nascimento)}
                                readOnly
                                className="w-full px-4 py-3 bg-surface-container-highest/30 border border-outline-variant/10 rounded-xl text-sm text-on-surface-variant/60 outline-none cursor-not-allowed"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
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
                              <label className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-widest px-1">Comparecimento</label>
                              <div className="flex items-center gap-6 h-[46px]">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="radio"
                                    checked={rn.comparecimento === true}
                                    onChange={() => handleRNChange(idx, 'comparecimento', true)}
                                    className="w-4 h-4 text-primary focus:ring-primary border-outline-variant/30"
                                  />
                                  <span className="text-table-cell group-hover:text-on-surface transition-colors">Sim</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer group">
                                  <input
                                    type="radio"
                                    checked={rn.comparecimento === false}
                                    onChange={() => handleRNChange(idx, 'comparecimento', false)}
                                    className="w-4 h-4 text-primary focus:ring-primary border-outline-variant/30"
                                  />
                                  <span className="text-table-cell group-hover:text-on-surface transition-colors">Não</span>
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
                value={filters.tipo_desfecho}
                onChange={(e) => setFilters({ ...filters, tipo_desfecho: e.target.value })}
              >
                <option value="">Tipo de Desfecho</option>
                {TIPO_DESFECHO_OPTIONS.map(opt => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>

              {filters.tipo_desfecho && (
                <button 
                  onClick={() => setFilters({ tipo_desfecho: 'PARTO', unidade: authUser?.unidade_cnes || '' })}
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
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="bg-surface-container-low">
                <tr>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">#</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Gestante</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Desfecho</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Recém-Nascido</th>
                  <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {loading && desfechos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-xs font-bold text-on-surface-variant/40 uppercase tracking-wider">Carregando registros...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedDesfechos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center">
                      <p className="text-xs font-bold text-on-surface-variant/40 uppercase tracking-wider">Nenhum desfecho encontrado</p>
                    </td>
                  </tr>
                ) : (
                  paginatedDesfechos.map((d, index) => (
                    <tr key={d.id} className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="px-4 py-3">
                        <span className="text-[10px] font-mono text-on-surface-variant/40">{index + 1 + (currentPage - 1) * itemsPerPage}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[10px] font-mono font-bold text-primary">CPF: {d.gestacoes?.pacientes?.cpf ? d.gestacoes.pacientes.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') : '---'}</span>
                          <p className="font-black text-xs text-on-surface uppercase leading-tight">{d.gestacoes?.pacientes?.gestante || 'N/A'}</p>
                          <span className="text-[10px] font-mono font-bold text-primary">SISPN: {d.sispn}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full w-fit ${
                            d.tipo_desfecho === 'PARTO' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
                          }`}>
                            {d.tipo_desfecho}
                          </span>
                          <span className="text-[10px] font-bold text-on-surface">{new Date(d.data_desfecho).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {d.tipo_desfecho === 'PARTO' ? (
                          <div className="flex flex-col gap-0.5">
                            <p className="font-black text-xs text-on-surface uppercase leading-tight">
                              {d.nome_rn || `RN ${d.gestacoes?.pacientes?.gestante || 'N/A'}`}
                            </p>
                            <span className="text-[10px] font-mono text-on-surface-variant/60">{d.cpf_rn ? `CPF: ${d.cpf_rn}` : '---'}</span>
                            {d.data_consulta_rn && (
                              <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                                d.comparecimento ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'
                              }`}>
                                {d.comparecimento ? 'ATENDIDO' : 'PENDENTE'}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[10px] text-on-surface-variant/40">---</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleEdit(d)}
                            className="p-1.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(d.id)}
                            className="p-1.5 rounded-lg bg-error text-white hover:bg-error/80 transition-all"
                            title="Excluir"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
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
              <div className="w-16 h-16 rounded-2xl bg-error/10 flex items-center text-error mx-auto">
                <span className="material-symbols-outlined text-3xl">delete_forever</span>
              </div>
              <div className="text-center space-y-3">
                <h3 className="text-xl font-bold text-on-surface tracking-tight">Excluir Desfecho?</h3>
                {deleteConfirmId && (() => {
                  const d = desfechos.find(x => x.id === deleteConfirmId);
                  return d ? (
                    <div className="bg-surface-container-low p-3 rounded-xl text-left space-y-1">
                      <p className="text-xs font-bold text-on-surface"><span className="text-primary">Gestante:</span> {d.gestacoes?.pacientes?.gestante || 'N/A'}</p>
                      <p className="text-xs font-bold text-on-surface"><span className="text-primary">SISPN:</span> {d.sispn}</p>
                      <p className="text-xs font-bold text-on-surface"><span className="text-primary">Tipo:</span> {d.tipo_desfecho}</p>
                      <p className="text-xs font-bold text-on-surface"><span className="text-primary">Data:</span> {new Date(d.data_desfecho).toLocaleDateString('pt-BR')}</p>
                      {d.nome_rn && <p className="text-xs font-bold text-on-surface"><span className="text-primary">RN:</span> {d.nome_rn}</p>}
                    </div>
                  ) : null;
                })()}
                <p className="text-xs text-on-surface-variant/70 leading-relaxed">
                  Esta ação removerá apenas os dados do desfecho. <strong className="text-error">A gestação e os dados da gestante serão mantidos.</strong>
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
