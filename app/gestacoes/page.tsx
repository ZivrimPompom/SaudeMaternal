'use client';

import React, { useState, useEffect, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { useAuth } from '@/context/AuthContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import Pagination from '@/components/Pagination';
import CSVImporter from '@/components/CSVImporter';

interface Gestacao {
  sispn: string;
  cpf_paciente: string;
  dum: string;
  dpp: string;
  data_abertura: string;
  data_cadastro: string;
  operador: string;
  referencia_tecnica: string;
  acs: string;
  equipe: string;
  idade_cadastro: number;
  fase_vida_cadastro: string;
  gestacao_anterior: number;
  aborto: number;
  parto: number;
  sifilis: string;
  sifilis_tratada: string;
  hiv: string;
  hepatite_b: string;
  hepatite_c: string;
  classificacao_pn: string;
  alto_risco_compartilhado: string;
  created_at?: string;
  // Joined/Computed fields for display
  paciente_nome?: string;
  referencia_tecnica_nome?: string;
  acs_nome?: string;
  operador_nome?: string;
  pacientes?: any;
}

interface Paciente {
  cpf: string;
  gestante: string;
  data_nascimento: string;
}

interface Operador {
  nome: string;
  cpf: string;
  status: string;
}

interface Profissional {
  nome: string;
  cpf: string;
  cbo: string;
  equipe: string;
  categoria_nome?: string;
}

export default function GestacoesPage() {
  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen } = useSearch();
  const { user: authUser } = useAuth();
  
  const [gestacoes, setGestacoes] = useState<Gestacao[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [operadores, setOperadores] = useState<Operador[]>([]);
  const [profissionais, setProfissionais] = useState<Profissional[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [formData, setFormData] = useState<Partial<Gestacao>>({
    sispn: '',
    cpf_paciente: '',
    dum: '',
    dpp: '',
    data_abertura: '',
    data_cadastro: new Date().toISOString().split('T')[0],
    operador: 'NÃO INFORMADO',
    referencia_tecnica: 'NÃO INFORMADO',
    acs: 'NÃO INFORMADO',
    equipe: 'NÃO INFORMADO',
    idade_cadastro: 0,
    fase_vida_cadastro: '',
    gestacao_anterior: 0,
    aborto: 0,
    parto: 0,
    sifilis: 'NÃO',
    sifilis_tratada: 'NÃO SABE',
    hiv: 'NEGATIVO',
    hepatite_b: 'NÃO REAGENTE',
    hepatite_c: 'NÃO REAGENTE',
    classificacao_pn: 'HABITUAL',
    alto_risco_compartilhado: 'NÃO'
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isPacienteSearchOpen, setIsPacienteSearchOpen] = useState(false);

  // Reset form when closed
  useEffect(() => {
    if (!isFormOpen) {
      setEditingId(null);
      setFormData({
        sispn: '',
        cpf_paciente: '',
        dum: '',
        dpp: '',
        data_abertura: '',
        data_cadastro: new Date().toISOString().split('T')[0],
        operador: 'NÃO INFORMADO',
        referencia_tecnica: 'NÃO INFORMADO',
        acs: 'NÃO INFORMADO',
        equipe: 'NÃO INFORMADO',
        idade_cadastro: 0,
        fase_vida_cadastro: '',
        gestacao_anterior: 0,
        aborto: 0,
        parto: 0,
        sifilis: 'NÃO',
        sifilis_tratada: 'NÃO SABE',
        hiv: 'NEGATIVO',
        hepatite_b: 'NÃO REAGENTE',
        hepatite_c: 'NÃO REAGENTE',
        classificacao_pn: 'HABITUAL',
        alto_risco_compartilhado: 'NÃO'
      });
      setRtSearchQuery('');
      setAcsSearchQuery('');
      setError(null);
      setSuccess(null);
    }
  }, [isFormOpen]);
  const [pacienteSearchQuery, setPacienteSearchQuery] = useState('');

  // Searchable Dropdowns for RT and ACS
  const [rtSearchQuery, setRtSearchQuery] = useState('');
  const [isRtDropdownOpen, setIsRtDropdownOpen] = useState(false);
  const rtDropdownRef = React.useRef<HTMLDivElement>(null);

  const [acsSearchQuery, setAcsSearchQuery] = useState('');
  const [isAcsDropdownOpen, setIsAcsDropdownOpen] = useState(false);
  const acsDropdownRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (formData.referencia_tecnica && formData.referencia_tecnica !== 'NÃO INFORMADO') {
      const prof = profissionais.find(p => p.cpf === formData.referencia_tecnica);
      if (prof) {
        setFormData(prev => ({ ...prev, equipe: prof.equipe || 'SEM EQUIPE' }));
      }
    }
  }, [formData.referencia_tecnica, profissionais]);

  const [filters, setFilters] = useState({
    dpp: '',
    captacao: '',
    equipe: '',
    referencia: '',
    acs: '',
    status: 'ATIVA'
  });

  const uniqueDppMonths = useMemo(() => {
    const months = new Set<string>();
    gestacoes.forEach(g => {
      if (g.dpp) {
        const date = new Date(g.dpp);
        if (!isNaN(date.getTime())) {
          months.add(`${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`);
        }
      }
    });
    return Array.from(months).sort().reverse();
  }, [gestacoes]);

  const uniqueEquipes = useMemo(() => {
    const equipes = gestacoes.map(g => g.equipe).filter(Boolean);
    return Array.from(new Set(equipes)).sort();
  }, [gestacoes]);

  const uniqueReferencias = useMemo(() => {
    const refs = gestacoes.map(g => g.referencia_tecnica_nome).filter(Boolean);
    return Array.from(new Set(refs)).sort();
  }, [gestacoes]);

  const uniqueACS = useMemo(() => {
    const acs = gestacoes.map(g => g.acs_nome).filter(Boolean);
    return Array.from(new Set(acs)).sort();
  }, [gestacoes]);

  useEffect(() => {
    setIsFormOpen(false);
    fetchInitialData();

    // Click outside listener for dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      if (rtDropdownRef.current && !rtDropdownRef.current.contains(event.target as Node)) {
        setIsRtDropdownOpen(false);
      }
      if (acsDropdownRef.current && !acsDropdownRef.current.contains(event.target as Node)) {
        setIsAcsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [setIsFormOpen]);

  const fetchInitialData = async () => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    setLoading(true);
    
    try {
      // Fetch Pacientes for lookup first to use as fallback
      const { data: pacData } = await supabase.from('pacientes').select('cpf, gestante, data_nascimento').order('gestante');
      const pacientesList = pacData || [];
      setPacientes(pacientesList);

      // Fetch Operadores (Ativos)
      const { data: opData } = await supabase.from('operadores').select('nome, cpf, status').eq('status', 'Ativo');
      setOperadores(opData || []);

      // Fetch Profissionais with categories
      const { data: profData } = await supabase
        .from('profissionais')
        .select(`
          nome,
          cpf,
          cbo,
          equipe,
          categorias_profissionais (categoria)
        `);
      
      const formattedProf = profData?.map(p => {
        const cat = Array.isArray(p.categorias_profissionais) 
          ? p.categorias_profissionais[0] 
          : p.categorias_profissionais;
        return {
          nome: p.nome,
          cpf: p.cpf,
          cbo: p.cbo,
          equipe: p.equipe,
          categoria_nome: (cat as any)?.categoria
        };
      }) || [];
      setProfissionais(formattedProf);

      // Fetch Gestacoes with patient names
      const { data: gestData, error: gestError } = await supabase
        .from('gestacoes')
        .select(`
          *,
          pacientes (gestante)
        `)
        .order('created_at', { ascending: false });

      if (gestError) throw gestError;
      
      const formattedGest = gestData.map(g => {
        // Handle both object and array response from Supabase join
        const pacienteData = Array.isArray(g.pacientes) ? g.pacientes[0] : g.pacientes;
        let nome = pacienteData?.gestante;
        
        // Fallback: if join failed, try to find in the fetched patients list
        if (!nome) {
          const found = pacientesList.find(p => p.cpf === g.cpf_paciente);
          if (found) nome = found.gestante;
        }

        // Look up names for CPFs
        const refTec = profData?.find(p => p.cpf === g.referencia_tecnica)?.nome || g.referencia_tecnica;
        const acsNome = profData?.find(p => p.cpf === g.acs)?.nome || g.acs;
        const opNome = opData?.find(o => o.cpf === g.operador)?.nome || g.operador;

        return {
          ...g,
          paciente_nome: nome || 'PACIENTE NÃO ENCONTRADO',
          referencia_tecnica_nome: refTec,
          acs_nome: acsNome,
          operador_nome: opNome
        };
      });
      setGestacoes(formattedGest);

    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      setError(`Erro ao carregar dados: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatSispn = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1.$2')
      .replace(/(\.\d{2})\d+?$/, '$1');
  };

  const formatCpf = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    return digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2');
  };

  // Calculations
  useEffect(() => {
    if (formData.dum) {
      const dumDate = new Date(formData.dum);
      const dppDate = new Date(dumDate);
      dppDate.setDate(dppDate.getDate() + 280);
      setFormData(prev => ({ ...prev, dpp: dppDate.toISOString().split('T')[0] }));
    }
  }, [formData.dum]);

  useEffect(() => {
    const cpf = formData.cpf_paciente;
    if (cpf) {
      const cleanCpf = cpf.replace(/\D/g, '');
      const pac = pacientes.find(p => p.cpf === cleanCpf);
      if (pac) {
        const birth = new Date(pac.data_nascimento);
        const refDate = formData.data_cadastro ? new Date(formData.data_cadastro) : new Date();
        
        let age = refDate.getFullYear() - birth.getFullYear();
        const m = refDate.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && refDate.getDate() < birth.getDate())) {
          age--;
        }

        let lifeStage = 'ADULTO';
        if (age < 12) lifeStage = 'CRIANÇA';
        else if (age < 18) lifeStage = 'ADOLESCENTE';
        else if (age >= 60) lifeStage = 'IDOSO';

        setFormData(prev => ({ 
          ...prev, 
          idade_cadastro: age,
          fase_vida_cadastro: lifeStage
        }));
      }
    }
  }, [formData.cpf_paciente, formData.data_cadastro, pacientes]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const getGestacaoWeeks = (dum: string) => {
    if (!dum) return 0;
    const start = new Date(dum);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return Math.floor(diffDays / 7);
  };

  const getStatusCaptacao = (dum: string, dataCadastro: string) => {
    if (!dum || !dataCadastro) return '---';
    const start = new Date(dum);
    const cad = new Date(dataCadastro);
    const diffTime = cad.getTime() - start.getTime();
    const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);
    return diffWeeks <= 12 ? 'PRECOCE' : 'TARDIA';
  };

  const getGestacaoStatus = (dpp: string) => {
    if (!dpp) return '---';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(dpp);
    end.setHours(0, 0, 0, 0);
    return now >= end ? 'VENCIDA' : 'ATIVA';
  };

  const filteredGestacoes = gestacoes.filter(g => {
    // Search query filter
    const query = searchQuery.toLowerCase().trim();
    const normalize = (str: string) => 
      str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    
    const queryNormalizada = normalize(query);
    const queryDigits = query.replace(/\D/g, '');

    const matchesSearch = !query || (
      normalize(g.paciente_nome || '').includes(queryNormalizada) || 
      normalize(g.sispn || '').includes(queryNormalizada) ||
      normalize(g.cpf_paciente || '').includes(queryNormalizada) ||
      (queryDigits !== '' && g.sispn.replace(/\D/g, '').includes(queryDigits)) ||
      (queryDigits !== '' && g.cpf_paciente.replace(/\D/g, '').includes(queryDigits)) ||
      normalize(g.referencia_tecnica_nome || '').includes(queryNormalizada) ||
      normalize(g.acs_nome || '').includes(queryNormalizada) ||
      normalize(g.equipe || '').includes(queryNormalizada)
    );

    if (!matchesSearch) return false;

    // Additional filters
    if (filters.dpp) {
      const gDpp = g.dpp || '';
      // Convert yyyy/MM to yyyy-MM
      const filterMonth = filters.dpp.replace('/', '-');
      if (!gDpp.startsWith(filterMonth)) return false;
    }

    if (filters.captacao) {
      if (getStatusCaptacao(g.dum, g.data_cadastro) !== filters.captacao) return false;
    }

    if (filters.equipe && g.equipe !== filters.equipe) return false;
    if (filters.referencia && g.referencia_tecnica_nome !== filters.referencia) return false;
    if (filters.acs && g.acs_nome !== filters.acs) return false;

    if (filters.status) {
      if (getGestacaoStatus(g.dpp) !== filters.status) return false;
    }

    return true;
  });

  const calculateStatus = (dum: string) => {
    if (!dum) return 'ATIVA';
    const dumDate = new Date(dum + 'T12:00:00');
    const today = new Date();
    // Se a data de hoje for maior que DUM + 280 dias, está vencida
    const limitDate = new Date(dumDate);
    limitDate.setDate(limitDate.getDate() + 280);
    return today > limitDate ? 'VENCIDA' : 'ATIVA';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isSupabaseConfigured) return;

    // Validations
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Regra: só podemos cadastrar pacientes que tenham cadastro prévio
    const cpfPaciente = formData.cpf_paciente || '';
    const patientExists = pacientes.some(p => p.cpf.replace(/\D/g, '') === cpfPaciente.replace(/\D/g, ''));
    if (!patientExists) {
      setError('Paciente não encontrada no cadastro de pacientes. Cadastre a paciente primeiro.');
      return;
    }

    if (formData.dum) {
      if (formData.dum > todayStr) {
        setError('DUM não pode ser maior que hoje.');
        return;
      }
    }

    if (formData.data_abertura) {
      if (formData.data_abertura > todayStr) {
        setError('Data de Abertura não pode ser maior que hoje.');
        return;
      }
    }

    if (formData.data_cadastro) {
      if (formData.data_cadastro > todayStr) {
        setError('Data de Cadastro não pode ser maior que hoje.');
        return;
      }
      if (formData.data_abertura && formData.data_cadastro < formData.data_abertura) {
        setError('Data de Cadastro não pode ser menor que a Data de Abertura.');
        return;
      }
    }

    if ((formData.gestacao_anterior || 0) < 0 || (formData.aborto || 0) < 0 || (formData.parto || 0) < 0) {
      setError('Os campos de histórico (Gestações, Abortos, Partos) não podem ser negativos.');
      return;
    }

    try {
      // Resolve nomes para CPFs se necessário (para lidar com dados legados sendo editados)
      let rtCpf = formData.referencia_tecnica;
      if (rtCpf && rtCpf !== 'NÃO INFORMADO' && rtCpf.replace(/\D/g, '').length !== 11) {
        const found = profissionais.find(p => p.nome === rtCpf);
        if (found) rtCpf = found.cpf;
      }

      let acsCpf = formData.acs;
      if (acsCpf && acsCpf !== 'NÃO INFORMADO' && acsCpf.replace(/\D/g, '').length !== 11) {
        const found = profissionais.find(p => p.nome === acsCpf);
        if (found) acsCpf = found.cpf;
      }

      const { 
        paciente_nome, 
        referencia_tecnica_nome, 
        acs_nome, 
        operador_nome, 
        pacientes,
        ...cleanFormData 
      } = formData;

      const payload = {
        ...cleanFormData,
        sispn: formData.sispn?.replace(/\D/g, ''),
        cpf_paciente: formData.cpf_paciente?.replace(/\D/g, ''),
        operador: authUser?.cpf?.replace(/\D/g, '') || 'SISTEMA',
        referencia_tecnica: rtCpf?.replace(/\D/g, '') || 'NÃO INFORMADO',
        acs: acsCpf?.replace(/\D/g, '') || 'NÃO INFORMADO',
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('gestacoes')
          .update(payload)
          .eq('sispn', editingId);

        if (updateError) throw updateError;
        setSuccess('Gestação atualizada com sucesso!');
      } else {
        const { error: insertError } = await supabase
          .from('gestacoes')
          .insert([payload]);

        if (insertError) {
          if (insertError.code === '23505') {
            setError('Este SISPN já está cadastrado.');
            return;
          }
          throw insertError;
        }
        setSuccess('Gestação cadastrada com sucesso!');
      }

      setFormData({
        sispn: '',
        cpf_paciente: '',
        dum: '',
        dpp: '',
        data_abertura: '',
        data_cadastro: new Date().toISOString().split('T')[0],
        operador: 'NÃO INFORMADO',
        referencia_tecnica: 'NÃO INFORMADO',
        acs: 'NÃO INFORMADO',
        equipe: 'NÃO INFORMADO',
        idade_cadastro: 0,
        fase_vida_cadastro: '',
        gestacao_anterior: 0,
        aborto: 0,
        parto: 0,
        sifilis: 'NÃO',
        sifilis_tratada: 'NÃO SABE',
        hiv: 'NEGATIVO',
        hepatite_b: 'NÃO REAGENTE',
        hepatite_c: 'NÃO REAGENTE',
        classificacao_pn: 'HABITUAL',
        alto_risco_compartilhado: 'NÃO'
      });
      setEditingId(null);
      setIsFormOpen(false);
      fetchInitialData();
    } catch (err: any) {
      console.error('Error saving gestação:', err);
      setError(err.message || 'Erro ao salvar gestação.');
    }
  };

  const handleEdit = (g: Gestacao) => {
    setEditingId(g.sispn);
    setFormData({
      ...g,
      sispn: formatSispn(g.sispn),
      cpf_paciente: formatCpf(g.cpf_paciente)
    });
    setRtSearchQuery(g.referencia_tecnica_nome || '');
    setAcsSearchQuery(g.acs_nome || '');
    setError(null);
    setSuccess(null);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (sispn: string) => {
    setDeleteConfirmId(null);
    const { error: deleteError } = await supabase
      .from('gestacoes')
      .delete()
      .eq('sispn', sispn);

    if (deleteError) {
      setError(`Erro ao excluir: ${deleteError.message}`);
    } else {
      setSuccess('Gestação excluída com sucesso!');
      fetchInitialData();
    }
  };

  const selectedPaciente = useMemo(() => {
    const cpf = formData.cpf_paciente?.replace(/\D/g, '');
    return pacientes.find(p => p.cpf === cpf);
  }, [formData.cpf_paciente, pacientes]);

  const enfermeiros = profissionais.filter(p => {
    const cbo = p.cbo || '';
    return cbo.startsWith('2235');
  });
  const displayEnfermeiros = enfermeiros;

  const acsList = profissionais.filter(p => {
    const cbo = p.cbo || '';
    return cbo === '515105';
  });
  const displayAcs = acsList;

  const filteredPacientesLookup = useMemo(() => {
    const normalize = (str: string) => 
      str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    
    const query = normalize(pacienteSearchQuery);
    const queryDigits = pacienteSearchQuery.replace(/\D/g, '');

    if (!query && !queryDigits) return pacientes.slice(0, 10);
    
    return pacientes.filter(p => 
      normalize(p.gestante).includes(query) || 
      (queryDigits !== '' && p.cpf.includes(queryDigits))
    ).slice(0, 10);
  }, [pacientes, pacienteSearchQuery]);

  const rtSearchResults = useMemo(() => {
    const normalize = (str: string) => 
      str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    
    const query = normalize(rtSearchQuery);
    if (!query) return enfermeiros.slice(0, 10);
    
    return enfermeiros.filter(p => 
      normalize(p.nome).includes(query) || 
      p.cpf.includes(query.replace(/\D/g, ''))
    ).slice(0, 10);
  }, [enfermeiros, rtSearchQuery]);

  const acsSearchResults = useMemo(() => {
    const normalize = (str: string) => 
      str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    
    const query = normalize(acsSearchQuery);
    if (!query) return acsList.slice(0, 10);
    
    return acsList.filter(p => 
      normalize(p.nome).includes(query) || 
      p.cpf.includes(query.replace(/\D/g, ''))
    ).slice(0, 10);
  }, [acsList, acsSearchQuery]);

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 lg:p-12 pb-32 max-w-7xl mx-auto space-y-8 md:space-y-12">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-12 h-1.5 bg-primary rounded-full"></span>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Acompanhamento Pré-Natal</span>
            </div>
            <h2 className="text-5xl font-black tracking-tight font-headline text-on-surface uppercase text-primary">Gestações</h2>
            <p className="text-lg text-on-surface-variant/60 font-body max-w-2xl">Controle e monitoramento de ciclos gestacionais.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <CSVImporter 
              tableName="gestacoes"
              title="Importar Gestações"
              expectedColumns={[
                'sispn', 'cpf_paciente', 'dum', 'dpp', 'data_abertura', 'data_cadastro',
                'referencia_tecnica', 'acs', 'equipe', 'idade_cadastro', 'fase_vida_cadastro',
                'gestacao_anterior', 'aborto', 'parto', 'sifilis', 'sifilis_tratada',
                'hiv', 'hepatite_b', 'hepatite_c', 'classificacao_pn', 'alto_risco_compartilhado'
              ]}
              requiredColumns={['sispn', 'cpf_paciente']}
              conflictColumn="sispn"
              onSuccess={fetchInitialData}
              transformData={(data) => {
                const todayStr = new Date().toISOString().split('T')[0];
                
                const parseDate = (dateStr: any) => {
                  if (!dateStr || dateStr.toString().trim() === '') return null;
                  const str = dateStr.toString().trim();
                  // Handle DD/MM/YYYY
                  const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
                  if (ddmmyyyy) {
                    const [_, day, month, year] = ddmmyyyy;
                    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
                  }
                  // Handle YYYY-MM-DD
                  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;
                  return null;
                };

                const calculateDPP = (dum: string | null) => {
                  if (!dum) return null;
                  const date = new Date(dum + 'T12:00:00');
                  date.setDate(date.getDate() + 280);
                  return date.toISOString().split('T')[0];
                };

                const calculateAgeAndPhase = (birthDate: string | null, refDate: string | null) => {
                  if (!birthDate || !refDate) return { age: null, phase: null };
                  const birth = new Date(birthDate + 'T12:00:00');
                  const ref = new Date(refDate + 'T12:00:00');
                  let age = ref.getFullYear() - birth.getFullYear();
                  const m = ref.getMonth() - birth.getMonth();
                  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) {
                    age--;
                  }
                  let phase = 'ADULTO';
                  if (age < 20) phase = 'ADOLESCENTE';
                  if (age >= 60) phase = 'IDOSO';
                  return { age, phase };
                };

                return data.reduce((acc: any[], row: any) => {
                  const sispn = row.sispn?.toString().replace(/\D/g, '');
                  if (!sispn) return acc;

                  // Pad CPF with leading zeros to 11 digits
                  const cpf = row.cpf_paciente?.toString().replace(/\D/g, '').padStart(11, '0');
                  
                  // REJECTION LOGIC: Check if patient exists in the database (local state)
                  const pac = pacientes.find(p => p.cpf === cpf);
                  if (!pac) {
                    console.warn(`Registro rejeitado: Paciente com CPF ${cpf} não encontrado no cadastro.`);
                    return acc;
                  }

                  let dum = parseDate(row.dum);
                  let dpp = parseDate(row.dpp);
                  let data_abertura = parseDate(row.data_abertura);
                  let data_cadastro = parseDate(row.data_cadastro);

                  // Ensure no future dates for DUM, Abertura and Cadastro
                  if (dum && dum > todayStr) dum = todayStr;
                  if (data_abertura && data_abertura > todayStr) data_abertura = todayStr;
                  if (data_cadastro && data_cadastro > todayStr) data_cadastro = todayStr;

                  // Auto-calculate DPP if missing
                  if (!dpp && dum) {
                    dpp = calculateDPP(dum);
                  }

                  // Use patient data to calculate age/phase if missing
                  const parsedIdade = parseInt(row.idade_cadastro);
                  let idade: number | null = isNaN(parsedIdade) ? null : parsedIdade;
                  let fase: string | null = row.fase_vida_cadastro || null;

                  if ((!idade || !fase) && pac.data_nascimento && data_cadastro) {
                    const { age, phase } = calculateAgeAndPhase(pac.data_nascimento, data_cadastro);
                    if (!idade) idade = age;
                    if (!fase) fase = phase;
                  }

                  const rtRaw = row.referencia_tecnica;
                  const rtCpf = rtRaw?.toString().replace(/\D/g, '').length === 11 
                    ? rtRaw.toString().replace(/\D/g, '') 
                    : (profissionais.find(p => p.nome === rtRaw)?.cpf || 'NÃO INFORMADO');

                  const acsRaw = row.acs;
                  const acsCpf = acsRaw?.toString().replace(/\D/g, '').length === 11 
                    ? acsRaw.toString().replace(/\D/g, '') 
                    : (profissionais.find(p => p.nome === acsRaw)?.cpf || 'NÃO INFORMADO');

                  const prof = profissionais.find(p => p.cpf === rtCpf);

                  acc.push({
                    ...row,
                    sispn,
                    cpf_paciente: cpf,
                    dum,
                    dpp,
                    data_abertura,
                    data_cadastro,
                    idade_cadastro: idade || null,
                    fase_vida_cadastro: fase || null,
                    operador: authUser?.cpf?.replace(/\D/g, '') || 'IMPORTAÇÃO',
                    gestacao_anterior: Math.max(0, parseInt(row.gestacao_anterior) || 0),
                    aborto: Math.max(0, parseInt(row.aborto) || 0),
                    parto: Math.max(0, parseInt(row.parto) || 0),
                    referencia_tecnica: rtCpf,
                    acs: acsCpf,
                    equipe: prof?.equipe || row.equipe || 'NÃO INFORMADO',
                  });
                  return acc;
                }, []);
              }}
            />
            <div className="flex items-center gap-3 bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant/20 shadow-sm">
              <span className="material-symbols-outlined text-primary text-xl">child_care</span>
              <span className="text-sm font-bold font-label uppercase tracking-widest text-on-surface-variant">{filteredGestacoes.length} Gestações</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-12 gap-10">
          <AnimatePresence>
            {isFormOpen && (
              <motion.section 
                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                animate={{ opacity: 1, height: 'auto', marginBottom: 40 }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                className="col-span-12 overflow-hidden"
              >
                <div className="bg-surface-container-lowest p-6 md:p-8 rounded-[2.5rem] shadow-2xl shadow-black/5 border border-outline-variant/10 relative overflow-hidden">
                  <h3 className="text-2xl font-black font-headline mb-8 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-primary text-2xl">add</span>
                    </div>
                    {editingId ? 'Editar Gestação' : 'Nova Gestação'}
                  </h3>

                  <form onSubmit={handleSubmit} className="space-y-8">
                    <AnimatePresence mode="wait">
                      {error && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-red-50 text-red-600 text-xs font-bold flex items-center gap-3">
                          <span className="material-symbols-outlined text-lg">error</span> {error}
                        </motion.div>
                      )}
                      {success && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-4 rounded-2xl bg-green-50 text-green-600 text-xs font-bold flex items-center gap-3">
                          <span className="material-symbols-outlined text-lg">check_circle</span> {success}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Identificação */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 border-b border-primary/10 pb-2">Identificação da Gestante</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2 relative">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Busca por CPF ou Nome <span className="text-error">*</span></label>
                          <div className="relative">
                            <input 
                              type="text"
                              className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none shadow-inner pr-12"
                              placeholder="Busca por CPF ou Nome"
                              value={pacienteSearchQuery}
                              onChange={(e) => {
                                setPacienteSearchQuery(e.target.value);
                                setIsPacienteSearchOpen(true);
                              }}
                              onFocus={() => setIsPacienteSearchOpen(true)}
                              required
                            />
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30">person_search</span>
                            
                            <AnimatePresence>
                              {isPacienteSearchOpen && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  className="absolute top-full left-0 right-0 z-50 mt-2 bg-white rounded-2xl shadow-2xl border-4 border-primary overflow-hidden"
                                >
                                  <div className="bg-primary px-6 py-3">
                                    <p className="text-white font-black text-[10px] uppercase tracking-widest">Selecione a gestante...</p>
                                  </div>
                                  <div className="max-h-80 overflow-y-auto">
                                    {filteredPacientesLookup.length > 0 ? (
                                      filteredPacientesLookup.map(p => (
                                        <button
                                          key={p.cpf}
                                          type="button"
                                          onClick={() => {
                                            setFormData({ ...formData, cpf_paciente: formatCpf(p.cpf) });
                                            setPacienteSearchQuery(p.gestante);
                                            setIsPacienteSearchOpen(false);
                                          }}
                                          className="w-full px-6 py-4 text-left hover:bg-primary/5 transition-colors border-b border-outline-variant/5 last:border-0 group"
                                        >
                                          <p className="font-bold text-xs text-on-surface uppercase group-hover:text-primary transition-colors">
                                            {p.gestante} ({formatCpf(p.cpf)})
                                          </p>
                                        </button>
                                      ))
                                    ) : (
                                      <div className="px-6 py-4 text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest text-center">
                                        Nenhuma paciente encontrada
                                      </div>
                                    )}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                          {isPacienteSearchOpen && (
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={() => setIsPacienteSearchOpen(false)}
                            />
                          )}
                        </div>
                        <div className="md:col-span-2 space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Nome da Gestante (Automático)</label>
                          <input 
                            type="text"
                            className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-xs outline-none opacity-60 cursor-not-allowed uppercase"
                            value={selectedPaciente?.gestante || 'PACIENTE NÃO ENCONTRADA'}
                            readOnly
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">SISPN (SisPreNatal)</label>
                          <input 
                            type="text"
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                            placeholder="352.428.442.82"
                            value={formData.sispn || ''}
                            onChange={(e) => setFormData({ ...formData, sispn: formatSispn(e.target.value) })}
                            required
                            disabled={!!editingId}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4 bg-primary/5 p-4 rounded-2xl border border-primary/10">
                          <div className="space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-primary/60">Idade no Cadastro</p>
                            <p className="text-xs font-black text-primary">{formData.idade_cadastro || '--'} ANOS</p>
                          </div>
                          <div className="text-right space-y-1">
                            <p className="text-[8px] font-black uppercase tracking-widest text-primary/60">Fase da Vida</p>
                            <p className="text-xs font-black text-primary">{formData.fase_vida_cadastro || '---'}</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Datas e Prazos */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 border-b border-primary/10 pb-2">DPP Gestacional</h4>
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">DUM (Última Menstruação)</label>
                          <input 
                            type="date"
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                            value={formData.dum || ''}
                            onChange={(e) => setFormData({ ...formData, dum: e.target.value })}
                            max={new Date().toISOString().split('T')[0]}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">DPP (Provável Parto)</label>
                          <input 
                            type="date"
                            className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-xs outline-none opacity-60 cursor-not-allowed"
                            value={formData.dpp || ''}
                            readOnly
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Data Abertura</label>
                          <input 
                            type="date"
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                            value={formData.data_abertura || ''}
                            onChange={(e) => setFormData({ ...formData, data_abertura: e.target.value })}
                            max={new Date().toISOString().split('T')[0]}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Data Cadastro</label>
                          <input 
                            type="date"
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none"
                            value={formData.data_cadastro || ''}
                            onChange={(e) => setFormData({ ...formData, data_cadastro: e.target.value })}
                            max={new Date().toISOString().split('T')[0]}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-secondary/5 p-4 rounded-2xl border border-secondary/10 flex justify-between items-center">
                          <span className="text-[8px] font-black uppercase tracking-widest text-secondary/60">Semanas Atuais</span>
                          <span className="text-sm font-black text-secondary">{getGestacaoWeeks(formData.dum || '')} SEM</span>
                        </div>
                        <div className="bg-secondary/5 p-4 rounded-2xl border border-secondary/10 flex justify-between items-center">
                          <span className="text-[8px] font-black uppercase tracking-widest text-secondary/60">Captação</span>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full ${getStatusCaptacao(formData.dum || '', formData.data_cadastro || '') === 'PRECOCE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                            {getStatusCaptacao(formData.dum || '', formData.data_cadastro || '')}
                          </span>
                        </div>
                        <div className="bg-secondary/5 p-4 rounded-2xl border border-secondary/10 flex justify-between items-center">
                          <span className="text-[8px] font-black uppercase tracking-widest text-secondary/60">Status Ciclo</span>
                          <span className={`text-[10px] font-black px-3 py-1 rounded-full ${getGestacaoStatus(formData.dpp || '') === 'ATIVA' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                            {getGestacaoStatus(formData.dpp || '')}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Responsáveis */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 border-b border-primary/10 pb-2">Responsáveis e Equipe</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2 relative" ref={rtDropdownRef}>
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Referência Técnica (Enfermeiro)</label>
                          <div className="relative">
                            <input 
                              type="text"
                              className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none shadow-inner pr-12"
                              placeholder="Buscar enfermeiro..."
                              value={rtSearchQuery}
                              onChange={(e) => {
                                setRtSearchQuery(e.target.value);
                                setIsRtDropdownOpen(true);
                              }}
                              onFocus={() => setIsRtDropdownOpen(true)}
                            />
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30">arrow_drop_down</span>
                            
                            <AnimatePresence>
                              {isRtDropdownOpen && rtSearchResults.length > 0 && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  className="absolute top-full left-0 right-0 z-50 mt-2 bg-white rounded-2xl shadow-2xl border-4 border-primary overflow-hidden"
                                >
                                  <div className="bg-primary px-6 py-3">
                                    <p className="text-white font-black text-[10px] uppercase tracking-widest">Selecione o enfermeiro...</p>
                                  </div>
                                  <div className="max-h-60 overflow-y-auto">
                                    {rtSearchResults.map(p => (
                                      <button
                                        key={p.cpf}
                                        type="button"
                                        onClick={() => {
                                          setFormData({ ...formData, referencia_tecnica: p.cpf });
                                          setRtSearchQuery(p.nome);
                                          setIsRtDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-6 py-4 hover:bg-primary/5 transition-colors flex flex-col gap-1 border-b border-outline-variant/5 last:border-0 group"
                                      >
                                        <span className="text-[10px] font-black text-primary uppercase group-hover:scale-105 transition-transform origin-left">{p.nome}</span>
                                        <span className="text-[9px] font-bold text-on-surface-variant/60">{p.equipe}</span>
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>

                        <div className="space-y-2 relative" ref={acsDropdownRef}>
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">ACS (Agente de Saúde)</label>
                          <div className="relative">
                            <input 
                              type="text"
                              className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none shadow-inner pr-12"
                              placeholder="Buscar ACS..."
                              value={acsSearchQuery}
                              onChange={(e) => {
                                setAcsSearchQuery(e.target.value);
                                setIsAcsDropdownOpen(true);
                              }}
                              onFocus={() => setIsAcsDropdownOpen(true)}
                            />
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30">arrow_drop_down</span>
                            
                            <AnimatePresence>
                              {isAcsDropdownOpen && acsSearchResults.length > 0 && (
                                <motion.div 
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 10 }}
                                  className="absolute top-full left-0 right-0 z-50 mt-2 bg-white rounded-2xl shadow-2xl border-4 border-primary overflow-hidden"
                                >
                                  <div className="bg-primary px-6 py-3">
                                    <p className="text-white font-black text-[10px] uppercase tracking-widest">Selecione o ACS...</p>
                                  </div>
                                  <div className="max-h-60 overflow-y-auto">
                                    {acsSearchResults.map(p => (
                                      <button
                                        key={p.cpf}
                                        type="button"
                                        onClick={() => {
                                          setFormData({ ...formData, acs: p.cpf });
                                          setAcsSearchQuery(p.nome);
                                          setIsAcsDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-6 py-4 hover:bg-primary/5 transition-colors flex flex-col gap-1 border-b border-outline-variant/5 last:border-0 group"
                                      >
                                        <span className="text-[10px] font-black text-primary uppercase group-hover:scale-105 transition-transform origin-left">{p.nome}</span>
                                        <span className="text-[9px] font-bold text-on-surface-variant/60">{p.equipe}</span>
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Equipe (Derivado da Ref. Técnica)</label>
                        <input 
                          type="text"
                          className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-xs outline-none opacity-60 cursor-not-allowed uppercase"
                          value={formData.equipe || 'NÃO DEFINIDA'}
                          readOnly
                        />
                      </div>
                    </div>

                    {/* Histórico e Clínico */}
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-primary/40 border-b border-primary/10 pb-2">Histórico e Dados Clínicos</h4>
                      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Gest. Ant.</label>
                          <input type="number" min="0" className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none" value={formData.gestacao_anterior || 0} onChange={(e) => setFormData({ ...formData, gestacao_anterior: Math.max(0, parseInt(e.target.value) || 0) })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Aborto</label>
                          <input type="number" min="0" className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none" value={formData.aborto || 0} onChange={(e) => setFormData({ ...formData, aborto: Math.max(0, parseInt(e.target.value) || 0) })} />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Parto</label>
                          <input type="number" min="0" className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none" value={formData.parto || 0} onChange={(e) => setFormData({ ...formData, parto: Math.max(0, parseInt(e.target.value) || 0) })} />
                        </div>
                        <div className="col-span-3 grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Classificação PN</label>
                            <select className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none" value={formData.classificacao_pn || 'HABITUAL'} onChange={(e) => setFormData({ ...formData, classificacao_pn: e.target.value })}>
                              <option value="HABITUAL">HABITUAL</option>
                              <option value="RISCO">RISCO</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Alto Risco Comp.</label>
                            <select className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none" value={formData.alto_risco_compartilhado || 'NÃO'} onChange={(e) => setFormData({ ...formData, alto_risco_compartilhado: e.target.value })}>
                              <option value="SIM">SIM</option>
                              <option value="NÃO">NÃO</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Sífilis</label>
                          <select className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none" value={formData.sifilis || 'NÃO'} onChange={(e) => setFormData({ ...formData, sifilis: e.target.value })}>
                            <option value="SIM">SIM</option>
                            <option value="NÃO">NÃO</option>
                            <option value="NÃO SABE">NÃO SABE</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Sífilis Tratada</label>
                          <select className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none" value={formData.sifilis_tratada || 'NÃO SABE'} onChange={(e) => setFormData({ ...formData, sifilis_tratada: e.target.value })}>
                            <option value="SIM">SIM</option>
                            <option value="NÃO">NÃO</option>
                            <option value="NÃO SABE">NÃO SABE</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">HIV</label>
                          <select className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none" value={formData.hiv || 'NEGATIVO'} onChange={(e) => setFormData({ ...formData, hiv: e.target.value })}>
                            <option value="POSITIVO">POSITIVO</option>
                            <option value="NEGATIVO">NEGATIVO</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Hepatite B</label>
                          <select className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none" value={formData.hepatite_b || 'NÃO REAGENTE'} onChange={(e) => setFormData({ ...formData, hepatite_b: e.target.value })}>
                            <option value="REAGENTE">REAGENTE</option>
                            <option value="NÃO REAGENTE">NÃO REAGENTE</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[8px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Hepatite C</label>
                          <select className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-xs outline-none appearance-none" value={formData.hepatite_c || 'NÃO REAGENTE'} onChange={(e) => setFormData({ ...formData, hepatite_c: e.target.value })}>
                            <option value="REAGENTE">REAGENTE</option>
                            <option value="NÃO REAGENTE">NÃO REAGENTE</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    <div className="pt-6 flex flex-col gap-3">
                      <button 
                        type="submit"
                        className="w-full bg-primary text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 font-headline uppercase tracking-widest text-[10px]"
                      >
                        <span className="material-symbols-outlined text-lg">{editingId ? 'edit' : 'add'}</span>
                        {editingId ? 'Atualizar Gestação' : 'Cadastrar Gestação'}
                      </button>
                      {editingId && (
                        <div className="grid grid-cols-2 gap-3">
                          <button type="button" onClick={() => setDeleteConfirmId(editingId)} className="bg-red-50 text-red-600 font-black py-4 rounded-2xl hover:bg-red-100 transition-all flex items-center justify-center gap-2 font-headline uppercase tracking-widest text-[8px]">
                            <span className="material-symbols-outlined text-sm">delete</span> Excluir
                          </button>
                          <button type="button" onClick={() => { setEditingId(null); setIsFormOpen(false); }} className="bg-surface-container-high text-on-surface-variant font-black py-4 rounded-2xl hover:bg-surface-container-highest transition-all flex items-center justify-center gap-2 font-headline uppercase tracking-widest text-[8px]">
                            <span className="material-symbols-outlined text-sm">close</span> Cancelar
                          </button>
                        </div>
                      )}
                    </div>
                  </form>
                </div>
              </motion.section>
            )}
          </AnimatePresence>

          <section className="col-span-12">
            <div className="bg-surface-container-lowest rounded-[3rem] overflow-hidden shadow-2xl shadow-black/5 border border-outline-variant/10">
              <div className="p-6 md:p-10 border-b border-outline-variant/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-surface-container-lowest/50 backdrop-blur-sm sticky top-0 z-20">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-2xl">pregnant_woman</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black font-headline text-on-surface uppercase tracking-tight">Ciclos Gestacionais</h3>
                    <p className="text-xs text-on-surface-variant/40 font-body uppercase tracking-widest font-bold">Monitoramento Ativo</p>
                  </div>
                </div>
              </div>

              {/* Filtros Avançados */}
              <div className="px-6 md:px-10 pb-6 flex flex-wrap items-center gap-4 border-b border-outline-variant/5">
                <div className="flex items-center gap-2 bg-primary/5 px-5 py-2.5 rounded-full border border-primary/10 shrink-0">
                  <span className="material-symbols-outlined text-primary text-sm">filter_list</span>
                  <span className="text-[9px] font-black uppercase tracking-widest text-primary">Filtros Ativos</span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <select 
                    className="bg-surface-container-low border-none rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                    value={filters.dpp}
                    onChange={(e) => { setFilters({ ...filters, dpp: e.target.value }); setCurrentPage(1); }}
                  >
                    <option value="">DPP (AAAA/MM)</option>
                    {uniqueDppMonths.map(month => <option key={month} value={month}>{month}</option>)}
                  </select>

                  <select 
                    className="bg-surface-container-low border-none rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                    value={filters.captacao}
                    onChange={(e) => { setFilters({ ...filters, captacao: e.target.value }); setCurrentPage(1); }}
                  >
                    <option value="">Captação</option>
                    <option value="PRECOCE">PRECOCE</option>
                    <option value="TARDIA">TARDIA</option>
                  </select>

                  <select 
                    className="bg-surface-container-low border-none rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                    value={filters.equipe}
                    onChange={(e) => { setFilters({ ...filters, equipe: e.target.value }); setCurrentPage(1); }}
                  >
                    <option value="">Equipe</option>
                    {uniqueEquipes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
                  </select>

                  <select 
                    className="bg-surface-container-low border-none rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                    value={filters.referencia}
                    onChange={(e) => { setFilters({ ...filters, referencia: e.target.value }); setCurrentPage(1); }}
                  >
                    <option value="">Ref. Técnica</option>
                    {uniqueReferencias.map(ref => <option key={ref} value={ref}>{ref}</option>)}
                  </select>

                  <select 
                    className="bg-surface-container-low border-none rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                    value={filters.acs}
                    onChange={(e) => { setFilters({ ...filters, acs: e.target.value }); setCurrentPage(1); }}
                  >
                    <option value="">ACS</option>
                    {uniqueACS.map(acs => <option key={acs} value={acs}>{acs}</option>)}
                  </select>

                  <select 
                    className="bg-surface-container-low border-none rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                    value={filters.status}
                    onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setCurrentPage(1); }}
                  >
                    <option value="">Status</option>
                    <option value="ATIVA">ATIVA</option>
                    <option value="VENCIDA">VENCIDA</option>
                  </select>

                  {(filters.dpp || filters.captacao || filters.equipe || filters.referencia || filters.acs || filters.status) && (
                    <button 
                      onClick={() => setFilters({ dpp: '', captacao: '', equipe: '', referencia: '', acs: '', status: '' })}
                      className="text-[9px] font-black uppercase tracking-widest text-error hover:underline shrink-0"
                    >
                      Limpar
                    </button>
                  )}
                </div>
              </div>

              <div className="overflow-x-auto">
                {loading ? (
                  <div className="p-24 text-center space-y-4">
                    <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div>
                    <p className="text-xs font-black uppercase tracking-[0.3em] text-on-surface-variant/30">Sincronizando Dados...</p>
                  </div>
                ) : filteredGestacoes.length === 0 ? (
                  <div className="p-24 text-center space-y-6">
                    <div className="w-20 h-20 bg-surface-container-low rounded-[2rem] flex items-center justify-center mx-auto">
                      <span className="material-symbols-outlined text-on-surface-variant/20 text-5xl">search</span>
                    </div>
                    <p className="text-sm font-body text-on-surface-variant/40">Nenhuma gestação encontrada.</p>
                  </div>
                ) : (
                  <>
                    <table className="w-full text-left border-separate border-spacing-0 min-w-[1200px]">
                      <thead className="sticky top-0 z-30 bg-surface-container-low">
                        <tr>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">Gestante / SISPN</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">DPP (DUM/DPP)</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">Semanas / Captação</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">Equipe / Ref. Técnica</th>
                          <th className="px-4 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline border-b border-outline-variant/5">Status</th>
                          <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/40 font-headline text-center border-b border-outline-variant/5 sticky right-0 bg-surface-container-low z-40 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)] w-[180px]">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/5">
                        {filteredGestacoes
                          .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                          .map((g) => {
                            const weeks = getGestacaoWeeks(g.dum);
                            const captacao = getStatusCaptacao(g.dum, g.data_cadastro);
                            const status = getGestacaoStatus(g.dpp);
                            
                            return (
                              <motion.tr layout key={g.sispn} className="hover:bg-surface-container-low/50 transition-all group">
                                <td className="px-6 py-4">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-black text-primary tracking-widest">{formatSispn(g.sispn)}</span>
                                    <p className="font-black text-on-surface font-headline text-sm group-hover:text-primary transition-colors uppercase line-clamp-1">{g.paciente_nome}</p>
                                    <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-tighter">CPF: {formatCpf(g.cpf_paciente)}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-primary/40 text-[14px]">calendar_today</span>
                                      <span className="text-[10px] font-bold text-on-surface">DUM: {new Date(g.dum).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="material-symbols-outlined text-secondary/40 text-[14px]">event_repeat</span>
                                      <span className="text-[10px] font-bold text-secondary">DPP: {new Date(g.dpp).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex flex-col gap-1">
                                    <span className="text-sm font-black text-on-surface">{weeks} SEMANAS</span>
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full w-fit uppercase tracking-widest ${captacao === 'PRECOCE' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                      {captacao}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">EQUIPE {g.equipe}</span>
                                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">{g.referencia_tecnica_nome}</p>
                                    <span className="text-[9px] font-medium text-on-surface-variant/40 uppercase">ACS: {g.acs_nome}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest ${status === 'ATIVA' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                                    {status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 sticky right-0 bg-surface-container-lowest group-hover:bg-surface-container-low transition-colors z-30 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">
                                  <div className="flex items-center justify-center gap-2">
                                    <button onClick={() => handleEdit(g)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-primary/5 text-primary hover:bg-primary hover:text-white transition-all shadow-sm group/btn">
                                      <span className="material-symbols-outlined text-[14px]">edit</span>
                                      <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover/btn:inline">Editar</span>
                                    </button>
                                    <button onClick={() => setDeleteConfirmId(g.sispn)} className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm group/btn">
                                      <span className="material-symbols-outlined text-[14px]">delete</span>
                                      <span className="text-[9px] font-black uppercase tracking-widest hidden group-hover/btn:inline">Excluir</span>
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })}
                      </tbody>
                    </table>
                    <Pagination 
                      currentPage={currentPage}
                      totalPages={Math.ceil(filteredGestacoes.length / itemsPerPage)}
                      onPageChange={setCurrentPage}
                      totalItems={filteredGestacoes.length}
                      itemsPerPage={itemsPerPage}
                      itemName="gestações"
                    />
                  </>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>

      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="bg-white rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-outline-variant/10 space-y-8">
              <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-red-600 text-5xl">delete_forever</span>
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black font-headline text-on-surface">Confirmar Exclusão</h3>
                <p className="text-sm text-on-surface-variant/60 font-body">Deseja realmente excluir este ciclo gestacional? Esta ação é irreversível.</p>
              </div>
              <div className="flex flex-col gap-3">
                <button onClick={() => handleDelete(deleteConfirmId)} className="w-full bg-red-600 text-white font-black py-5 rounded-2xl shadow-xl shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all font-headline uppercase tracking-widest text-xs">Sim, Excluir</button>
                <button onClick={() => setDeleteConfirmId(null)} className="w-full bg-surface-container-high text-on-surface-variant font-black py-5 rounded-2xl hover:bg-surface-container-highest transition-all font-headline uppercase tracking-widest text-xs">Cancelar</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </DashboardLayout>
  );
}
