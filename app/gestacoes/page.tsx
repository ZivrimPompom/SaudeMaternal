'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Heart, Plus, Edit2, Trash2, Search, AlertCircle, CheckCircle2, X, FileUp, ChevronLeft, ChevronRight, Calendar, User, ClipboardList, MapPin, Activity, Baby, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Pagination from '@/components/Pagination';
import RecordsSummary from '@/components/RecordsSummary';
import SearchInput from '@/components/SearchInput';

interface Gestacao {
  id: string;
  cpf_paciente: string;
  gestante_nome?: string;
  dum: string;
  dpp: string;
  idade_gestacional_semanas: number;
  idade_gestacional_dias: number;
  gravidez_planejada: boolean;
  uso_metodo_contraceptivo: boolean;
  metodo_contraceptivo: string;
  numero_gestacoes: number;
  numero_partos: number;
  numero_abortos: number;
  situacao_gestacao: string;
  created_at?: string;
  cpf_operador?: string;
}

interface Paciente {
  cpf: string;
  gestante: string;
}

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2');
};

export default function GestacoesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen, refreshTrigger, setOnExportCSV } = useSearch();
  const { user: authUser } = useAuth();
  
  const [gestacoes, setGestacoes] = useState<Gestacao[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Gestacao>>({
    cpf_paciente: '',
    dum: '',
    dpp: '',
    idade_gestacional_semanas: 0,
    idade_gestacional_dias: 0,
    gravidez_planejada: false,
    uso_metodo_contraceptivo: false,
    metodo_contraceptivo: '',
    numero_gestacoes: 1,
    numero_partos: 0,
    numero_abortos: 0,
    situacao_gestacao: 'EM CURSO'
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setIsFormOpen(false);
    loadInitialData();
  }, [setIsFormOpen, refreshTrigger]);

  const loadInitialData = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [gestacoesRes, pacientesRes] = await Promise.all([
        supabase.from('gestacoes').select('*, pacientes(gestante)').order('created_at', { ascending: false }),
        supabase.from('pacientes').select('cpf, gestante').order('gestante')
      ]);

      if (gestacoesRes.data) {
        const formatted = gestacoesRes.data.map((g: any) => ({
          ...g,
          gestante_nome: g.pacientes?.gestante
        }));
        setGestacoes(formatted);
      }
      if (pacientesRes.data) setPacientes(pacientesRes.data);

    } catch (err) {
      console.error('Error loading data:', err);
      setError('Erro ao carregar dados.');
    } finally {
      setLoading(false);
    }
  };

  const calculateDPP = (dum: string) => {
    if (!dum) return '';
    const date = new Date(dum);
    date.setDate(date.getDate() + 280); // 40 weeks
    return date.toISOString().split('T')[0];
  };

  const calculateIG = (dum: string) => {
    if (!dum) return { semanas: 0, dias: 0 };
    const start = new Date(dum);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const semanas = Math.floor(diffDays / 7);
    const dias = diffDays % 7;
    return { semanas, dias };
  };

  useEffect(() => {
    if (formData.dum) {
      const dpp = calculateDPP(formData.dum);
      const { semanas, dias } = calculateIG(formData.dum);
      setFormData(prev => ({
        ...prev,
        dpp,
        idade_gestacional_semanas: semanas,
        idade_gestacional_dias: dias
      }));
    }
  }, [formData.dum]);

  const filteredGestacoes = useMemo(() => {
    return gestacoes.filter(g => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const normalize = (str: string) => 
        str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

      const gestante = normalize(g.gestante_nome || '');
      const situacao = normalize(g.situacao_gestacao || '');
      const cpf = g.cpf_paciente.replace(/\D/g, '');
      
      const queryNormalizada = normalize(query);
      const queryDigits = query.replace(/\D/g, '');

      return gestante.includes(queryNormalizada) || 
             situacao.includes(queryNormalizada) ||
             (queryDigits !== '' && cpf.includes(queryDigits));
    });
  }, [gestacoes, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isSupabaseConfigured) return;

    if (!formData.cpf_paciente || !formData.dum) {
      setError('Paciente e DUM são obrigatórios.');
      return;
    }

    try {
      const payload = {
        ...formData,
        metodo_contraceptivo: formData.metodo_contraceptivo?.toUpperCase(),
        situacao_gestacao: formData.situacao_gestacao?.toUpperCase(),
        cpf_operador: authUser?.cpf || null
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('gestacoes')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
        setSuccess('Gestação atualizada com sucesso!');
      } else {
        const { error: insertError } = await supabase
          .from('gestacoes')
          .insert([payload]);

        if (insertError) throw insertError;
        setSuccess('Gestação registrada com sucesso!');
      }

      setFormData({
        cpf_paciente: '',
        dum: '',
        dpp: '',
        idade_gestacional_semanas: 0,
        idade_gestacional_dias: 0,
        gravidez_planejada: false,
        uso_metodo_contraceptivo: false,
        metodo_contraceptivo: '',
        numero_gestacoes: 1,
        numero_partos: 0,
        numero_abortos: 0,
        situacao_gestacao: 'EM CURSO'
      });
      setEditingId(null);
      setIsFormOpen(false);
      loadInitialData();
    } catch (err: any) {
      console.error('Error saving gestation:', err);
      setError(err.message || 'Erro ao salvar gestação.');
    }
  };

  const handleEdit = (g: Gestacao) => {
    setEditingId(g.id);
    setFormData({
      cpf_paciente: g.cpf_paciente,
      dum: g.dum,
      dpp: g.dpp,
      idade_gestacional_semanas: g.idade_gestacional_semanas,
      idade_gestacional_dias: g.idade_gestacional_dias,
      gravidez_planejada: g.gravidez_planejada,
      uso_metodo_contraceptivo: g.uso_metodo_contraceptivo,
      metodo_contraceptivo: g.metodo_contraceptivo,
      numero_gestacoes: g.numero_gestacoes,
      numero_partos: g.numero_partos,
      numero_abortos: g.numero_abortos,
      situacao_gestacao: g.situacao_gestacao
    });
    setError(null);
    setSuccess(null);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(null);
    const { error: deleteError } = await supabase
      .from('gestacoes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError('Erro ao excluir gestação.');
    } else {
      setSuccess('Gestação excluída com sucesso!');
      loadInitialData();
    }
  };

  const handleExportCSV = useCallback(() => {
    const headers = ['GESTANTE', 'CPF', 'DUM', 'DPP', 'IG', 'PLANEJADA', 'SITUAÇÃO'];
    const rows = filteredGestacoes.map(g => [
      g.gestante_nome,
      g.cpf_paciente,
      g.dum,
      g.dpp,
      `${g.idade_gestacional_semanas}s ${g.idade_gestacional_dias}d`,
      g.gravidez_planejada ? 'SIM' : 'NÃO',
      g.situacao_gestacao
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "gestacoes.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredGestacoes]);

  useEffect(() => {
    setOnExportCSV(() => handleExportCSV);
    return () => setOnExportCSV(null);
  }, [handleExportCSV, setOnExportCSV]);

  if (!mounted) return null;

  return (
    <DashboardLayout title="Gestações">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Topbar Pattern - Figura 1 */}
        <div className="bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-primary uppercase tracking-tight">Gestações</h1>
          </div>

          <SearchInput 
            className="w-full md:flex-1 md:mx-8" 
            placeholder="Digite Gestante ou Situação"
          />

          <RecordsSummary 
            total={gestacoes.length} 
            filtered={filteredGestacoes.length} 
          />
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Form Section */}
          <AnimatePresence>
            {isFormOpen && (
              <motion.section 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 40 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="col-span-12 overflow-hidden"
              >
                <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] shadow-2xl shadow-black/5 border border-outline-variant/10 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
                  
                  <h3 className="text-2xl font-black font-headline mb-8 flex items-center gap-3 relative z-10">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <Heart className="text-primary w-5 h-5" />
                    </div>
                    {editingId ? 'Editar Gestação' : 'Nova Gestação'}
                  </h3>

                  <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-xs font-bold flex items-center gap-3"
                        >
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          {error}
                        </motion.div>
                      )}
                      {success && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-4 rounded-2xl bg-green-50 border border-green-100 text-green-600 text-xs font-bold flex items-center gap-3"
                        >
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          {success}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Paciente (Gestante)</label>
                        <select 
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none"
                          value={formData.cpf_paciente || ''}
                          onChange={(e) => setFormData({ ...formData, cpf_paciente: e.target.value })}
                          required
                        >
                          <option value="">Selecione a paciente</option>
                          {pacientes.map(p => (
                            <option key={p.cpf} value={p.cpf}>{p.gestante} ({formatCpf(p.cpf)})</option>
                          ))}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">DUM</label>
                          <input 
                            type="date"
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                            value={formData.dum || ''}
                            onChange={(e) => setFormData({ ...formData, dum: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">DPP (Calculada)</label>
                          <input 
                            type="date"
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none opacity-60"
                            value={formData.dpp || ''}
                            readOnly
                          />
                        </div>
                      </div>
                    </div>

                    {formData.dum && (
                      <div className="p-4 rounded-2xl bg-primary/5 border border-primary/10 flex justify-between items-center">
                        <div className="space-y-1">
                          <p className="text-[8px] font-black uppercase tracking-widest text-primary/60">Idade Gestacional</p>
                          <p className="text-xs font-black text-primary">{formData.idade_gestacional_semanas} SEMANAS E {formData.idade_gestacional_dias} DIAS</p>
                        </div>
                        <div className="text-right">
                          <span className="material-symbols-outlined text-primary/40">calendar_today</span>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60">Gravidez Planejada?</span>
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, gravidez_planejada: !formData.gravidez_planejada })}
                          className={`w-12 h-6 rounded-full transition-all relative ${formData.gravidez_planejada ? 'bg-primary' : 'bg-outline-variant/30'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.gravidez_planejada ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>

                      <div className="bg-surface-container-low p-4 rounded-2xl flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider text-on-surface-variant/60">Usava Contraceptivo?</span>
                        <button 
                          type="button"
                          onClick={() => setFormData({ ...formData, uso_metodo_contraceptivo: !formData.uso_metodo_contraceptivo })}
                          className={`w-12 h-6 rounded-full transition-all relative ${formData.uso_metodo_contraceptivo ? 'bg-primary' : 'bg-outline-variant/30'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${formData.uso_metodo_contraceptivo ? 'right-1' : 'left-1'}`} />
                        </button>
                      </div>
                    </div>

                    {formData.uso_metodo_contraceptivo && (
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Qual Método?</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none uppercase"
                          placeholder="EX: PÍLULA, PRESERVATIVO, DIU"
                          value={formData.metodo_contraceptivo || ''}
                          onChange={(e) => setFormData({ ...formData, metodo_contraceptivo: e.target.value.toUpperCase() })}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Gestações</label>
                        <input 
                          type="number"
                          min="1"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                          value={formData.numero_gestacoes || ''}
                          onChange={(e) => setFormData({ ...formData, numero_gestacoes: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Partos</label>
                        <input 
                          type="number"
                          min="0"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                          value={formData.numero_partos || ''}
                          onChange={(e) => setFormData({ ...formData, numero_partos: Number(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Abortos</label>
                        <input 
                          type="number"
                          min="0"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                          value={formData.numero_abortos || ''}
                          onChange={(e) => setFormData({ ...formData, numero_abortos: Number(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Situação da Gestação</label>
                      <select 
                        className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none"
                        value={formData.situacao_gestacao || ''}
                        onChange={(e) => setFormData({ ...formData, situacao_gestacao: e.target.value })}
                      >
                        <option value="EM CURSO">EM CURSO</option>
                        <option value="ENCERRADA">ENCERRADA</option>
                        <option value="INTERROMPIDA">INTERROMPIDA</option>
                      </select>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                      <button 
                        type="submit"
                        className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-headline uppercase tracking-widest text-[10px]"
                      >
                        {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {editingId ? 'Atualizar Gestação' : 'Registrar Gestação'}
                      </button>
                      {editingId && (
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            type="button"
                            onClick={() => setDeleteConfirmId(editingId)}
                            className="bg-red-50 text-red-600 font-black py-4 rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 font-headline uppercase tracking-widest text-[8px]"
                          >
                            <Trash2 className="w-3 h-3" />
                            Excluir
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setIsFormOpen(false);
                              setFormData({
                                cpf_paciente: '', dum: '', dpp: '', idade_gestacional_semanas: 0, idade_gestacional_dias: 0, gravidez_planejada: false, uso_metodo_contraceptivo: false, metodo_contraceptivo: '', numero_gestacoes: 1, numero_partos: 0, numero_abortos: 0, situacao_gestacao: 'EM CURSO'
                              });
                            }}
                            className="bg-surface-container-high text-on-surface-variant font-black py-4 rounded-2xl hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2 font-headline uppercase tracking-widest text-[8px]"
                          >
                            <X className="w-3 h-3" />
                            Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </form>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* List Section */}
          <section className="col-span-12">
            <div className="bg-surface-container-lowest rounded-[3rem] overflow-hidden shadow-2xl shadow-black/5 border border-outline-variant/10">
              <div className="p-6 md:p-10 border-b border-outline-variant/5 flex justify-between items-center bg-surface-container-lowest/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Heart className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-headline text-on-surface">Gestações Ativas</h3>
                    <p className="text-xs text-on-surface-variant/40 font-body uppercase tracking-widest font-bold">Monitoramento Pré-Natal</p>
                  </div>
                </div>
                <div className="bg-primary/10 text-primary px-6 py-2 rounded-full text-[10px] font-black font-headline uppercase tracking-[0.2em]">
                  {filteredGestacoes.length} Registros
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {loading ? (
                  <div className="p-24 text-center space-y-4">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/30">Sincronizando Dados...</p>
                  </div>
                ) : filteredGestacoes.length === 0 ? (
                  <div className="p-24 text-center space-y-6">
                    <div className="w-20 h-20 bg-surface-container-low rounded-[2rem] flex items-center justify-center mx-auto">
                      <Search className="text-on-surface-variant/20 w-10 h-10" />
                    </div>
                    <p className="text-sm font-body text-on-surface-variant/40">Nenhuma gestação encontrada.</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-separate border-spacing-0 min-w-[1100px]">
                      <thead className="sticky top-0 z-30 bg-surface-container-low">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">DUM / DPP</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">Paciente / CPF</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">Idade Gestacional</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">Histórico / Planej.</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline text-center border-b border-outline-variant/5 sticky right-0 bg-surface-container-low z-40 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] w-[180px]">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {filteredGestacoes
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((g) => (
                            <motion.tr 
                              layout
                              key={g.id} 
                              className="hover:bg-surface-container-low/50 transition-all group"
                            >
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8px] font-black text-on-surface-variant/40 uppercase">DUM:</span>
                                  <span className="text-[10px] font-black text-primary tracking-widest">{new Date(g.dum).toLocaleDateString('pt-BR')}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[8px] font-black text-on-surface-variant/40 uppercase">DPP:</span>
                                  <span className="text-[10px] font-bold text-on-surface-variant/60">{new Date(g.dpp).toLocaleDateString('pt-BR')}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-0.5">
                                <div className="flex items-center gap-1.5">
                                  <User className="w-3 h-3 text-on-surface-variant/30" />
                                  <p className="font-black text-on-surface font-headline text-sm group-hover:text-primary transition-colors uppercase">{g.gestante_nome}</p>
                                </div>
                                <span className="text-[9px] font-bold text-on-surface-variant/40 ml-[18px]">{formatCpf(g.cpf_paciente)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-on-surface uppercase tracking-wider">{g.idade_gestacional_semanas} SEMANAS</span>
                                <div className="flex items-center gap-1.5">
                                  <Activity className="w-3 h-3 text-primary/40" />
                                  <span className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-widest">{g.situacao_gestacao}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-1">
                                <div className="flex items-center gap-3">
                                  <div className="flex items-center gap-1" title="Gestações">
                                    <Heart className="w-3 h-3 text-on-surface-variant/30" />
                                    <span className="text-[10px] font-black text-on-surface">{g.numero_gestacoes}G</span>
                                  </div>
                                  <div className="flex items-center gap-1" title="Partos">
                                    <Baby className="w-3 h-3 text-on-surface-variant/30" />
                                    <span className="text-[10px] font-black text-on-surface">{g.numero_partos}P</span>
                                  </div>
                                  <div className="flex items-center gap-1" title="Abortos">
                                    <AlertCircle className="w-3 h-3 text-on-surface-variant/30" />
                                    <span className="text-[10px] font-black text-on-surface">{g.numero_abortos}A</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <Info className="w-3 h-3 text-on-surface-variant/30" />
                                  <span className="text-[9px] font-bold text-on-surface-variant/60 uppercase tracking-tighter">Planejada: {g.gravidez_planejada ? 'SIM' : 'NÃO'}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-6 py-4 sticky right-0 bg-surface-container-lowest group-hover:bg-surface-container-low transition-colors z-30 shadow-[-10px_0_15_px_-3px_rgba(0,0,0,0.05)]">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => handleEdit(g)}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all shadow-sm group/btn"
                                  title="Editar Gestação"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover/btn:inline">Editar</span>
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirmId(g.id)}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm group/btn"
                                  title="Excluir Gestação"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover/btn:inline">Excluir</span>
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                    <Pagination 
                      currentPage={currentPage}
                      totalPages={Math.ceil(filteredGestacoes.length / itemsPerPage)}
                      onPageChange={setCurrentPage}
                      totalItems={filteredGestacoes.length}
                      itemsPerPage={itemsPerPage}
                      itemName="gestações"
                    />
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-outline-variant/10 space-y-8"
            >
              <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto">
                <Trash2 className="text-red-600 w-10 h-10" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black font-headline text-on-surface">Confirmar Exclusão</h3>
                <p className="text-sm text-on-surface-variant/60 font-body">
                  Você está prestes a excluir o registro desta gestação. Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDelete(deleteConfirmId)}
                  className="w-full bg-red-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-headline uppercase tracking-widest text-xs"
                >
                  Sim, Excluir Registro
                </button>
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="w-full bg-surface-container-high text-on-surface-variant font-black py-4 rounded-2xl hover:bg-surface-container-highest transition-all font-headline uppercase tracking-widest text-[10px]"
                >
                  Cancelar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
