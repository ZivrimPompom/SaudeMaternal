'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface Operator {
  id: string;
  name: string;
  cpf: string;
  status: 'Ativo' | 'Bloqueado';
  initials: string;
}

export default function OperadoresPage() {
  const { searchQuery } = useSearch();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      return;
    }
    let isMounted = true;
    const loadOperators = async () => {
      setLoading(true);
      try {
        // Tenta buscar ordenando por 'name' ou 'nome'
        let result = await supabase
          .from('operadores')
          .select('*')
          .order('name', { ascending: true });
        
        if (result.error) {
          // Se falhar por causa da coluna 'name', tenta 'nome'
          result = await supabase
            .from('operadores')
            .select('*')
            .order('nome', { ascending: true });
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
              initials: item.initials || item.sigla || (item.name || item.nome || '??').substring(0, 2).toUpperCase()
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
    loadOperators();
    return () => { isMounted = false; };
  }, []);

  const fetchOperators = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    try {
      let result = await supabase
        .from('operadores')
        .select('*')
        .order('name', { ascending: true });
      
      if (result.error) {
        result = await supabase
          .from('operadores')
          .select('*')
          .order('nome', { ascending: true });
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
          initials: item.initials || item.sigla || (item.name || item.nome || '??').substring(0, 2).toUpperCase()
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

  const [formData, setFormData] = useState({
    name: '',
    cpf: '',
    password: '',
    status: 'Ativo' as 'Ativo' | 'Bloqueado'
  });

  const [editingId, setEditingId] = useState<string | null>(null); // Now stores the CPF
  const [error, setError] = useState<string | null>(null);

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

      if (updateError) {
        console.error('Erro detalhado Supabase (Update):', updateError);
        setError(`Erro ao atualizar: ${updateError.message}`);
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

      if (insertError) {
        console.error('Erro detalhado Supabase (Insert):', insertError);
        setError(`Erro ao salvar: ${insertError.message}`);
        return;
      }
    }

    setFormData({ name: '', cpf: '', password: '', status: 'Ativo' });
    fetchOperators();
  };

  const handleEdit = (op: Operator) => {
    setEditingId(op.cpf);
    setFormData({
      name: op.name,
      cpf: op.cpf,
      password: '', // Password usually not shown
      status: op.status
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ name: '', cpf: '', password: '', status: 'Ativo' });
    setError(null);
  };

  return (
    <DashboardLayout>
      <div className="p-12 max-w-7xl mx-auto space-y-12">
        {/* Page Header */}
        <header className="space-y-2">
          <h2 className="text-5xl font-extrabold tracking-tight font-headline text-on-surface">Cadastro de Operadores</h2>
          <p className="text-lg text-on-secondary-container font-body opacity-70">Gerencie os perfis de acesso</p>
        </header>

        {/* Layout Grid: Bento Style */}
        {!isSupabaseConfigured && (
          <div className="bg-error/10 border border-error/20 p-6 rounded-xl text-error mb-8">
            <h4 className="font-bold flex items-center gap-2">
              <span className="material-symbols-outlined">warning</span>
              Supabase não configurado
            </h4>
            <p className="text-sm mt-2">As variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY não foram encontradas ou são inválidas. O sistema não poderá carregar ou salvar dados.</p>
          </div>
        )}

        <div className="grid grid-cols-12 gap-8">
          {/* Form Section */}
          <section className="col-span-12 lg:col-span-4 space-y-6">
            <div className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/15">
              <h3 className="text-xl font-bold font-headline mb-6 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-primary rounded-full"></span>
                {editingId ? 'Editar Registro' : 'Novo Registro'}
              </h3>
              <form className="space-y-5" onSubmit={handleSubmit}>
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center gap-2 animate-pulse">
                    <span className="material-symbols-outlined text-sm">error</span>
                    {error}
                  </div>
                )}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Nome Completo</label>
                  <input 
                    className="w-full bg-surface-container-low border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 transition-all font-body" 
                    placeholder="Ex: Jean Luc Picard" 
                    type="text" 
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value });
                      setError(null);
                    }}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-label">CPF</label>
                  <input 
                    className="w-full bg-surface-container-low border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 transition-all font-body" 
                    placeholder="000.000.000-00" 
                    type="text" 
                    value={formData.cpf}
                    onChange={handleCpfChange}
                    maxLength={14}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Status</label>
                  <select 
                    className="w-full bg-surface-container-low border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 transition-all font-body appearance-none"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Ativo' | 'Bloqueado' })}
                  >
                    <option value="Ativo">Ativo</option>
                    <option value="Bloqueado">Bloqueado</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Senha</label>
                  <input 
                    className="w-full bg-surface-container-low border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 transition-all font-body" 
                    placeholder={editingId ? "Deixe em branco para manter" : "••••••••"} 
                    type="password" 
                    value={formData.password}
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      setError(null);
                    }}
                    required={!editingId}
                  />
                </div>
                <div className="pt-4 space-y-3">
                  <button className="w-full bg-gradient-to-r from-primary to-primary-container text-white font-bold py-4 rounded-lg shadow-lg shadow-primary/10 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-headline uppercase tracking-wide text-sm" type="submit">
                    <span className="material-symbols-outlined text-sm">{editingId ? 'edit' : 'save'}</span>
                    {editingId ? 'Atualizar Operador' : 'Salvar Operador'}
                  </button>
                  {(editingId || formData.name || formData.cpf || formData.password) && (
                    <button 
                      type="button"
                      onClick={cancelEdit}
                      className="w-full bg-slate-100 text-slate-500 font-bold py-3 rounded-lg hover:bg-slate-200 transition-colors font-headline uppercase tracking-wide text-[10px] flex items-center justify-center gap-2"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                      {editingId ? 'Cancelar Edição' : 'Limpar Formulário'}
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Informational Card */}
            <div className="bg-secondary-container/30 p-6 rounded-xl border border-secondary-container/50">
              <div className="flex gap-4">
                <span className="material-symbols-outlined text-secondary">info</span>
                <div>
                  <h4 className="text-sm font-bold text-on-secondary-fixed-variant mb-1">Dica de Segurança</h4>
                  <p className="text-xs text-on-secondary-container leading-relaxed">As senhas devem ser alfanuméricas e conter pelo menos 8 caracteres para garantir a integridade dos dados clínicos.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Table Section */}
          <section className="col-span-12 lg:col-span-8">
            <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-sm border border-outline-variant/15">
              <div className="p-6 border-b border-surface-container-low flex justify-between items-center">
                <h3 className="text-xl font-bold font-headline">Operadores Ativos</h3>
                <span className="bg-tertiary-container text-on-tertiary-container px-3 py-1 rounded-full text-[10px] font-bold font-label uppercase tracking-widest">{filteredOperators.length} Registros</span>
              </div>
              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-12 text-center text-slate-400 font-body">
                    <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                    Carregando operadores...
                  </div>
                ) : filteredOperators.length === 0 ? (
                  <div className="p-12 text-center text-slate-400 font-body">
                    Nenhum operador encontrado.
                  </div>
                ) : (
                  <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-low/50">
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant font-label">Nome</th>
                      <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant font-label">CPF</th>
                      <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant font-label">Status</th>
                      <th className="px-4 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant font-label">Senha</th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant font-label text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low">
                    {filteredOperators.map((op) => (
                      <tr key={op.cpf} className="hover:bg-surface-container-low transition-colors group">
                        <td className="px-6 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{op.initials}</div>
                            <p className="font-semibold text-on-surface text-sm">{op.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-5 text-sm font-body text-secondary">{op.cpf}</td>
                        <td className="px-4 py-5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                            op.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-error-container text-on-error-container'
                          }`}>
                            {op.status}
                          </span>
                        </td>
                        <td className="px-4 py-5">
                          <span className="text-slate-300 tracking-widest">••••••••</span>
                        </td>
                        <td className="px-6 py-5 text-right">
                          <button 
                            onClick={() => handleEdit(op)}
                            title="Editar Operador"
                            className="w-8 h-8 inline-flex items-center justify-center rounded-full bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all group-hover:scale-110 shadow-sm"
                          >
                            <span className="material-symbols-outlined text-lg">edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                )}
              </div>
            </div>

            {/* Asymmetric Decoration/Note */}
            <div className="mt-8 flex justify-end">
              <div className="max-w-xs text-right opacity-40">
                <p className="text-[10px] font-headline font-bold uppercase tracking-[0.2em] mb-2">Internal Ledger Audit</p>
                <p className="text-[11px] leading-relaxed">All changes are logged with timestamp and administrator signature for regulatory compliance.</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </DashboardLayout>
  );
}
