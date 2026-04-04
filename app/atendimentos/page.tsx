'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '@/context/AuthContext';
import Pagination from '@/components/Pagination';
import RecordsSummary from '@/components/RecordsSummary';
import SearchInput from '@/components/SearchInput';

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
  unidade_cnes?: string;
  cpf_operador?: string;
  operador_nome?: string;
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
  const getGestacaoStatus = (dpp: string) => {
    if (!dpp) return '---';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(dpp);
    end.setHours(0, 0, 0, 0);
    return now >= end ? 'VENCIDA' : 'ATIVA';
  };

  const calculateTrimestre = (dum: string, dataConsulta: string) => {
    if (!dum || !dataConsulta) return null;
    const start = new Date(dum + 'T12:00:00');
    const consult = new Date(dataConsulta + 'T12:00:00');
    const diffTime = consult.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays > 280) return 'FORA DO PERÍODO';
    if (diffDays <= 91) return '1º TRIMESTRE';
    if (diffDays <= 189) return '2º TRIMESTRE';
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

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen, refreshTrigger, setOnExportCSV } = useSearch();
  const { user: authUser } = useAuth();
  const [atendimentos, setAtendimentos] = useState<Atendimento[]>([]);
  const [totalAtendimentosCount, setTotalAtendimentosCount] = useState(0);
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
    equipe: '',
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

  const uniqueCategorias = useMemo(() => {
    const cats = new Set<string>();
    allProfessionals.forEach(p => {
      const cat = getCboCategory(p.cbo);
      if (cat) cats.add(cat);
    });
    return Array.from(cats).sort();
  }, [allProfessionals]);

  const uniqueEquipes = useMemo(() => {
    const eqs = new Set<string>();
    gestacoes.forEach(g => {
      if (g.equipe) eqs.add(g.equipe);
    });
    return Array.from(eqs).sort();
  }, [gestacoes]);

  const [formData, setFormData] = useState<Partial<Atendimento>>({
    sispn: '',
    data_consulta: '',
    cbo: '',
    cpf: 'NÃO INFORMADO',
    data_proxima_consulta: '',
    observacoes_clinicas: ''
  });

  const [selectedPatientSispn, setSelectedPatientSispn] = useState<string | null>(null);
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const patientsWithAtendimentos = useMemo(() => {
    const patientMap = new Map<string, any>();
    
    gestacoes.forEach(g => {
      const status = getGestacaoStatus(g.dpp);
      if (!filters.status || status === filters.status) {
        patientMap.set(g.sispn, {
          ...g,
          atendimentosCount: 0,
          lastAtendimentoDate: null,
          nextAtendimentoDate: null,
          status: status
        });
      }
    });

    atendimentos.forEach(a => {
      const p = patientMap.get(a.sispn);
      if (p) {
        p.atendimentosCount++;
        if (!p.lastAtendimentoDate || new Date(a.data_consulta) > new Date(p.lastAtendimentoDate)) {
          p.lastAtendimentoDate = a.data_consulta;
        }
        if (a.data_proxima_consulta) {
          if (!p.nextAtendimentoDate || new Date(a.data_proxima_consulta) < new Date(p.nextAtendimentoDate)) {
            // We want the *soonest* next appointment
            if (new Date(a.data_proxima_consulta) >= new Date()) {
               p.nextAtendimentoDate = a.data_proxima_consulta;
            }
          }
        }
      }
    });

    return Array.from(patientMap.values());
  }, [gestacoes, atendimentos, filters.status]);

  const filteredPatients = useMemo(() => {
    return patientsWithAtendimentos.filter(p => {
      const query = searchQuery.toLowerCase().trim();
      const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
      const queryNormalizada = normalize(query);
      
      const matchesSearch = !query || (
        normalize(p.paciente_nome).includes(queryNormalizada) ||
        normalize(p.sispn).includes(queryNormalizada)
      );

      if (!matchesSearch) return false;
      
      if (filters.trimestre || filters.categoria) {
        const patientAtendimentos = atendimentos.filter(a => a.sispn === p.sispn);
        const hasMatchingAtendimento = patientAtendimentos.some(a => {
          if (filters.trimestre && a.trimestre_consulta !== filters.trimestre) return false;
          if (filters.categoria && getCboCategory(a.cbo) !== filters.categoria) return false;
          return true;
        });
        if (!hasMatchingAtendimento) return false;
      }

      if (filters.dpp && !p.dpp?.startsWith(filters.dpp)) return false;
      if (filters.equipe && p.equipe !== filters.equipe) return false;

      return true;
    });
  }, [patientsWithAtendimentos, atendimentos, searchQuery, filters]);

  const groupedAtendimentos = useMemo(() => {
    if (!selectedPatientSispn) return {};
    const patientAtendimentos = atendimentos.filter(a => a.sispn === selectedPatientSispn);
    const groups: Record<string, any[]> = {
      '1º TRIMESTRE': [],
      '2º TRIMESTRE': [],
      '3º TRIMESTRE': [],
      'FORA DO PERÍODO': []
    };
    patientAtendimentos.forEach(a => {
      const trim = a.trimestre_consulta || 'FORA DO PERÍODO';
      if (!groups[trim]) groups[trim] = [];
      groups[trim].push(a);
    });

    // Sort by date within each trimester (ascending order as requested "order of date")
    Object.keys(groups).forEach(key => {
      groups[key].sort((a, b) => new Date(a.data_consulta).getTime() - new Date(b.data_consulta).getTime());
    });

    return groups;
  }, [selectedPatientSispn, atendimentos]);

  const handleViewPatient = (sispn: string) => {
    setSelectedPatientSispn(sispn);
    setFormData({
      sispn,
      data_consulta: new Date().toISOString().split('T')[0],
      cbo: '',
      cpf: 'NÃO INFORMADO',
      data_proxima_consulta: '',
      observacoes_clinicas: ''
    });
    setPatientSearch(gestacoes.find(g => g.sispn === sispn)?.paciente_nome || sispn);
    setIsViewingHistory(true);
    setIsFormOpen(true);
    
    // Scroll to history table after a short delay to allow rendering
    setTimeout(() => {
      const historyElement = document.getElementById('history-table');
      if (historyElement) {
        historyElement.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  };

  useEffect(() => {
    if (!isFormOpen) {
      setEditingId(null);
      setSelectedPatientSispn(null);
      setIsViewingHistory(false);
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
  }, [refreshTrigger]);

  const fetchData = async () => {
    if (!isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    try {
      // Fetch Categories and Professionals
      const [catsRes, prosRes] = await Promise.all([
        supabase.from('categorias_profissionais').select('*').order('categoria').limit(1000),
        supabase.from('profissionais').select('cpf, nome, cbo, situacao, equipe').order('nome').limit(1000)
      ]);

      const professionalsData = prosRes.data || [];
      if (catsRes.data) setCategories(catsRes.data);
      if (prosRes.data) setAllProfessionals(professionalsData);

      // Fetch Patients in chunks
      let patientsList: any[] = [];
      let pacFrom = 0;
      let pacHasMore = true;
      while (pacHasMore) {
        const { data, error } = await supabase.from('pacientes').select('cpf, gestante').range(pacFrom, pacFrom + 999);
        if (error) throw error;
        if (data && data.length > 0) {
          patientsList = [...patientsList, ...data];
          if (data.length < 1000) pacHasMore = false;
          else pacFrom += 1000;
        } else pacHasMore = false;
        if (pacFrom > 50000) break;
      }

      // Fetch Gestacoes in chunks
      let gestacoesData: any[] = [];
      let gestFrom = 0;
      let gestHasMore = true;
      while (gestHasMore) {
        const { data, error } = await supabase
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
          `)
          .range(gestFrom, gestFrom + 999);
        
        if (error) throw error;
        if (data && data.length > 0) {
          gestacoesData = [...gestacoesData, ...data];
          if (data.length < 1000) gestHasMore = false;
          else gestFrom += 1000;
        } else gestHasMore = false;
        if (gestFrom > 50000) break;
      }
      
      let formattedGest: any[] = gestacoesData.map(g => {
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
      });
      setGestacoes(formattedGest);

      // Fetch Atendimentos in chunks
      let atendimentosData: any[] = [];
      let atendFrom = 0;
      let atendHasMore = true;
      while (atendHasMore) {
        const { data, error, count } = await supabase
          .from('atendimentos')
          .select('*', { count: 'exact' })
          .order('data_consulta', { ascending: false })
          .range(atendFrom, atendFrom + 999);
        
        if (error) throw error;
        if (atendFrom === 0) setTotalAtendimentosCount(count || 0);

        if (data && data.length > 0) {
          atendimentosData = [...atendimentosData, ...data];
          if (data.length < 1000) atendHasMore = false;
          else atendFrom += 1000;
        } else atendHasMore = false;
        if (atendFrom > 50000) break;
      }

      // Manually join data to avoid complex join errors
      const enrichedAtendimentos = atendimentosData.map(c => {
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
            equipe: prof.equipe
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
      
      if (trimestre === 'FORA DO PERÍODO') {
        setError(`Data da consulta (${formData.data_consulta}) está fora do período gestacional (0-280 dias).`);
        return;
      }

      const professional = allProfessionals.find(p => p.cpf === selectedProfessionalCpf);

      const payload = {
        sispn: formData.sispn,
        data_consulta: formData.data_consulta,
        trimestre_consulta: trimestre,
        cbo: professional?.cbo || formData.cbo,
        cpf: selectedProfessionalCpf,
        data_proxima_consulta: formData.data_proxima_consulta || null,
        observacoes_clinicas: formData.observacoes_clinicas || null,
        unidade_cnes: authUser?.unidade_cnes || null,
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
    if (!con) return;
    
    setEditingId(con.id_atendimento);
    setIsViewingHistory(false);
    setSelectedPatientSispn(con.sispn);
    
    // Get patient name safely
    let gestanteNome = con.sispn;
    if (con.gestacoes) {
      const gest = Array.isArray(con.gestacoes) ? con.gestacoes[0] : con.gestacoes;
      const pac = gest?.pacientes;
      const pacObj = Array.isArray(pac) ? pac[0] : pac;
      if (pacObj?.gestante) {
        gestanteNome = pacObj.gestante;
      }
    }
    
    setPatientSearch(gestanteNome);
    setProfessionalSearch(con.profissionais?.nome || con.cpf || '');
    setSelectedProfessionalCpf(con.cpf || '');
    
    // Find category
    if (con.cpf) {
      const professional = allProfessionals.find(p => p.cpf === con.cpf);
      if (professional) {
        const category = categories.find(c => c.cbo === professional.cbo.substring(0, 4));
        if (category) setSelectedCategory(category.categoria);
      }
    }

    setFormData({
      sispn: con.sispn || '',
      data_consulta: con.data_consulta || '',
      cbo: con.cbo || '',
      cpf: con.cpf || '',
      data_proxima_consulta: con.data_proxima_consulta || '',
      observacoes_clinicas: con.observacoes_clinicas || ''
    });
    
    setIsFormOpen(true);
    
    // Scroll to top to show the form
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
    const activePros = allProfessionals.filter(p => (p as any).situacao === 'ATIVO');
    if (!professionalSearch || professionalSearch.length < 1) return activePros.slice(0, 10);
    
    const normalize = (str: string) => 
      str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    
    const query = normalize(professionalSearch);
    
    return activePros.filter(p => {
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

  const handleExportCSV = useCallback(() => {
    const headers = ['SISPN', 'GESTANTE', 'DATA CONSULTA', 'TRIMESTRE', 'PROFISSIONAL', 'CBO'];
    const rows = filteredAtendimentos.map(a => [
      a.sispn,
      a.gestacoes?.pacientes?.gestante || 'N/A',
      new Date(a.data_consulta).toLocaleDateString('pt-BR'),
      a.trimestre_consulta,
      a.profissionais?.nome || 'N/A',
      a.cbo
    ]);
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "atendimentos.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredAtendimentos]);

  useEffect(() => {
    setOnExportCSV(() => handleExportCSV);
    return () => setOnExportCSV(null);
  }, [handleExportCSV, setOnExportCSV]);

  if (!mounted) return null;

  return (
    <DashboardLayout>
      <div className="p-4 md:p-8 lg:p-10 pb-32 max-w-7xl mx-auto space-y-10">
        {/* Topbar Pattern - Figura 1 */}
        <div className="bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-primary uppercase tracking-tight">Atendimentos</h1>
          </div>

          <SearchInput className="hidden md:flex flex-1 mx-8" />

          <RecordsSummary 
            total={atendimentos.length} 
            filtered={filteredPatients.length} 
          />
        </div>

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
                      {editingId ? 'Editar Atendimento' : 'NOVO ATENDIMENTO'}
                    </h3>
                    <p className="text-sm text-on-surface-variant/60 font-body">Preencha os dados clínicos com atenção para análise futura.</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                  <div className={isViewingHistory && !editingId ? 'hidden' : 'block'}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                    {/* Column 1 */}
                    <div className="space-y-6">
                      <div className="space-y-2 relative" ref={patientDropdownRef}>
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Busca por SISPN ou Nome <span className="text-error">*</span></label>
                        <div className="relative">
                          <input 
                            type="text"
                            className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none shadow-inner pr-12"
                            placeholder="Busca por SISPN ou Nome"
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
                                className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest rounded-2xl shadow-2xl border-4 border-primary z-50 overflow-hidden"
                              >
                                <div className="bg-primary px-6 py-3">
                                  <p className="text-white font-black text-[10px] uppercase tracking-widest">Selecione a gestante...</p>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                  {patientSearchResults.map((g, idx) => (
                                    <button
                                      key={`${g.sispn}-${idx}`}
                                      type="button"
                                      onClick={() => {
                                        setFormData({ ...formData, sispn: g.sispn });
                                        setPatientSearch(g.paciente_nome);
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

                      <div className="grid grid-cols-1 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">SISPN</label>
                          <input 
                            type="text"
                            readOnly
                            className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-headline text-lg font-black outline-none text-primary uppercase shadow-sm"
                            value={selectedGestante?.sispn || ''}
                            placeholder="-"
                          />
                        </div>
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
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">DPP Referência</label>
                          <input 
                            type="text"
                            readOnly
                            className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-sm outline-none text-on-surface-variant/60"
                            value={selectedGestante ? getDppReferencia(selectedGestante.dpp) : ''}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Referência Consulta</label>
                          <input 
                            type="text"
                            readOnly
                            className="w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-sm outline-none text-on-surface-variant/60"
                            value={getConsultaReferencia(formData.data_consulta || '')}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Próxima Consulta</label>
                          <div className="relative">
                            <input 
                              type="date"
                              className="w-full bg-surface-container-low border-2 border-transparent focus:border-primary focus:bg-white rounded-2xl px-6 py-4 transition-all font-body text-sm outline-none"
                              value={formData.data_proxima_consulta || ''}
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
                              value={formData.data_consulta || ''}
                              onChange={(e) => setFormData({ ...formData, data_consulta: e.target.value })}
                              required
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-[0.2em] text-on-surface-variant/50 ml-2">Trimestre Consulta</label>
                          <input 
                            type="text"
                            readOnly
                            className={`w-full bg-surface-container-low border-2 border-transparent rounded-2xl px-6 py-4 font-body text-sm outline-none uppercase ${calculateTrimestre(selectedGestante?.dum || '', formData.data_consulta || '') === 'FORA DO PERÍODO' ? 'text-error font-black' : 'text-on-surface-variant/60'}`}
                            value={calculateTrimestre(selectedGestante?.dum || '', formData.data_consulta || '') || ''}
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
                                className="absolute top-full left-0 right-0 mt-2 bg-surface-container-lowest rounded-2xl shadow-2xl border-4 border-primary z-50 overflow-hidden"
                              >
                                <div className="bg-primary px-6 py-3">
                                  <p className="text-white font-black text-[10px] uppercase tracking-widest">Selecione o profissional...</p>
                                </div>
                                <div className="max-h-80 overflow-y-auto">
                                  {professionalSearchResults.map((p, idx) => (
                                    <button
                                      key={`${p.cpf}-${idx}`}
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
                                </div>
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
                          value={formData.observacoes_clinicas || ''}
                          onChange={(e) => setFormData({ ...formData, observacoes_clinicas: e.target.value })}
                        />
                      </div>
                    </div>
                    </div>
                  </div>

                  <div className={`flex justify-end gap-4 pt-8 border-t border-outline-variant/10 ${isViewingHistory && !editingId ? 'hidden' : 'flex'}`}>
                    <button 
                      type="button"
                      onClick={() => {
                        setIsFormOpen(false);
                        setEditingId(null);
                        setSelectedPatientSispn(null);
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

                {/* Integrated History Table */}
                {selectedPatientSispn && (
                  <div id="history-table" className="pt-12 space-y-8 border-t border-outline-variant/10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                          <span className="material-symbols-outlined">history</span>
                        </div>
                        <div>
                          <h4 className="text-lg font-black text-primary uppercase tracking-tight">Histórico de Atendimentos Realizados</h4>
                          <p className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-widest">Acompanhamento cronológico por trimestre</p>
                        </div>
                      </div>
                      
                      {isViewingHistory && !editingId && (
                        <button 
                          type="button"
                          onClick={() => setIsViewingHistory(false)}
                          className="bg-primary text-white px-6 py-3 rounded-full font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                        >
                          <span className="material-symbols-outlined text-sm">add</span>
                          Novo Atendimento
                        </button>
                      )}
                    </div>

                    <div className="bg-surface-container-low rounded-[2.5rem] overflow-hidden border border-outline-variant/5">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-separate border-spacing-0">
                          <thead>
                            <tr className="bg-surface-container-high/50">
                              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-primary/60">Data</th>
                              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-primary/60">Trimestre</th>
                              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-primary/60">Profissional</th>
                              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-primary/60">Próxima</th>
                              <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-primary/60 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/5">
                            {Object.entries(groupedAtendimentos)
                              .filter(([_, items]) => items && items.length > 0)
                              .map(([trimestre, items]) => (
                                <React.Fragment key={`group-${trimestre}`}>
                                  <tr className="bg-primary/[0.02]">
                                    <td colSpan={5} className="px-6 py-2 text-[8px] font-black text-primary uppercase tracking-[0.3em] text-center">
                                      {trimestre}
                                    </td>
                                  </tr>
                                  {items.map((con, idx) => (
                                    <tr key={`atendimento-${con.id_atendimento || `idx-${idx}`}`} className="hover:bg-white/50 transition-colors group">
                                      <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                          <span className="text-xs font-bold text-on-surface">{new Date(con.data_consulta).toLocaleDateString('pt-BR')}</span>
                                          <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase tracking-widest">{getConsultaReferencia(con.data_consulta)}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        <span className="text-[9px] font-black text-on-surface-variant/60 uppercase tracking-widest">{con.trimestre_consulta}</span>
                                      </td>
                                      <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                          <span className="text-xs font-bold text-primary uppercase">{con.profissionais?.nome || '---'}</span>
                                          <span className="text-[9px] font-black text-on-surface-variant/40 uppercase tracking-widest">{getCboCategory(con.cbo)}</span>
                                        </div>
                                      </td>
                                      <td className="px-6 py-4">
                                        {con.data_proxima_consulta ? (
                                          <span className="text-xs font-bold text-primary">{new Date(con.data_proxima_consulta).toLocaleDateString('pt-BR')}</span>
                                        ) : (
                                          <span className="text-[9px] font-bold text-on-surface-variant/20 uppercase tracking-widest">---</span>
                                        )}
                                      </td>
                                      <td className="px-6 py-4">
                                        <div className="flex items-center justify-center gap-2">
                                          <button 
                                            type="button"
                                            onClick={() => handleEdit(con)} 
                                            className="p-2 rounded-xl bg-white/50 text-on-surface-variant hover:bg-primary hover:text-white transition-all shadow-sm"
                                            title="Editar"
                                          >
                                            <span className="material-symbols-outlined text-sm">edit</span>
                                          </button>
                                          <button 
                                            type="button"
                                            onClick={() => setDeleteConfirmId(con.id_atendimento)} 
                                            className="p-2 rounded-xl bg-white/50 text-on-surface-variant hover:bg-error hover:text-white transition-all shadow-sm"
                                            title="Excluir"
                                          >
                                            <span className="material-symbols-outlined text-sm">delete</span>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </React.Fragment>
                              ))}
                            {Object.values(groupedAtendimentos).every(arr => arr.length === 0) && (
                              <tr>
                                <td colSpan={5} className="px-6 py-12 text-center opacity-20 text-[10px] font-black uppercase tracking-widest">Nenhum atendimento registrado</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 bg-primary/10 px-5 py-2.5 rounded-full border border-primary/20 shrink-0">
                <span className="material-symbols-outlined text-primary text-sm">filter_alt</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-primary">Filtros Ativos</span>
              </div>
              
              <select 
                className="w-full lg:w-auto bg-white text-primary border-2 border-primary/30 hover:shadow-primary/5 hover:border-primary rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Status Gestação</option>
                <option value="ATIVA">GESTAÇÃO ATIVA</option>
                <option value="VENCIDA">GESTAÇÃO VENCIDA</option>
              </select>

              <select 
                className="w-full lg:w-auto bg-white text-primary border-2 border-primary/30 hover:shadow-primary/5 hover:border-primary rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                value={filters.dpp}
                onChange={(e) => setFilters({ ...filters, dpp: e.target.value })}
              >
                <option value="">DPP (AAAA/MM)</option>
                {uniqueDppMonths.map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <select 
                className="w-full lg:w-auto bg-white text-primary border-2 border-primary/30 hover:shadow-primary/5 hover:border-primary rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                value={filters.trimestre}
                onChange={(e) => setFilters({ ...filters, trimestre: e.target.value as any })}
              >
                <option value="">Trimestre</option>
                <option value="1º TRIMESTRE">1º TRIMESTRE</option>
                <option value="2º TRIMESTRE">2º TRIMESTRE</option>
                <option value="3º TRIMESTRE">3º TRIMESTRE</option>
              </select>

              <select 
                className="w-full lg:w-auto bg-white text-primary border-2 border-primary/30 hover:shadow-primary/5 hover:border-primary rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                value={filters.categoria}
                onChange={(e) => setFilters({ ...filters, categoria: e.target.value })}
              >
                <option value="">Profissional</option>
                {uniqueCategorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              <select 
                className="w-full lg:w-auto bg-white text-primary border-2 border-primary/30 hover:shadow-primary/5 hover:border-primary rounded-full px-5 py-2.5 text-[9px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer shadow-sm"
                value={filters.equipe}
                onChange={(e) => setFilters({ ...filters, equipe: e.target.value })}
              >
                <option value="">Equipe</option>
                {uniqueEquipes.map(eq => (
                  <option key={eq} value={eq}>{eq}</option>
                ))}
              </select>

              {(filters.dpp || filters.trimestre || filters.categoria || filters.equipe || filters.status !== 'ATIVA') && (
                <button 
                  onClick={() => setFilters({ dpp: '', trimestre: '', categoria: '', equipe: '', status: 'ATIVA' })}
                  className="w-full lg:w-auto flex items-center justify-center gap-2 px-6 py-2.5 rounded-full bg-error/10 text-error text-[9px] font-black uppercase tracking-widest hover:bg-error hover:text-white transition-all border border-error/20"
                >
                  <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                  Limpar
                </button>
              )}
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-[40px] shadow-2xl border border-outline-variant/10 overflow-hidden">
            <div className="overflow-x-auto max-h-[600px] scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-30 bg-surface-container-low">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Gestante</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">SISPN</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Atendimentos</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Última Consulta</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Próxima Consulta</th>
                    <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {loading ? (
                    <tr><td colSpan={6} className="p-32 text-center"><div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div></td></tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr><td colSpan={6} className="p-32 text-center opacity-20 text-xl font-black uppercase tracking-widest">Nenhum paciente encontrado</td></tr>
                  ) : (
                    filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((p) => (
                      <tr key={p.sispn} className="hover:bg-primary/[0.02] transition-colors group">
                        <td className="px-8 py-6">
                          <p className="font-black text-sm text-on-surface uppercase tracking-tight group-hover:text-primary transition-colors">
                            {p.paciente_nome}
                          </p>
                          <span className="text-[10px] font-bold text-primary/40 uppercase tracking-widest">{p.equipe}</span>
                        </td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.status === 'ATIVA' ? 'bg-blue-100 text-blue-600' : 'bg-surface-container-high text-on-surface-variant/40'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-[10px] font-bold text-on-surface-variant/60 font-mono">{p.sispn}</td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-primary/40">medical_services</span>
                            <span className="text-xs font-bold text-on-surface">{p.atendimentosCount} consultas</span>
                          </div>
                        </td>
                        <td className="px-8 py-6 text-xs font-bold text-on-surface">
                          {p.lastAtendimentoDate ? new Date(p.lastAtendimentoDate).toLocaleDateString('pt-BR') : '---'}
                        </td>
                        <td className="px-8 py-6">
                          {p.nextAtendimentoDate ? (
                            <div className="flex items-center gap-2 text-xs font-bold text-primary">
                              <span className="material-symbols-outlined text-sm">event_repeat</span>
                              {new Date(p.nextAtendimentoDate).toLocaleDateString('pt-BR')}
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-on-surface-variant/20 uppercase tracking-widest">Não agendada</span>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => handleViewPatient(p.sispn)} className="p-3 rounded-2xl bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all" title="Visualizar Detalhes"><span className="material-symbols-outlined text-lg">visibility</span></button>
                            <button onClick={() => { 
                              setSelectedPatientSispn(p.sispn); 
                              setFormData({
                                sispn: p.sispn,
                                data_consulta: new Date().toISOString().split('T')[0],
                                cbo: '',
                                cpf: 'NÃO INFORMADO',
                                data_proxima_consulta: '',
                                observacoes_clinicas: ''
                              }); 
                              setPatientSearch(p.paciente_nome); 
                              setIsViewingHistory(false);
                              setIsFormOpen(true); 
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} className="p-3 rounded-2xl bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all" title="Adicionar Atendimento"><span className="material-symbols-outlined text-lg">add</span></button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            
            <Pagination currentPage={currentPage} totalPages={Math.ceil(filteredPatients.length / itemsPerPage)} onPageChange={setCurrentPage} totalItems={filteredPatients.length} itemsPerPage={itemsPerPage} itemName="pacientes" />
          </div>
        </section>

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
