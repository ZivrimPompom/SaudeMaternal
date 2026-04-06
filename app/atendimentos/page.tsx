'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import Pagination from '@/components/Pagination';
import RecordsSummary from '@/components/RecordsSummary';
import SearchInput from '@/components/SearchInput';
import PatientBanner from '@/components/PatientBanner';

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
  paciente_cns?: string;
  paciente_nascimento?: string;
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

  // New states for multiple entries
  const [formEntries, setFormEntries] = useState<any[]>([]);

  useEffect(() => {
    if (mounted && formEntries.length === 0) {
      setFormEntries([
        {
          id: Math.random().toString(36).substr(2, 9),
          data_consulta: '',
          trimestre_consulta: '---',
          cpf_profissional: '',
          data_proxima_consulta: '',
          observacoes_clinicas: ''
        }
      ]);
    }
  }, [mounted, formEntries.length]);

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
          trim1Count: 0,
          trim2Count: 0,
          trim3Count: 0,
          currentTrimester: '---',
          hasAlert: false,
          alertMessage: '',
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
        if (a.trimestre_consulta === '1º TRIMESTRE') p.trim1Count++;
        if (a.trimestre_consulta === '2º TRIMESTRE') p.trim2Count++;
        if (a.trimestre_consulta === '3º TRIMESTRE') p.trim3Count++;
        if (a.data_proxima_consulta) {
          const nextDate = new Date(a.data_proxima_consulta);
          if (!p.nextAtendimentoDate || nextDate < new Date(p.nextAtendimentoDate)) {
            if (nextDate >= new Date()) {
               p.nextAtendimentoDate = a.data_proxima_consulta;
            }
          }
        }
      }
    });

    // Calculate alert based on current trimester and consultation counts
    patientMap.forEach((p) => {
      if (p.dum) {
        const weeks = calculateWeeks(p.dum);
        if (weeks <= 13) p.currentTrimester = '1º TRIMESTRE';
        else if (weeks <= 27) p.currentTrimester = '2º TRIMESTRE';
        else p.currentTrimester = '3º TRIMESTRE';

        const minConsultas: Record<string, number> = {
          '1º TRIMESTRE': 3,
          '2º TRIMESTRE': 6,
          '3º TRIMESTRE': 9,
        };

        const required = minConsultas[p.currentTrimester] || 0;
        const totalConsultas = p.trim1Count + p.trim2Count + p.trim3Count;

        if (totalConsultas === 0) {
          p.hasAlert = true;
          p.alertMessage = `SEM CONSULTAS (${p.currentTrimester})`;
        } else if (totalConsultas < required) {
          p.hasAlert = true;
          p.alertMessage = `${totalConsultas}/${required} CONSULTAS`;
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
      
      if (filters.trimestre && p.currentTrimester !== filters.trimestre) return false;

      if (filters.categoria) {
        const patientAtendimentos = atendimentos.filter(a => a.sispn === p.sispn);
        const hasMatchingAtendimento = patientAtendimentos.some(a => {
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

  const selectedGestante = useMemo(() => {
    return gestacoes.find(g => g.sispn === formData.sispn);
  }, [formData.sispn, gestacoes]);

  const selectedPatientHistory = useMemo(() => {
    if (!formData.sispn) return [];
    return atendimentos
      .filter(a => a.sispn === formData.sispn)
      .sort((a, b) => new Date(b.data_consulta).getTime() - new Date(a.data_consulta).getTime());
  }, [formData.sispn, atendimentos]);

  const handleViewPatient = (sispn: string) => {
    setFormData({ sispn });
    setPatientSearch(gestacoes.find(g => g.sispn === sispn)?.paciente_nome || sispn);
    setIsViewingHistory(true);
    setIsFormOpen(true);
    
    // Wait for animation to complete, then scroll to show full banner
    setTimeout(() => {
      const formElement = document.getElementById('launch-section');
      if (formElement) {
        formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 350);
  };

  useEffect(() => {
    if (!isFormOpen) {
      setEditingId(null);
      setSelectedPatientSispn(null);
      setIsViewingHistory(false);
      setFormData({
        sispn: '',
      });
      const today = new Date().toISOString().split('T')[0];
      setFormEntries([
        {
          id: Math.random().toString(36).substr(2, 9),
          data_consulta: today,
          trimestre_consulta: '1º TRIMESTRE',
          cpf_profissional: '',
          data_proxima_consulta: '',
          observacoes_clinicas: ''
        }
      ]);
      setPatientSearch('');
      setProfessionalSearch('');
      setSelectedProfessionalCpf('');
      setSelectedCategory('MEDICO');
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
            pacientes (gestante, cpf, cns, data_nascimento)
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
          paciente_cpf: String(cpf || 'NÃO INFORMADO'),
          paciente_cns: (pac as any)?.cns || '---',
          paciente_nascimento: (pac as any)?.data_nascimento || null
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

    const gest = gestacoes.find(g => g.sispn === formData.sispn);
    if (!gest) {
      setError('Gestaçāo não encontrada no registro de gestações.');
      return;
    }

    const status = getGestacaoStatus(gest.dpp);
    if (status === 'VENCIDA') {
      setError('Não é possível registrar atendimentos para gestações com status VENCIDA.');
      return;
    }

    try {
      const payloads = formEntries.map(entry => {
        if (!entry.cpf_profissional) {
          throw new Error('Selecione um profissional para todas as linhas.');
        }

        const trimestre = calculateTrimestre(gest.dum, entry.data_consulta || '');
        
        if (trimestre === 'FORA DO PERÍODO') {
          throw new Error(`Data da consulta (${entry.data_consulta}) está fora do período gestacional (0-280 dias).`);
        }

        const professional = allProfessionals.find(p => p.cpf === entry.cpf_profissional);

        return {
          sispn: formData.sispn,
          data_consulta: entry.data_consulta,
          trimestre_consulta: trimestre,
          cbo: professional?.cbo || null,
          cpf: entry.cpf_profissional,
          data_proxima_consulta: entry.data_proxima_consulta || null,
          observacoes_clinicas: entry.observacoes_clinicas || null,
          unidade_cnes: authUser?.unidade_cnes || null,
          cpf_operador: authUser?.cpf || null
        };
      });

      if (editingId) {
        const { error: updateError } = await supabase
          .from('atendimentos')
          .update(payloads[0])
          .eq('id_atendimento', editingId);
        if (updateError) throw updateError;
        setSuccess('Atendimento atualizado!');
      } else {
        const { error: insertError } = await supabase
          .from('atendimentos')
          .insert(payloads);
        if (insertError) throw insertError;
        setSuccess(`${payloads.length} atendimentos registrados!`);
      }

      await fetchData();
      const launchSection = document.getElementById('launch-section');
      if (launchSection) {
        launchSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEdit = (con: Atendimento) => {
    if (!con) return;
    
    setEditingId(con.id_atendimento);
    const gest = Array.isArray(con.gestacoes) ? con.gestacoes[0] : con.gestacoes;
    const pac = gest?.pacientes;
    const pacObj = Array.isArray(pac) ? pac[0] : pac;
    
    setPatientSearch((pacObj as any)?.gestante || con.sispn);
    setSelectedProfessionalCpf(con.cpf || '');
    
    const prof = allProfessionals.find(p => p.cpf === con.cpf);
    if (prof) {
      setProfessionalSearch(prof.nome);
      const cat = categories.find(c => prof.cbo.startsWith(c.cbo));
      if (cat) setSelectedCategory(cat.categoria);
    }

    setFormData({
      sispn: con.sispn,
    });
    
    setFormEntries([
      {
        id: Math.random().toString(36).substr(2, 9),
        data_consulta: con.data_consulta,
        trimestre_consulta: con.trimestre_consulta,
        cpf_profissional: con.cpf || '',
        data_proxima_consulta: con.data_proxima_consulta || '',
        observacoes_clinicas: con.observacoes_clinicas || '',
        nome_profissional: prof?.nome || ''
      }
    ]);

    setIsViewingHistory(false);
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

  const filteredProfessionals = useMemo(() => {
    if (!selectedCategory) return [];
    const category = categories.find(c => c.categoria === selectedCategory);
    if (!category) return [];
    return allProfessionals.filter(p => p.cbo.startsWith(category.cbo));
  }, [selectedCategory, categories, allProfessionals]);

  const handleExportCSV = useCallback(() => {
    const headers = ['SISPN', 'GESTANTE', 'DATA CONSULTA', 'TRIMESTRE', 'PROFISSIONAL', 'CBO', 'PRÓXIMA CONSULTA', 'OBSERVAÇÕES'];
    const rows = atendimentos.filter(a => {
      const query = searchQuery.toLowerCase().trim();
      const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
      const queryNormalizada = normalize(query);
      const gest = Array.isArray(a.gestacoes) ? a.gestacoes[0] : a.gestacoes;
      const pac = gest?.pacientes;
      const pacObj = Array.isArray(pac) ? pac[0] : pac;
      const pacienteNome = (pacObj as any)?.gestante || '';
      const profissionalNome = a.profissionais?.nome || '';
      const matchesSearch = !query || (
        normalize(pacienteNome).includes(queryNormalizada) ||
        normalize(a.sispn).includes(queryNormalizada) ||
        normalize(profissionalNome).includes(queryNormalizada) ||
        normalize(a.cbo).includes(queryNormalizada)
      );
      if (!matchesSearch) return false;
      if (filters.trimestre && a.trimestre_consulta !== filters.trimestre) return false;
      if (filters.categoria && getCboCategory(a.cbo) !== filters.categoria) return false;
      const equipe = a.profissionais?.equipe || (gest as any)?.equipe || '';
      if (filters.equipe && equipe !== filters.equipe) return false;
      return true;
    }).map(a => {
      const gest = Array.isArray(a.gestacoes) ? a.gestacoes[0] : a.gestacoes;
      const pac = gest?.pacientes;
      const pacObj = Array.isArray(pac) ? pac[0] : pac;
      return [
        a.sispn,
        (pacObj as any)?.gestante || '',
        a.data_consulta,
        a.trimestre_consulta,
        a.profissionais?.nome || 'N/A',
        a.cbo || '',
        a.data_proxima_consulta || '',
        (a.observacoes_clinicas || '').replace(/,/g, ';')
      ];
    });
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
  }, [atendimentos, searchQuery, filters]);

  useEffect(() => {
    setOnExportCSV(() => handleExportCSV);
    return () => setOnExportCSV(null);
  }, [handleExportCSV, setOnExportCSV]);

  if (!mounted) return null;

  return (
    <DashboardLayout title="Atendimentos">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Topbar Pattern - Figura 1 */}
        <div className="bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-primary uppercase tracking-tight">Atendimentos</h1>
          </div>

          <SearchInput className="w-full md:flex-1 md:mx-8" />

          <RecordsSummary 
            total={atendimentos.length} 
            filtered={filteredPatients.length} 
          />
        </div>

        <AnimatePresence>
          {isFormOpen && (
            <motion.section initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
              <div id="launch-section" className="bg-surface-container-lowest p-4 md:p-6 rounded-2xl shadow-2xl border border-outline-variant/10 space-y-3">
                {selectedGestante && (
                  <PatientBanner 
                    patient={{
                      nome: selectedGestante.paciente_nome,
                      data_nascimento: selectedGestante.paciente_nascimento || '',
                      cpf: selectedGestante.paciente_cpf,
                      cns: selectedGestante.paciente_cns || '',
                      dum: selectedGestante.dum,
                      dpp: selectedGestante.dpp,
                      data_cadastro: selectedGestante.data_cadastro,
                      risco: selectedGestante.classificacao_pn || 'HABITUAL'
                    }}
                  />
                )}

                {!isViewingHistory ? (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Spreadsheet Grid */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-primary uppercase tracking-widest">Lançamento de Atendimentos</h4>
                        {!editingId && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setFormEntries([...formEntries, {
                                id: Math.random().toString(36).substr(2, 9),
                                data_consulta: '',
                                trimestre_consulta: '---',
                                cpf_profissional: '',
                                data_proxima_consulta: '',
                                observacoes_clinicas: ''
                              }]);
                            }}
                            className="flex items-center gap-2 text-primary hover:text-primary/70 transition-colors"
                          >
                            <span className="material-symbols-outlined text-lg">add_circle</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">Adicionar Linha</span>
                          </button>
                        )}
                      </div>

                      <div className="bg-surface-container-low rounded-2xl overflow-x-auto border border-outline-variant/10">
                        <table className="w-full text-left border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
                          <colgroup>
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '8%' }} />
                          </colgroup>
                            <thead className="bg-slate-100 dark:bg-slate-800">
                              <tr>
                                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-black dark:text-slate-200">Data Consulta</th>
                                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-black dark:text-slate-200">Trimestre</th>
                                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-black dark:text-slate-200">Profissional</th>
                                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-black dark:text-slate-200">Próxima Consulta</th>
                                <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-black dark:text-slate-200">Observações</th>
                                {!editingId && <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-black dark:text-slate-200 text-center">Ações</th>}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                              {formEntries.map((entry, index) => (
                                <tr key={entry.id} className="hover:bg-orange-50 dark:hover:bg-slate-800/50 transition-colors">
                                  <td className="px-4 py-4">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                                      <input 
                                        type="date" 
                                        className="bg-transparent border-none p-0 text-xs font-bold outline-none focus:ring-0 w-full text-black dark:text-slate-100"
                                        value={entry.data_consulta}
                                        onChange={(e) => {
                                          const newEntries = [...formEntries];
                                          newEntries[index].data_consulta = e.target.value;
                                          const trimestre = calculateTrimestre(selectedGestante?.dum || '', e.target.value);
                                          newEntries[index].trimestre_consulta = trimestre || '---';
                                          setFormEntries(newEntries);
                                        }}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                                      <span className={`text-xs font-bold ${selectedGestante && calculateTrimestre(selectedGestante.dum, entry.data_consulta) === 'FORA DO PERÍODO' ? 'text-red-600' : 'text-black dark:text-slate-100'}`}>
                                        {selectedGestante ? calculateTrimestre(selectedGestante.dum, entry.data_consulta) : '---'}
                                      </span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2 relative min-h-[40px]">
                                      <select 
                                        className="absolute opacity-0 w-full h-full cursor-pointer top-0 left-0 text-xs"
                                        value={entry.cpf_profissional || ''}
                                        onChange={(e) => {
                                          const newEntries = [...formEntries];
                                          const cpf = e.target.value;
                                          newEntries[index].cpf_profissional = cpf;
                                          const prof = allProfessionals.find(p => p.cpf === cpf);
                                          if (prof) {
                                            newEntries[index].nome_profissional = prof.nome;
                                          }
                                          setFormEntries(newEntries);
                                        }}
                                      >
                                        <option value="">SELECIONE PROFISSIONAL</option>
                                        {allProfessionals.map((p) => {
                                          const cat = categories.find(c => p.cbo.startsWith(c.cbo));
                                          return (
                                            <option key={p.cpf} value={p.cpf}>{p.nome} - {cat?.categoria || 'OUTROS'}</option>
                                          );
                                        })}
                                      </select>
                                      <div className="text-xs font-bold uppercase text-black dark:text-slate-100 break-words whitespace-normal pointer-events-none">
                                        {entry.nome_profissional ? (
                                          <>
                                            <p className="font-black text-primary">{entry.nome_profissional}</p>
                                            <p className="text-[10px] text-slate-500">{getCboCategory(allProfessionals.find(p => p.cpf === entry.cpf_profissional)?.cbo)}</p>
                                          </>
                                        ) : (
                                          <p className="text-slate-400">SELECIONE PROFISSIONAL</p>
                                        )}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                                      <input 
                                        type="date" 
                                        className="bg-transparent border-none p-0 text-xs font-bold outline-none focus:ring-0 w-full text-black dark:text-slate-100"
                                        value={entry.data_proxima_consulta || ''}
                                        onChange={(e) => {
                                          const newEntries = [...formEntries];
                                          newEntries[index].data_proxima_consulta = e.target.value;
                                          setFormEntries(newEntries);
                                        }}
                                      />
                                    </div>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-3 py-2">
                                      <input 
                                        type="text"
                                        className="bg-transparent border-none p-0 text-xs font-bold outline-none focus:ring-0 w-full text-black dark:text-slate-100"
                                        value={entry.observacoes_clinicas || ''}
                                        onChange={(e) => {
                                          const newEntries = [...formEntries];
                                          newEntries[index].observacoes_clinicas = e.target.value;
                                          setFormEntries(newEntries);
                                        }}
                                        placeholder="Observações clínicas"
                                      />
                                    </div>
                                  </td>
                                {!editingId && (
                                  <td className="px-2 py-1.5 text-center">
                                    <button 
                                      type="button" 
                                      onClick={() => {
                                        if (formEntries.length > 1) {
                                          setFormEntries(formEntries.filter((_, i) => i !== index));
                                        }
                                      }}
                                      className="text-error hover:scale-110 transition-transform disabled:opacity-20"
                                      disabled={formEntries.length === 1}
                                    >
                                      <span className="material-symbols-outlined text-sm">delete</span>
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 mt-4">
                      <button type="button" onClick={() => setIsFormOpen(false)} className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 bg-white text-primary border border-primary hover:bg-primary/5 shadow-lg shadow-primary/5">
                        <span className="material-symbols-outlined text-sm">close</span>
                        Cancelar
                      </button>
                      <button type="submit" className="flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold transition-all duration-300 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20">
                        <span className="material-symbols-outlined text-sm">save</span>
                        Salvar Atendimento
                      </button>
                    </div>

                    {/* Movimento de Atendimentos da Gestante Selecionada */}
                    {formData.sispn && selectedPatientHistory.length > 0 && (
                      <div id="history-table" className="space-y-2 pt-2 border-t border-outline-variant/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-lg">history</span>
                            <h4 className="text-sm font-black text-primary uppercase tracking-widest">Movimento de Atendimentos Realizados</h4>
                          </div>
                        </div>
                        <div className="bg-surface-container-low rounded-2xl overflow-x-auto border border-outline-variant/10">
                          <table className="w-full text-left border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
                            <colgroup>
                              <col style={{ width: '12%' }} />
                              <col style={{ width: '10%' }} />
                              <col style={{ width: '20%' }} />
                              <col style={{ width: '12%' }} />
                              <col style={{ width: '20%' }} />
                              <col style={{ width: '8%' }} />
                            </colgroup>
                            <thead className="bg-surface-container-high">
                              <tr>
                                <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Data Consulta</th>
                                <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Trimestre</th>
                                <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Profissional</th>
                                <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Próxima Consulta</th>
                                <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60">Observações</th>
                                <th className="px-2 py-1.5 text-[9px] font-black uppercase tracking-widest text-on-surface-variant/60 text-center">Ações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-outline-variant/5">
                              {selectedPatientHistory.map((h) => (
                                <tr key={h.id_atendimento} className="hover:bg-white/50 transition-colors group">
                                  <td className="px-2 py-1.5">
                                    <div className="text-[10px] font-bold text-on-surface">{new Date(h.data_consulta).toLocaleDateString('pt-BR')}</div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="text-[10px] font-bold text-on-surface uppercase">{h.trimestre_consulta}</div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="text-[9px]">
                                      <p className="font-black text-on-surface uppercase">{allProfessionals.find(p => p.cpf === h.cpf)?.nome || '---'}</p>
                                      <p className="font-bold text-on-surface-variant/60 uppercase">{getCboCategory(h.cbo)}</p>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="text-[10px] font-bold text-on-surface">
                                      {h.data_proxima_consulta ? new Date(h.data_proxima_consulta).toLocaleDateString('pt-BR') : '---'}
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="text-[10px] font-bold text-on-surface-variant truncate">
                                      {h.observacoes_clinicas || '---'}
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="flex items-center justify-center gap-1">
                                      <button 
                                        type="button"
                                        onClick={() => handleEdit(h)} 
                                        className="p-1 rounded-xl bg-white/50 text-on-surface-variant hover:bg-primary hover:text-white transition-all"
                                        title="Editar"
                                      >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => setDeleteConfirmId(h.id_atendimento)} 
                                        className="p-1 rounded-xl bg-white/50 text-on-surface-variant hover:bg-error hover:text-white transition-all"
                                        title="Excluir"
                                      >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-lg">history</span>
                      <h4 className="text-sm font-black text-primary uppercase tracking-widest">Movimento de Atendimentos Realizados</h4>
                    </div>
                    {formData.sispn && selectedPatientHistory.length > 0 ? (
                      <div id="history-table" className="bg-surface-container-low rounded-2xl overflow-x-auto border border-outline-variant/10">
                        <table className="w-full text-left border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
                          <colgroup>
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '20%' }} />
                            <col style={{ width: '8%' }} />
                          </colgroup>
                          <thead className="bg-slate-100 dark:bg-slate-800">
                            <tr>
                              <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-black dark:text-slate-200">Data Consulta</th>
                              <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-black dark:text-slate-200">Trimestre</th>
                              <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-black dark:text-slate-200">Profissional</th>
                              <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-black dark:text-slate-200">Próxima Consulta</th>
                              <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-black dark:text-slate-200">Observações</th>
                              <th className="px-4 py-3 text-xs font-black uppercase tracking-wider text-black dark:text-slate-200 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                            {selectedPatientHistory.map((h) => (
                              <tr key={h.id_atendimento} className="hover:bg-orange-50 dark:hover:bg-slate-800/50 transition-colors group">
                                <td className="px-4 py-4">
                                  <div className="text-xs font-bold text-black dark:text-slate-100">{new Date(h.data_consulta).toLocaleDateString('pt-BR')}</div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="text-xs font-bold text-black dark:text-slate-100 uppercase">{h.trimestre_consulta}</div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="text-xs">
                                    <p className="font-black text-black dark:text-slate-100 uppercase">{allProfessionals.find(p => p.cpf === h.cpf)?.nome || '---'}</p>
                                    <p className="font-medium text-slate-600 dark:text-slate-400 uppercase">{getCboCategory(h.cbo)}</p>
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="text-xs font-bold text-black dark:text-slate-100">
                                    {h.data_proxima_consulta ? new Date(h.data_proxima_consulta).toLocaleDateString('pt-BR') : '---'}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="text-xs font-medium text-slate-700 dark:text-slate-400 truncate">
                                    {h.observacoes_clinicas || '---'}
                                  </div>
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center justify-center gap-2">
                                    <button 
                                      type="button"
                                      onClick={() => handleEdit(h)} 
                                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-primary hover:text-white transition-all"
                                      title="Editar"
                                    >
                                      <span className="material-symbols-outlined text-base">edit</span>
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => setDeleteConfirmId(h.id_atendimento)} 
                                      className="p-2 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-red-600 hover:text-white transition-all"
                                      title="Excluir"
                                    >
                                      <span className="material-symbols-outlined text-base">delete</span>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-6 text-sm text-on-surface-variant font-bold uppercase tracking-wide">
                        Nenhum registro encontrado para essa gestante.
                      </div>
                    )}
                  </div>
                )}
                {error && <div className="p-4 bg-error/10 rounded-2xl text-error text-xs font-bold">{error}</div>}
                {success && <div className="p-4 bg-green-500/10 rounded-2xl text-green-600 text-xs font-bold">{success}</div>}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Filters and Table Section */}
        <section className="space-y-4">
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
                <option value="">DPP</option>
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

          <div className="bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/10 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-separate border-spacing-0">
                <thead className="sticky top-0 z-30 bg-surface-container-low">
                  <tr>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Gestante</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Status</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Trimestre</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Registros</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Última Atividade</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Alertas</th>
                    <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {loading ? (
                    <tr><td colSpan={7} className="p-24 text-center"><div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div></td></tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr><td colSpan={7} className="p-24 text-center opacity-20 text-xl font-black uppercase tracking-widest">Nenhum paciente encontrado</td></tr>
                  ) : (
                    filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((p) => (
                      <tr key={p.sispn} className="hover:bg-primary/[0.02] transition-colors group">
                        <td className="px-6 py-4">
                          <p className="font-black text-sm text-on-surface uppercase tracking-tight group-hover:text-primary transition-colors">
                            {p.paciente_nome}
                          </p>
                          <span className="text-xs font-bold text-on-surface-variant/80 font-mono">SISPN: {p.sispn}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${p.status === 'ATIVA' ? 'bg-blue-100 text-blue-600' : 'bg-surface-container-high text-on-surface-variant/40'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                            p.currentTrimester === '1º TRIMESTRE' ? 'bg-purple-100 text-purple-600' :
                            p.currentTrimester === '2º TRIMESTRE' ? 'bg-amber-100 text-amber-600' :
                            p.currentTrimester === '3º TRIMESTRE' ? 'bg-orange-100 text-orange-600' :
                            'bg-surface-container-high text-on-surface-variant/40'
                          }`}>
                            {p.currentTrimester}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-sm text-primary/40">medical_services</span>
                            <span className="text-xs font-bold text-on-surface">{p.atendimentosCount} registros</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs font-bold text-on-surface">
                          {p.lastAtendimentoDate ? new Date(p.lastAtendimentoDate).toLocaleDateString('pt-BR') : '---'}
                        </td>
                        <td className="px-6 py-4">
                          {p.hasAlert ? (
                            <span className="px-3 py-1 rounded-full bg-red-100 text-red-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">
                              <span className="material-symbols-outlined text-[10px]">warning</span>
                              {p.alertMessage}
                            </span>
                          ) : (
                            <span className="px-3 py-1 rounded-full bg-green-100 text-green-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1 w-fit">
                              <span className="material-symbols-outlined text-[10px]">check_circle</span>
                              Em dia
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-3">
                            <button onClick={() => handleViewPatient(p.sispn)} className="p-3 rounded-2xl bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all" title="Visualizar Detalhes"><span className="material-symbols-outlined text-lg">visibility</span></button>
                            <button onClick={() => { 
                              setFormData({ sispn: p.sispn }); 
                              setPatientSearch(p.paciente_nome); 
                              setIsViewingHistory(false);
                              setIsFormOpen(true); 
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} className="p-3 rounded-2xl bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all" title="Adicionar Registro"><span className="material-symbols-outlined text-lg">add</span></button>
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
              <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-surface-container-lowest rounded-[2.5rem] p-10 max-w-md w-full shadow-2xl border border-outline-variant/10 text-center space-y-8">
                <div className="w-20 h-20 bg-red-50 rounded-[2rem] flex items-center justify-center mx-auto"><span className="material-symbols-outlined text-red-600 text-4xl">delete_forever</span></div>
                <div className="space-y-2">
                  <h4 className="text-xl font-black font-headline text-on-surface uppercase tracking-tight">Confirmar Exclusão</h4>
                  <p className="text-sm text-on-surface-variant font-body">Esta ação é permanente. Deseja continuar?</p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setDeleteConfirmId(null)} className="flex-1 bg-surface-container-high text-on-surface font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]">Cancelar</button>
                  <button onClick={() => handleDelete(deleteConfirmId)} className="flex-1 bg-red-600 text-white font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]">Excluir</button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </DashboardLayout>
  );
}
