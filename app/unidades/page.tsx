'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { Building2, Plus, Edit2, Trash2, Search, AlertCircle, CheckCircle2, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Pagination from '@/components/Pagination';
import RecordsSummary from '@/components/RecordsSummary';
import SearchInput from '@/components/SearchInput';

interface Unidade {
  cnes: string;
  nome_unidade: string;
  tipo_unidade: string;
  logradouro: string;
  numero: string;
  bairro: string;
  contato: string;
  email: string;
  cidade: string;
  uf: string;
  cpf_operador?: string;
}

const formatCpf = (value: string) => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2');
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

export default function UnidadesPage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen, refreshTrigger, setOnExportCSV } = useSearch();
  const { user: authUser } = useAuth();
  const [unidades, setUnidades] = useState<Unidade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formData, setFormData] = useState<Unidade>({
    cnes: '',
    nome_unidade: '',
    tipo_unidade: '',
    logradouro: '',
    numero: '',
    bairro: '',
    contato: '',
    email: '',
    cidade: 'SÃO PAULO',
    uf: 'SP'
  });

  const [editingCnes, setEditingCnes] = useState<string | null>(null);
  const [deleteConfirmCnes, setDeleteConfirmCnes] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    setIsFormOpen(false);
    fetchUnidades();
  }, [setIsFormOpen, refreshTrigger]);

  const fetchUnidades = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from('unidades')
      .select('*')
      .order('nome_unidade');
    
    if (error) {
      console.error('Error fetching units:', error);
      setError('Erro ao carregar unidades.');
    } else if (data) {
      setUnidades(data as Unidade[]);
    }
    setLoading(false);
  };

  const filteredUnidades = useMemo(() => {
    return unidades.filter(uni => {
      const query = searchQuery.toLowerCase().trim();
      if (!query) return true;

      const normalize = (str: string) => 
        str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

      const nome = normalize(uni.nome_unidade);
      const cnes = uni.cnes.toLowerCase();
      const bairro = normalize(uni.bairro);
      
      const queryNormalizada = normalize(query);

      return nome.includes(queryNormalizada) || cnes.includes(queryNormalizada) || bairro.includes(queryNormalizada);
    });
  }, [unidades, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isSupabaseConfigured) {
      setError('Supabase não configurado.');
      return;
    }

    if (!formData.cnes.trim() || !formData.nome_unidade.trim()) {
      setError('CNES e Nome da Unidade são obrigatórios.');
      return;
    }

    try {
      const payload = {
        ...formData,
        nome_unidade: formData.nome_unidade.toUpperCase(),
        logradouro: formData.logradouro.toUpperCase(),
        bairro: formData.bairro.toUpperCase(),
        cpf_operador: authUser?.cpf || null
      };

      if (editingCnes) {
        const { error: updateError } = await supabase
          .from('unidades')
          .update(payload)
          .eq('cnes', editingCnes);

        if (updateError) throw updateError;
        setSuccess('Unidade atualizada com sucesso!');
      } else {
        const { error: insertError } = await supabase
          .from('unidades')
          .insert([payload]);

        if (insertError) {
          if (insertError.code === '23505') {
            setError('Este CNES já está cadastrado.');
            return;
          }
          throw insertError;
        }
        setSuccess('Unidade cadastrada com sucesso!');
      }

      setFormData({
        cnes: '',
        nome_unidade: '',
        tipo_unidade: '',
        logradouro: '',
        numero: '',
        bairro: '',
        contato: '',
        email: '',
        cidade: 'SÃO PAULO',
        uf: 'SP'
      });
      setEditingCnes(null);
      setIsFormOpen(false);
      fetchUnidades();
    } catch (err: any) {
      console.error('Error saving unit:', err);
      setError(err.message || 'Erro ao salvar unidade.');
    }
  };

  const handleEdit = (uni: Unidade) => {
    setEditingCnes(uni.cnes);
    setFormData(uni);
    setError(null);
    setSuccess(null);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (cnes: string) => {
    setDeleteConfirmCnes(null);
    setError(null);
    setSuccess(null);

    const { error: deleteError } = await supabase
      .from('unidades')
      .delete()
      .eq('cnes', cnes);

    if (deleteError) {
      console.error('Error deleting unit:', deleteError);
      setError('Erro ao excluir unidade: ' + deleteError.message);
    } else {
      setSuccess('Unidade excluída com sucesso!');
      fetchUnidades();
    }
  };

  const cancelEdit = () => {
    setEditingCnes(null);
    setFormData({
      cnes: '',
      nome_unidade: '',
      tipo_unidade: '',
      logradouro: '',
      numero: '',
      bairro: '',
      contato: '',
      email: '',
      cidade: 'SÃO PAULO',
      uf: 'SP'
    });
    setError(null);
    setSuccess(null);
    setIsFormOpen(false);
  };

  const handleExportCSV = useCallback(() => {
    const headers = ['CNES', 'NOME UNIDADE', 'TIPO', 'BAIRRO', 'CONTATO'];
    const rows = filteredUnidades.map(u => [
      u.cnes,
      u.nome_unidade,
      u.tipo_unidade,
      u.bairro,
      u.contato
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "unidades.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredUnidades]);

  useEffect(() => {
    setOnExportCSV(() => handleExportCSV);
    return () => setOnExportCSV(null);
  }, [handleExportCSV, setOnExportCSV]);

  if (!mounted) return null;

  return (
    <DashboardLayout title="Unidades de Saúde">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Topbar Pattern - Figura 1 */}
        <div className="bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-primary uppercase tracking-tight">Unidades</h1>
          </div>

          <SearchInput 
            className="w-full md:flex-1 md:mx-8" 
            placeholder="Digite CNES, Nome ou Bairro"
          />

          <RecordsSummary 
            total={unidades.length} 
            filtered={filteredUnidades.length} 
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
                      <Building2 className="text-primary w-5 h-5" />
                    </div>
                    {editingCnes ? 'Editar Unidade' : 'Nova Unidade'}
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
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">CNES (Código)</label>
                        <input 
                          type="text"
                          disabled={!!editingCnes}
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none disabled:opacity-50"
                          placeholder="Ex: 2780057"
                          value={formData.cnes || ''}
                          onChange={(e) => setFormData({ ...formData, cnes: e.target.value.replace(/\D/g, '') })}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Nome da Unidade</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none uppercase"
                          placeholder="Ex: UBS JARDIM PAULISTA"
                          value={formData.nome_unidade || ''}
                          onChange={(e) => setFormData({ ...formData, nome_unidade: e.target.value.toUpperCase() })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Tipo de Unidade</label>
                        <select 
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none"
                          value={formData.tipo_unidade || ''}
                          onChange={(e) => setFormData({ ...formData, tipo_unidade: e.target.value })}
                        >
                          <option value="">Selecione o tipo</option>
                          <option value="UBS">UBS - Unidade Básica de Saúde</option>
                          <option value="AMA">AMA - Assistência Médica Ambulatorial</option>
                          <option value="UPA">UPA - Unidade de Pronto Atendimento</option>
                          <option value="HOSPITAL">HOSPITAL</option>
                          <option value="OUTROS">OUTROS</option>
                        </select>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Bairro</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none uppercase"
                          placeholder="Ex: JARDIM PAULISTA"
                          value={formData.bairro || ''}
                          onChange={(e) => setFormData({ ...formData, bairro: e.target.value.toUpperCase() })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="col-span-2 space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Logradouro</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none uppercase"
                          placeholder="RUA / AVENIDA"
                          value={formData.logradouro || ''}
                          onChange={(e) => setFormData({ ...formData, logradouro: e.target.value.toUpperCase() })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Nº</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                          placeholder="123"
                          value={formData.numero || ''}
                          onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Contato</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                          placeholder="(00) 00000-0000"
                          value={formData.contato || ''}
                          onChange={(e) => setFormData({ ...formData, contato: formatPhone(e.target.value) })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">E-mail</label>
                        <input 
                          type="email"
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                          placeholder="unidade@saude.gov.br"
                          value={formData.email || ''}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        />
                      </div>
                    </div>

                    <div className="pt-4 flex flex-col gap-3">
                      <button 
                        type="submit"
                        className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-headline uppercase tracking-widest text-[10px]"
                      >
                        {editingCnes ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        {editingCnes ? 'Atualizar Unidade' : 'Cadastrar Unidade'}
                      </button>
                      {editingCnes && (
                        <div className="grid grid-cols-2 gap-3">
                          <button 
                            type="button"
                            onClick={() => setDeleteConfirmCnes(editingCnes)}
                            className="bg-red-50 text-red-600 font-black py-4 rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 font-headline uppercase tracking-widest text-[8px]"
                          >
                            <Trash2 className="w-3 h-3" />
                            Excluir
                          </button>
                          <button 
                            type="button"
                            onClick={cancelEdit}
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
                    <Building2 className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-headline text-on-surface">Unidades Ativas</h3>
                    <p className="text-xs text-on-surface-variant/40 font-body uppercase tracking-widest font-bold">Listagem Geral de CNES</p>
                  </div>
                </div>
                <div className="bg-primary/10 text-primary px-6 py-2 rounded-full text-[10px] font-black font-headline uppercase tracking-[0.2em]">
                  {filteredUnidades.length} Registros
                </div>
              </div>

              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {loading ? (
                  <div className="p-24 text-center space-y-4">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/30">Sincronizando Dados...</p>
                  </div>
                ) : filteredUnidades.length === 0 ? (
                  <div className="p-24 text-center space-y-6">
                    <div className="w-20 h-20 bg-surface-container-low rounded-[2rem] flex items-center justify-center mx-auto">
                      <Search className="text-on-surface-variant/20 w-10 h-10" />
                    </div>
                    <p className="text-sm font-body text-on-surface-variant/40">Nenhuma unidade de saúde encontrada.</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px]">
                      <thead className="sticky top-0 z-30 bg-surface-container-low">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">CNES / Unidade</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">Endereço / Bairro</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5 w-[150px]">Operador</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline text-center border-b border-outline-variant/5 sticky right-0 bg-surface-container-low z-40 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] w-[180px]">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {filteredUnidades
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((uni) => (
                            <motion.tr 
                              layout
                              key={uni.cnes} 
                              className="hover:bg-surface-container-low/50 transition-all group"
                            >
                            <td className="px-6 py-4">
                              <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-black text-primary tracking-widest">{uni.cnes}</span>
                                <p className="font-black text-on-surface font-headline text-sm group-hover:text-primary transition-colors uppercase">{uni.nome_unidade}</p>
                                <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase">{uni.tipo_unidade}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-black text-on-surface uppercase tracking-wider">{uni.bairro}</span>
                                <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase">{uni.logradouro}, {uni.numero}</span>
                                <span className="text-[9px] font-bold text-on-surface-variant/40">{formatPhone(uni.contato)}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[10px] font-black text-on-surface uppercase tracking-wider">OPERADOR</span>
                                <span className="text-[9px] font-bold text-on-surface-variant/40">{uni.cpf_operador ? formatCpf(uni.cpf_operador) : '---'}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 sticky right-0 bg-surface-container-lowest group-hover:bg-surface-container-low transition-colors z-30 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                              <div className="flex items-center justify-center gap-2">
                                <button 
                                  onClick={() => handleEdit(uni)}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all shadow-sm group/btn"
                                  title="Editar Unidade"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover/btn:inline">Editar</span>
                                </button>
                                <button 
                                  onClick={() => setDeleteConfirmCnes(uni.cnes)}
                                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm group/btn"
                                  title="Excluir Unidade"
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
                      totalPages={Math.ceil(filteredUnidades.length / itemsPerPage)}
                      onPageChange={setCurrentPage}
                      totalItems={filteredUnidades.length}
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
        {deleteConfirmCnes && (
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
                  Você está prestes a excluir a unidade <span className="font-black text-primary">{deleteConfirmCnes}</span>. Esta ação não pode ser desfeita.
                </p>
              </div>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => handleDelete(deleteConfirmCnes)}
                  className="w-full bg-red-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-headline uppercase tracking-widest text-xs"
                >
                  Sim, Excluir Registro
                </button>
                <button 
                  onClick={() => setDeleteConfirmCnes(null)}
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
