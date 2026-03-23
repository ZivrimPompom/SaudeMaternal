'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserCheck, Plus, Edit2, Trash2, Search, AlertCircle, CheckCircle2, X, IdCard, FileUp, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CSVImporter from '@/components/CSVImporter';

interface Categoria {
  cbo: string;
  categoria: string;
}

interface Profissional {
  cpf: string;
  nome: string;
  cns: string;
  cbo: string;
  equipe: string;
  vinculo: 'DIRETO' | 'INTERMEDIADO';
  tipo_vinculo: 'CLT' | 'ESTATUTARIO' | 'AUTÔNOMO';
  chs: 20 | 30 | 40;
  unidade_cnes?: string;
  categorias_profissionais?: Categoria;
  unidades_saude?: { nome_fantasia: string };
}

interface HealthUnit {
  cnes: string;
  nome_fantasia: string;
}

export default function ProfissionaisPage() {
  const { searchQuery } = useSearch();
  const [professionals, setProfessionals] = useState<Profissional[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [units, setUnits] = useState<HealthUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmCpf, setDeleteConfirmCpf] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Profissional>>({
    cpf: '',
    nome: '',
    cns: '',
    cbo: '',
    equipe: 'SEM EQUIPE',
    vinculo: 'INTERMEDIADO',
    tipo_vinculo: 'CLT',
    chs: 20,
    unidade_cnes: ''
  });

  const [editingCpf, setEditingCpf] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    let prosResponse = await supabase
      .from('profissionais')
      .select('*, categorias_profissionais(cbo, categoria), unidades_saude(nome_fantasia)')
      .order('nome');
    
    if (prosResponse.error && prosResponse.error.message.includes('relationship')) {
      // Fallback if relationship doesn't exist yet
      prosResponse = await supabase
        .from('profissionais')
        .select('*, categorias_profissionais(cbo, categoria)')
        .order('nome');
    }

    const [catsResponse, unitsResponse] = await Promise.all([
      supabase
        .from('categorias_profissionais')
        .select('cbo, categoria')
        .order('categoria'),
      supabase
        .from('unidades_saude')
        .select('cnes, nome_fantasia')
        .order('nome_fantasia')
    ]);

    if (prosResponse.error) {
      console.error('Erro ao carregar profissionais:', prosResponse.error);
      setError(`Erro ao carregar profissionais: ${prosResponse.error.message}`);
    } else {
      setProfessionals(prosResponse.data as Profissional[]);
    }

    if (catsResponse.error) console.error('Error fetching categories:', catsResponse.error);
    else setCategories(catsResponse.data as Categoria[]);

    if (unitsResponse.error) console.error('Error fetching units:', unitsResponse.error);
    else setUnits(unitsResponse.data as HealthUnit[]);

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

  const formatCns = (value: string) => {
    const digits = value.replace(/\D/g, '');
    return digits
      .replace(/(\d{4})(\d)/, '$1.$2')
      .replace(/(\d{4})(\d)/, '$1.$2')
      .replace(/(\d{4})(\d{1,3})/, '$1.$2')
      .replace(/(\.\d{3})\d+?$/, '$1');
  };

  const filteredProfessionals = professionals.filter(pro => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const nome = normalize(pro.nome);
    const cpf = pro.cpf.replace(/\D/g, '');
    const cns = pro.cns.replace(/\D/g, '');
    const categoria = pro.categorias_profissionais ? normalize(pro.categorias_profissionais.categoria) : '';
    
    const queryNormalizada = normalize(query);
    const queryDigits = query.replace(/\D/g, '');

    const matchesNome = nome.includes(queryNormalizada);
    const matchesCpf = queryDigits !== '' && cpf.includes(queryDigits);
    const matchesCns = queryDigits !== '' && cns.includes(queryDigits);
    const matchesCategoria = categoria.includes(queryNormalizada);

    return matchesNome || matchesCpf || matchesCns || matchesCategoria;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isSupabaseConfigured) return;

    if (!formData.cpf || !formData.nome || !formData.cbo) {
      setError('CPF, Nome e CBO são obrigatórios.');
      return;
    }

    const cleanCpf = formData.cpf.replace(/\D/g, '');
    if (cleanCpf.length !== 11) {
      setError('CPF inválido.');
      return;
    }

    try {
      // Create a clean payload with only the fields that exist in the table
      const payload: any = {
        cpf: cleanCpf,
        nome: formData.nome?.toUpperCase(),
        cns: formData.cns?.replace(/\D/g, '') || '',
        cbo: formData.cbo,
        equipe: formData.equipe,
        vinculo: formData.vinculo,
        tipo_vinculo: formData.tipo_vinculo,
        chs: formData.chs,
        unidade_cnes: formData.unidade_cnes || null
      };

      if (editingCpf) {
        let { error: updateError } = await supabase
          .from('profissionais')
          .update(payload)
          .eq('cpf', editingCpf);

        if (updateError && updateError.message.includes('unidade_cnes')) {
          // Fallback if column doesn't exist yet
          const { unidade_cnes, ...fallbackPayload } = payload;
          const { error: retryError } = await supabase
            .from('profissionais')
            .update(fallbackPayload)
            .eq('cpf', editingCpf);
          updateError = retryError;
        }

        if (updateError) throw updateError;
        setSuccess('Profissional atualizado com sucesso!');
      } else {
        let { error: insertError } = await supabase
          .from('profissionais')
          .insert([payload]);

        if (insertError && insertError.message.includes('unidade_cnes')) {
          // Fallback if column doesn't exist yet
          const { unidade_cnes, ...fallbackPayload } = payload;
          const { error: retryError } = await supabase
            .from('profissionais')
            .insert([fallbackPayload]);
          insertError = retryError;
        }

        if (insertError) {
          if (insertError.code === '23505') {
            setError('Este CPF já está cadastrado.');
            return;
          }
          throw insertError;
        }
        setSuccess('Profissional cadastrado com sucesso!');
      }

      setFormData({
        cpf: '',
        nome: '',
        cns: '',
        cbo: '',
        equipe: 'SEM EQUIPE',
        vinculo: 'INTERMEDIADO',
        tipo_vinculo: 'CLT',
        chs: 20,
        unidade_cnes: ''
      });
      setEditingCpf(null);
      fetchData();
    } catch (err: any) {
      console.error('Error saving professional:', err);
      setError(err.message || 'Erro ao salvar profissional.');
    }
  };

  const handleEdit = (pro: Profissional) => {
    setEditingCpf(pro.cpf);
    setFormData({
      ...pro,
      cpf: formatCpf(pro.cpf),
      cns: formatCns(pro.cns)
    });
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (cpf: string) => {
    setDeleteConfirmCpf(null);
    const { error: deleteError } = await supabase
      .from('profissionais')
      .delete()
      .eq('cpf', cpf);

    if (deleteError) {
      console.error('Erro ao excluir profissional:', deleteError);
      setError(`Erro ao excluir profissional: ${deleteError.message}`);
    } else {
      setSuccess('Profissional excluído com sucesso!');
      fetchData();
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 lg:p-12 pb-32 max-w-7xl mx-auto space-y-8 md:space-y-12">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-1.5 bg-primary rounded-full"></span>
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Gestão de Pessoas</span>
          </div>
          <h2 className="text-5xl font-black tracking-tight font-headline text-on-surface">Cadastro de Profissionais</h2>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-lg text-on-surface-variant/60 font-body max-w-2xl">Administração completa do corpo clínico e técnico da unidade.</p>
            <CSVImporter 
              tableName="profissionais" 
              expectedColumns={['cpf', 'nome', 'cns', 'cbo', 'equipe', 'vinculo', 'tipo_vinculo', 'chs', 'unidade_cnes']}
              conflictColumn="cpf"
              onSuccess={fetchData}
              title="Importar Profissionais"
              transformData={(data) => data.map(item => ({
                ...item,
                nome: (item.nome || '').toUpperCase(),
                cpf: (item.cpf || '').replace(/\D/g, ''),
                cns: (item.cns || '').replace(/\D/g, ''),
                equipe: (item.equipe || '').toUpperCase(),
                vinculo: (item.vinculo || 'INTERMEDIADO').toUpperCase(),
                tipo_vinculo: (item.tipo_vinculo || 'CLT').toUpperCase(),
                chs: parseInt(item.chs) || 20,
                unidade_cnes: item.unidade_cnes || null
              }))}
            />
          </div>
        </header>

        <div className="grid grid-cols-12 gap-10">
          {/* Form Section */}
          <section className="col-span-12 space-y-8">
            <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] shadow-2xl shadow-black/5 border border-outline-variant/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16" />
              
              <h3 className="text-2xl font-black font-headline mb-8 flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Plus className="text-primary w-5 h-5" />
                </div>
                {editingCpf ? 'Editar Cadastro' : 'Novo Profissional'}
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

                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">CPF</label>
                  <input 
                    type="text"
                    disabled={!!editingCpf}
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none disabled:opacity-50"
                    placeholder="000.000.000-00"
                    value={formData.cpf || ''}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCpf(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Nome Completo</label>
                  <input 
                    type="text"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none uppercase"
                    placeholder="NOME DO PROFISSIONAL"
                    value={formData.nome || ''}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">CNS (Cartão Nacional de Saúde)</label>
                  <input 
                    type="text"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                    placeholder="0000.0000.0000.000"
                    value={formData.cns || ''}
                    onChange={(e) => setFormData({ ...formData, cns: formatCns(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Categoria (CBO)</label>
                  <select 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none"
                    value={formData.cbo || ''}
                    onChange={(e) => setFormData({ ...formData, cbo: e.target.value })}
                  >
                    <option value="">Selecione uma categoria...</option>
                    {categories.map(cat => (
                      <option key={cat.cbo} value={cat.cbo}>{cat.categoria} ({cat.cbo})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Unidade de Saúde</label>
                  <select 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none"
                    value={formData.unidade_cnes || ''}
                    onChange={(e) => setFormData({ ...formData, unidade_cnes: e.target.value })}
                  >
                    <option value="">Selecione uma unidade...</option>
                    {units.map(unit => (
                      <option key={unit.cnes} value={unit.cnes}>{unit.nome_fantasia}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Equipe</label>
                  <select 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none"
                    value={formData.equipe || ''}
                    onChange={(e) => setFormData({ ...formData, equipe: e.target.value })}
                  >
                    <option value="SEM EQUIPE">SEM EQUIPE</option>
                    <option value="FORA DE AREA">FORA DE AREA</option>
                    {Array.from({ length: 99 }, (_, i) => {
                      const num = (i + 1).toString().padStart(3, '0');
                      return (
                        <option key={num} value={`Equipe ${num}`}>Equipe {num}</option>
                      );
                    })}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Vínculo</label>
                    <select 
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none"
                      value={formData.vinculo || 'INTERMEDIADO'}
                      onChange={(e) => setFormData({ ...formData, vinculo: e.target.value as any })}
                    >
                      <option value="DIRETO">DIRETO</option>
                      <option value="INTERMEDIADO">INTERMEDIADO</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">CHS</label>
                    <select 
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none"
                      value={formData.chs || 20}
                      onChange={(e) => setFormData({ ...formData, chs: parseInt(e.target.value) as any })}
                    >
                      <option value={20}>20 HORAS</option>
                      <option value={30}>30 HORAS</option>
                      <option value={40}>40 HORAS</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Tipo de Vínculo</label>
                  <select 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none"
                    value={formData.tipo_vinculo || 'CLT'}
                    onChange={(e) => setFormData({ ...formData, tipo_vinculo: e.target.value as any })}
                  >
                    <option value="CLT">CLT</option>
                    <option value="ESTATUTARIO">ESTATUTÁRIO</option>
                    <option value="AUTÔNOMO">AUTÔNOMO</option>
                  </select>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    type="submit"
                    className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-headline uppercase tracking-widest text-[10px]"
                  >
                    {editingCpf ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingCpf ? 'Atualizar Profissional' : 'Cadastrar Profissional'}
                  </button>
                  {editingCpf && (
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button"
                        onClick={() => setDeleteConfirmCpf(editingCpf)}
                        className="bg-red-50 text-red-600 font-black py-4 rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 font-headline uppercase tracking-widest text-[8px]"
                      >
                        <Trash2 className="w-3 h-3" />
                        Excluir
                      </button>
                      <button 
                        type="button"
                        onClick={() => {
                          setEditingCpf(null);
                          setFormData({
                            cpf: '', nome: '', cns: '', cbo: '', equipe: 'SEM EQUIPE',
                            vinculo: 'INTERMEDIADO', tipo_vinculo: 'CLT', chs: 20
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
          </section>

          {/* List Section */}
          <section className="col-span-12">
            <div className="bg-surface-container-lowest rounded-[3rem] overflow-hidden shadow-2xl shadow-black/5 border border-outline-variant/10">
              <div className="p-6 md:p-10 border-b border-outline-variant/5 flex justify-between items-center bg-surface-container-lowest/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <UserCheck className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-headline text-on-surface">Profissionais Ativos</h3>
                    <p className="text-xs text-on-surface-variant/40 font-body uppercase tracking-widest font-bold">Listagem Geral</p>
                  </div>
                </div>
                <div className="bg-primary/10 text-primary px-6 py-2 rounded-full text-[10px] font-black font-headline uppercase tracking-[0.2em]">
                  {filteredProfessionals.length} Registros
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {loading ? (
                  <div className="p-24 text-center space-y-4">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/30">Sincronizando Dados...</p>
                  </div>
                ) : filteredProfessionals.length === 0 ? (
                  <div className="p-24 text-center space-y-6">
                    <div className="w-20 h-20 bg-surface-container-low rounded-[2rem] flex items-center justify-center mx-auto">
                      <Search className="text-on-surface-variant/20 w-10 h-10" />
                    </div>
                    <p className="text-sm font-body text-on-surface-variant/40">Nenhum profissional encontrado.</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px]">
                      <thead className="sticky top-0 z-30 bg-surface-container-low">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5 w-[250px]">Profissional / CPF</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5 w-[200px]">CNS / CBO</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5 w-[120px]">Equipe</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">Vínculo</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline text-center border-b border-outline-variant/5 sticky right-0 bg-surface-container-low z-40 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] w-[180px]">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {filteredProfessionals
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((pro) => (
                            <motion.tr 
                              layout
                              key={pro.cpf} 
                              className="hover:bg-surface-container-low/50 transition-all group"
                            >
                              <td className="px-6 py-4">
                                <div className="flex flex-col gap-0.5">
                                  <span className="text-[10px] font-black text-primary tracking-widest">{formatCpf(pro.cpf)}</span>
                                  <p className="font-black text-on-surface font-headline text-sm group-hover:text-primary transition-colors uppercase line-clamp-1">{pro.nome}</p>
                                  <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest line-clamp-1">
                                    {pro.unidades_saude?.nome_fantasia || 'Sem Unidade'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col gap-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <IdCard className="w-3 h-3 text-on-surface-variant/30" />
                                    <span className="text-[10px] font-bold text-on-surface-variant/60 whitespace-nowrap">{formatCns(pro.cns) || '---'}</span>
                                  </div>
                                  <span className="text-[10px] font-black text-secondary uppercase tracking-tighter line-clamp-1">
                                    {pro.categorias_profissionais?.categoria || '---'}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <span className="text-[9px] font-black text-primary uppercase tracking-widest bg-primary/5 px-2 py-0.5 rounded-full">
                                  {pro.equipe || 'SEM EQUIPE'}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col gap-1">
                                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest w-fit ${
                                    pro.vinculo === 'DIRETO' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                                  }`}>
                                    {pro.vinculo}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-tighter">
                                      {pro.tipo_vinculo}
                                    </span>
                                    <span className="w-1 h-1 rounded-full bg-on-surface-variant/20"></span>
                                    <span className="text-[9px] font-black text-on-surface-variant/60">
                                      {pro.chs}H
                                    </span>
                                  </div>
                                </div>
                              </td>
                              <td className="px-6 py-4 sticky right-0 bg-surface-container-lowest group-hover:bg-surface-container-low transition-colors z-30 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => handleEdit(pro)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all shadow-sm group/btn"
                                    title="Editar Profissional"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover/btn:inline">Editar</span>
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirmCpf(pro.cpf)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm group/btn"
                                    title="Excluir Profissional"
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

                    {/* Pagination Controls */}
                    <div className="p-6 bg-surface-container-low/20 border-t border-outline-variant/5 flex justify-between items-center">
                      <p className="text-[10px] text-on-surface-variant/50 font-body uppercase tracking-widest">
                        Mostrando {Math.min(filteredProfessionals.length, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(filteredProfessionals.length, currentPage * itemsPerPage)} de {filteredProfessionals.length} profissionais
                      </p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg bg-surface-container-high text-on-surface-variant disabled:opacity-30 hover:bg-surface-container-highest transition-all"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="flex items-center gap-1">
                          {Array.from({ length: Math.min(5, Math.ceil(filteredProfessionals.length / itemsPerPage)) }, (_, i) => {
                            const pageNum = i + 1;
                            return (
                              <button
                                key={pageNum}
                                onClick={() => setCurrentPage(pageNum)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
                                  currentPage === pageNum 
                                    ? 'bg-primary text-white shadow-lg shadow-primary/20' 
                                    : 'bg-surface-container-low text-on-surface hover:bg-surface-container-high'
                                }`}
                              >
                                {pageNum}
                              </button>
                            );
                          })}
                        </div>
                        <button 
                          onClick={() => setCurrentPage(prev => Math.min(Math.ceil(filteredProfessionals.length / itemsPerPage), prev + 1))}
                          disabled={currentPage === Math.ceil(filteredProfessionals.length / itemsPerPage)}
                          className="p-2 rounded-lg bg-surface-container-high text-on-surface-variant disabled:opacity-30 hover:bg-surface-container-highest transition-all"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmCpf && (
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
                  Você está prestes a excluir o profissional com CPF <span className="font-black text-primary">{formatCpf(deleteConfirmCpf)}</span>. Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDelete(deleteConfirmCpf)}
                  className="w-full bg-red-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-headline uppercase tracking-widest text-xs"
                >
                  Sim, Excluir Registro
                </button>
                <button 
                  onClick={() => setDeleteConfirmCpf(null)}
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
