'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '@/components/Pagination';
import RecordsSummary from '@/components/RecordsSummary';
import SearchInput from '@/components/SearchInput';

interface Paciente {
  cpf: string;
  gestante: string;
  nome_mae: string;
  prontuario: string;
  cns: string;
  data_nascimento: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  contato: string;
  email: string;
  cidade: string;
  uf: string;
  operador_responsavel?: string;
  cpf_operador?: string;
  operador_nome?: string;
  unidade_cnes?: string;
  created_at?: string;
}

export default function PacientesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen, refreshTrigger, setOnExportCSV } = useSearch();
  const { user: authUser } = useAuth();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [formData, setFormData] = useState<Partial<Paciente>>({
    cpf: '',
    gestante: '',
    nome_mae: '',
    prontuario: '',
    cns: '',
    data_nascimento: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    contato: '',
    email: '',
    cidade: 'SÃO PAULO',
    uf: 'SP'
  });

  const [editingId, setEditingId] = useState<string | null>(null); // Now stores the CPF

  useEffect(() => {
    setIsFormOpen(false);
    fetchData();
  }, [setIsFormOpen, refreshTrigger]);

  const fetchData = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    let allData: Paciente[] = [];
    let from = 0;
    let hasMore = true;
    let errorOccurred = false;

    while (hasMore) {
      const { data, error: fetchError } = await supabase
        .from('pacientes')
        .select('*')
        .order('gestante')
        .range(from, from + 999);

      if (fetchError) {
        console.error('Erro ao carregar pacientes:', fetchError);
        setError(`Erro ao carregar pacientes: ${fetchError.message}`);
        errorOccurred = true;
        hasMore = false;
      } else if (data && data.length > 0) {
        allData = [...allData, ...(data as Paciente[])];
        if (data.length < 1000) hasMore = false;
        else from += 1000;
      } else {
        hasMore = false;
      }
      if (from > 50000) break;
    }

    if (!errorOccurred) {
      setPacientes(allData);
    }

    setLoading(false);
  };

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1');
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 10) {
      return digits
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .replace(/(-\d{4})\d+?$/, '$1');
    }
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .replace(/(-\d{4})\d+?$/, '$1');
  };

  const formatCns = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 15);
    let formatted = digits;
    if (digits.length > 4) formatted = `${digits.slice(0, 4)}.${digits.slice(4)}`;
    if (digits.length > 8) formatted = `${formatted.slice(0, 9)}.${digits.slice(8)}`;
    if (digits.length > 12) formatted = `${formatted.slice(0, 14)}.${digits.slice(12)}`;
    return formatted.slice(0, 18); // 0000.0000.0000.000
  };

  const formatProntuario = (value: string) => {
    // Exemplo: 13-423
    const clean = value.replace(/[^a-zA-Z0-9]/g, '');
    if (clean.length > 2) {
      return `${clean.slice(0, 2)}-${clean.slice(2, 7)}`;
    }
    return clean;
  };

  const calculateAge = (birthDate: string) => {
    if (!birthDate) return { ageText: '---', lifeStage: '---' };
    
    const birth = new Date(birthDate);
    const today = new Date();
    
    let years = today.getFullYear() - birth.getFullYear();
    let months = today.getMonth() - birth.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < birth.getDate())) {
      years--;
      months += 12;
    }
    
    if (today.getDate() < birth.getDate()) {
      months--;
      if (months < 0) {
        years--;
        months += 12;
      }
    }

    const ageText = `${years} ANOS, ${months} MESES`;
    
    let lifeStage = 'ADULTO';
    if (years < 12) lifeStage = 'CRIANÇA';
    else if (years < 18) lifeStage = 'ADOLESCENTE';
    else if (years >= 60) lifeStage = 'IDOSO';
    
    return { ageText, lifeStage };
  };

  const filteredPacientes = useMemo(() => {
    return pacientes.filter(pac => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const normalize = (str: string) => 
        str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";

      const gestante = normalize(pac.gestante);
      const cpf = pac.cpf?.replace(/\D/g, '') || '';
      const prontuario = pac.prontuario?.toLowerCase() || '';
      
      const queryNormalizada = normalize(query);
      const queryDigits = query.replace(/\D/g, '');

      return gestante.includes(queryNormalizada) || 
             (queryDigits !== '' && cpf.includes(queryDigits)) ||
             prontuario.includes(queryNormalizada);
    });
  }, [pacientes, searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isSupabaseConfigured) return;

    if (!formData.gestante || !formData.cpf) {
      setError('Nome da Gestante e CPF são obrigatórios.');
      return;
    }

    try {
      const payload = {
        ...formData,
        gestante: formData.gestante.toUpperCase(),
        nome_mae: formData.nome_mae?.toUpperCase() || 'NÃO INFORMADO',
        cpf: formData.cpf.replace(/\D/g, ''),
        contato: formData.contato?.replace(/\D/g, '') || '',
        cns: formData.cns?.replace(/\D/g, '') || '',
        logradouro: formData.logradouro?.toUpperCase() || '',
        complemento: formData.complemento?.toUpperCase() || '',
        bairro: formData.bairro?.toUpperCase() || '',
        cidade: 'SÃO PAULO',
        uf: 'SP',
        operador_responsavel: authUser?.nome || 'SISTEMA',
        cpf_operador: authUser?.cpf || null,
        unidade_cnes: authUser?.unidade_cnes || null
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('pacientes')
          .update(payload)
          .eq('cpf', editingId);

        if (updateError) {
          if (updateError.code === '23505' || updateError.message.includes('duplicate key')) {
            setError('Este CPF já está cadastrado para outra paciente.');
            return;
          }
          throw updateError;
        }
        setSuccess('Paciente atualizado com sucesso!');
      } else {
        const { error: insertError } = await supabase
          .from('pacientes')
          .insert([payload]);

        if (insertError) {
          if (insertError.code === '23505') {
            setError('Este CPF já está cadastrado.');
            return;
          }
          throw insertError;
        }
        setSuccess('Paciente cadastrado com sucesso!');
      }

      setFormData({
        cpf: '',
        gestante: '',
        nome_mae: '',
        prontuario: '',
        cns: '',
        data_nascimento: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        contato: '',
        email: '',
        cidade: 'SÃO PAULO',
        uf: 'SP'
      });
      setEditingId(null);
      setIsFormOpen(false);
      fetchData();
    } catch (err: any) {
      console.error('Error saving patient:', err);
      if (err.message?.includes('row-level security policy')) {
        setError('Erro de permissão no banco de dados. Por favor, verifique se as políticas de RLS estão configuradas corretamente no Supabase.');
      } else {
        setError(err.message || 'Erro ao salvar paciente.');
      }
    }
  };

  const handleEdit = (pac: Paciente) => {
    setEditingId(pac.cpf);
    setFormData({
      ...pac,
      cpf: formatCpf(pac.cpf || ''),
      contato: formatPhone(pac.contato || ''),
      cns: formatCns(pac.cns || ''),
      prontuario: formatProntuario(pac.prontuario || '')
    });
    setError(null);
    setSuccess(null);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (cpf: string) => {
    setDeleteConfirmId(null);
    const { error: deleteError } = await supabase
      .from('pacientes')
      .delete()
      .eq('cpf', cpf);

    if (deleteError) {
      console.error('Erro ao excluir:', deleteError);
      setError(`Erro ao excluir paciente: ${deleteError.message}`);
    } else {
      setSuccess('Paciente excluído com sucesso!');
      fetchData();
    }
  };

  const handleExportCSV = useCallback(() => {
    const headers = ['GESTANTE', 'CPF', 'CNS', 'PRONTUÁRIO', 'DATA NASCIMENTO', 'NOME MÃE', 'CONTATO', 'EMAIL', 'LOGRADOURO', 'NÚMERO', 'COMPLEMENTO', 'BAIRRO', 'CIDADE', 'UF'];
    const rows = filteredPacientes.map(p => [
      p.gestante,
      p.cpf,
      p.cns,
      p.prontuario,
      p.data_nascimento,
      p.nome_mae,
      p.contato,
      p.email,
      p.logradouro,
      p.numero,
      p.complemento,
      p.bairro,
      p.cidade,
      p.uf
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "pacientes.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredPacientes]);

  useEffect(() => {
    setOnExportCSV(() => handleExportCSV);
    return () => setOnExportCSV(null);
  }, [handleExportCSV, setOnExportCSV]);

  if (!mounted) return null;

  return (
    <DashboardLayout title="Pacientes">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Topbar Pattern - Figura 1 */}
        <div className="bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-primary uppercase tracking-tight">Pacientes</h1>
          </div>

          <SearchInput className="w-full md:flex-1 md:mx-8" />

          <RecordsSummary 
            total={pacientes.length} 
            filtered={filteredPacientes.length} 
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
                      <span className="material-symbols-outlined text-primary text-xl">{editingId ? 'edit' : 'person_add'}</span>
                    </div>
                    {editingId ? 'Editar Cadastro' : 'Nova Paciente'}
                  </h3>

                  <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-4 rounded-2xl bg-red-50 border border-red-100 text-red-600 text-table-cell flex items-center gap-3"
                        >
                          <span className="material-symbols-outlined text-lg shrink-0">error</span>
                          {error}
                        </motion.div>
                      )}
                      {success && (
                        <motion.div 
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="p-4 rounded-2xl bg-green-50 border border-green-100 text-green-600 text-table-cell flex items-center gap-3"
                        >
                          <span className="material-symbols-outlined text-lg shrink-0">check_circle</span>
                          {success}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-2 space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Nome da Gestante</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none uppercase"
                          placeholder="NOME DA GESTANTE"
                          value={formData.gestante || ''}
                          onChange={(e) => setFormData({ ...formData, gestante: e.target.value.toUpperCase() })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">CPF</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none"
                          placeholder="000.000.000-00"
                          value={formData.cpf || ''}
                          onChange={(e) => setFormData({ ...formData, cpf: formatCpf(e.target.value) })}
                          required
                          disabled={!!editingId}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">CNS</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none"
                          placeholder="0000.0000.0000.000"
                          value={formData.cns || ''}
                          onChange={(e) => setFormData({ ...formData, cns: formatCns(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Prontuário</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none"
                          placeholder="00-000"
                          value={formData.prontuario || ''}
                          onChange={(e) => setFormData({ ...formData, prontuario: formatProntuario(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Data de Nascimento</label>
                        <input 
                          type="date"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none"
                          value={formData.data_nascimento || ''}
                          onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Idade</label>
                        <div className="w-full bg-surface-container-low/50 border-2 border-dashed border-outline-variant/20 rounded-2xl px-6 py-4 min-h-[52px] flex items-center">
                          <span className="text-xs font-black text-primary">
                            {formData.data_nascimento ? calculateAge(formData.data_nascimento).ageText : '---'}
                          </span>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Fase da Vida</label>
                        <div className="w-full bg-surface-container-low/50 border-2 border-dashed border-outline-variant/20 rounded-2xl px-6 py-4 min-h-[52px] flex items-center">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${
                            !formData.data_nascimento ? 'text-on-surface-variant/30' :
                            calculateAge(formData.data_nascimento).lifeStage === 'CRIANÇA' ? 'bg-blue-100 text-blue-700' :
                            calculateAge(formData.data_nascimento).lifeStage === 'ADOLESCENTE' ? 'bg-purple-100 text-purple-700' :
                            calculateAge(formData.data_nascimento).lifeStage === 'IDOSO' ? 'bg-orange-100 text-orange-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {formData.data_nascimento ? calculateAge(formData.data_nascimento).lifeStage : '---'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-2 space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Nome da Mãe</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none uppercase"
                          placeholder="NOME DA MÃE"
                          value={formData.nome_mae || ''}
                          onChange={(e) => setFormData({ ...formData, nome_mae: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Contato</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none"
                          placeholder="(00) 00000-0000"
                          value={formData.contato || ''}
                          onChange={(e) => setFormData({ ...formData, contato: formatPhone(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">E-mail</label>
                        <input 
                          type="email"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none"
                          placeholder="email@exemplo.com"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="col-span-2 space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Logradouro</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none uppercase"
                          placeholder="RUA / AVENIDA / PRAÇA"
                          value={formData.logradouro || ''}
                          onChange={(e) => setFormData({ ...formData, logradouro: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Nº</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none uppercase"
                          placeholder="99A"
                          value={formData.numero || ''}
                          onChange={(e) => setFormData({ ...formData, numero: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Complemento</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none uppercase"
                          placeholder="PRÓXIMO / TRAVESSA / VIELA"
                          value={formData.complemento || ''}
                          onChange={(e) => setFormData({ ...formData, complemento: e.target.value.toUpperCase() })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Cidade</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none uppercase opacity-60 cursor-not-allowed"
                          value="SÃO PAULO"
                          readOnly
                        />
                      </div>
                      <div className="col-span-2 space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Bairro</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none uppercase"
                          placeholder="BAIRRO"
                          value={formData.bairro || ''}
                          onChange={(e) => setFormData({ ...formData, bairro: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">UF</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none uppercase opacity-60 cursor-not-allowed"
                          value="SP"
                          readOnly
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                      <button 
                        type="submit"
                        className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-headline uppercase tracking-widest text-[10px]"
                      >
                        <span className="material-symbols-outlined text-lg">{editingId ? 'save' : 'person_add'}</span>
                        {editingId ? 'Atualizar Paciente' : 'Cadastrar Paciente'}
                      </button>
                      {editingId && (
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            type="button"
                            onClick={() => setDeleteConfirmId(editingId)}
                            className="bg-red-50 text-red-600 font-black py-4 rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 font-headline uppercase tracking-widest text-[8px]"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                            Excluir
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              setEditingId(null);
                              setIsFormOpen(false);
                              setFormData({
                                cpf: '', gestante: '', nome_mae: '', prontuario: '', cns: '', data_nascimento: '', logradouro: '', numero: '', complemento: '', bairro: '', contato: '', email: '', cidade: 'SÃO PAULO', uf: 'SP'
                              });
                            }}
                            className="bg-surface-container-high text-on-surface-variant font-black py-4 rounded-2xl hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2 font-headline uppercase tracking-widest text-[8px]"
                          >
                            <span className="material-symbols-outlined text-[14px]">close</span>
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
              <div className="p-6 md:p-10 border-b border-outline-variant/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-2xl">group</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-headline text-on-surface uppercase tracking-tight">Pacientes</h3>
                    <p className="text-xs text-on-surface-variant/40 font-body uppercase tracking-widest font-bold">Listagem Geral</p>
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {loading ? (
                  <div className="p-24 text-center space-y-4">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/30">Sincronizando Dados...</p>
                  </div>
                ) : filteredPacientes.length === 0 ? (
                  <div className="p-24 text-center space-y-6">
                    <div className="w-20 h-20 bg-surface-container-low rounded-[2rem] flex items-center justify-center mx-auto">
                      <span className="material-symbols-outlined text-on-surface-variant/20 text-5xl">search</span>
                    </div>
                    <p className="text-sm font-body text-on-surface-variant/40">Nenhuma paciente encontrada.</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-separate border-spacing-0 min-w-[1100px]">
                      <thead className="sticky top-0 z-30 bg-surface-container-low">
                        <tr>
                          <th className="px-6 py-4 text-table-header border-b border-slate-300 dark:border-slate-700">Gestante</th>
                          <th className="px-4 py-4 text-table-header border-b border-slate-300 dark:border-slate-700 w-[160px]">Fase</th>
                          <th className="px-4 py-4 text-table-header border-b border-slate-300 dark:border-slate-700">Endereço</th>
                          <th className="px-6 py-4 text-table-header text-center border-b border-slate-300 dark:border-slate-700 w-[120px]">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {filteredPacientes
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((pac) => {
                            const { ageText, lifeStage } = calculateAge(pac.data_nascimento);
                            return (
                              <motion.tr 
                                layout
                                key={pac.cpf} 
                                className="hover:bg-orange-50 dark:hover:bg-slate-800/50 transition-all group"
                              >
                                <td className="px-6 py-5">
                                  <div className="flex items-start gap-4">
                                    <div className="min-w-0 flex-1">
                                      <span className="text-xs font-mono font-bold text-orange-600">{formatCpf(pac.cpf || '')}</span>
                                      <p className="font-black text-on-surface font-headline text-base group-hover:text-orange-600 transition-colors uppercase truncate">{pac.gestante}</p>
                                      <span className="text-table-cell text-black dark:text-slate-300 uppercase">CNS: {formatCns(pac.cns || '') || '---'}</span>
                                    </div>
                                    <div className="min-w-0 flex-1 border-l border-gray-200 dark:border-gray-700 pl-4">
                                      <span className="text-table-cell text-black dark:text-slate-200 uppercase block">{pac.prontuario || '---'}</span>
                                      <span className="text-table-cell text-black dark:text-slate-200 uppercase block mt-1">Mãe: {pac.nome_mae || 'NÃO INFORMADO'}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-5">
                                  <span className={`text-table-cell px-3 py-1.5 rounded-lg uppercase tracking-wide border block w-fit ${
                                    lifeStage === 'CRIANÇA' ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800' :
                                    lifeStage === 'ADOLESCENTE' ? 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800' :
                                    lifeStage === 'IDOSO' ? 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/50 dark:text-orange-300 dark:border-orange-800' :
                                    'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800'
                                  }`}>
                                    {lifeStage}
                                  </span>
                                  <span className="text-table-cell text-black dark:text-slate-300 mt-2 block">{ageText}</span>
                                </td>
                                <td className="px-4 py-5">
                                  <div className="flex items-start gap-2">
<span className="material-symbols-outlined text-black dark:text-slate-400 text-base mt-0.5 shrink-0">location_on</span>
                                    <div className="text-table-cell text-black dark:text-slate-300 leading-tight uppercase">
                                    <div>{pac.logradouro}, {pac.numero}</div>
                                    <div>{pac.complemento}</div>
                                    <div>{pac.bairro}</div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="material-symbols-outlined text-black dark:text-slate-400 text-base">call</span>
                                  <span className="text-table-cell text-black dark:text-slate-300">{formatPhone(pac.contato || '') || '---'}</span>
                                  </div>
                                </td>
                                <td className="px-6 py-5 text-center">
                                  <div className="flex items-center justify-center gap-3">
                                    <button 
                                      onClick={() => handleEdit(pac)}
                                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-orange-100 text-orange-700 hover:bg-orange-600 hover:text-white transition-all shadow-sm group/btn border border-orange-200 hover:border-orange-600"
                                      title="Editar Paciente"
                                    >
                                      <span className="material-symbols-outlined text-base">edit</span>
                                      <span className="text-table-cell uppercase tracking-wider hidden group-hover/btn:inline">Editar</span>
                                    </button>
                                    <button 
                                      onClick={() => setDeleteConfirmId(pac.cpf)}
                                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-100 text-red-700 hover:bg-red-600 hover:text-white transition-all shadow-sm group/btn border border-red-200 hover:border-red-600"
                                      title="Excluir Paciente"
                                    >
                                      <span className="material-symbols-outlined text-base">delete</span>
                                      <span className="text-table-cell uppercase tracking-wider hidden group-hover/btn:inline">Excluir</span>
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })}
                      </tbody>
                    </table>

                    {/* Pagination Controls */}
                    <Pagination 
                      currentPage={currentPage}
                      totalPages={Math.ceil(filteredPacientes.length / itemsPerPage)}
                      onPageChange={setCurrentPage}
                      totalItems={filteredPacientes.length}
                      itemsPerPage={itemsPerPage}
                      itemName="pacientes"
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
                <span className="material-symbols-outlined text-red-600 text-5xl">delete_forever</span>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black font-headline text-on-surface">Confirmar Exclusão</h3>
                <p className="text-sm text-on-surface-variant/60 font-body">
                  Você está prestes a excluir o registro desta paciente. Esta ação não pode ser desfeita.
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
