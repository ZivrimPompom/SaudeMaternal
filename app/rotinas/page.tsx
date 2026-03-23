'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ClipboardList, Plus, Edit2, Trash2, Search, AlertCircle, CheckCircle2, X, FileUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CSVImporter from '@/components/CSVImporter';

interface Rotina {
  id: string;
  tipo: 'EXAME' | 'VACINA' | 'MEDICACAO';
  descricao: string;
  trimestre: 'PRIMEIRO' | 'SEGUNDO' | 'TERCEIRO';
  categoria: 'OBRIGATORIO' | 'OPCIONAL' | 'EVENTUAL';
  created_at?: string;
}

export default function RotinasPage() {
  const { searchQuery, setSearchQuery } = useSearch();
  const [routines, setRoutines] = useState<Rotina[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Rotina>>({
    tipo: 'EXAME',
    descricao: '',
    trimestre: 'PRIMEIRO',
    categoria: 'OBRIGATORIO'
  });

  const [editingId, setEditingId] = useState<string | null>(null);
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
    
    const { data, error: fetchError } = await supabase
      .from('rotinas')
      .select('*')
      .order('created_at', { ascending: false });

    if (fetchError) setError('Erro ao carregar rotinas.');
    else setRoutines(data as Rotina[]);

    setLoading(false);
  };

  const filteredRoutines = routines.filter(rot => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const descricao = normalize(rot.descricao);
    const tipo = normalize(rot.tipo);
    const trimestre = normalize(rot.trimestre);
    const categoria = normalize(rot.categoria);
    
    const queryNormalizada = normalize(query);

    return descricao.includes(queryNormalizada) || 
           tipo.includes(queryNormalizada) || 
           trimestre.includes(queryNormalizada) || 
           categoria.includes(queryNormalizada);
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isSupabaseConfigured) return;

    if (!formData.descricao) {
      setError('A descrição é obrigatória.');
      return;
    }

    try {
      const payload = {
        tipo: formData.tipo,
        descricao: formData.descricao.toUpperCase(),
        trimestre: formData.trimestre,
        categoria: formData.categoria
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('rotinas')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
        setSuccess('Rotina atualizada com sucesso!');
      } else {
        const { error: insertError } = await supabase
          .from('rotinas')
          .insert([payload]);

        if (insertError) throw insertError;
        setSuccess('Rotina cadastrada com sucesso!');
      }

      setFormData({
        tipo: 'EXAME',
        descricao: '',
        trimestre: 'PRIMEIRO',
        categoria: 'OBRIGATORIO'
      });
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      console.error('Error saving routine:', err);
      setError(err.message || 'Erro ao salvar rotina.');
    }
  };

  const handleEdit = (rot: Rotina) => {
    setEditingId(rot.id);
    setFormData({
      tipo: rot.tipo,
      descricao: rot.descricao,
      trimestre: rot.trimestre,
      categoria: rot.categoria
    });
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(null);
    const { error: deleteError } = await supabase
      .from('rotinas')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Erro ao excluir rotina:', deleteError);
      setError(`Erro ao excluir rotina: ${deleteError.message}`);
    } else {
      setSuccess('Rotina excluída com sucesso!');
      fetchData();
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 lg:p-12 pb-32 max-w-7xl mx-auto space-y-8 md:space-y-12">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-12 h-1.5 bg-primary rounded-full"></span>
            <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Protocolos Clínicos</span>
          </div>
          <h2 className="text-5xl font-black tracking-tight font-headline text-on-surface">Cadastro de Rotinas</h2>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <p className="text-lg text-on-surface-variant/60 font-body max-w-2xl">Definição de exames, vacinas e medicações por trimestre gestacional.</p>
              <CSVImporter 
                tableName="rotinas" 
                expectedColumns={['tipo', 'descricao', 'trimestre', 'categoria']}
                onSuccess={fetchData}
                title="Importar Rotinas"
                transformData={(data) => data.map(item => {
                  // Normalize Tipo (Singular and No Accents)
                  let tipo = item.tipo ? item.tipo.toUpperCase().trim() : null;
                  if (tipo === 'EXAMES' || tipo === 'EXAME') tipo = 'EXAME';
                  if (tipo === 'VACINAS' || tipo === 'VACINA') tipo = 'VACINA';
                  if (tipo?.includes('MEDICAC')) tipo = 'MEDICACAO';

                  // Normalize Categoria (No Accents)
                  let categoria = item.categoria ? item.categoria.toUpperCase().trim() : 'OBRIGATORIO';
                  if (categoria.includes('OBRIGAT')) categoria = 'OBRIGATORIO';
                  if (categoria.includes('OPCIONAL')) categoria = 'OPCIONAL';
                  if (categoria.includes('EVENTUAL')) categoria = 'EVENTUAL';

                  // Normalize Trimestre
                  let trimestre = item.trimestre ? item.trimestre.toUpperCase().trim() : 'PRIMEIRO';
                  if (trimestre.includes('1') || trimestre.includes('PRIM')) trimestre = 'PRIMEIRO';
                  if (trimestre.includes('2') || trimestre.includes('SEG')) trimestre = 'SEGUNDO';
                  if (trimestre.includes('3') || trimestre.includes('TER')) trimestre = 'TERCEIRO';

                  return {
                    ...item,
                    tipo,
                    descricao: item.descricao ? item.descricao.toUpperCase().trim() : null,
                    trimestre,
                    categoria
                  };
                })}
              />
            <div className="flex items-center gap-3 bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant/20 shadow-sm">
              <ClipboardList className="text-primary w-5 h-5" />
              <span className="text-sm font-bold font-label uppercase tracking-widest text-on-surface-variant">{filteredRoutines.length} Rotinas</span>
            </div>
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
                {editingId ? 'Editar Rotina' : 'Nova Rotina'}
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
                  <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Tipo de Rotina</label>
                  <select 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none"
                    value={formData.tipo || 'EXAME'}
                    onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                  >
                    <option value="EXAME">EXAME</option>
                    <option value="VACINA">VACINA</option>
                    <option value="MEDICACAO">MEDICACAO</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Descrição</label>
                  <textarea 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none uppercase min-h-[100px]"
                    placeholder="DESCREVA O EXAME, VACINA OU MEDICAÇÃO"
                    value={formData.descricao || ''}
                    onChange={(e) => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Trimestre</label>
                  <select 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none"
                    value={formData.trimestre || 'PRIMEIRO'}
                    onChange={(e) => setFormData({ ...formData, trimestre: e.target.value as any })}
                  >
                    <option value="PRIMEIRO">PRIMEIRO TRIMESTRE</option>
                    <option value="SEGUNDO">SEGUNDO TRIMESTRE</option>
                    <option value="TERCEIRO">TERCEIRO TRIMESTRE</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Categoria</label>
                  <select 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none"
                    value={formData.categoria || 'OBRIGATORIO'}
                    onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                  >
                    <option value="OBRIGATORIO">OBRIGATORIO</option>
                    <option value="OPCIONAL">OPCIONAL</option>
                    <option value="EVENTUAL">EVENTUAL</option>
                  </select>
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    type="submit"
                    className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-headline uppercase tracking-widest text-[10px]"
                  >
                    {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingId ? 'Atualizar Rotina' : 'Cadastrar Rotina'}
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
                          setFormData({
                            tipo: 'EXAME',
                            descricao: '',
                            trimestre: 'PRIMEIRO',
                            categoria: 'OBRIGATORIO'
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
              <div className="p-6 md:p-10 border-b border-outline-variant/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-headline text-on-surface">Protocolos Ativos</h3>
                    <p className="text-xs text-on-surface-variant/40 font-body uppercase tracking-widest font-bold">Listagem de Rotinas</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Filtrar protocolos..."
                      className="w-full bg-surface-container-low border-none rounded-full pl-12 pr-4 py-3 text-xs font-body focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {loading ? (
                  <div className="p-24 text-center space-y-4">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/30">Sincronizando Dados...</p>
                  </div>
                ) : filteredRoutines.length === 0 ? (
                  <div className="p-24 text-center space-y-6">
                    <div className="w-20 h-20 bg-surface-container-low rounded-[2rem] flex items-center justify-center mx-auto">
                      <Search className="text-on-surface-variant/20 w-10 h-10" />
                    </div>
                    <p className="text-sm font-body text-on-surface-variant/40">Nenhuma rotina encontrada.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-separate border-spacing-0 min-w-[1100px]">
                    <thead className="sticky top-0 z-30 bg-surface-container-low">
                      <tr>
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">Descrição / Tipo</th>
                        <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">Trimestre</th>
                        <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">Categoria</th>
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline text-center border-b border-outline-variant/5 sticky right-0 bg-surface-container-low z-40 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] w-[200px]">Ações de Gerenciamento</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                      {filteredRoutines.map((rot) => (
                        <motion.tr 
                          layout
                          key={rot.id} 
                          className="hover:bg-surface-container-low/50 transition-all group"
                        >
                          <td className="px-10 py-8">
                            <div className="flex flex-col gap-1">
                              <span className={`text-[9px] font-black uppercase tracking-widest w-fit px-2 py-0.5 rounded ${
                                rot.tipo === 'EXAME' ? 'bg-blue-100 text-blue-700' : 
                                rot.tipo === 'VACINA' ? 'bg-green-100 text-green-700' : 
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {rot.tipo}
                              </span>
                              <p className="font-black text-on-surface font-headline text-base group-hover:text-primary transition-colors uppercase">{rot.descricao}</p>
                            </div>
                          </td>
                          <td className="px-6 py-8">
                            <span className="text-[10px] font-black text-on-surface-variant/60 uppercase tracking-tighter">
                              {rot.trimestre} Trimestre
                            </span>
                          </td>
                          <td className="px-6 py-8">
                            <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest w-fit ${
                              rot.categoria === 'OBRIGATORIO' ? 'bg-orange-50 text-orange-700' : 
                              rot.categoria === 'OPCIONAL' ? 'bg-slate-50 text-slate-600' : 
                              'bg-yellow-50 text-yellow-700'
                            }`}>
                              {rot.categoria}
                            </span>
                          </td>
                          <td className="px-10 py-8 sticky right-0 bg-surface-container-lowest group-hover:bg-surface-container-low transition-colors z-30 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                            <div className="flex items-center justify-center gap-3">
                              <button 
                                onClick={() => handleEdit(rot)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all shadow-sm group/btn"
                                title="Editar Rotina"
                              >
                                <Edit2 className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-widest hidden group-hover/btn:inline">Editar</span>
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(rot.id)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm group/btn"
                                title="Excluir Rotina"
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
                  Você está prestes a excluir esta rotina. Esta ação não pode ser desfeita.
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
