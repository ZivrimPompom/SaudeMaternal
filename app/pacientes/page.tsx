'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { 
  Users, 
  Plus, 
  Edit2, 
  Trash2, 
  Search, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  Calendar, 
  Phone, 
  Mail, 
  MapPin,
  Fingerprint
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import CSVImporter from '@/components/CSVImporter';

interface Paciente {
  id: string;
  name: string;
  cpf: string;
  birth_date: string;
  phone: string;
  email: string;
  address: string;
  created_at?: string;
}

export default function PacientesPage() {
  const { searchQuery, setSearchQuery } = useSearch();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const [formData, setFormData] = useState<Partial<Paciente>>({
    name: '',
    cpf: '',
    birth_date: '',
    phone: '',
    email: '',
    address: ''
  });

  const [editingId, setEditingId] = useState<string | null>(null);

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
      .from('pacientes')
      .select('*')
      .order('name');

    if (fetchError) setError('Erro ao carregar pacientes.');
    else setPacientes(data as Paciente[]);

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

  const filteredPacientes = pacientes.filter(pac => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const name = normalize(pac.name);
    const cpf = pac.cpf?.replace(/\D/g, '') || '';
    const email = pac.email?.toLowerCase() || '';
    
    const queryNormalizada = normalize(query);
    const queryDigits = query.replace(/\D/g, '');

    return name.includes(queryNormalizada) || 
           (queryDigits !== '' && cpf.includes(queryDigits)) ||
           email.includes(queryNormalizada);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isSupabaseConfigured) return;

    if (!formData.name || !formData.cpf) {
      setError('Nome e CPF são obrigatórios.');
      return;
    }

    try {
      const payload = {
        ...formData,
        name: formData.name.toUpperCase(),
        cpf: formData.cpf.replace(/\D/g, ''),
        phone: formData.phone?.replace(/\D/g, '') || ''
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('pacientes')
          .update(payload)
          .eq('id', editingId);

        if (updateError) throw updateError;
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
        name: '',
        cpf: '',
        birth_date: '',
        phone: '',
        email: '',
        address: ''
      });
      setEditingId(null);
      fetchData();
    } catch (err: any) {
      console.error('Error saving patient:', err);
      setError(err.message || 'Erro ao salvar paciente.');
    }
  };

  const handleEdit = (pac: Paciente) => {
    setEditingId(pac.id);
    setFormData({
      ...pac,
      cpf: formatCpf(pac.cpf || ''),
      phone: formatPhone(pac.phone || '')
    });
    setError(null);
    setSuccess(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(null);
    const { error: deleteError } = await supabase
      .from('pacientes')
      .delete()
      .eq('id', id);

    if (deleteError) {
      setError('Erro ao excluir paciente.');
    } else {
      setSuccess('Paciente excluído com sucesso!');
      fetchData();
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 lg:p-12 pb-32 max-w-7xl mx-auto space-y-8 md:space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-12 h-1.5 bg-primary rounded-full"></span>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Gestão Clínica</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight font-headline text-on-surface">Cadastro de Pacientes</h2>
            <p className="text-lg text-on-surface-variant/60 font-body max-w-2xl">Gerenciamento de gestantes e prontuários do sistema.</p>
          </div>
          <div className="flex flex-col md:flex-row items-center gap-3">
            <CSVImporter 
              tableName="pacientes" 
              expectedColumns={['name', 'cpf', 'birth_date', 'phone', 'email', 'address']}
              conflictColumn="cpf"
              onSuccess={fetchData}
              title="Importar Pacientes"
            />
            <div className="flex items-center gap-3 bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant/20 shadow-sm">
              <Users className="text-primary w-5 h-5" />
              <span className="text-sm font-bold font-label uppercase tracking-widest text-on-surface-variant">{filteredPacientes.length} Pacientes</span>
            </div>
          </div>
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
                {editingId ? 'Editar Cadastro' : 'Nova Paciente'}
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
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Nome Completo</label>
                  <input 
                    type="text"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none uppercase"
                    placeholder="NOME DA PACIENTE"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value.toUpperCase() })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">CPF</label>
                    <input 
                      type="text"
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none"
                      placeholder="000.000.000-00"
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: formatCpf(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Nascimento</label>
                    <input 
                      type="date"
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none"
                      value={formData.birth_date}
                      onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Telefone</label>
                    <input 
                      type="text"
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none"
                      placeholder="(00) 00000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: formatPhone(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">E-mail</label>
                    <input 
                      type="email"
                      className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none"
                      placeholder="email@exemplo.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Endereço</label>
                  <input 
                    type="text"
                    className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none"
                    placeholder="Rua, Número, Bairro, Cidade"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex flex-col gap-3">
                  <button 
                    type="submit"
                    className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-headline uppercase tracking-widest text-xs"
                  >
                    {editingId ? <Edit2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    {editingId ? 'Atualizar Paciente' : 'Cadastrar Paciente'}
                  </button>
                  {editingId && (
                    <button 
                      type="button"
                      onClick={() => {
                        setEditingId(null);
                        setFormData({
                          name: '', cpf: '', birth_date: '', phone: '', email: '', address: ''
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
              <div className="p-6 md:p-10 border-b border-outline-variant/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Users className="text-primary w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-headline text-on-surface">Pacientes Cadastradas</h3>
                    <p className="text-xs text-on-surface-variant/40 font-body uppercase tracking-widest font-bold">Listagem Geral</p>
                  </div>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Filtrar pacientes..."
                      className="w-full bg-surface-container-low border-none rounded-full pl-12 pr-4 py-3 text-xs font-body focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-24 text-center space-y-4">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/30">Sincronizando Dados...</p>
                  </div>
                ) : filteredPacientes.length === 0 ? (
                  <div className="p-24 text-center space-y-6">
                    <div className="w-20 h-20 bg-surface-container-low rounded-[2rem] flex items-center justify-center mx-auto">
                      <Search className="text-on-surface-variant/20 w-10 h-10" />
                    </div>
                    <p className="text-sm font-body text-on-surface-variant/40">Nenhuma paciente encontrada.</p>
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low/30">
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline">Paciente / CPF</th>
                        <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline">Contato</th>
                        <th className="px-6 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline">Nascimento</th>
                        <th className="px-10 py-6 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/5">
                      {filteredPacientes.map((pac) => (
                        <motion.tr 
                          layout
                          key={pac.id} 
                          className="hover:bg-surface-container-low/50 transition-all group"
                        >
                          <td className="px-10 py-8">
                            <div className="flex flex-col gap-1">
                              <span className="text-[10px] font-black text-primary tracking-widest">{formatCpf(pac.cpf || '')}</span>
                              <p className="font-black text-on-surface font-headline text-base group-hover:text-primary transition-colors uppercase">{pac.name}</p>
                            </div>
                          </td>
                          <td className="px-6 py-8">
                            <div className="flex flex-col gap-1">
                              <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-on-surface-variant/30" />
                                <span className="text-[10px] font-bold text-on-surface-variant/60">{formatPhone(pac.phone || '') || '---'}</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Mail className="w-3 h-3 text-on-surface-variant/30" />
                                <span className="text-[10px] font-bold text-on-surface-variant/60 truncate max-w-[150px]">{pac.email || '---'}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-8">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-primary/40" />
                              <span className="text-sm font-black text-on-surface-variant/60">
                                {pac.birth_date ? new Date(pac.birth_date).toLocaleDateString('pt-BR') : '---'}
                              </span>
                            </div>
                          </td>
                          <td className="px-10 py-8 text-right">
                            <div className="flex items-center justify-end gap-3">
                              <button 
                                onClick={() => handleEdit(pac)}
                                className="w-10 h-10 inline-flex items-center justify-center rounded-2xl bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all shadow-sm"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(pac.id)}
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
