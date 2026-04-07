'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { ClipboardList, Plus, Edit2, Trash2, Search, AlertCircle, CheckCircle2, X, FileUp, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Pagination from '@/components/Pagination';
import RecordsSummary from '@/components/RecordsSummary';
import SearchInput from '@/components/SearchInput';

interface Rotina {
  id: string;
  tipo: 'EXAME' | 'VACINA' | 'MEDICACAO';
  descricao: string;
  trimestre: 'PRIMEIRO' | 'SEGUNDO' | 'TERCEIRO';
  categoria: 'OBRIGATORIO' | 'OPCIONAL' | 'EVENTUAL';
  unidade_cnes?: string;
  cpf_operador?: string;
  operador_nome?: string;
  created_at?: string;
}

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2');
};

export default function RotinasPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen, refreshTrigger, setOnExportCSV } = useSearch();
  const { user: authUser } = useAuth();
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
    setIsFormOpen(false);
    fetchData();
  }, [setIsFormOpen, refreshTrigger]);

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

  const filteredRoutines = useMemo(() => {
    return routines.filter(rot => {
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
  }, [routines, searchQuery]);

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
        descricao: formData.descricao?.toUpperCase(),
        trimestre: formData.trimestre,
        categoria: formData.categoria,
        unidade_cnes: authUser?.unidade_cnes || null,
        cpf_operador: authUser?.cpf || null
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
      setIsFormOpen(false);
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
    setIsFormOpen(true);
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

  const handleExportCSV = useCallback(() => {
    const headers = ['TIPO', 'TRIMESTRE', 'CATEGORIA', 'DESCRIÇÃO'];
    const rows = filteredRoutines.map(r => [
      r.tipo,
      r.trimestre,
      r.categoria,
      r.descricao
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "rotinas.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredRoutines]);

  useEffect(() => {
    setOnExportCSV(() => handleExportCSV);
    return () => setOnExportCSV(null);
  }, [handleExportCSV, setOnExportCSV]);

  if (!mounted) return null;

  return (
    <DashboardLayout title="Rotinas">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Topbar Pattern - Figura 1 */}
        <div className="bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-primary uppercase tracking-tight">Rotinas</h1>
          </div>

          <SearchInput 
            className="w-full md:flex-1 md:mx-8" 
            placeholder="Digite Descrição"
          />

          <RecordsSummary 
            total={routines.length} 
            filtered={filteredRoutines.length} 
          />
        </div>

        <div className="grid grid-cols-12 gap-10">
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

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Tipo</label>
                        <select 
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none appearance-none"
                          value={formData.tipo || 'EXAME'}
                          onChange={(e) => setFormData({ ...formData, tipo: e.target.value as any })}
                        >
                          <option value="EXAME">EXAME</option>
                          <option value="VACINA">VACINA</option>
                          <option value="MEDICACAO">MEDICACAO</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Trimestre</label>
                        <select 
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none appearance-none"
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
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none appearance-none"
                          value={formData.categoria || 'OBRIGATORIO'}
                          onChange={(e) => setFormData({ ...formData, categoria: e.target.value as any })}
                        >
                          <option value="OBRIGATORIO">OBRIGATORIO</option>
                          <option value="OPCIONAL">OPCIONAL</option>
                          <option value="EVENTUAL">EVENTUAL</option>
                        </select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Descrição</label>
                      <textarea 
                        className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all text-input outline-none uppercase min-h-[80px]"
                        placeholder="DESCREVA O EXAME, VACINA OU MEDICAÇÃO"
                        value={formData.descricao || ''}
                        onChange={(e) => setFormData({ ...formData, descricao: e.target.value.toUpperCase() })}
                      />
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
                              setIsFormOpen(false);
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
              </motion.section>
            )}
          </AnimatePresence>

          {/* List Section */}
          <section className="col-span-12">
            <div className="bg-surface-container-lowest rounded-[3rem] overflow-hidden shadow-2xl shadow-black/5 border border-outline-variant/10">
              <div className="p-6 md:p-10 border-b border-outline-variant/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <ClipboardList className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-headline text-on-surface">Protocolos</h3>
                    <p className="text-xs text-on-surface-variant/60 font-body uppercase tracking-widest font-bold">Listagem de Rotinas</p>
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
                    <p className="text-sm font-body text-on-surface-variant/60">Nenhuma rotina encontrada.</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-separate border-spacing-0 min-w-[800px]">
                      <thead className="sticky top-0 z-30 bg-surface-container-low">
                        <tr>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Descrição</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Tipo</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Trimestre</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Categoria</th>
                          <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5 text-center">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {filteredRoutines
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((rot) => (
                            <motion.tr 
                              layout
                              key={rot.id} 
                              className="hover:bg-primary/[0.02] transition-colors group"
                            >
                            <td className="px-4 py-3">
                              <p className="font-black text-xs text-on-surface uppercase leading-tight">{rot.descricao}</p>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${
                                rot.tipo === 'EXAME' ? 'bg-blue-100 text-blue-700' : 
                                rot.tipo === 'VACINA' ? 'bg-success/10 text-success' : 
                                'bg-purple-100 text-purple-700'
                              }`}>
                                {rot.tipo}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-[9px] font-black text-on-surface uppercase tracking-widest">
                                {rot.trimestre}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                rot.categoria === 'OBRIGATORIO' ? 'bg-primary/10 text-primary' : 
                                rot.categoria === 'OPCIONAL' ? 'bg-surface-container-high text-on-surface-variant' : 
                                'bg-warning/10 text-warning'
                              }`}>
                                {rot.categoria}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button 
                                  onClick={() => handleEdit(rot)}
                                  className="p-1.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all"
                                  title="Editar"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirmId(rot.id)}
                                  className="p-1.5 rounded-lg bg-error text-white hover:bg-error/80 transition-all"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                    <Pagination 
                      currentPage={currentPage}
                      totalPages={Math.ceil(filteredRoutines.length / itemsPerPage)}
                      onPageChange={setCurrentPage}
                      totalItems={filteredRoutines.length}
                      itemsPerPage={itemsPerPage}
                      itemName="rotinas"
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
