'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { UserCheck, Plus, Edit2, Trash2, Search, AlertCircle, CheckCircle2, X, IdCard } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Categoria {
  cbo: string;
  categoria: string;
}

interface Profissional {
  cpf: string;
  nome: string;
  cns: string;
  cbo: string;
  vinculo: 'DIRETO' | 'INTERMEDIADO';
  tipo_vinculo: 'CLT' | 'ESTATUTARIO' | 'AUTÔNOMO';
  chs: 20 | 30 | 40;
  categorias_profissionais?: Categoria;
}

export default function ProfissionaisPage() {
  const { searchQuery } = useSearch();
  const [professionals, setProfessionals] = useState<Profissional[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmCpf, setDeleteConfirmCpf] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Profissional>>({
    cpf: '',
    nome: '',
    cns: '',
    cbo: '',
    vinculo: 'INTERMEDIADO',
    tipo_vinculo: 'CLT',
    chs: 20
  });

  const [editingCpf, setEditingCpf] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    const [prosResponse, catsResponse] = await Promise.all([
      supabase
        .from('profissionais')
        .select('*, categorias_profissionais(cbo, categoria)')
        .order('nome'),
      supabase
        .from('categorias_profissionais')
        .select('cbo, categoria')
        .order('categoria')
    ]);

    if (prosResponse.error) setError('Erro ao carregar profissionais.');
    else setProfessionals(prosResponse.data as Profissional[]);

    if (catsResponse.error) console.error('Error fetching categories:', catsResponse.error);
    else setCategories(catsResponse.data as Categoria[]);

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
      const payload = {
        ...formData,
        cpf: cleanCpf,
        nome: formData.nome.toUpperCase(),
        cns: formData.cns?.replace(/\D/g, '') || ''
      };

      // Remove the joined object before sending to Supabase
      delete (payload as any).categorias_profissionais;

      if (editingCpf) {
        const { error: updateError } = await supabase
          .from('profissionais')
          .update(payload)
          .eq('cpf', editingCpf);

        if (updateError) throw updateError;
        setSuccess('Profissional atualizado com sucesso!');
      } else {
        const { error: insertError } = await supabase
          .from('profissionais')
          .insert([payload]);

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
        vinculo: 'INTERMEDIADO',
        tipo_vinculo: 'CLT',
        chs: 20
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
      setError('Erro ao excluir profissional.');
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
          <p className="text-lg text-on-surface-variant/60 font-body max-w-2xl">Administração completa do corpo clínico e técnico da unidade.</p>
        </header>

        <div className="grid grid-cols-12 gap-10">
          {/* Form Section */}
          <section className="col-span-12 lg:col-span-4 space-y-8">
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
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">CPF</label>
                  <input 
                    type="text"
                    disabled={!!editingCpf}
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none disabled:opacity-50"
                    placeholder="000.000.000-00"
                    value={formData.cpf}
                    onChange={(e) => setFormData({ ...formData, cpf: formatCpf(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Nome Completo</label>
                  <input 
                    type="text"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none uppercase"
                    placeholder="NOME DO PROFISSIONAL"
                    value={formData.nome}
                    onChange={(e) => setFormData({ ...formData, nome: e.target.value.toUpperCase() })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">CNS (Cartão Nacional de Saúde)</label>
                  <input 
                    type="text"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none"
                    placeholder="0000.0000.0000.000"
                    value={formData.cns}
                    onChange={(e) => setFormData({ ...formData, cns: formatCns(e.target.value) })}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Categoria (CBO)</label>
                  <select 
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none appearance-none"
                    value={formData.cbo}
                    onChange={(e) => setFormData({ ...formData, cbo: e.target.value })}
                  >
                    <option value="">Selecione uma categoria...</option>
                    {categories.map(cat => (
                      <option key={cat.cbo} value={cat.cbo}>{cat.categoria} ({cat.cbo})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Vínculo</label>
                    <select 
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none appearance-none"
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
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none appearance-none"
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
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none appearance-none"
                    value={formData.tipo_vinculo}
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
                    className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-headline uppercase tracking-widest text-xs"
                  >
                    {editingCpf ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingCpf ? 'Atualizar Profissional' : 'Cadastrar Profissional'}
                  </button>
                  {editingCpf && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingCpf(null);
                        setFormData({
                          cpf: '', nome: '', cns: '', cbo: '',
                          vinculo: 'INTERMEDIADO', tipo_vinculo: 'CLT', chs: 20
                        });
                      }}
                      className="w-full bg-surface-container-high text-on-surface-variant font-black py-4 rounded-2xl hover:bg-surface-container-highest transition-all flex items-center justify-center gap-3 font-headline uppercase tracking-widest text-[10px]"
                    >
                      <X className="w-3 h-3" />
                      Cancelar Edição
                    </button>
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

              <div className="overflow-x-auto">
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
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low/30">
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline">Profissional / CPF</th>
                        <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline">CNS / CBO</th>
                        <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline">Vínculo</th>
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                      {filteredProfessionals.map((pro) => (
                        <motion.tr 
                          layout
                          key={pro.cpf} 
                          className="hover:bg-surface-container-low/50 transition-all group"
                        >
                          <td className="px-10 py-8">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black text-primary tracking-widest">{formatCpf(pro.cpf)}</span>
                              <p className="font-black text-on-surface font-headline text-base group-hover:text-primary transition-colors uppercase">{pro.nome}</p>
                            </div>
                          </td>
                          <td className="px-6 py-8">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <IdCard className="w-3 h-3 text-on-surface-variant/30" />
                                <span className="text-[10px] font-bold text-on-surface-variant/60">{formatCns(pro.cns) || '---'}</span>
                              </div>
                              <span className="text-[10px] font-black text-secondary uppercase tracking-tighter">
                                {pro.categorias_profissionais?.categoria || '---'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-8">
                            <div className="flex flex-col gap-2">
                              <span className={`inline-flex px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest w-fit ${
                                pro.vinculo === 'DIRETO' ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-purple-600'
                              }`}>
                                {pro.vinculo}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-tighter">
                                  {pro.tipo_vinculo}
                                </span>
                                <span className="w-1 h-1 rounded-full bg-on-surface-variant/20"></span>
                                <span className="text-[10px] font-black text-on-surface-variant/60">
                                  {pro.chs}H
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-10 py-8 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button 
                                onClick={() => handleEdit(pro)}
                                className="w-10 h-10 inline-flex items-center justify-center rounded-2xl bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all shadow-sm"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmCpf(pro.cpf)}
                                className="w-10 h-10 inline-flex items-center justify-center rounded-2xl bg-surface-container-high text-on-surface-variant hover:bg-red-600 hover:text-white transition-all shadow-sm"
                              >
                                <Trash2 className="w-4 h-4" />
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
