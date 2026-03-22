'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Briefcase, Plus, Edit2, Trash2, Search, AlertCircle, CheckCircle2, X, FileUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CSVImporter from '@/components/CSVImporter';

interface CategoriaProfissional {
  cbo: string;
  categoria: string;
  // vinculo: 'DIRETO' | 'INTERMEDIADO';
  // tipo_vinculo: 'CLT' | 'ESTATUTARIO' | 'AUTÔNOMO';
  // chs: 20 | 30 | 40;
}

export default function CategoriasPage() {
  const { searchQuery } = useSearch();
  const [categories, setCategories] = useState<CategoriaProfissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<CategoriaProfissional>({
    cbo: '',
    categoria: '',
    // vinculo: 'INTERMEDIADO',
    // tipo_vinculo: 'CLT',
    // chs: 20
  });

  const [editingCbo, setEditingCbo] = useState<string | null>(null);
  const [deleteConfirmCbo, setDeleteConfirmCbo] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('categorias_profissionais')
      .select('*')
      .order('categoria');
    
    if (error) {
      console.error('Error fetching categories:', error);
      setError('Erro ao carregar categorias.');
    } else if (data) {
      setCategories(data as CategoriaProfissional[]);
    }
    setLoading(false);
  };

  const filteredCategories = categories.filter(cat => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const categoria = normalize(cat.categoria);
    const cbo = cat.cbo.toLowerCase();
    
    const queryNormalizada = normalize(query);

    return categoria.includes(queryNormalizada) || cbo.includes(queryNormalizada);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isSupabaseConfigured) {
      setError('Supabase não configurado.');
      return;
    }

    if (!formData.cbo.trim() || !formData.categoria.trim()) {
      setError('CBO e Categoria são obrigatórios.');
      return;
    }

    try {
      if (editingCbo) {
        const { error: updateError } = await supabase
          .from('categorias_profissionais')
          .update({
            categoria: formData.categoria,
            // vinculo: formData.vinculo,
            // tipo_vinculo: formData.tipo_vinculo,
            // chs: formData.chs
          })
          .eq('cbo', editingCbo);

        if (updateError) throw updateError;
        setSuccess('Categoria atualizada com sucesso!');
      } else {
        const { error: insertError } = await supabase
          .from('categorias_profissionais')
          .insert([formData]);

        if (insertError) {
          if (insertError.code === '23505') {
            setError('Este CBO já está cadastrado.');
            return;
          }
          throw insertError;
        }
        setSuccess('Categoria cadastrada com sucesso!');
      }

      setFormData({
        cbo: '',
        categoria: '',
        // vinculo: 'INTERMEDIADO',
        // tipo_vinculo: 'CLT',
        // chs: 20
      });
      setEditingCbo(null);
      fetchCategories();
    } catch (err: any) {
      console.error('Error saving category:', err);
      setError(err.message || 'Erro ao salvar categoria.');
    }
  };

  const handleEdit = (cat: CategoriaProfissional) => {
    setEditingCbo(cat.cbo);
    setFormData(cat);
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (cbo: string) => {
    setDeleteConfirmCbo(null);
    setError(null);
    setSuccess(null);

    const { error: deleteError } = await supabase
      .from('categorias_profissionais')
      .delete()
      .eq('cbo', cbo);

    if (deleteError) {
      console.error('Error deleting category:', deleteError);
      setError('Erro ao excluir categoria: ' + deleteError.message);
    } else {
      setSuccess('Categoria excluída com sucesso!');
      fetchCategories();
    }
  };

  const cancelEdit = () => {
    setEditingCbo(null);
    setFormData({
      cbo: '',
      categoria: '',
      // vinculo: 'INTERMEDIADO',
      // tipo_vinculo: 'CLT',
      // chs: 20
    });
    setError(null);
    setSuccess(null);
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 lg:p-12 pb-32 max-w-7xl mx-auto space-y-8 md:space-y-12">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-1.5 bg-secondary rounded-full"></span>
            <span className="text-[10px] font-black text-secondary uppercase tracking-[0.4em]">Recursos Humanos</span>
          </div>
          <h2 className="text-5xl font-black tracking-tight font-headline text-on-surface">Categorias Profissionais</h2>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-lg text-on-surface-variant/60 font-body max-w-2xl">Gerenciamento de ocupações, vínculos e cargas horárias (CBO).</p>
            <CSVImporter 
              tableName="categorias_profissionais" 
              expectedColumns={['cbo', 'categoria']}
              conflictColumn="cbo"
              onSuccess={fetchCategories}
              title="Importar Categorias"
            />
          </div>
        </header>

        <div className="grid grid-cols-12 gap-10">
          {/* Form Section */}
          <section className="col-span-12 lg:col-span-4 space-y-8">
            <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] shadow-2xl shadow-black/5 border border-outline-variant/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-secondary/5 rounded-full -mr-16 -mt-16" />
              
              <h3 className="text-2xl font-black font-headline mb-8 flex items-center gap-3 relative z-10">
                <div className="w-10 h-10 rounded-2xl bg-secondary/10 flex items-center justify-center">
                  <Plus className="text-secondary w-5 h-5" />
                </div>
                {editingCbo ? 'Editar Categoria' : 'Nova Categoria'}
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
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">CBO (Código)</label>
                  <input 
                    type="text"
                    disabled={!!editingCbo}
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-secondary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none disabled:opacity-50"
                    placeholder="Ex: 225125"
                    value={formData.cbo || ''}
                    onChange={(e) => setFormData({ ...formData, cbo: e.target.value.replace(/\D/g, '') })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Nome da Categoria</label>
                  <input 
                    type="text"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-secondary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none uppercase"
                    placeholder="Ex: MÉDICO CLÍNICO"
                    value={formData.categoria || ''}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value.toUpperCase() })}
                  />
                </div>

                {/* 
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Vínculo</label>
                    <select 
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-secondary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none appearance-none"
                      value={formData.vinculo}
                      onChange={(e) => setFormData({ ...formData, vinculo: e.target.value as any })}
                    >
                      <option value="DIRETO">DIRETO</option>
                      <option value="INTERMEDIADO">INTERMEDIADO</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">CHS</label>
                    <select 
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-secondary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none appearance-none"
                      value={formData.chs}
                      onChange={(e) => setFormData({ ...formData, chs: parseInt(e.target.value) as any })}
                    >
                      <option value={20}>20 HORAS</option>
                      <option value={30}>30 HORAS</option>
                      <option value={40}>40 HORAS</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Tipo de Vínculo</label>
                  <select 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-secondary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none appearance-none"
                    value={formData.tipo_vinculo}
                    onChange={(e) => setFormData({ ...formData, tipo_vinculo: e.target.value as any })}
                  >
                    <option value="CLT">CLT</option>
                    <option value="ESTATUTARIO">ESTATUTÁRIO</option>
                    <option value="AUTÔNOMO">AUTÔNOMO</option>
                  </select>
                </div>
                */}

                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    type="submit"
                    className="w-full bg-secondary text-white font-black py-5 rounded-2xl shadow-xl shadow-secondary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-headline uppercase tracking-widest text-xs"
                  >
                    {editingCbo ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingCbo ? 'Atualizar Categoria' : 'Cadastrar Categoria'}
                  </button>
                  {editingCbo && (
                    <div className="grid grid-cols-2 gap-3">
                      <button 
                        type="button"
                        onClick={() => setDeleteConfirmCbo(editingCbo)}
                        className="bg-red-50 text-red-600 font-black py-4 rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 font-headline uppercase tracking-widest text-[10px]"
                      >
                        <Trash2 className="w-3 h-3" />
                        Excluir
                      </button>
                      <button 
                        type="button"
                        onClick={cancelEdit}
                        className="bg-surface-container-high text-on-surface-variant font-black py-4 rounded-2xl hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2 font-headline uppercase tracking-widest text-[10px]"
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
          <section className="col-span-12 lg:col-span-8">
            <div className="bg-surface-container-lowest rounded-[3rem] overflow-hidden shadow-2xl shadow-black/5 border border-outline-variant/10">
              <div className="p-6 md:p-10 border-b border-outline-variant/5 flex justify-between items-center bg-surface-container-lowest/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-secondary/10 flex items-center justify-center">
                    <Briefcase className="text-secondary w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-headline text-on-surface">Categorias Ativas</h3>
                    <p className="text-xs text-on-surface-variant/40 font-body uppercase tracking-widest font-bold">Listagem Geral de CBOs</p>
                  </div>
                </div>
                <div className="bg-secondary/10 text-secondary px-6 py-2 rounded-full text-[10px] font-black font-headline uppercase tracking-[0.2em]">
                  {filteredCategories.length} Registros
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-secondary/20 scrollbar-track-transparent">
                {loading ? (
                  <div className="p-24 text-center space-y-4">
                    <div className="animate-spin w-10 h-10 border-4 border-secondary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/30">Sincronizando Dados...</p>
                  </div>
                ) : filteredCategories.length === 0 ? (
                  <div className="p-24 text-center space-y-6">
                    <div className="w-20 h-20 bg-surface-container-low rounded-[2rem] flex items-center justify-center mx-auto">
                      <Search className="text-on-surface-variant/20 w-10 h-10" />
                    </div>
                    <p className="text-sm font-body text-on-surface-variant/40">Nenhuma categoria profissional encontrada.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px]">
                    <thead className="sticky top-0 z-30 bg-surface-container-low">
                      <tr>
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">CBO / Categoria</th>
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline text-center border-b border-outline-variant/5 sticky right-0 bg-surface-container-low z-40 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] w-[200px]">Ações de Gerenciamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                      {filteredCategories.map((cat) => (
                        <motion.tr 
                          layout
                          key={cat.cbo} 
                          className="hover:bg-surface-container-low/50 transition-all group"
                        >
                          <td className="px-10 py-8">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black text-secondary tracking-widest">{cat.cbo}</span>
                              <p className="font-black text-on-surface font-headline text-base group-hover:text-secondary transition-colors uppercase">{cat.categoria}</p>
                            </div>
                          </td>
                          {/* 
                          <td className="px-6 py-8">
                            <div className="flex flex-col gap-2">
                              <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest w-fit ${
                                cat.vinculo === 'DIRETO' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                              }`}>
                                {cat.vinculo}
                              </span>
                              <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-tighter">
                                {cat.tipo_vinculo}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-8 text-center">
                            <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-surface-container-high text-on-surface font-black font-headline text-sm group-hover:bg-secondary group-hover:text-white transition-all">
                              {cat.chs}
                            </div>
                          </td>
                          */}
                          <td className="px-10 py-8 sticky right-0 bg-surface-container-lowest group-hover:bg-surface-container-low transition-colors z-30 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center justify-center gap-3">
                              <button 
                                onClick={() => handleEdit(cat)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary/5 text-secondary hover:bg-secondary hover:text-white transition-all shadow-sm group/btn"
                                title="Editar Categoria"
                              >
                                <Edit2 className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover/btn:inline">Editar</span>
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmCbo(cat.cbo)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm group/btn"
                                title="Excluir Categoria"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover/btn:inline">Excluir</span>
                              </button>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Custom Confirmation Modal */}
      <AnimatePresence>
        {deleteConfirmCbo && (
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
                  Você está prestes a excluir a categoria com CBO <span className="font-black text-secondary">{deleteConfirmCbo}</span>. Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDelete(deleteConfirmCbo)}
                  className="w-full bg-red-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-headline uppercase tracking-widest text-xs"
                >
                  Sim, Excluir Registro
                </button>
                <button 
                  onClick={() => setDeleteConfirmCbo(null)}
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
