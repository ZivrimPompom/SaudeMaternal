'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AlertTriangle, 
  Info, 
  UserPlus, 
  Fingerprint, 
  Lock, 
  Eye, 
  EyeOff, 
  Save, 
  RefreshCw, 
  Shield, 
  Filter, 
  Search, 
  Edit2, 
  MoreVertical, 
  Trash2,
  CheckCircle2,
  X,
  ChevronLeft, 
  ChevronRight, 
  ShieldCheck,
  SearchX,
  Users,
  FileUp,
  Building2
} from 'lucide-react';
import CSVImporter from '@/components/CSVImporter';
import Pagination from '@/components/Pagination';

interface Operator {
  id: string;
  name: string;
  cpf: string;
  status: 'Ativo' | 'Bloqueado';
  initials: string;
  unidade_cnes?: string;
  unidades_saude?: { nome_fantasia: string };
}

interface HealthUnit {
  cnes: string;
  nome_fantasia: string;
}

export default function OperadoresPage() {
  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen } = useSearch();
  const { user: authUser } = useAuth();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [units, setUnits] = useState<HealthUnit[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    setIsFormOpen(false);
  }, [setIsFormOpen]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }
    let isMounted = true;
    const loadData = async () => {
      setLoading(true);
      try {
        // Fetch Units
        const unitsResult = await supabase
          .from('unidades_saude')
          .select('cnes, nome_fantasia')
          .order('nome_fantasia');
        
        if (unitsResult.data) {
          setUnits(unitsResult.data as HealthUnit[]);
        }

        // Tenta buscar com join
        let result = await supabase
          .from('operadores')
          .select('*, unidades_saude(nome_fantasia)')
          .order('name', { ascending: true });
        
        if (result.error && result.error.message.includes('relationship')) {
          // Fallback if relationship doesn't exist yet
          result = await supabase
            .from('operadores')
            .select('*')
            .order('name', { ascending: true });
        }
        
        if (result.error && result.error.message.includes('column')) {
          // Se falhar por causa da coluna 'name', tenta 'nome'
          result = await supabase
            .from('operadores')
            .select('*, unidades_saude(nome_fantasia)')
            .order('nome', { ascending: true });
            
          if (result.error && result.error.message.includes('relationship')) {
            result = await supabase
              .from('operadores')
              .select('*')
              .order('nome', { ascending: true });
          }
        }

        if (isMounted) {
          if (result.error) {
            console.error('Erro ao buscar operadores:', result.error);
            setError(`Erro ao carregar dados: ${result.error.message}`);
          } else if (result.data) {
            // Mapeia os dados para garantir que usem as chaves esperadas pela interface Operator
            const mappedData = result.data.map((item: any) => ({
              id: item.id,
              name: item.name || item.nome || 'Sem Nome',
              cpf: item.cpf,
              status: item.status || 'Ativo',
              initials: item.initials || item.sigla || (item.name || item.nome || '??').substring(0, 2).toUpperCase(),
              unidade_cnes: item.unidade_cnes,
              unidades_saude: item.unidades_saude
            }));
            setOperators(mappedData as Operator[]);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error('Erro inesperado:', err);
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => { isMounted = false; };
  }, []);

  const fetchOperators = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      // Tenta buscar com join
      let result = await supabase
        .from('operadores')
        .select('*, unidades_saude(nome_fantasia)')
        .order('name', { ascending: true });
      
      if (result.error && result.error.message.includes('relationship')) {
        // Fallback if relationship doesn't exist yet
        result = await supabase
          .from('operadores')
          .select('*')
          .order('name', { ascending: true });
      }
      
      if (result.error && result.error.message.includes('column')) {
        // Se falhar por causa da coluna 'name', tenta 'nome'
        result = await supabase
          .from('operadores')
          .select('*, unidades_saude(nome_fantasia)')
          .order('nome', { ascending: true });
          
        if (result.error && result.error.message.includes('relationship')) {
          result = await supabase
            .from('operadores')
            .select('*')
            .order('nome', { ascending: true });
        }
      }

      if (result.error) {
        console.error('Erro ao buscar operadores:', result.error);
        setError(`Erro ao carregar dados: ${result.error.message}`);
      } else if (result.data) {
        const mappedData = result.data.map((item: any) => ({
          id: item.id,
          name: item.name || item.nome || 'Sem Nome',
          cpf: item.cpf,
          status: item.status || 'Ativo',
          initials: item.initials || item.sigla || (item.name || item.nome || '??').substring(0, 2).toUpperCase(),
          unidade_cnes: item.unidade_cnes,
          unidades_saude: item.unidades_saude
        }));
        setOperators(mappedData as Operator[]);
      }
    } catch (err) {
      console.error('Erro inesperado:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredOperators = operators.filter(op => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    // Normaliza para remover acentos (ex: 'João' vira 'Joao')
    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const name = normalize(op.name);
    const cpf = op.cpf.replace(/\D/g, '');
    const initials = normalize(op.initials);
    
    const queryNormalizada = normalize(query);
    const queryNumeros = query.replace(/\D/g, '');

    return (
      name.includes(queryNormalizada) ||
      initials.includes(queryNormalizada) ||
      (queryNumeros !== '' && cpf.includes(queryNumeros))
    );
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    password: '',
    status: 'Ativo' as 'Ativo' | 'Bloqueado',
    unidade_cnes: ''
  });

  const [editingId, setEditingId] = useState<string | null>(null); // Now stores the CPF
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, '');
    let formatted = digits;
    if (digits.length > 3) formatted = `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length > 6) formatted = `${formatted.slice(0, 7)}.${digits.slice(6)}`;
    if (digits.length > 9) formatted = `${formatted.slice(0, 11)}-${digits.slice(9, 11)}`;
    return formatted.slice(0, 14);
  };

  const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCPF(e.target.value);
    setFormData({ ...formData, cpf: formatted });
    setError(null);
  };

  const getInitials = (name: string) => {
    return name
      .trim()
      .split(/\s+/)
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isSupabaseConfigured) {
      setError('Configuração do Supabase ausente na Vercel. Verifique as Environment Variables.');
      return;
    }

    if (!formData.name.trim()) {
      setError('O nome é obrigatório.');
      return;
    }

    if (formData.cpf.length !== 14) {
      setError('O CPF deve ter 11 dígitos (000.000.000-00).');
      return;
    }

    if (!editingId && !formData.password) {
      setError('A senha é obrigatória para novos operadores.');
      return;
    }

    const operatorData: any = {
      cpf: formData.cpf,
      status: formData.status,
      unidade_cnes: formData.unidade_cnes || null,
      cpf_operador: authUser?.cpf || null
    };

    // Tenta descobrir quais colunas usar baseado no que já carregamos ou tenta ambas
    // Uma estratégia segura é tentar salvar com um conjunto e se falhar tentar o outro
    const primaryData = {
      ...operatorData,
      name: formData.name,
      initials: getInitials(formData.name),
      ...(formData.password ? { password: formData.password } : {})
    };

    const secondaryData = {
      ...operatorData,
      nome: formData.name,
      sigla: getInitials(formData.name),
      ...(formData.password ? { senha: formData.password } : {})
    };

    if (editingId) {
      let { error: updateError } = await supabase
        .from('operadores')
        .update(primaryData)
        .eq('cpf', editingId);

      if (updateError && updateError.message.includes('column')) {
        // Tenta com os nomes em português se falhar por coluna inexistente
        const { error: retryError } = await supabase
          .from('operadores')
          .update(secondaryData)
          .eq('cpf', editingId);
        updateError = retryError;
      }

      if (updateError && updateError.message.includes('unidade_cnes')) {
        // Fallback if unidade_cnes column doesn't exist yet
        const { unidade_cnes: _, ...primaryWithoutUnit } = primaryData;
        const { unidade_cnes: __, ...secondaryWithoutUnit } = secondaryData;
        
        let { error: retryError } = await supabase
          .from('operadores')
          .update(primaryWithoutUnit)
          .eq('cpf', editingId);
          
        if (retryError && retryError.message.includes('column')) {
          const { error: retryError2 } = await supabase
            .from('operadores')
            .update(secondaryWithoutUnit)
            .eq('cpf', editingId);
          retryError = retryError2;
        }
        updateError = retryError;
      }

      if (updateError) {
        console.error('Erro detalhado Supabase (Update):', updateError);
        if (updateError.code === '23505' || updateError.message.includes('duplicate key') || updateError.message.includes('unique constraint')) {
          setError('Este CPF já está cadastrado para outro operador.');
        } else {
          setError(`Erro ao atualizar: ${updateError.message}`);
        }
        return;
      }
      setEditingId(null);
    } else {
      let { error: insertError } = await supabase
        .from('operadores')
        .insert([primaryData]);

      if (insertError && insertError.message.includes('column')) {
        const { error: retryError } = await supabase
          .from('operadores')
          .insert([secondaryData]);
        insertError = retryError;
      }

      if (insertError && insertError.message.includes('unidade_cnes')) {
        // Fallback if unidade_cnes column doesn't exist yet
        const { unidade_cnes: _, ...primaryWithoutUnit } = primaryData;
        const { unidade_cnes: __, ...secondaryWithoutUnit } = secondaryData;
        
        let { error: retryError } = await supabase
          .from('operadores')
          .insert([primaryWithoutUnit]);
          
        if (retryError && retryError.message.includes('column')) {
          const { error: retryError2 } = await supabase
            .from('operadores')
            .insert([secondaryWithoutUnit]);
          retryError = retryError2;
        }
        insertError = retryError;
      }

      if (insertError) {
        console.error('Erro detalhado Supabase (Insert):', insertError);
        if (insertError.code === '23505' || insertError.message.includes('duplicate key') || insertError.message.includes('unique constraint')) {
          setError('Este CPF já está cadastrado para outro operador.');
        } else {
          setError(`Erro ao salvar: ${insertError.message}`);
        }
        return;
      }
    }

    setFormData({ name: '', cpf: '', password: '', status: 'Ativo', unidade_cnes: '' });
    setIsFormOpen(false);
    fetchOperators();
  };

  const handleEdit = (op: Operator) => {
    setEditingId(op.cpf);
    setFormData({
      name: op.name,
      cpf: op.cpf,
      password: '', // Password usually not shown
      status: op.status,
      unidade_cnes: op.unidade_cnes || ''
    });
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', cpf: '', password: '', status: 'Ativo', unidade_cnes: '' });
    setError(null);
    setIsFormOpen(false);
  };

  const handleDelete = async (cpf: string) => {
    setDeleteConfirmId(null);
    setError(null);
    setSuccess(null);

    const { error: deleteError } = await supabase
      .from('operadores')
      .delete()
      .eq('cpf', cpf);

    if (deleteError) {
      console.error('Erro ao excluir operador:', deleteError);
      setError(`Erro ao excluir operador: ${deleteError.message}`);
    } else {
      setSuccess('Operador excluído com sucesso!');
      fetchOperators();
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 lg:p-12 pb-32 max-w-7xl mx-auto space-y-8 md:space-y-12">
        {/* Page Header */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-12 h-1.5 bg-primary rounded-full"></span>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Controle de Acessos</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight font-headline text-on-surface uppercase text-primary">Operadores</h2>
            <p className="text-lg text-on-surface-variant/60 font-body max-w-2xl">Gerencie os perfis de acesso e permissões clínicas do sistema.</p>
          </div>
          <div className="flex items-center gap-3">
            <CSVImporter 
              tableName="operadores" 
              expectedColumns={['nome', 'cpf', 'senha', 'status', 'nivel_acesso', 'sigla', 'unidade_cnes']}
              conflictColumn="cpf"
              onSuccess={fetchOperators}
              title="Importar Operadores"
              transformData={(data) => data.map(item => {
                const nome = item.nome || item.name || '';
                const sigla = item.sigla || item.initials || getInitials(nome);
                const senha = item.senha || item.password || item.senha_acesso || '123456';
                
                return {
                  ...item,
                  nome: nome,
                  sigla: sigla,
                  senha: senha,
                  unidade_cnes: item.unidade_cnes || null
                };
              })}
            />
            <div className="flex items-center gap-3 bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant/20 shadow-sm">
              <Users className="text-primary w-5 h-5" />
              <span className="text-sm font-bold font-label uppercase tracking-widest text-on-surface-variant">{filteredOperators.length} Operadores</span>
            </div>
          </div>
        </header>

        {/* Layout Grid: Bento Style */}
        {!isSupabaseConfigured && (
          <div className="bg-error/10 border border-error/20 p-6 rounded-2xl text-error mb-8 flex items-start gap-4 shadow-sm">
            <AlertTriangle className="w-8 h-8 shrink-0" />
            <div>
              <h4 className="font-bold text-lg">Supabase não configurado</h4>
              <p className="text-sm mt-1 opacity-80">As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não foram encontradas ou são inválidas. O sistema não poderá carregar ou salvar dados na Vercel.</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-12 gap-6 md:gap-8">
          {/* Form Section - Bento Card 1 */}
          <AnimatePresence>
            {isFormOpen && (
              <motion.section 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="col-span-12 space-y-6 overflow-hidden"
              >
                <div className="bg-surface-container-lowest p-6 md:p-8 rounded-2xl shadow-md border border-outline-variant/10 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-primary-container"></div>
                  <div className="flex justify-between items-center mb-8">
                    <h3 className="text-xl font-bold font-headline flex items-center gap-3">
                      {editingId ? <Edit2 className="text-primary w-6 h-6" /> : <UserPlus className="text-primary w-6 h-6" />}
                      {editingId ? 'Editar Registro' : 'Novo Registro'}
                    </h3>
                    <button 
                      onClick={cancelEdit}
                      className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                  <form className="space-y-6" onSubmit={handleSubmit}>
                    {error && (
                      <div className="p-4 rounded-xl bg-error-container/30 border border-error/20 text-error text-xs font-semibold flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <span className="flex-1">{error}</span>
                      </div>
                    )}
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">Nome Completo</label>
                      <div className="relative group">
                        <UserPlus className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                        <input 
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl pl-12 pr-4 py-3.5 transition-all font-body outline-none text-xs" 
                          placeholder="Ex: Jean Luc Picard" 
                          type="text" 
                          value={formData.name || ''}
                          onChange={(e) => {
                            setFormData({ ...formData, name: e.target.value });
                            setError(null);
                          }}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">CPF</label>
                      <div className="relative group">
                        <Fingerprint className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                        <input 
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl pl-12 pr-4 py-3.5 transition-all font-body outline-none text-xs" 
                          placeholder="000.000.000-00" 
                          type="text" 
                          value={formData.cpf || ''}
                          onChange={handleCpfChange}
                          maxLength={14}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">Unidade de Saúde</label>
                      <div className="relative group">
                        <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                        <select 
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl pl-12 pr-4 py-3.5 transition-all font-body outline-none text-xs appearance-none"
                          value={formData.unidade_cnes || ''}
                          onChange={(e) => setFormData({ ...formData, unidade_cnes: e.target.value })}
                        >
                          <option value="">Selecione uma unidade...</option>
                          {units.map(unit => (
                            <option key={unit.cnes} value={unit.cnes}>{unit.nome_fantasia}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">Status</label>
                        <div className="relative group">
                          <Shield className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                          <select 
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl pl-12 pr-4 py-3.5 transition-all font-body outline-none text-xs appearance-none"
                            value={formData.status || 'Ativo'}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Ativo' | 'Bloqueado' })}
                          >
                            <option value="Ativo">Ativo</option>
                            <option value="Bloqueado">Bloqueado</option>
                          </select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-bold uppercase tracking-widest text-on-surface-variant font-label ml-1">Senha</label>
                        <div className="relative group">
                          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-primary transition-colors w-5 h-5" />
                          <input 
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary/30 focus:bg-white focus:ring-4 focus:ring-primary/5 rounded-xl pl-12 pr-4 py-3.5 transition-all font-body outline-none text-xs" 
                            placeholder={editingId ? "Manter" : "••••••••"} 
                            type="password" 
                            value={formData.password || ''}
                            onChange={(e) => {
                              setFormData({ ...formData, password: e.target.value });
                              setError(null);
                            }}
                            required={!editingId}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="pt-6 space-y-3">
                      <button className="w-full bg-primary text-white font-bold py-4 rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-3 font-headline uppercase tracking-widest text-[11px]" type="submit">
                        {editingId ? <ShieldCheck className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                        {editingId ? 'Atualizar Operador' : 'Cadastrar Operador'}
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
                      {!editingId && (formData.name || formData.cpf || formData.password) && (
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

                {/* Informational Card - Bento Card 2 */}
                <div className="bg-tertiary-container/10 p-6 rounded-2xl border border-tertiary-container/20 group hover:bg-tertiary-container/20 transition-colors duration-500">
                  <div className="flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-tertiary-container/20 flex items-center justify-center text-tertiary shrink-0 group-hover:scale-110 transition-transform">
                      <Shield className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-tertiary mb-1 uppercase tracking-wider">Diretriz de Segurança</h4>
                      <p className="text-xs text-on-tertiary-container/70 leading-relaxed font-body">As senhas devem ser alfanuméricas e conter pelo menos 8 caracteres para garantir a integridade dos dados clínicos e conformidade com a LGPD.</p>
                    </div>
                  </div>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          {/* Table Section - Bento Card 3 */}
          <section className="col-span-12">
            <div className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-md border border-outline-variant/10 flex flex-col h-full">
              <div className="p-6 md:p-8 border-b border-surface-container-low flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest/50 backdrop-blur-sm sticky top-0 z-10">
                <div>
                  <h3 className="text-2xl font-bold font-headline text-on-surface">Operadores</h3>
                  <p className="text-xs text-on-surface-variant font-body opacity-60 mt-1">Listagem completa de profissionais autorizados</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                    <input 
                      type="text" 
                      placeholder="Filtrar..."
                      className="bg-surface-container-low border-none rounded-full pl-9 pr-4 py-2 text-xs font-body focus:ring-2 focus:ring-primary/20 outline-none w-40 md:w-64 transition-all"
                      value={searchQuery}
                      onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setCurrentPage(1);
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
                {loading ? (
                  <div className="p-8 space-y-6">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <div key={i} className="flex items-center gap-6 animate-pulse">
                        <div className="w-11 h-11 bg-surface-container-high rounded-2xl"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-surface-container-high rounded w-1/3"></div>
                          <div className="h-2 bg-surface-container-high rounded w-1/4"></div>
                        </div>
                        <div className="w-32 h-4 bg-surface-container-high rounded"></div>
                        <div className="w-24 h-6 bg-surface-container-high rounded-full"></div>
                        <div className="w-20 h-10 bg-surface-container-high rounded-xl"></div>
                      </div>
                    ))}
                  </div>
                ) : filteredOperators.length === 0 ? (
                  <div className="p-20 text-center text-slate-400 font-body flex flex-col items-center gap-4">
                    <SearchX className="text-6xl opacity-20 w-16 h-16" />
                    <p className="text-sm font-medium">Nenhum operador encontrado com os critérios atuais.</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-separate border-spacing-0 min-w-[1000px]">
                      <thead className="sticky top-0 z-30 bg-surface-container-low">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-label border-b border-outline-variant/5 w-[250px]">Profissional</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-label border-b border-outline-variant/5 w-[180px]">Identificação</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-label border-b border-outline-variant/5 w-[120px]">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant font-label text-center border-b border-outline-variant/5 sticky right-0 bg-surface-container-low z-40 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] w-[180px]">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-container-low/50">
                        {filteredOperators
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((op) => (
                            <tr key={op.cpf} className="hover:bg-surface-container-low/40 transition-all group">
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-surface-container-high to-surface-container-highest flex items-center justify-center text-sm font-bold text-primary shadow-sm group-hover:scale-105 transition-transform">
                                    {op.initials}
                                  </div>
                                  <div>
                                    <p className="font-bold text-on-surface text-sm font-headline leading-tight uppercase line-clamp-1">{op.name}</p>
                                    <p className="text-[9px] text-on-surface-variant/60 font-body uppercase tracking-widest mt-0.5 line-clamp-1">
                                      {op.unidades_saude?.nome_fantasia || 'Sem Unidade'}
                                    </p>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex flex-col">
                                  <span className="text-xs font-mono text-on-surface-variant font-medium">{op.cpf}</span>
                                  <span className="text-[8px] text-on-surface-variant/40 font-body uppercase tracking-tighter mt-0.5 whitespace-nowrap">CPF Verificado</span>
                                </div>
                              </td>
                              <td className="px-4 py-4">
                                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${
                                  op.status === 'Ativo' 
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                                    : 'bg-error-container/50 text-on-error-container border border-error/10'
                                }`}>
                                  <span className={`w-1 h-1 rounded-full ${op.status === 'Ativo' ? 'bg-emerald-500' : 'bg-error'} animate-pulse`}></span>
                                  {op.status}
                                </div>
                              </td>
                              <td className="px-6 py-4 sticky right-0 bg-surface-container-lowest group-hover:bg-surface-container-low transition-colors z-30 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                                <div className="flex items-center justify-center gap-2">
                                  <button 
                                    onClick={() => handleEdit(op)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all shadow-sm group/btn"
                                    title="Editar Operador"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                    <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover/btn:inline">Editar</span>
                                  </button>
                                  <button 
                                    onClick={() => setDeleteConfirmId(op.cpf)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm group/btn"
                                    title="Excluir Operador"
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
                      totalPages={Math.ceil(filteredOperators.length / itemsPerPage)}
                      onPageChange={setCurrentPage}
                      totalItems={filteredOperators.length}
                      itemsPerPage={itemsPerPage}
                      itemName="operadores"
                    />
                  </>
                )}
              </div>
            </div>

            {/* Asymmetric Decoration/Note */}
            <div className="mt-8 flex justify-between items-center px-4">
              <div className="flex items-center gap-2 opacity-30">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[9px] font-bold uppercase tracking-widest">Dados Criptografados</span>
              </div>
              <div className="max-w-xs text-right opacity-40">
                <p className="text-[9px] font-headline font-black uppercase tracking-[0.3em] mb-1">Internal Ledger Audit</p>
                <p className="text-[10px] leading-relaxed font-body">Todas as alterações são registradas com timestamp e assinatura do administrador para conformidade regulatória.</p>
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
                  Você está prestes a excluir o operador com CPF <span className="font-black text-primary">{deleteConfirmId}</span>. Esta ação não pode ser desfeita.
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
