'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import Pagination from '@/components/Pagination';

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
  equipe: string;
  referencia_tecnica: string;
  acs: string;
  data_cadastro: string;
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

  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen, refreshTrigger } = useSearch();
  const { user: authUser } = useAuth();
  
  const [desfechos, setDesfechos] = useState<Desfecho[]>([]);
  const [gestacoes, setGestacoes] = useState<Gestacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

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
          sispn, dum, dpp, equipe, referencia_tecnica, acs, data_cadastro,
          pacientes (gestante, cpf)
        `)
        .order('created_at', { ascending: false });

      if (gestError) throw gestError;
      
      const formattedGestacoes = (gestData || []).map((g: any) => ({
        sispn: g.sispn,
        dum: g.dum,
        dpp: g.dpp,
        paciente_nome: g.pacientes?.gestante || 'NÃO INFORMADO',
        paciente_cpf: g.pacientes?.cpf || 'NÃO INFORMADO',
        equipe: g.equipe,
        referencia_tecnica: g.referencia_tecnica,
        acs: g.acs,
        data_cadastro: g.data_cadastro
      }));
      setGestacoes(formattedGestacoes);

      // Fetch Desfechos with Joins
      const { data: desData, error: desError } = await supabase
        .from('desfechos')
        .select(`
          *,
          gestacoes (
            sispn, dum, dpp, equipe, referencia_tecnica, acs, data_cadastro,
            pacientes (gestante, cpf)
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
    const newRN: RecemNascido = { 
      nome_rn: '', 
      cpf_rn: '', 
      data_nascimento: '', 
      data_consulta_rn: '', 
      comparecimento: false 
    };

    if (formData.tipo_desfecho === 'PARTO' && selectedGestante) {
      newRN.nome_rn = `RN ${selectedGestante.paciente_nome}`;
      newRN.data_nascimento = formData.data_desfecho;
    }

    setRecemNascidos([...recemNascidos, newRN]);
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
        return prev.map(rn => ({
          ...rn,
          nome_rn: rn.nome_rn || `RN ${selectedGestante.paciente_nome}`,
          data_nascimento: rn.data_nascimento || formData.data_desfecho
        }));
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

  const getStatusCaptacao = (dum: string, dataCadastro: string) => {
    if (!dum || !dataCadastro) return '---';
    const start = new Date(dum);
    const cad = new Date(dataCadastro);
    const diffTime = cad.getTime() - start.getTime();
    const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
    return diffWeeks <= 12 ? 'PRECOCE' : 'TARDIA';
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
      if (!query) return true;
      const pacienteNome = d.gestacoes?.pacientes?.gestante || '';
      return pacienteNome.toLowerCase().includes(query) || d.sispn.includes(query);
    });
  }, [desfechos, searchQuery]);

  const paginatedDesfechos = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredDesfechos.slice(start, start + itemsPerPage);
  }, [filteredDesfechos, currentPage]);

  if (!mounted) return null;

  const handleExportCSV = () => {
    const headers = ['SISPN', 'GESTANTE', 'DATA DESFECHO', 'DESFECHO'];
    const rows = filteredDesfechos.map(d => [
      d.sispn,
      d.gestacoes?.pacientes?.gestante || 'N/A',
      new Date(d.data_desfecho).toLocaleDateString('pt-BR'),
      d.tipo_desfecho
    ]);
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
  };

  return (
    <DashboardLayout title="Lançamento de Desfecho">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Topbar Pattern - Figura 1 */}
        <div className="bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col md:flex-row items-center gap-4">
          <div className="flex items-center gap-4 pr-4 border-r border-outline-variant/10">
            <h1 className="text-xl font-black text-primary uppercase tracking-tight">Desfechos</h1>
          </div>
          
          <div className="relative flex-1 w-full">
            <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30 text-xl">search</span>
            <input
              type="text"
              placeholder="SISPN ou CPF..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-surface-container-low border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-primary/20 transition-all placeholder:text-on-surface-variant/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-on-primary font-headline text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-lg">upload</span>
              Importar
            </button>
            <button
              className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-primary text-primary font-headline text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 transition-all"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Exportar Layout
            </button>
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-2 px-6 py-3 rounded-2xl border-2 border-primary text-primary font-headline text-[10px] font-black uppercase tracking-widest hover:bg-primary/5 transition-all"
            >
              <span className="material-symbols-outlined text-lg">download</span>
              Exportar CSV
            </button>
            <button
              onClick={() => setIsFormOpen(!isFormOpen)}
              className="flex items-center gap-2 px-8 py-3 rounded-2xl bg-primary text-on-primary font-headline text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              <span className="material-symbols-outlined text-lg">{isFormOpen ? 'close' : 'add'}</span>
              {isFormOpen ? 'Cancelar' : 'Cadastrar'}
            </button>
          </div>
        </div>

        {/* Orange Patient Info Frame */}
        {selectedGestante && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-primary p-6 rounded-3xl shadow-xl shadow-primary/20 border border-white/10 text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32" />
            <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-6">
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Nome da Gestante</p>
                <p className="text-xs font-black uppercase truncate">{selectedGestante.paciente_nome}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60">CPF</p>
                <p className="text-xs font-black uppercase">{selectedGestante.paciente_cpf}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60">SISPN</p>
                <p className="text-xs font-black uppercase">{selectedGestante.sispn}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Captação</p>
                <p className="text-xs font-black uppercase">{getStatusCaptacao(selectedGestante.dum, selectedGestante.data_cadastro)}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60">DUM</p>
                <p className="text-xs font-black uppercase">{new Date(selectedGestante.dum).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60">DPP</p>
                <p className="text-xs font-black uppercase">{new Date(selectedGestante.dpp).toLocaleDateString('pt-BR')}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[8px] font-black uppercase tracking-widest opacity-60">Risco</p>
                <p className="text-xs font-black uppercase">BAIXO RISCO</p>
              </div>
            </div>
          </motion.div>
        )}

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
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-primary rounded-2xl p-6 text-on-primary shadow-lg shadow-primary/20 flex items-center gap-6 relative overflow-hidden"
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <span className="material-symbols-outlined text-3xl">person</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">Gestante Selecionada</p>
                      <h3 className="text-xl font-bold tracking-tight">{selectedGestante.paciente_nome}</h3>
                      <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-[10px] font-bold uppercase tracking-widest opacity-80">
                        <span>Referência: {selectedGestante.dum ? new Date(selectedGestante.dum).toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }) : 'N/A'}</span>
                        <span>Equipe: {selectedGestante.equipe}</span>
                      </div>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-6 py-3 rounded-xl border border-white/20">
                      <p className="text-[8px] font-black uppercase tracking-[0.2em] opacity-70 mb-1">Número SISPN</p>
                      <p className="text-lg font-black tracking-tighter">{selectedGestante.sispn}</p>
                    </div>
                  </motion.div>
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

        {/* History Table */}
        <div className="bg-white rounded-3xl border border-outline-variant/10 shadow-sm overflow-hidden">
          <div className="p-6 border-b border-outline-variant/5 flex items-center justify-between bg-surface-container-lowest">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary">history</span>
              </div>
              <div>
                <h2 className="text-lg font-bold text-on-surface tracking-tight">Histórico de Desfechos</h2>
                <p className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-bold">Registros Recentes</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low/50">
                  <th className="px-6 py-4 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.2em]">SISPN</th>
                  <th className="px-6 py-4 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.2em]">Gestante</th>
                  <th className="px-6 py-4 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.2em]">Data Desfecho</th>
                  <th className="px-6 py-4 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.2em]">Desfecho</th>
                  <th className="px-6 py-4 text-[10px] font-black text-on-surface-variant/60 uppercase tracking-[0.2em] text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {loading && desfechos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                        <p className="text-xs font-bold text-on-surface-variant/40 uppercase tracking-widest">Carregando registros...</p>
                      </div>
                    </td>
                  </tr>
                ) : paginatedDesfechos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <p className="text-xs font-bold text-on-surface-variant/40 uppercase tracking-widest">Nenhum desfecho encontrado</p>
                    </td>
                  </tr>
                ) : (
                  paginatedDesfechos.map((d) => (
                    <tr key={d.id} className="hover:bg-primary/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <span className="text-xs font-black text-on-surface tracking-tighter">{d.sispn}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-on-surface uppercase">{d.gestacoes?.pacientes?.gestante || 'N/A'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-on-surface-variant/70">{new Date(d.data_desfecho).toLocaleDateString('pt-BR')}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                          d.tipo_desfecho === 'PARTO' ? 'bg-success/10 text-success' : 'bg-error/10 text-error'
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
                totalItems={filteredDesfechos.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </div>
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
