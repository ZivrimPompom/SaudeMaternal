'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Plus, 
  Save, 
  RefreshCw, 
  Search, 
  Edit2, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight, 
  SearchX,
  Building2,
  MapPin,
  Phone,
  Hash,
  FileUp, 
  CheckCircle2,
  Trash2,
  X
} from 'lucide-react';
import Pagination from '@/components/Pagination';

interface HealthUnit {
  cnes: string;
  nome_fantasia: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  telefone: string;
  cpf_operador?: string;
  operador_nome?: string;
}

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2');
};

export default function UnidadesSaudePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen, refreshTrigger } = useSearch();
  const { user: authUser } = useAuth();
  const [units, setUnits] = useState<HealthUnit[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [formData, setFormData] = useState<HealthUnit>({
    cnes: '',
    nome_fantasia: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    municipio: 'SAO PAULO',
    uf: 'SP',
    cep: '',
    telefone: ''
  });

  useEffect(() => {
    setIsFormOpen(false);
    if (isSupabaseConfigured) {
      fetchUnits();
    }
  }, [setIsFormOpen, refreshTrigger]);

  const fetchUnits = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('unidades_saude')
        .select('*')
        .order('nome_fantasia', { ascending: true });

      if (error) {
        if (error.message.includes('relation "public.unidades_saude" does not exist')) {
          setError('A tabela "unidades_saude" ainda não foi criada no Supabase. Por favor, execute o script SQL fornecido.');
          return;
        }
        console.error('Erro ao buscar unidades:', error);
        setError(`Erro ao carregar dados: ${error.message}`);
      } else if (data) {
        setUnits(data as HealthUnit[]);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCEP = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 5) {
      formatted = `${digits.slice(0, 5)}-${digits.slice(5, 8)}`;
    }
    return formatted.slice(0, 9);
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 0) formatted = `(${digits.slice(0, 2)}`;
    if (digits.length > 2) formatted = `${formatted})${digits.slice(2, 6)}`;
    if (digits.length > 6) formatted = `${formatted}-${digits.slice(6, 10)}`;
    if (digits.length > 10) formatted = `(${digits.slice(0, 2)})${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
    return formatted.slice(0, 14);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    let newValue = value;

    if (name === 'nome_fantasia' || name === 'bairro' || name === 'municipio' || name === 'uf' || name === 'logradouro' || name === 'complemento') {
      newValue = value.toUpperCase();
    }

    if (name === 'cep') {
      newValue = formatCEP(value);
    }

    if (name === 'telefone') {
      newValue = formatPhone(value);
    }

    setFormData(prev => ({ ...prev, [name]: newValue }));
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured) {
      setError('Configuração do Supabase ausente.');
      return;
    }

    if (!formData.cnes.trim() || !formData.nome_fantasia.trim()) {
      setError('CNES e Nome Fantasia são obrigatórios.');
      return;
    }

    try {
      const payload = {
        ...formData,
        cpf_operador: authUser?.cpf || null
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('unidades_saude')
          .update(payload)
          .eq('cnes', editingId);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from('unidades_saude')
          .insert([payload]);

        if (insertError) throw insertError;
      }

      setFormData({
        cnes: '',
        nome_fantasia: '',
        logradouro: '',
        numero: '',
        complemento: '',
        bairro: '',
        municipio: 'SAO PAULO',
        uf: 'SP',
        cep: '',
        telefone: ''
      });
      setEditingId(null);
      setIsFormOpen(false);
      fetchUnits();
    } catch (err: any) {
      console.error('Erro ao salvar unidade:', err);
      setError(`Erro ao salvar: ${err.message}`);
    }
  };

  const handleEdit = (unit: HealthUnit) => {
    setEditingId(unit.cnes);
    setFormData(unit);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({
      cnes: '',
      nome_fantasia: '',
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      municipio: 'SAO PAULO',
      uf: 'SP',
      cep: '',
      telefone: ''
    });
    setError(null);
    setIsFormOpen(false);
  };

  const handleDelete = async (cnes: string) => {
    setDeleteConfirmId(null);
    setError(null);
    setSuccess(null);

    const { error: deleteError } = await supabase
      .from('unidades_saude')
      .delete()
      .eq('cnes', cnes);

    if (deleteError) {
      console.error('Erro ao excluir unidade:', deleteError);
      setError(`Erro ao excluir unidade: ${deleteError.message}`);
    } else {
      setSuccess('Unidade excluída com sucesso!');
      fetchUnits();
    }
  };

  const filteredUnits = units.filter(unit => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const name = normalize(unit.nome_fantasia);
    const cnes = unit.cnes.toLowerCase();
    const bairro = normalize(unit.bairro);
    
    const queryNormalizada = normalize(query);

    return (
      name.includes(queryNormalizada) ||
      cnes.includes(queryNormalizada) ||
      bairro.includes(queryNormalizada)
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  if (!mounted) return null;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 lg:p-12 pb-32 max-w-7xl mx-auto space-y-8 md:space-y-12">
        {/* Page Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-12 h-1.5 bg-primary rounded-full"></span>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Rede de Atendimento</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight font-headline text-on-surface uppercase text-primary">Unidades de Saúde</h2>
            <p className="text-lg text-on-surface-variant/60 font-body max-w-2xl">Gerencie os estabelecimentos de saúde da rede.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant/20 shadow-sm">
              <Building2 className="text-primary w-5 h-5" />
              <span className="text-sm font-bold font-label uppercase tracking-widest text-on-surface-variant">{filteredUnits.length} Unidades</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-6 md:gap-8">
          {/* Form Section */}
          <AnimatePresence>
            {isFormOpen && (
              <motion.section 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 32 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="col-span-12 overflow-hidden"
              >
                <div className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-md border border-outline-variant/10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-container"></div>
                  <h3 className="text-xl font-bold font-headline mb-8 flex items-center gap-3">
                    {editingId ? <Edit2 className="text-primary w-6 h-6" /> : <Plus className="text-primary w-6 h-6" />}
                    {editingId ? 'Editar Unidade' : 'Nova Unidade'}
                  </h3>
                  <form className="space-y-5" onSubmit={handleSubmit}>
                    {error && (
                      <div className="p-4 rounded-xl bg-error-container/30 border border-error/20 text-error text-xs font-semibold flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span className="flex-1">{error}</span>
                      </div>
                    )}
                    {success && (
                      <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-semibold flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <CheckCircle2 className="w-5 h-5 shrink-0" />
                        <span className="flex-1">{success}</span>
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">CNES</label>
                        <div className="relative group">
                          <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-4 h-4" />
                          <input 
                            name="cnes"
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl pl-10 pr-4 py-3 transition-all font-body outline-none text-xs" 
                            placeholder="Ex: 2787741" 
                            type="text" 
                            value={formData.cnes || ''}
                            onChange={handleInputChange}
                            disabled={!!editingId}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">Telefone</label>
                        <div className="relative group">
                          <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-4 h-4" />
                          <input 
                            name="telefone"
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl pl-10 pr-4 py-3 transition-all font-body outline-none text-xs" 
                            placeholder="(00)0000-0000" 
                            type="text" 
                            value={formData.telefone || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">Nome Fantasia</label>
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-4 h-4" />
                        <input 
                          name="nome_fantasia"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl pl-10 pr-4 py-3 transition-all font-body outline-none text-xs" 
                          placeholder="UBS JARDIM ROSELI" 
                          type="text" 
                          value={formData.nome_fantasia || ''}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">Logradouro</label>
                        <div className="relative group">
                          <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-4 h-4" />
                          <input 
                            name="logradouro"
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl pl-10 pr-4 py-3 transition-all font-body outline-none text-xs" 
                            placeholder="RUA SIMAO NUNES" 
                            type="text" 
                            value={formData.logradouro || ''}
                            onChange={handleInputChange}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">Número</label>
                        <input 
                          name="numero"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl px-4 py-3 transition-all font-body outline-none text-xs" 
                          placeholder="31A" 
                          type="text" 
                          value={formData.numero || ''}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">Complemento</label>
                        <input 
                          name="complemento"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl px-4 py-3 transition-all font-body outline-none text-xs" 
                          placeholder="Térreo" 
                          type="text" 
                          value={formData.complemento || ''}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">Bairro</label>
                        <input 
                          name="bairro"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl px-4 py-3 transition-all font-body outline-none text-xs" 
                          placeholder="JARDIM ROSELI" 
                          type="text" 
                          value={formData.bairro || ''}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">Município</label>
                        <input 
                          name="municipio"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl px-4 py-3 transition-all font-body outline-none text-xs" 
                          placeholder="SAO PAULO" 
                          type="text" 
                          value={formData.municipio || ''}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">UF</label>
                        <input 
                          name="uf"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl px-4 py-3 transition-all font-body outline-none text-xs" 
                          placeholder="SP" 
                          type="text" 
                          value={formData.uf || ''}
                          onChange={handleInputChange}
                          maxLength={2}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">CEP</label>
                      <input 
                        name="cep"
                        className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl px-4 py-3 transition-all font-body outline-none text-xs" 
                        placeholder="08380-039" 
                        type="text" 
                        value={formData.cep || ''}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="pt-6 space-y-3">
                      <button className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 font-headline uppercase tracking-widest text-xs" type="submit">
                        {editingId ? <CheckCircle2 className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                        {editingId ? 'Atualizar Unidade' : 'Cadastrar Unidade'}
                      </button>
                      {editingId && (
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            type="button"
                            onClick={() => setDeleteConfirmId(editingId)}
                            className="bg-red-50 text-red-600 font-black py-4 rounded-xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 font-headline uppercase tracking-widest text-[8px]"
                          >
                            <Trash2 className="w-3 h-3" />
                            Excluir
                          </button>
                          <button 
                            type="button"
                            onClick={cancelEdit}
                            className="bg-surface-container-high text-on-surface-variant font-black py-4 rounded-xl hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2 font-headline uppercase tracking-widest text-[8px]"
                          >
                            <X className="w-3 h-3" />
                            Cancelar
                          </button>
                        </div>
                      )}
                      {!editingId && (formData.cnes || formData.nome_fantasia) && (
                        <button 
                          type="button"
                          onClick={cancelEdit}
                          className="w-full bg-surface-container text-on-surface-variant font-bold py-3.5 rounded-xl hover:bg-surface-container-high transition-colors font-headline uppercase tracking-widest text-[8px] flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Limpar Formulário
                        </button>
                      )}
                    </div>
                  </form>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Table Section */}
          <section className="col-span-12">
            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-md border border-outline-variant/10 flex flex-col h-full">
              <div className="p-6 md:p-8 border-b border-surface-container-low flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest/50 backdrop-blur-sm sticky top-0 z-10">
                <div>
                  <h3 className="text-2xl font-bold font-headline text-on-surface">Unidades Cadastradas</h3>
                  <p className="text-xs text-on-surface-variant font-body opacity-60 mt-1">Listagem de estabelecimentos de saúde</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Filtrar..."
                      className="bg-surface-container-low border-none rounded-full pl-9 pr-4 py-2 text-xs font-body focus:ring-2 focus:ring-primary/20 outline-none w-40 md:w-64 transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {loading ? (
                  <div className="p-8 space-y-6">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-6 animate-pulse">
                        <div className="w-11 h-11 bg-surface-container-high rounded-2xl"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-surface-container-high rounded w-1/3"></div>
                          <div className="h-2 bg-surface-container-high rounded w-1/4"></div>
                        </div>
                        <div className="w-32 h-4 bg-surface-container-high rounded"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredUnits.length === 0 ? (
                  <div className="p-20 text-center text-slate-400 font-body flex flex-col items-center gap-4">
                    <SearchX className="text-6xl opacity-20 w-16 h-16" />
                    <p className="text-sm font-medium">Nenhuma unidade encontrada.</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px]">
                      <thead className="sticky top-0 z-30 bg-surface-container-low">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-label border-b border-outline-variant/5 w-[300px]">Unidade</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-label border-b border-outline-variant/5 w-[150px]">CNES</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-label border-b border-outline-variant/5">Localização</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-label border-b border-outline-variant/5 w-[150px]">Operador</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-label text-center border-b border-outline-variant/5 sticky right-0 bg-surface-container-low z-40 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] w-[180px]">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-low/50">
                        {filteredUnits
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((unit) => (
                            <tr key={unit.cnes} className="hover:bg-surface-container-low/40 transition-all group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-surface-container-high to-surface-container-highest flex items-center justify-center text-sm font-bold text-primary shadow-sm group-hover:scale-105 transition-transform">
                                    <Building2 className="w-4 h-4" />
                                  </div>
                                  <div>
                                    <p className="font-bold text-on-surface text-sm font-headline leading-tight uppercase line-clamp-1">{unit.nome_fantasia}</p>
                                    <p className="text-[9px] text-on-surface-variant/60 font-body uppercase tracking-widest mt-0.5 line-clamp-1">{unit.telefone || 'Sem telefone'}</p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-xs font-mono text-on-surface-variant font-medium">{unit.cnes}</span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col">
                                  <span className="text-[11px] text-on-surface font-medium line-clamp-1">{unit.bairro}</span>
                                  <span className="text-[9px] text-on-surface-variant/60 font-body line-clamp-1">{unit.municipio} - {unit.uf}</span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-black text-on-surface uppercase tracking-wider">OPERADOR</span>
                                  <span className="text-[9px] font-bold text-on-surface-variant/40">{formatCpf(unit.cpf_operador || '') || '---'}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 sticky right-0 bg-surface-container-lowest group-hover:bg-surface-container-low transition-colors z-30 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => handleEdit(unit)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all shadow-sm group/btn"
                                    title="Editar Unidade"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover/btn:inline">Editar</span>
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirmId(unit.cnes)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm group/btn"
                                    title="Excluir Unidade"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover/btn:inline">Excluir</span>
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>

                    {/* Pagination Controls */}
                    <Pagination 
                      currentPage={currentPage}
                      totalPages={Math.ceil(filteredUnits.length / itemsPerPage)}
                      onPageChange={setCurrentPage}
                      totalItems={filteredUnits.length}
                      itemsPerPage={itemsPerPage}
                      itemName="unidades"
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
                  Você está prestes a excluir a unidade com CNES <span className="font-black text-primary">{deleteConfirmId}</span>. Esta ação não pode ser desfeita.
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
