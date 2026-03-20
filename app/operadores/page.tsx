'use client';

import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';

interface Operator {
  nome: string;
  cpf: string;
  status: 'Ativo' | 'Bloqueado';
  sigla: string;
}

export default function OperadoresPage() {
  const { searchQuery } = useSearch();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    let isMounted = true;
    const loadOperators = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('operadores')
        .select('*')
        .order('nome');
      
      if (isMounted) {
        if (error) {
          console.error('Error fetching operators:', error);
        } else if (data) {
          setOperators(data as Operator[]);
        }
        setLoading(false);
      }
    };
    loadOperators();
    return () => { isMounted = false; };
  }, []);

  const fetchOperators = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('operadores')
      .select('*')
      .order('nome');
    
    if (error) {
      console.error('Error fetching operators:', error);
    } else if (data) {
      setOperators(data as Operator[]);
    }
    setLoading(false);
  };

  const filteredOperators = operators.filter(op => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return true;

    // Normaliza para remover acentos (ex: 'João' vira 'Joao')
    const normalize = (str: string) => 
      str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

    const nome = normalize(op.nome);
    const cpf = op.cpf.replace(/\D/g, '');
    const sigla = normalize(op.sigla);
    
    const queryNormalizada = normalize(query);
    const queryNumeros = query.replace(/\D/g, '');

    return (
      nome.includes(queryNormalizada) ||
      sigla.includes(queryNormalizada) ||
      (queryNumeros !== '' && cpf.includes(queryNumeros))
    );
  });

  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    senha: '',
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

    if (!formData.nome.trim()) {
      setError('O nome é obrigatório.');
      return;
    }

    if (formData.cpf.length !== 14) {
      setError('O CPF deve ter 11 dígitos (000.000.000-00).');
      return;
    }

    if (!editingId && !formData.senha) {
      setError('A senha é obrigatória para novos operadores.');
      return;
    }

    const operatorData = {
      nome: formData.nome,
      cpf: formData.cpf,
      status: formData.status,
      sigla: getInitials(formData.nome),
      ...(formData.senha ? { senha: formData.senha } : {})
    };

    if (editingId) {
      const { error: updateError } = await supabase
        .from('operadores')
        .update(operatorData)
        .eq('cpf', editingId);

      if (updateError) {
        console.error('Erro detalhado Supabase (Update):', updateError);
        setError(`Erro ao atualizar: ${updateError.message} (Código: ${updateError.code})`);
        return;
      }
      setEditingId(null);
    } else {
      const { error: insertError } = await supabase
        .from('operadores')
        .insert([operatorData]);

      if (insertError) {
        console.error('Erro detalhado Supabase (Insert):', insertError);
        setError(`Erro ao salvar: ${insertError.message} (Código: ${insertError.code})`);
        return;
      }
    }

    setFormData({ nome: '', cpf: '', senha: '', status: 'Ativo' });
    fetchOperators();
  };

  const handleEdit = (op: Operator) => {
    setEditingId(op.cpf);
    setFormData({
      nome: op.nome,
      cpf: op.cpf,
      senha: '', // Password usually not shown
      status: op.status
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData({ nome: '', cpf: '', senha: '', status: 'Ativo' });
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
                    value={formData.nome}
                    onChange={(e) => {
                      setFormData({ ...formData, nome: e.target.value });
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
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant font-label">Senha</label>
                  <input 
                    className="w-full bg-surface-container-low border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-t-lg px-4 py-3 transition-all font-body" 
                    placeholder={editingId ? "Deixe em branco para manter" : "••••••••"} 
                    type="password" 
                    value={formData.senha}
                    onChange={(e) => {
                      setFormData({ ...formData, senha: e.target.value });
                      setError(null);
                    }}
                    required={!editingId}
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
                <div className="pt-4 space-y-3">
                  <button className="w-full bg-gradient-to-r from-primary to-primary-container text-white font-bold py-4 rounded-lg shadow-lg shadow-primary/10 hover:opacity-90 transition-opacity flex items-center justify-center gap-2 font-headline uppercase tracking-wide text-sm" type="submit">
                    <span className="material-symbols-outlined text-sm">{editingId ? 'edit' : 'save'}</span>
                    {editingId ? 'Atualizar Operador' : 'Salvar Operador'}
                  </button>
                  {(editingId || formData.nome || formData.cpf || formData.senha) && (
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
                      <th className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant font-label">Nome</th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant font-label">CPF</th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant font-label">Senha</th>
                      <th className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant font-label">Status</th>
                      <th className="px-8 py-4 text-[11px] font-black uppercase tracking-widest text-on-surface-variant font-label text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-container-low">
                    {filteredOperators.map((op) => (
                      <tr key={op.cpf} className="hover:bg-surface-container-low transition-colors group">
                        <td className="px-8 py-5">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">{op.sigla}</div>
                            <p className="font-semibold text-on-surface text-sm">{op.nome}</p>
                          </div>
                        </td>
                        <td className="px-6 py-5 text-sm font-body text-secondary">{op.cpf}</td>
                        <td className="px-6 py-5">
                          <span className="text-slate-300 tracking-widest">••••••••</span>
                        </td>
                        <td className="px-6 py-5">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-tighter ${
                            op.status === 'Ativo' ? 'bg-green-100 text-green-700' : 'bg-error-container text-on-error-container'
                          }`}>
                            {op.status}
                          </span>
                        </td>
                        <td className="px-8 py-5 text-right">
                          <button 
                            onClick={() => handleEdit(op)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all text-[10px] font-bold uppercase tracking-wider group-hover:scale-105"
                          >
                            <span className="material-symbols-outlined text-sm">edit</span>
                            Editar
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
