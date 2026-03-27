'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import CSVImporter from '@/components/CSVImporter';
import Pagination from '@/components/Pagination';

interface Categoria {
  cbo: string;
  categoria: string;
}

interface Profissional {
  cpf: string;
  nome: string;
  cbo: string;
}

interface Atendimento {
  id_atendimento: string;
  sispn: string;
  data_consulta: string;
  trimestre_consulta: '1º TRIMESTRE' | '2º TRIMESTRE' | '3º TRIMESTRE';
  cbo: string;
  cpf: string;
  data_proxima_consulta?: string;
  observacoes_clinicas?: string;
  cpf_operador?: string;
  created_at?: string;
  // Joins
  gestacoes?: {
    dum: string;
    dpp: string;
    equipe: string;
    rt_nome: string;
    acs_nome: string;
    data_cadastro: string;
    pacientes: {
      gestante: string;
      cpf: string;
    }
  };
  profissionais?: {
    nome: string;
    equipe: string;
  };
}

interface Gestacao {
  sispn: string;
  dum: string;
  dpp: string;
  paciente_nome: string;
  paciente_cpf: string;
  equipe: string;
  rt_nome: string;
  acs_nome: string;
  data_cadastro: string;
  classificacao_pn?: string;
  alto_risco_compartilhado?: string;
  hiv?: string;
  sifilis?: string;
  hepatite_b?: string;
  hepatite_c?: string;
}

const CBO_CATEGORIES: Record<string, string> = {
  '2235': 'ENFERMEIRO',
  '2251': 'MEDICO',
  '2252': 'MEDICO',
  '2253': 'MEDICO',
  '2232': 'DENTISTA',
  '3222': 'TECNICO ENFERMAGEM',
  '5151': 'ACS',
};

const getCboCategory = (cbo: any) => {
  if (!cbo) return 'NÃO INFORMADO';
  const cboStr = String(cbo);
  const prefix = cboStr.substring(0, 4);
  return CBO_CATEGORIES[prefix] || 'OUTROS';
};

const calculateWeeks = (dum: string) => {
  if (!dum) return 0;
  const start = new Date(dum);
  const today = new Date();
  const diffTime = today.getTime() - start.getTime();
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  return diffWeeks;
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

export default function AtendimentosPage() {
  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen } = useSearch();
  const { user: authUser } = useAuth();
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [gestacoes, setGestacoes] = useState<Gestacao[]>([]);
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [allProfessionals, setAllProfessionals] = useState<Profissional[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Patient Search in Form
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  // Professional Search in Form
  const [professionalSearch, setProfessionalSearch] = useState('');
  const [isProfessionalDropdownOpen, setIsProfessionalDropdownOpen] = useState(false);
  const professionalDropdownRef = useRef<HTMLDivElement>(null);

  // Selected Category and Professional in Form
  const [selectedCategory, setSelectedCategory] = useState('MEDICO');
  const [selectedProfessionalCpf, setSelectedProfessionalCpf] = useState('');

  // Filters
  const [filters, setFilters] = useState({
    dpp: '',
    trimestre: '',
    categoria: '',
    equipe: ''
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

  const [formData, setFormData] = useState<Partial<Atendimento>>({
    sispn: '',
    data_consulta: new Date().toISOString().split('T')[0],
    cbo: '',
    cpf: 'NÃO INFORMADO',
    data_proxima_consulta: '',
    observacoes_clinicas: ''
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  useEffect(() => {
    if (!isFormOpen) {
      setEditingId(null);
      setFormData({
        sispn: '',
        data_consulta: new Date().toISOString().split('T')[0],
        cbo: '',
        cpf: 'NÃO INFORMADO',
        data_proxima_consulta: '',
        observacoes_clinicas: ''
      });
      setPatientSearch('');
      setSelectedCategory('NÃO INFORMADO');
      setSelectedProfessionalCpf('');
      setError(null);
      setSuccess(null);
    }
  }, [isFormOpen]);

  useEffect(() => {
    fetchData();
    
    // Click outside listener for dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node)) {
        setIsPatientDropdownOpen(false);
      }
      if (professionalDropdownRef.current && !professionalDropdownRef.current.contains(event.target as Node)) {
        setIsProfessionalDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchData = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch Categories, Professionals and Patients
      const [catsRes, prosRes, pacsRes] = await Promise.all([
        supabase.from('categorias_profissionais').select('*').order('categoria'),
        supabase.from('profissionais').select('cpf, nome, cbo').eq('situacao', 'ATIVO').order('nome'),
        supabase.from('pacientes').select('cpf, gestante')
      ]);

      const professionalsData = prosRes.data || [];
      const patientsList = pacsRes.data || [];
      if (catsRes.data) setCategories(catsRes.data);
      if (prosRes.data) setAllProfessionals(professionalsData);

      // Fetch Gestacoes with more details
      const { data: gestData, error: gestError } = await supabase
        .from('gestacoes')
        .select(`
          sispn,
          dum,
          dpp,
          equipe,
          referencia_tecnica,
          acs,
          data_cadastro,
          classificacao_pn,
          alto_risco_compartilhado,
          sifilis,
          hiv,
          hepatite_b,
          hepatite_c,
          pacientes (gestante, cpf)
        `);
      
      let formattedGest: any[] = [];
      if (gestError) {
        console.warn('Erro ao buscar gestações:', gestError);
      } else {
        formattedGest = gestData?.map(g => {
          // Handle both object and array response from Supabase join
          let pac: any = g.pacientes;
          if (Array.isArray(pac)) pac = pac[0];
          
          let nome = (pac as any)?.gestante;
          let cpf = (pac as any)?.cpf;

          // Fallback: if join failed, try to find in the fetched patients list
          if (!nome) {
            const found = patientsList.find(p => p.cpf === (g as any).cpf_paciente);
            if (found) {
              nome = found.gestante;
              cpf = found.cpf;
            }
          }

          const rtNome = professionalsData.find(p => p.cpf === (g as any).referencia_tecnica)?.nome || (g as any).referencia_tecnica || 'NÃO INFORMADO';
          const acsNome = professionalsData.find(p => p.cpf === (g as any).acs)?.nome || (g as any).acs || 'NÃO INFORMADO';
          
          return {
            sispn: String(g.sispn || ''),
            dum: g.dum,
            dpp: g.dpp,
            equipe: g.equipe,
            rt_nome: rtNome,
            acs_nome: acsNome,
            data_cadastro: g.data_cadastro,
            classificacao_pn: g.classificacao_pn || 'HABITUAL',
            alto_risco_compartilhado: g.alto_risco_compartilhado || 'NÃO',
            sifilis: g.sifilis || 'NÃO',
            hiv: g.hiv || 'NEGATIVO',
            hepatite_b: g.hepatite_b || 'NÃO REAGENTE',
            hepatite_c: g.hepatite_c || 'NÃO REAGENTE',
            paciente_nome: nome || 'NÃO INFORMADO',
            paciente_cpf: String(cpf || 'NÃO INFORMADO')
          };
        }) || [];
        setGestacoes(formattedGest);
      }

      // Fetch Atendimentos
      let { data: consData, error: consError } = await supabase
        .from('atendimentos')
        .select('*')
        .order('data_consulta', { ascending: false });

      if (consError) throw consError;

      // Manually join data to avoid complex join errors
      const enrichedAtendimentos = (consData || []).map(c => {
        const gest = formattedGest.find(g => g.sispn === c.sispn);
        const prof = professionalsData.find(p => p.cpf === c.cpf);
        return {
          ...c,
          gestacoes: gest ? {
            dum: gest.dum,
            dpp: gest.dpp,
            equipe: gest.equipe,
            rt_nome: gest.rt_nome,
            acs_nome: gest.acs_nome,
            pacientes: { gestante: gest.paciente_nome, cpf: gest.paciente_cpf }
          } : null,
          profissionais: prof ? {
            nome: prof.nome,
            equipe: (prof as any).equipe
          } : null
        };
      });

      setAtendimentos(enrichedAtendimentos);
    } catch (err: any) {
      console.error('Erro ao buscar dados:', err);
      // Better error message
      const msg = err.message || (typeof err === 'object' ? JSON.stringify(err) : String(err));
      setError(msg || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const calculateTrimestre = (dum: string, dataConsulta: string) => {
    if (!dum || !dataConsulta) return null;
    const start = new Date(dum);
    const consult = new Date(dataConsulta);
    const diffTime = consult.getTime() - start.getTime();
    const diffWeeks = diffTime / (1000 * 60 * 60 * 24 * 7);

    if (diffWeeks <= 13) return '1º TRIMESTRE';
    if (diffWeeks <= 27) return '2º TRIMESTRE';
    return '3º TRIMESTRE';
  };

  const getStatusCaptacao = (dum: string, dataCadastro: string) => {
    if (!dum || !dataCadastro) return '---';
    const start = new Date(dum);
    const registration = new Date(dataCadastro);
    const diffTime = registration.getTime() - start.getTime();
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

  const getDppReferencia = (dpp: string) => {
    if (!dpp) return '---';
    const date = new Date(dpp);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const getConsultaReferencia = (dataConsulta: string) => {
    if (!dataConsulta) return '---';
    const date = new Date(dataConsulta);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isSupabaseConfigured) return;

    if (!formData.sispn) {
      setError('Selecione uma gestante.');
      return;
    }

    // Regra: só podemos lançar pessoas que tenham sido cadastradas no registro de gestações
    const gest = gestacoes.find(g => g.sispn === formData.sispn);
    if (!gest) {
      setError('Gestaçāo não encontrada no registro de gestações.');
      return;
    }

    // Regra: só podem receber registros de atendimento pessoas com o status da gestação = ATIVA
    const status = getGestacaoStatus(gest.dpp);
    if (status === 'VENCIDA') {
      setError('Não é possível registrar atendimentos para gestações com status VENCIDA.');
      return;
    }

    if (!selectedProfessionalCpf) {
      setError('Selecione um profissional.');
      return;
    }

    try {
      const trimestre = calculateTrimestre(gest?.dum || '', formData.data_consulta || '');
      const professional = allProfessionals.find(p => p.cpf === selectedProfessionalCpf);

      const payload = {
        sispn: formData.sispn,
        data_consulta: formData.data_consulta,
        trimestre_consulta: trimestre,
        cbo: professional?.cbo || formData.cbo,
        cpf: selectedProfessionalCpf,
        data_proxima_consulta: formData.data_proxima_consulta || null,
        observacoes_clinicas: formData.observacoes_clinicas || null,
        cpf_operador: authUser?.cpf || null
      };

      if (editingId) {
        const { error: updateError } = await supabase
          .from('atendimentos')
          .update(payload)
          .eq('id_atendimento', editingId);
        if (updateError) throw updateError;
        setSuccess('Atendimento atualizado com sucesso!');
      } else {
        const { error: insertError } = await supabase
          .from('atendimentos')
          .insert([payload]);
        if (insertError) throw insertError;
        setSuccess('Atendimento registrado com sucesso!');
      }

      setFormData({
        sispn: '',
        data_consulta: new Date().toISOString().split('T')[0],
        cbo: '',
        cpf: 'NÃO INFORMADO',
        data_proxima_consulta: '',
        observacoes_clinicas: ''
      });
      setPatientSearch('');
      setProfessionalSearch('');
      setSelectedCategory('MEDICO');
      setSelectedProfessionalCpf('');
      setEditingId(null);
      setIsFormOpen(false);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (con: Atendimento) => {
    setEditingId(con.id_atendimento);
    const gest = Array.isArray(con.gestacoes) ? con.gestacoes[0] : con.gestacoes;
    const pac = gest?.pacientes;
    const pacObj = Array.isArray(pac) ? pac[0] : pac;
    
    setPatientSearch((pacObj as any)?.gestante || con.sispn);
    setProfessionalSearch(con.profissionais?.nome || con.cpf);
    setSelectedProfessionalCpf(con.cpf);
    
    const professional = allProfessionals.find(p => p.cpf === con.cpf);
    if (professional) {
      const category = categories.find(c => c.cbo === professional.cbo.substring(0, 4));
      if (category) setSelectedCategory(category.categoria);
    }

    setFormData({
      sispn: con.sispn,
      data_consulta: con.data_consulta,
      cbo: con.cbo,
      cpf: con.cpf,
      data_proxima_consulta: con.data_proxima_consulta || '',
      observacoes_clinicas: con.observacoes_clinicas || ''
    });
    setPatientSearch(formatSispn(con.sispn));
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error: delError } = await supabase
        .from('atendimentos')
        .delete()
        .eq('id_atendimento', id);
      if (delError) throw delError;
      setSuccess('Atendimento excluído!');
      setDeleteConfirmId(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredAtendimentos = useMemo(() => {
    return atendimentos.filter(c => {
      const query = searchQuery.toLowerCase().trim();
      const normalize = (str: string) => 
        str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
      
      const queryNormalizada = normalize(query);
      
      const gest = Array.isArray(c.gestacoes) ? c.gestacoes[0] : c.gestacoes;
      const pac = gest?.pacientes;
      const pacObj = Array.isArray(pac) ? pac[0] : pac;
      const pacienteNome = (pacObj as any)?.gestante || '';
      const profissionalNome = c.profissionais?.nome || '';
      
      const matchesSearch = !query || (
        normalize(pacienteNome).includes(queryNormalizada) ||
        normalize(c.sispn).includes(queryNormalizada) ||
        normalize(profissionalNome).includes(queryNormalizada) ||
        normalize(c.cbo).includes(queryNormalizada)
      );

      if (!matchesSearch) return false;

      if (filters.dpp) {
        const gest = gestacoes.find(g => g.sispn === c.sispn);
        if (gest?.dpp) {
          const date = new Date(gest.dpp);
          const formattedDpp = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
          if (formattedDpp !== filters.dpp) return false;
        } else {
          return false;
        }
      }
      if (filters.trimestre && c.trimestre_consulta !== filters.trimestre) return false;
      if (filters.categoria && getCboCategory(c.cbo) !== filters.categoria) return false;
      
      const equipe = c.profissionais?.equipe || (gest as any)?.equipe || '';
      if (filters.equipe && equipe !== filters.equipe) return false;

      return true;
    });
  }, [atendimentos, searchQuery, filters, gestacoes]);

  const patientSearchResults = useMemo(() => {
    if (!patientSearch || patientSearch.length < 2) return [];
    
    const normalize = (str: string) => 
      str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    
    const queryDigits = patientSearch.replace(/\D/g, '');
    const queryText = normalize(patientSearch);
    
    return gestacoes.filter(g => {
      // Regra: só mostrar gestações ATIVAS para novos atendimentos
      const status = getGestacaoStatus(g.dpp);
      if (status !== 'ATIVA') return false;

      const nome = normalize(g.paciente_nome || '');
      const sispn = normalize(g.sispn || '');
      const cpf = normalize(g.paciente_cpf || '');
      
      // Check numeric fields if query has digits
      if (queryDigits.length > 0) {
        if (sispn.includes(queryDigits) || cpf.includes(queryDigits)) return true;
      }
      
      // Check name with normalization
      return nome.includes(queryText);
    }).slice(0, 10);
  }, [patientSearch, gestacoes]);

  const professionalSearchResults = useMemo(() => {
    if (!professionalSearch || professionalSearch.length < 1) return allProfessionals.slice(0, 10);
    
    const normalize = (str: string) => 
      str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    
    const query = normalize(professionalSearch);
    
    return allProfessionals.filter(p => {
      const nome = normalize(p.nome || '');
      const cpf = p.cpf || '';
      return nome.includes(query) || cpf.includes(query);
    }).slice(0, 10);
  }, [professionalSearch, allProfessionals]);

  const selectedGestante = useMemo(() => {
    return gestacoes.find(g => g.sispn === formData.sispn);
  }, [formData.sispn, gestacoes]);

  const filteredProfessionals = useMemo(() => {
    if (!selectedCategory) return [];
    const category = categories.find(c => c.categoria === selectedCategory);
    if (!category) return [];
    return allProfessionals.filter(p => p.cbo.startsWith(category.cbo));
  }, [selectedCategory, categories, allProfessionals]);

  const uniqueEquipes = Array.from(new Set(gestacoes.map(g => g.equipe))).filter(Boolean).sort();
  const uniqueCategorias = Array.from(new Set(atendimentos.map(c => getCboCategory(c.cbo)))).filter(Boolean).sort();

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 lg:p-10 pb-32 max-w-7xl mx-auto space-y-10">
        {/* Header Section - Inspired by Gestacoes and Stitch */}
        <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-1.5 bg-primary rounded-full"></div>
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.4em]">Monitoramento Clínico</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-black tracking-tighter font-headline text-primary uppercase leading-none">
              Atendimentos
            </h2>
            <p className="text-lg text-on-surface-variant/60 font-body max-w-xl leading-relaxed">
              Gestão individualizada de consultas e procedimentos para um acompanhamento pré-natal de excelência.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <CSVImporter 
                tableName="atendimentos"
                expectedColumns={['sispn', 'data_consulta', 'cbo', 'cpf', 'data_proxima_consulta', 'observacoes_clinicas']}
                requiredColumns={['sispn', 'data_consulta', 'cbo']}
                onSuccess={fetchData}
                title="Importar CSV"
                transformData={(data) => {
                  const existingSispns = new Set(gestacoes.map(g => g.sispn?.toString().replace(/\D/g, '') || ''));
                  return data.filter(item => {
                    const sispn = item.sispn?.toString().replace(/\D/g, '');
                    if (!sispn || !existingSispns.has(sispn)) return false;

                    // Regra: só importar atendimentos para gestações ATIVAS
                    const gest = gestacoes.find(g => g.sispn?.toString().replace(/\D/g, '') === sispn);
                    if (gest && getGestacaoStatus(gest.dpp) !== 'ATIVA') return false;

                    return true;
                  }).map(item => {
                    const sispnClean = item.sispn?.toString().replace(/\D/g, '');
                    const gest = gestacoes.find(g => g.sispn?.toString().replace(/\D/g, '') === sispnClean);
                    const formatDate = (dateStr: string) => {
                      if (!dateStr) return null;
                      if (dateStr.includes('/')) {
                        const [d, m, y] = dateStr.split('/');
                        return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
                      }
                      return dateStr;
                    };
                    const dataConsulta = formatDate(item.data_consulta) || '';
                    return {
                      ...item,
                      data_consulta: dataConsulta,
                      data_proxima_consulta: formatDate(item.data_proxima_consulta),
                      trimestre_consulta: calculateTrimestre(gest?.dum || '', dataConsulta),
                      cpf: item.cpf || 'NÃO INFORMADO',
                      observacoes_clinicas: item.observacoes_clinicas || item.observacoes || null
                    };
                  });
                }}
              />
              <div className="flex items-center gap-3 bg-surface-container-high px-4 py-2 rounded-full border border-outline-variant/20 shadow-sm">
                <span className="material-symbols-outlined text-primary text-xl">clinical_notes</span>
                <span className="text-sm font-bold font-label uppercase tracking-widest text-on-surface-variant">{filteredAtendimentos.length} Atendimentos</span>
              </div>
            </div>
          </div>
        </header>

        {/* Form Section - Inspired by Stitch Model */}
        <AnimatePresence>
          {isFormOpen && (
            <motion.section 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-surface-container-lowest p-8 md:p-12 rounded-[40px] shadow-2xl border border-outline-variant/10 space-y-10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-2xl">clinical_notes</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-primary uppercase tracking-tight">
                      {editingId ? 'Editar Atendimento' : 'Novo Lançamento Individual'}
                    </h3>
                    <p className="text-sm text-on-surface-variant/60 font-body">Preencha os dados clínicos com atenção para análise futura.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    {/* Column 1 */}
                    <div className="space-y-6">
                      <div className="space-y-2 relative" ref={patientDropdownRef}>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">SISPN <span className="text-error">*</span></label>
                        <div className="relative">
                          <input 
                            type="text"
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none shadow-inner pr-12"
                            placeholder="Buscar por Nome ou SISPN..."
                            value={patientSearch}
                            onChange={(e) => {
                              const val = e.target.value;
                              const isNumeric = /^[0-9.\- ]*$/.test(val);
                              if (isNumeric && val.length > 0) {
                                setPatientSearch(formatSispn(val));
                              } else {
                                setPatientSearch(val);
                              }
                              setIsPatientDropdownOpen(true);
                            }}
                            onFocus={() => setIsPatientDropdownOpen(true)}
                          />
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30">arrow_drop_down</span>
                          
                          <AnimatePresence>
                            {isPatientDropdownOpen && patientSearchResults.length > 0 && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border-4 border-primary z-50 overflow-hidden"
                              >
                                <div className="bg-primary px-6 py-3">
                                  <p className="text-white font-black text-[10px] uppercase tracking-widest">Selecione a gestante...</p>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                  {patientSearchResults.map(g => (
                                    <button
                                      key={g.sispn}
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, sispn: g.sispn });
                                        setPatientSearch(formatSispn(g.sispn));
                                        setIsPatientDropdownOpen(false);
                                      }}
                                      className="w-full px-6 py-4 text-left hover:bg-primary/5 transition-colors border-b border-outline-variant/5 last:border-0 group"
                                    >
                                      <p className="font-bold text-xs text-on-surface uppercase group-hover:text-primary transition-colors">
                                        {g.paciente_nome} ({g.sispn})
                                      </p>
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Nome da Gestante</label>
                        <input 
                          type="text"
                          readOnly
                          className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-6 font-headline text-lg font-black outline-none text-primary uppercase shadow-sm"
                          value={selectedGestante?.paciente_nome || ''}
                          placeholder="SELECIONE UMA GESTANTE ACIMA"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">DUM</label>
                          <div className="relative">
                            <input 
                              type="text"
                              readOnly
                              className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-sm outline-none text-on-surface-variant/60"
                              value={selectedGestante ? new Date(selectedGestante.dum).toLocaleDateString('pt-BR') : ''}
                            />
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/20 text-lg">calendar_today</span>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">DPP</label>
                          <div className="relative">
                            <input 
                              type="text"
                              readOnly
                              className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-sm outline-none text-on-surface-variant/60"
                              value={selectedGestante ? new Date(selectedGestante.dpp).toLocaleDateString('pt-BR') : ''}
                            />
                            <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/20 text-lg">calendar_today</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Status Captação</label>
                          <input 
                            type="text"
                            readOnly
                            className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-sm outline-none text-on-surface-variant/60 uppercase"
                            value={selectedGestante ? getStatusCaptacao(selectedGestante.dum, selectedGestante.data_cadastro) : ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Trimestre Consulta</label>
                          <input 
                            type="text"
                            readOnly
                            className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-sm outline-none text-on-surface-variant/60 uppercase"
                            value={calculateTrimestre(selectedGestante?.dum || '', formData.data_consulta || '') || ''}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">DPP Referência</label>
                          <input 
                            type="text"
                            readOnly
                            className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-sm outline-none text-on-surface-variant/60"
                            value={selectedGestante ? getDppReferencia(selectedGestante.dpp) : ''}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Próxima Consulta</label>
                          <div className="relative">
                            <input 
                              type="date"
                              className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none"
                              value={formData.data_proxima_consulta}
                              onChange={(e) => setFormData({ ...formData, data_proxima_consulta: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2 */}
                    <div className="space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Data Atendimento <span className="text-error">*</span></label>
                          <div className="relative">
                            <input 
                              type="date"
                              className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none"
                              value={formData.data_consulta}
                              onChange={(e) => setFormData({ ...formData, data_consulta: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Referência Consulta</label>
                          <input 
                            type="text"
                            readOnly
                            className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-sm outline-none text-on-surface-variant/60"
                            value={getConsultaReferencia(formData.data_consulta || '')}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 relative" ref={professionalDropdownRef}>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Profissional <span className="text-error">*</span></label>
                        <div className="relative">
                          <input 
                            type="text"
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none shadow-inner pr-12"
                            placeholder="Buscar profissional por nome..."
                            value={professionalSearch}
                            onChange={(e) => {
                              setProfessionalSearch(e.target.value);
                              setIsProfessionalDropdownOpen(true);
                            }}
                            onFocus={() => setIsProfessionalDropdownOpen(true)}
                          />
                          <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant/30">person_search</span>
                          
                          <AnimatePresence>
                            {isProfessionalDropdownOpen && professionalSearchResults.length > 0 && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-outline-variant/10 z-50 overflow-hidden"
                              >
                                {professionalSearchResults.map(p => (
                                  <button
                                    key={p.cpf}
                                    type="button"
                                    onClick={() => {
                                      setSelectedProfessionalCpf(p.cpf);
                                      setProfessionalSearch(p.nome);
                                      setIsProfessionalDropdownOpen(false);
                                      
                                      // Auto-populate category
                                      const categoryName = getCboCategory(p.cbo);
                                      setSelectedCategory(categoryName);
                                    }}
                                    className="w-full px-6 py-4 text-left hover:bg-primary/5 transition-colors flex items-center gap-3 group"
                                  >
                                    <span className="material-symbols-outlined text-primary text-lg">medical_services</span>
                                    <div>
                                      <p className="font-black text-xs text-primary uppercase">{p.nome}</p>
                                      <p className="text-[10px] font-bold text-on-surface-variant/40 font-mono">{getCboCategory(p.cbo)} • {p.cpf}</p>
                                    </div>
                                  </button>
                                ))}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Categoria Profissional (Automático)</label>
                        <input 
                          type="text"
                          readOnly
                          className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-sm outline-none text-on-surface-variant/60 uppercase"
                          value={selectedCategory}
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Observações Clínicas</label>
                        <textarea 
                          className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none resize-none h-32"
                          placeholder="Notas sobre o atendimento..."
                          value={formData.observacoes_clinicas}
                          onChange={(e) => setFormData({ ...formData, observacoes_clinicas: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end gap-4 pt-8 border-t border-outline-variant/10">
                    <button 
                      type="button"
                      onClick={() => {
                        setIsFormOpen(false);
                        setEditingId(null);
                        setFormData({
                          sispn: '',
                          data_consulta: new Date().toISOString().split('T')[0],
                          cbo: '',
                          cpf: 'NÃO INFORMADO',
                          data_proxima_consulta: '',
                          observacoes_clinicas: ''
                        });
                        setPatientSearch('');
                        setProfessionalSearch('');
                        setSelectedCategory('MEDICO');
                        setSelectedProfessionalCpf('');
                      }}
                      className="px-8 py-4 rounded-full font-black text-[10px] uppercase tracking-widest text-on-surface-variant hover:bg-surface-container-high transition-colors"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="bg-primary text-white px-12 py-4 rounded-full font-black text-[10px] uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                    >
                      <span className="material-symbols-outlined text-lg">save</span>
                      {editingId ? 'Atualizar Registro' : 'Confirmar Atendimento'}
                    </button>
                  </div>
                </form>
                
                {error && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-error/10 rounded-2xl flex items-center gap-3 text-error text-xs font-bold">
                    <span className="material-symbols-outlined text-lg">warning</span> {error}
                  </motion.div>
                )}
                {success && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-4 bg-green-500/10 rounded-2xl flex items-center gap-3 text-green-600 text-xs font-bold">
                    <span className="material-symbols-outlined text-lg">check_circle</span> {success}
                  </motion.div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Filters and Table Section */}
        <section className="space-y-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
              <div className="flex items-center gap-2 bg-primary/5 px-5 py-2.5 rounded-full border border-primary/10 shrink-0">
                <span className="material-symbols-outlined text-primary text-sm">filter_list</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary">Filtros Ativos</span>
              </div>
              
              <select 
                className="bg-surface-container-low border-none rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                value={filters.dpp}
                onChange={(e) => setFilters({ ...filters, dpp: e.target.value })}
              >
                <option value="">DPP (AAAA/MM)</option>
                {uniqueDppMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select 
                className="bg-surface-container-low border-none rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                value={filters.trimestre}
                onChange={(e) => setFilters({ ...filters, trimestre: e.target.value as any })}
              >
                <option value="">Trimestre</option>
                <option value="1º TRIMESTRE">1º TRIMESTRE</option>
                <option value="2º TRIMESTRE">2º TRIMESTRE</option>
                <option value="3º TRIMESTRE">3º TRIMESTRE</option>
              </select>

              <select 
                className="bg-surface-container-low border-none rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                value={filters.categoria}
                onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
              >
                <option value="">Profissional</option>
                {uniqueCategorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select 
                className="bg-surface-container-low border-none rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer"
                value={filters.equipe}
                onChange={(e) => setFilters({ ...filters, equipe: e.target.value })}
              >
                <option value="">Equipe</option>
                {uniqueEquipes.map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>

              {(filters.dpp || filters.trimestre || filters.categoria || filters.equipe) && (
                <button 
                  onClick={() => setFilters({ dpp: '', trimestre: '', categoria: '', equipe: '' })}
                  className="text-[9px] font-black uppercase tracking-widest text-error hover:underline shrink-0"
                >
                  Limpar
                </button>
              )}
            </div>

            <div className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">
              Exibindo <span className="text-primary">{filteredAtendimentos.length}</span> registros
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-[40px] shadow-2xl border border-outline-variant/10 overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-30 bg-surface-container-low">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Gestante / Identificação</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Data / Período</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Profissional / CBO</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Próximo Agendamento</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5 text-center sticky right-0 bg-surface-container-low z-40 shadow-[-10px_0_15px_-3px_rgba(0,0,0,0.05)]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {loading ? (
                    <tr><td colSpan={5} className="p-32 text-center"><div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div></td></tr>
                  ) : filteredAtendimentos.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-32 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-20">
                          <span className="material-symbols-outlined text-6xl">search</span>
                          <p className="text-xl font-black uppercase tracking-widest">Nenhum resultado encontrado</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    filteredAtendimentos
                      .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                      .map((con) => (
                        <tr key={con.id_atendimento} className="hover:bg-primary/[0.02] transition-colors group">
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                <span className="material-symbols-outlined text-2xl">pregnant_woman</span>
                              </div>
                              <div>
                                <p className="font-black text-sm text-on-surface uppercase tracking-tight group-hover:text-primary transition-colors">
                                  {(() => {
                                    const gest = Array.isArray(con.gestacoes) ? con.gestacoes[0] : con.gestacoes;
                                    const pac = gest?.pacientes;
                                    const pacObj = Array.isArray(pac) ? pac[0] : pac;
                                    return (pacObj as any)?.gestante || 'NÃO INFORMADO';
                                  })()}
                                </p>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-on-surface-variant/40 font-mono">{con.sispn}</span>
                                  <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">• {(Array.isArray(con.gestacoes) ? con.gestacoes[0] : con.gestacoes)?.equipe}</span>
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                                <span className="material-symbols-outlined text-primary/40 text-lg">calendar_today</span>
                                {new Date(con.data_consulta).toLocaleDateString('pt-BR')}
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary/10 text-secondary text-[9px] font-black uppercase tracking-widest">
                                  <span className="material-symbols-outlined text-[10px]">monitoring</span>
                                  {con.trimestre_consulta}
                                </div>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest">
                                  <span className="material-symbols-outlined text-[10px]">history</span>
                                  {getConsultaReferencia(con.data_consulta)}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-xs font-bold text-on-surface">
                                <span className="material-symbols-outlined text-primary/40 text-lg">medical_services</span>
                                {con.profissionais?.nome || 'NÃO INFORMADO'}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-on-surface-variant/40 font-mono">{con.cbo}</span>
                                <span className="text-[9px] font-black uppercase tracking-widest text-primary/60">• {getCboCategory(con.cbo)}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-6">
                            {con.data_proxima_consulta ? (
                              <div className="flex items-center gap-2 text-xs font-bold text-on-surface-variant">
                                <span className="material-symbols-outlined text-primary/40 text-lg">event_repeat</span>
                                {new Date(con.data_proxima_consulta).toLocaleDateString('pt-BR')}
                              </div>
                            ) : (
                              <span className="text-[10px] font-bold text-on-surface-variant/20 italic tracking-widest uppercase">Não agendada</span>
                            )}
                          </td>
                          <td className="px-8 py-6">
                            <div className="flex items-center justify-center gap-3">
                              <button 
                                onClick={() => handleEdit(con)}
                                className="p-3 rounded-2xl bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white hover:shadow-lg hover:shadow-primary/20 transition-all active:scale-90"
                                title="Editar"
                              >
                                <span className="material-symbols-outlined text-lg">edit</span>
                              </button>
                              <button 
                                onClick={() => setDeleteConfirmId(con.id_atendimento)}
                                className="p-3 rounded-2xl bg-surface-container-high text-on-surface-variant hover:bg-error hover:text-white hover:shadow-lg hover:shadow-error/20 transition-all active:scale-90"
                                title="Excluir"
                              >
                                <span className="material-symbols-outlined text-lg">delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                  )}
                </tbody>
              </table>
            </div>
            
            <Pagination 
              currentPage={currentPage}
              totalPages={Math.ceil(filteredAtendimentos.length / itemsPerPage)}
              onPageChange={setCurrentPage}
              totalItems={filteredAtendimentos.length}
              itemsPerPage={itemsPerPage}
              itemName="atendimentos"
            />
          </div>
        </section>
        {/* Delete Confirmation Modal */}
        <AnimatePresence>
          {deleteConfirmId && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-surface-container-lowest rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-outline-variant/10 text-center space-y-8"
              >
                <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-red-600 text-4xl">delete_forever</span>
                </div>
                <div className="space-y-2">
                  <h4 className="text-xl font-black font-headline text-on-surface uppercase tracking-tight">Confirmar Exclusão</h4>
                  <p className="text-sm text-on-surface-variant font-body">Esta ação é permanente e não poderá ser desfeita. Deseja continuar?</p>
                </div>
                <div className="flex gap-3">
                  <button 
                    onClick={() => setDeleteConfirmId(null)}
                    className="flex-1 bg-surface-container-high text-on-surface font-black py-4 rounded-2xl hover:bg-surface-container-highest transition-all uppercase tracking-widest text-[10px]"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={() => handleDelete(deleteConfirmId)}
                    className="flex-1 bg-red-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-red-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all uppercase tracking-widest text-[10px]"
                  >
                    Excluir
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
