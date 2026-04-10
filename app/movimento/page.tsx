'use client';

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import Link from 'next/link';
import DashboardLayout from '@/components/DashboardLayout';
import { useSearch } from '@/context/SearchContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import Pagination from '@/components/Pagination';
import RecordsSummary from '@/components/RecordsSummary';
import SearchInput from '@/components/SearchInput';
import PatientBanner from '@/components/PatientBanner';
import CSVImporter from '@/components/CSVImporter';

interface Routine {
  id: string;
  descricao: string;
  tipo: string;
  trimestre: string;
  tipo_resultado?: string;
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

interface ExamResult {
  id_registro: string;
  sispn: string;
  id_rotina: string;
  tipo: string;
  tipo_resultado?: string;
  data_realizacao: string;
  resultado: string;
  valor_quantitativo?: string;
  observacoes?: string;
  data_proxima_consulta?: string;
  trimestre_realizacao: string;
  cbo: string;
  cpf_profissional: string;
  unidade_cnes?: string;
  cpf_operador?: string;
  created_at?: string;
  // Enriched fields
  nome_profissional?: string;
  grupo?: string;
  // Joins
  gestacoes?: {
    dum: string;
    dpp: string;
    equipe: string;
    data_cadastro: string;
    pacientes: {
      gestante: string;
      cpf: string;
    }
  };
  rotinas?: {
    descricao: string;
    tipo: string;
    trimestre: string;
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
  data_cadastro: string;
  classificacao_pn?: string;
}

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

export default function MovimentoPage() {
  const getGestacaoStatus = (dpp: string) => {
    if (!dpp) return '---';
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(dpp);
    end.setHours(0, 0, 0, 0);
    return now >= end ? 'VENCIDA' : 'ATIVA';
  };

  const calculateTrimestre = (dum: string, dataRotina: string) => {
    if (!dum || !dataRotina) return '---';
    const start = new Date(dum + 'T12:00:00');
    const rotinaDate = new Date(dataRotina + 'T12:00:00');
    const diffTime = rotinaDate.getTime() - start.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0 || diffDays > 280) return 'FORA DO PERÍODO';
    if (diffDays <= 91) return 'PRIMEIRO';
    if (diffDays <= 189) return 'SEGUNDO';
    return 'TERCEIRO';
  };

  const getStatusCaptacao = (dum: string, dataCadastro: string) => {
    if (!dum || !dataCadastro) return '---';
    const start = new Date(dum);
    const registration = new Date(dataCadastro);
    const diffWeeks = (registration.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 7);
    return diffWeeks <= 12 ? 'PRECOCE' : 'TARDIA';
  };

  const getDppReferencia = (dpp: string) => {
    if (!dpp) return '---';
    const date = new Date(dpp);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const getRotinaReferencia = (data: string) => {
    if (!data) return '---';
    const date = new Date(data);
    return `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen, refreshTrigger, setOnExportCSV, onExportCSV } = useSearch();
  const [isViewingHistory, setIsViewingHistory] = useState(false);
  const { user: authUser } = useAuth();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [gestacoes, setGestacoes] = useState<Gestacao[]>([]);
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [allProfessionals, setAllProfessionals] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<{cnes: string; nome_fantasia: string}[]>([]);
  const [loading, setLoading] = useState(true);

  const uniqueUnidades = useMemo(() => {
    return unidades.sort((a, b) => a.nome_fantasia.localeCompare(b.nome_fantasia));
  }, [unidades]);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('MEDICO');
  const [selectedProfessionalCpf, setSelectedProfessionalCpf] = useState('');
  
  // Patient Search in Form
  const [patientSearch, setPatientSearch] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);
  const patientDropdownRef = useRef<HTMLDivElement>(null);

  // Professional Search in Form
  const [professionalSearch, setProfessionalSearch] = useState('');
  const [isProfessionalDropdownOpen, setIsProfessionalDropdownOpen] = useState(false);
  const professionalDropdownRef = useRef<HTMLDivElement>(null);

  // New states for multiple entries
  const [formEntries, setFormEntries] = useState<any[]>([]);

  useEffect(() => {
    if (mounted && formEntries.length === 0) {
      setFormEntries([
        {
          id: Math.random().toString(36).substr(2, 9),
          id_rotina: '',
          descricao: '',
          tipo_temp: '',
          tipo_resultado: '',
          data_realizacao: '',
          resultado: 'NEGATIVO / NÃO REAGENTE',
          valor_quantitativo: '',
          data_proxima_consulta: '',
          observacoes: '',
          trimestre_realizacao: '---',
          cpf_profissional: '',
          categoria_profissional: 'MEDICO',
          nome_profissional: ''
        }
      ]);
    }
  }, [mounted, formEntries.length]);

  // Filters
  const [filters, setFilters] = useState({
    dpp: '',
    tipo: '',
    trimestre: '',
    rotina: '',
    equipe: '',
    status: 'ATIVA',
    unidade: ''
  });

  const [formData, setFormData] = useState<Partial<ExamResult>>({
    sispn: '',
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const patientsWithResults = useMemo(() => {
    const patientMap = new Map<string, any>();
    
    gestacoes.forEach(g => {
      const status = getGestacaoStatus(g.dpp);
      const weeksToDpp = g.dpp ? Math.max(0, Math.ceil((new Date(g.dpp).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24 * 7))) : null;
      let currentTrimester = '---';
      if (g.dum) {
        const weeks = Math.floor((new Date().getTime() - new Date(g.dum).getTime()) / (1000 * 60 * 60 * 24 * 7));
        if (weeks <= 13) currentTrimester = '1º TRIMESTRE';
        else if (weeks <= 27) currentTrimester = '2º TRIMESTRE';
        else currentTrimester = '3º TRIMESTRE';
      }
      if (!filters.status || status === filters.status) {
        patientMap.set(g.sispn, {
          ...g,
          resultsCount: 0,
          examsCount: 0,
          consultasCount: 0,
          vaccinesCount: 0,
          lastResultDate: null,
          hasPositive: false,
          status: status,
          weeksToDpp: weeksToDpp,
          currentTrimester: currentTrimester
        });
      }
    });

    results.forEach(r => {
      const p = patientMap.get(r.sispn);
      if (p) {
        p.resultsCount++;
        const tipo = r.tipo || r.rotinas?.tipo;
        if (tipo === 'EXAME') p.examsCount++;
        else if (tipo === 'CONSULTA') p.consultasCount++;
        else if (tipo === 'VACINA') p.vaccinesCount++;
        if (!p.lastResultDate || new Date(r.data_realizacao) > new Date(p.lastResultDate)) {
          p.lastResultDate = r.data_realizacao;
        }
        const res = r.resultado.toUpperCase();
        const isPositive = (res.includes('POSITIVO') || res.includes('REAGENTE')) && !res.includes('NEGATIVO') && !res.includes('NAO') && !res.includes('NÃO');
        if (isPositive) {
          p.hasPositive = true;
        }
      }
    });

    return Array.from(patientMap.values());
  }, [gestacoes, results, filters.status]);

  const filteredPatients = useMemo(() => {
    return patientsWithResults.filter(p => {
      const query = searchQuery.toLowerCase().trim();
      const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
      const queryNormalizada = normalize(query);
      
      const matchesSearch = !query || (
        normalize(p.paciente_nome).includes(queryNormalizada) ||
        normalize(p.sispn).includes(queryNormalizada)
      );

      if (!matchesSearch) return false;
      
      if (filters.trimestre || filters.tipo || filters.rotina) {
        const patientResults = results.filter(r => r.sispn === p.sispn);
        const hasMatchingResult = patientResults.some(r => {
          const triMap: Record<string, string> = {
            '1º TRIMESTRE': 'PRIMEIRO',
            '2º TRIMESTRE': 'SEGUNDO',
            '3º TRIMESTRE': 'TERCEIRO'
          };
          const triRealizacao = triMap[r.trimestre_realizacao] || r.trimestre_realizacao;
          if (filters.trimestre && triRealizacao !== filters.trimestre) return false;
          if (filters.tipo && (r.tipo || r.rotinas?.tipo) !== filters.tipo) return false;
          if (filters.rotina && r.rotinas?.descricao !== filters.rotina) return false;
          return true;
        });
        if (!hasMatchingResult) return false;
      }

      if (filters.equipe && p.equipe !== filters.equipe) return false;

      if (filters.unidade && String(p.unidade_cnes).trim() !== String(filters.unidade).trim()) return false;

      return true;
    });
  }, [patientsWithResults, results, searchQuery, filters]);

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleViewPatient = (sispn: string) => {
    setFormData({ sispn });
    setPatientSearch(gestacoes.find(g => g.sispn === sispn)?.paciente_nome || sispn);
    setIsViewingHistory(true);
    setIsFormOpen(true);
    
    // Scroll to history table after a short delay
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
      setIsViewingHistory(false);
      setFormData({
        sispn: '',
      });
      const today = new Date().toISOString().split('T')[0];
      setFormEntries([
        {
          id: Math.random().toString(36).substr(2, 9),
          id_rotina: '',
          descricao: '',
          tipo_temp: '',
          data_realizacao: today,
          resultado: 'NEGATIVO / NÃO REAGENTE',
          trimestre_realizacao: '1º TRIMESTRE'
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
      // Fetch unidades
      const unitsRes = await supabase.from('unidades_saude').select('cnes, nome_fantasia').order('nome_fantasia');
      if (unitsRes.data) setUnidades(unitsRes.data);

      // Fetch routines, categories and professionals (usually < 1000)
      const [routinesRes, catsRes, prosRes] = await Promise.all([
        supabase.from('rotinas').select('id, descricao, tipo, trimestre, tipo_resultado').in('tipo', ['EXAME', 'VACINA', 'CONSULTA']).order('descricao').limit(1000),
        supabase.from('categorias_profissionais').select('*').order('categoria').limit(1000),
        supabase.from('profissionais').select('cpf, nome, cbo, situacao, equipe, categorias_profissionais(cbo, categoria, grupo)').order('nome').limit(1000)
      ]);

      if (routinesRes.error) throw routinesRes.error;
      const routinesData = routinesRes.data || [];
      const categoriesData = catsRes.data || [];
      const professionalsData = prosRes.data || [];
      
      setRoutines(routinesData);
      setCategories(categoriesData);
      setAllProfessionals(professionalsData);

      // Fetch Results in chunks (bypassing 1000 limit)
      let resultsData: any[] = [];
      let resultsFrom = 0;
      let resultsHasMore = true;
      while (resultsHasMore) {
        const { data, error } = await supabase.from('registro_rotinas').select(`
          *,
          rotinas (descricao, tipo, trimestre, tipo_resultado, grupo)
        `).order('data_realizacao', { ascending: true }).order('id_registro', { ascending: true }).range(resultsFrom, resultsFrom + 999);
        if (error) throw error;
        if (data && data.length > 0) {
          resultsData = [...resultsData, ...data];
          if (data.length < 1000) resultsHasMore = false;
          else resultsFrom += 1000;
        } else resultsHasMore = false;
        if (resultsFrom > 50000) break;
      }

      // Fetch Gestacoes in chunks
      let gestacoesData: any[] = [];
      let gestFrom = 0;
      let gestHasMore = true;
      while (gestHasMore) {
        const { data, error } = await supabase.from('gestacoes').select(`
          sispn, dum, dpp, equipe, data_cadastro, classificacao_pn, unidade_cnes,
          pacientes (gestante, cpf, cns, data_nascimento)
        `).range(gestFrom, gestFrom + 999);
        if (error) throw error;
        if (data && data.length > 0) {
          gestacoesData = [...gestacoesData, ...data];
          if (data.length < 1000) gestHasMore = false;
          else gestFrom += 1000;
        } else gestHasMore = false;
        if (gestFrom > 50000) break;
      }
      
      const formattedGest = gestacoesData.map(g => {
        let pac: any = g.pacientes;
        if (Array.isArray(pac)) pac = pac[0];
        return {
          sispn: String(g.sispn || ''),
          dum: g.dum,
          dpp: g.dpp,
          equipe: g.equipe,
          data_cadastro: g.data_cadastro,
          unidade_cnes: g.unidade_cnes,
          paciente_nome: (pac as any)?.gestante || 'NÃO INFORMADO',
          paciente_cpf: String((pac as any)?.cpf || 'NÃO INFORMADO'),
          paciente_cns: (pac as any)?.cns || '---',
          paciente_nascimento: (pac as any)?.data_nascimento || null,
          classificacao_pn: g.classificacao_pn || 'HABITUAL'
        };
      });
      setGestacoes(formattedGest);

      const enrichedResults = resultsData.map(r => {
        const gest = formattedGest.find(g => g.sispn === r.sispn);
        
        // Enrich with profissional data
        const prof = professionalsData.find(p => p.cpf === r.cpf_profissional);
        let nome_profissional = '---';
        let grupo = '---';
        
        if (prof) {
          nome_profissional = prof.nome;
          const catFromJoin = Array.isArray(prof.categorias_profissionais) 
            ? prof.categorias_profissionais[0] 
            : prof.categorias_profissionais;
          grupo = catFromJoin?.grupo || '---';
        }
        
        // Fallback: try CBO prefix lookup if profissional not found
        if (grupo === '---' && r.cbo) {
          const cboPrefixo = String(r.cbo).substring(0, 4);
          const catBackup = categoriesData.find(cat => cat.cbo === cboPrefixo);
          grupo = catBackup?.grupo || '---';
        }
        
        return {
          ...r,
          nome_profissional,
          grupo,
          gestacoes: gest ? {
            dum: gest.dum,
            dpp: gest.dpp,
            equipe: gest.equipe,
            data_cadastro: gest.data_cadastro,
            pacientes: { gestante: gest.paciente_nome, cpf: gest.paciente_cpf }
          } : null
        };
      });
      setResults(enrichedResults);

    } catch (err: any) {
      console.error('Erro ao buscar dados:', err);
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };


  const selectedGestante = useMemo(() => {
    return gestacoes.find(g => g.sispn === formData.sispn);
  }, [formData.sispn, gestacoes]);

  const selectedPatientHistory = useMemo(() => {
    if (!formData.sispn) return [];
    return results
      .filter(r => {
        if (r.sispn !== formData.sispn) return false;
        const triMap: Record<string, string> = {
          '1º TRIMESTRE': 'PRIMEIRO',
          '2º TRIMESTRE': 'SEGUNDO',
          '3º TRIMESTRE': 'TERCEIRO'
        };
        const triRealizacao = triMap[r.trimestre_realizacao] || r.trimestre_realizacao;
        if (filters.trimestre && triRealizacao !== filters.trimestre) return false;
        if (filters.tipo && (r.tipo || r.rotinas?.tipo) !== filters.tipo) return false;
        if (filters.rotina && r.rotinas?.descricao !== filters.rotina) return false;
        return true;
      })
      .sort((a, b) => new Date(b.data_realizacao).getTime() - new Date(a.data_realizacao).getTime());
  }, [formData.sispn, results, filters]);

  const uniqueEquipes = Array.from(new Set(gestacoes.map(g => g.equipe))).filter(Boolean).sort();


  const professionalSearchResults = useMemo(() => {
    if (!professionalSearch || professionalSearch.length < 2) return [];
    const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    const queryText = normalize(professionalSearch);
    
    return allProfessionals.filter(p => {
      return normalize(p.nome).includes(queryText) || p.cpf.includes(professionalSearch);
    }).slice(0, 10);
  }, [professionalSearch, allProfessionals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!isSupabaseConfigured) return;
    if (!formData.sispn) return setError('Selecione uma gestante.');

    const gest = gestacoes.find(g => g.sispn === formData.sispn);
    if (!gest) return setError('Gestação não encontrada.');
    if (getGestacaoStatus(gest.dpp) === 'VENCIDA') return setError('Gestação VENCIDA.');

    try {
      const payloads = formEntries.map(entry => {
        if (!entry.cpf_profissional) {
          throw new Error('Selecione um profissional para todas as linhas.');
        }

        const trimestre = calculateTrimestre(gest.dum, entry.data_realizacao || '');
        
        if (trimestre === 'FORA DO PERÍODO') {
          throw new Error(`Data de realização (${entry.data_realizacao}) está fora do período gestacional (0-280 dias).`);
        }

        // Find the routine ID that matches description and calculated trimester
        const routine = routines.find(r => 
          r.descricao === entry.descricao && 
          r.trimestre === trimestre &&
          (!entry.tipo_temp || r.tipo === entry.tipo_temp)
        ) || routines.find(r => 
          r.descricao === entry.descricao && 
          (!entry.tipo_temp || r.tipo === entry.tipo_temp)
        );

        const professional = allProfessionals.find(p => p.cpf === entry.cpf_profissional);

        const payload: any = {
          sispn: formData.sispn,
          id_rotina: routine?.id || entry.id_rotina,
          data_realizacao: entry.data_realizacao,
          resultado: entry.resultado,
          valor_quantitativo: entry.valor_quantitativo || null,
          trimestre_realizacao: trimestre,
          cbo: professional?.cbo || null,
          cpf_profissional: entry.cpf_profissional || 'NÃO INFORMADO',
          unidade_cnes: authUser?.unidade_cnes || null,
          cpf_operador: authUser?.cpf || null
        };

        if (entry.tipo_temp === 'CONSULTA') {
          payload.data_proxima_consulta = entry.data_proxima_consulta || null;
          payload.observacoes = entry.observacoes || null;
        }

        return payload;
      });

      if (payloads.some(p => !p.id_rotina)) return setError('Selecione uma descrição válida para todas as linhas.');

      if (editingId) {
        const { error: updateError } = await supabase.from('registro_rotinas').update(payloads[0]).eq('id_registro', editingId);
        if (updateError) throw updateError;
        setSuccess('Resultado atualizado!');
      } else {
        const { error: insertError } = await supabase.from('registro_rotinas').insert(payloads);
        if (insertError) throw insertError;
        setSuccess(`${payloads.length} resultados registrados!`);
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

  const handleEdit = (res: ExamResult) => {
    setEditingId(res.id_registro);
    const gest = Array.isArray(res.gestacoes) ? res.gestacoes[0] : res.gestacoes;
    const pac = gest?.pacientes;
    const pacObj = Array.isArray(pac) ? pac[0] : pac;
    
    setPatientSearch((pacObj as any)?.gestante || res.sispn);
    setSelectedProfessionalCpf(res.cpf_profissional || '');
    
    const prof = allProfessionals.find(p => p.cpf === res.cpf_profissional);
    if (prof) {
      setProfessionalSearch(prof.nome);
      const cat = categories.find(c => prof.cbo.startsWith(c.cbo));
      if (cat) setSelectedCategory(cat.categoria);
    }

    setFormData({
      sispn: res.sispn,
    });
    
    setFormEntries([
      {
        id: Math.random().toString(36).substr(2, 9),
        id_rotina: res.id_rotina,
        descricao: res.rotinas?.descricao || '',
        tipo_temp: res.tipo || res.rotinas?.tipo || 'EXAME',
        data_realizacao: res.data_realizacao,
        resultado: res.resultado,
        trimestre_realizacao: res.trimestre_realizacao,
        cpf_profissional: res.cpf_profissional || '',
        categoria_profissional: prof?.cbo ? (categories.find(c => prof.cbo.startsWith(c.cbo))?.categoria || 'MEDICO') : 'MEDICO',
        nome_profissional: prof?.nome || ''
      }
    ]);

    setIsViewingHistory(false);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    try {
      const { error: delError } = await supabase.from('registro_rotinas').delete().eq('id_registro', id);
      if (delError) throw delError;
      setSuccess('Registro excluído!');
      setDeleteConfirmId(null);
      fetchData();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const filteredExames = useMemo(() => {
    return results.filter(r => {
      const query = searchQuery.toLowerCase().trim();
      const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
      const queryNormalizada = normalize(query);
      
      const gest = Array.isArray(r.gestacoes) ? r.gestacoes[0] : r.gestacoes;
      const pac = gest?.pacientes;
      const pacObj = Array.isArray(pac) ? pac[0] : pac;
      const pacienteNome = (pacObj as any)?.gestante || '';
      const rotinaNome = r.rotinas?.descricao || '';
      const gestacaoStatus = gest ? getGestacaoStatus((gest as any).dpp) : '---';
      
      const matchesSearch = !query || (
        normalize(pacienteNome).includes(queryNormalizada) ||
        normalize(r.sispn).includes(queryNormalizada) ||
        normalize(rotinaNome).includes(queryNormalizada)
      );

      if (!matchesSearch) return false;
      if (filters.status && gestacaoStatus !== filters.status) return false;
      const triMap: Record<string, string> = {
        '1º TRIMESTRE': 'PRIMEIRO',
        '2º TRIMESTRE': 'SEGUNDO',
        '3º TRIMESTRE': 'TERCEIRO'
      };
      const triRealizacao = triMap[r.trimestre_realizacao] || r.trimestre_realizacao;
      if (filters.trimestre && triRealizacao !== filters.trimestre) return false;
      if (filters.tipo && (r.tipo || r.rotinas?.tipo) !== filters.tipo) return false;
      if (filters.rotina && r.rotinas?.descricao !== filters.rotina) return false;
      if (filters.equipe && (gest as any)?.equipe !== filters.equipe) return false;
      
      // Filter by unidade (only for non-admin users)
      if (authUser?.nivel_acesso !== 'Administrador' && authUser?.unidade_cnes) {
        if (String((gest as any)?.unidade_cnes).trim() !== String(authUser.unidade_cnes).trim()) return false;
      }

      return true;
    });
  }, [results, searchQuery, filters]);

  const patientSearchResults = useMemo(() => {
    if (!patientSearch || patientSearch.length < 2) return [];
    const normalize = (str: string) => str ? str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase() : "";
    const queryText = normalize(patientSearch);
    
    return gestacoes.filter(g => {
      if (getGestacaoStatus(g.dpp) !== 'ATIVA') return false;
      return normalize(g.paciente_nome).includes(queryText) || g.sispn.includes(patientSearch);
    }).slice(0, 10);
  }, [patientSearch, gestacoes]);

  const filteredProfessionals = useMemo(() => {
    if (!selectedCategory) return [];
    const category = categories.find(c => c.categoria === selectedCategory);
    if (!category) return [];
    return allProfessionals.filter(p => p.cbo.startsWith(category.cbo));
  }, [selectedCategory, categories, allProfessionals]);

  const handleExportCSV = useCallback(() => {
    const headers = ['SISPN', 'GESTANTE', 'ROTINA', 'TIPO', 'DATA REALIZAÇÃO', 'RESULTADO', 'TRIMESTRE', 'PROFISSIONAL', 'EQUIPE'];
    const rows = filteredExames.map(r => {
      const gest = Array.isArray(r.gestacoes) ? r.gestacoes[0] : r.gestacoes;
      const pac = gest?.pacientes;
      const pacObj = Array.isArray(pac) ? pac[0] : pac;
      
      return [
        r.sispn,
        (pacObj as any)?.gestante || '',
        r.rotinas?.descricao || '',
        r.tipo || r.rotinas?.tipo || 'EXAME',
        r.data_realizacao,
        r.resultado,
        r.trimestre_realizacao,
        allProfessionals.find(p => p.cpf === r.cpf_profissional)?.nome || '',
        (gest as any)?.equipe || ''
      ];
    });
    const csvContent = [headers, ...rows].map(e => e.join(";")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "exames_vacinas.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [filteredExames, allProfessionals]);

  useEffect(() => {
    setOnExportCSV(() => handleExportCSV);
    return () => setOnExportCSV(null);
  }, [handleExportCSV, setOnExportCSV]);

  if (!mounted) return null;

  const handleExportLayout = () => {
    const headers = ['sispn', 'id_rotina', 'data_realizacao', 'resultado', 'cpf_profissional', 'cbo', 'trimestre_realizacao', 'observacoes'];
    const blob = new Blob([headers.join(',')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'layout_importacao_movimento.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <DashboardLayout title="Movimento">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Topbar Pattern - Figura 1 */}
        <div className="bg-white p-4 rounded-2xl border border-outline-variant/10 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-primary uppercase tracking-tight">Movimento</h1>
          </div>

          <SearchInput className="w-full md:flex-1 md:mx-8" />

          <RecordsSummary 
            total={results.length} 
            filtered={filteredExames.length} 
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
                        <h4 className="text-sm font-black text-primary uppercase tracking-widest">Lançamento de Rotinas</h4>
                        {!editingId && (
                          <button 
                            type="button" 
                            onClick={() => {
                              setFormEntries([...formEntries, {
                                id: Math.random().toString(36).substr(2, 9),
                                id_rotina: '',
                                descricao: '',
                                tipo_temp: '',
                                data_realizacao: '',
                                resultado: 'NEGATIVO / NÃO REAGENTE',
                                data_proxima_consulta: '',
                                observacoes: '',
                                trimestre_realizacao: '---',
                                cpf_profissional: '',
                                categoria_profissional: 'MEDICO',
                                nome_profissional: ''
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
                              <col style={{ width: '10%' }} />
                              <col style={{ width: '8%' }} />
                              <col style={{ width: '15%' }} />
                              <col style={{ width: '8%' }} />
                              <col style={{ width: '15%' }} />
                              <col style={{ width: '10%' }} />
                              <col style={{ width: '10%' }} />
                              <col style={{ width: '8%' }} />
                              <col style={{ width: '10%' }} />
                              <col style={{ width: '6%' }} />
                            </colgroup>
                          <thead className="bg-surface-container-low">
                            <tr>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Data</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Trim</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Rotina</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Tipo</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Profissional</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Grupo</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Resultado</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Valor</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Próxima</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Obs</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/5">
                            {formEntries.map((entry, index) => (
                              <tr key={entry.id} className="hover:bg-white/50 transition-colors">
                                <td className="px-2 py-1.5">
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                    <input 
                                      type="date" 
                                      className="bg-transparent border-none p-0 text-[10px] font-bold outline-none focus:ring-0 w-full text-on-surface"
                                      value={entry.data_realizacao}
                                      onChange={(e) => {
                                        const newEntries = [...formEntries];
                                        newEntries[index].data_realizacao = e.target.value;
                                        setFormEntries(newEntries);
                                      }}
                                    />
                                  </div>
                                </td>
                                 <td className="px-2 py-1.5">
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                    <span className={`text-[10px] font-bold ${selectedGestante && calculateTrimestre(selectedGestante.dum, entry.data_realizacao) === 'FORA DO PERÍODO' ? 'text-error' : 'text-on-surface'}`}>
                                      {selectedGestante ? calculateTrimestre(selectedGestante.dum, entry.data_realizacao) : '---'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                    <select 
                                      className="bg-transparent border-none p-0 text-[10px] font-bold outline-none focus:ring-0 w-full uppercase text-on-surface cursor-pointer appearance-none"
                                      value={entry.descricao || ''}
                                      onChange={(e) => {
                                        const newEntries = [...formEntries];
                                        const desc = e.target.value;
                                        newEntries[index].descricao = desc;
                                        const routine = routines.find(r => r.descricao === desc);
                                        if (routine) {
                                          newEntries[index].tipo_temp = routine.tipo;
                                          newEntries[index].tipo_resultado = routine.tipo_resultado || '';
                                          if (routine.tipo_resultado === 'quantitativo') {
                                            newEntries[index].resultado = 'NORMAL';
                                          } else if (routine.tipo_resultado === 'sorologia') {
                                            newEntries[index].resultado = 'NÃO REAGENTE';
                                          } else if (routine.tipo_resultado === 'microbiologico') {
                                            newEntries[index].resultado = 'NEGATIVO';
                                          } else if (routine.tipo_resultado === 'citologia' || routine.tipo_resultado === 'analise' || routine.tipo_resultado === 'imagem') {
                                            newEntries[index].resultado = 'NORMAL';
                                          }
                                        } else {
                                          newEntries[index].tipo_temp = '';
                                          newEntries[index].tipo_resultado = '';
                                        }
                                        setFormEntries(newEntries);
                                      }}
                                    >
                                      <option value="">Selecione a Rotina</option>
                                      {Array.from(new Set(routines.map(r => r.descricao)))
                                        .sort()
                                        .map(desc => (
                                          <option key={desc} value={desc}>{desc}</option>
                                        ))}
                                    </select>
                                  </div>
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1 opacity-60">
                                    <input 
                                      type="text"
                                      readOnly
                                      disabled
                                      className="bg-transparent border-none p-0 text-[10px] font-bold outline-none focus:ring-0 w-full uppercase text-on-surface cursor-default"
                                      value={entry.tipo_temp || ''}
                                      placeholder="Tipo"
                                    />
                                  </div>
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1 relative min-h-[36px] flex items-center">
                                    <select 
                                      className="absolute opacity-0 w-full h-full cursor-pointer top-0 left-0 text-[10px]"
                                      value={entry.cpf_profissional || ''}
                                      onChange={(e) => {
                                        const newEntries = [...formEntries];
                                        const cpf = e.target.value;
                                        newEntries[index].cpf_profissional = cpf;
                                        const prof = allProfessionals.find(p => p.cpf === cpf);
                                        if (prof) {
                                          newEntries[index].nome_profissional = prof.nome;
                                          const catFromJoin = Array.isArray(prof.categorias_profissionais) ? prof.categorias_profissionais[0] : prof.categorias_profissionais;
                                          newEntries[index].grupo_profissional = catFromJoin?.grupo || '';
                                          const cat = categories.find(c => prof.cbo.startsWith(c.cbo));
                                          newEntries[index].categoria_profissional = cat?.categoria || 'MEDICO';
                                        }
                                        setFormEntries(newEntries);
                                      }}
                                    >
                                      <option value="">SELECIONE PROFISSIONAL</option>
                                      {allProfessionals
                                        .filter(p => {
                                          const grupo = Array.isArray(p.categorias_profissionais) ? p.categorias_profissionais[0]?.grupo : p.categorias_profissionais?.grupo;
                                          return grupo !== 'ADMINISTRATIVO';
                                        })
                                        .map((p) => (
                                          <option key={p.cpf} value={p.cpf}>{p.nome}</option>
                                        ))}
                                    </select>
                                    <div className="text-[10px] font-bold text-on-surface break-words whitespace-normal pointer-events-none">
                                      {entry.nome_profissional ? (
                                        entry.nome_profissional
                                      ) : (
                                        'SELECIONE PROFISSIONAL'
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                    <span className="text-[10px] font-bold text-on-surface bg-secondary/10 px-2 py-0.5 rounded-full">
                                      {entry.grupo_profissional || '---'}
                                    </span>
                                  </div>
                                </td>
                                <td className="px-2 py-1.5">
                                  {entry.tipo_temp === 'CONSULTA' ? (
                                    <div className="text-[10px] text-on-surface-variant/40">-</div>
                                  ) : (
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
              <select 
                className="w-full lg:w-auto px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filters.tipo}
                onChange={(e) => setFilters({ ...filters, tipo: e.target.value })}
              >
                <option value="">Tipo</option>
                <option value="EXAME">EXAME</option>
                <option value="VACINA">VACINA</option>
                <option value="CONSULTA">CONSULTA</option>
              </select>

              <select
                                        className={`bg-transparent border-none p-0 text-[10px] font-bold outline-none focus:ring-0 w-full uppercase cursor-pointer appearance-none ${
                                          entry.resultado === '-' || entry.resultado === 'N/A'
                                            ? 'text-on-surface-variant/40' 
                                            : (entry.resultado.includes('POSITIVO') || entry.resultado.includes('REAGENTE') || entry.resultado === 'ALTERADO') 
                                              ? 'text-error' 
                                              : 'text-green-600'
                                        }`}
                                        value={entry.resultado}
                                        onChange={(e) => {
                                          const newEntries = [...formEntries];
                                          newEntries[index].resultado = e.target.value;
                                          setFormEntries(newEntries);
                                        }}
                                      >
                                        {entry.tipo_resultado === 'sorologia' && (
                                          <>
                                            <option value="REAGENTE">REAGENTE</option>
                                            <option value="NÃO REAGENTE">NÃO REAGENTE</option>
                                          </>
                                        )}
                                        {entry.tipo_resultado === 'microbiologico' && (
                                          <>
                                            <option value="POSITIVO">POSITIVO</option>
                                            <option value="NEGATIVO">NEGATIVO</option>
                                          </>
                                        )}
                                        {(entry.tipo_resultado === 'quantitativo' || entry.tipo_resultado === 'analise' || entry.tipo_resultado === 'imagem' || entry.tipo_resultado === 'citologia') && (
                                          <>
                                            <option value="NORMAL">NORMAL</option>
                                            <option value="ALTERADO">ALTERADO</option>
                                          </>
                                        )}
                                        {entry.tipo_resultado === 'tipagem' && (
                                          <>
                                            <option value="A+">A+</option>
                                            <option value="A-">A-</option>
                                            <option value="B+">B+</option>
                                            <option value="B-">B-</option>
                                            <option value="AB+">AB+</option>
                                            <option value="AB-">AB-</option>
                                            <option value="O+">O+</option>
                                            <option value="O-">O-</option>
                                          </>
                                        )}
                                        {(entry.tipo_resultado === 'n/a' || entry.tipo_resultado === 'variavel' || !entry.tipo_resultado) && (
                                          <>
                                            <option value="POSITIVO / REAGENTE">POSITIVO / REAGENTE</option>
                                            <option value="NEGATIVO / NÃO REAGENTE">NEGATIVO / NÃO REAGENTE</option>
                                            <option value="-">-</option>
                                          </>
                                        )}
                                      </select>
                                    </div>
                                  )}
                                </td>
                                <td className="px-2 py-1.5">
                                  {entry.tipo_resultado === 'quantitativo' ? (
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <input 
                                        type="text"
                                        className="bg-transparent border-none p-0 text-[10px] font-bold outline-none focus:ring-0 w-full text-on-surface"
                                        value={entry.valor_quantitativo || ''}
                                        onChange={(e) => {
                                          const newEntries = [...formEntries];
                                          newEntries[index].valor_quantitativo = e.target.value;
                                          setFormEntries(newEntries);
                                        }}
                                        placeholder="Valor"
                                      />
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-on-surface-variant/40">-</div>
                                  )}
                                </td>
                                <td className="px-2 py-1.5">
                                  {entry.tipo_temp === 'CONSULTA' ? (
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <input 
                                        type="date" 
                                        className="bg-transparent border-none p-0 text-[10px] font-bold outline-none focus:ring-0 w-full text-on-surface"
                                        value={entry.data_proxima_consulta || ''}
                                        onChange={(e) => {
                                          const newEntries = [...formEntries];
                                          newEntries[index].data_proxima_consulta = e.target.value;
                                          setFormEntries(newEntries);
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-on-surface-variant/40">-</div>
                                  )}
                                </td>
                                <td className="px-2 py-1.5">
                                  {entry.tipo_temp === 'CONSULTA' ? (
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <input 
                                        type="text"
                                        className="bg-transparent border-none p-0 text-[10px] font-bold outline-none focus:ring-0 w-full text-on-surface"
                                        value={entry.observacoes || ''}
                                        onChange={(e) => {
                                          const newEntries = [...formEntries];
                                          newEntries[index].observacoes = e.target.value;
                                          setFormEntries(newEntries);
                                        }}
                                        placeholder="Obs"
                                      />
                                    </div>
                                  ) : (
                                    <div className="text-[10px] text-on-surface-variant/40">-</div>
                                  )}
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
                        Salvar Resultado
                      </button>
                    </div>

                    {/* Movimento de Exames da Gestante Selecionada */}
                    {formData.sispn && selectedPatientHistory.length > 0 && (
                      <div id="history-table" className="space-y-2 pt-2 border-t border-outline-variant/10">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-primary text-lg">history</span>
                            <h4 className="text-sm font-black text-primary uppercase tracking-widest">Movimento de Rotinas Realizadas</h4>
                          </div>
                        </div>
                        <div className="bg-surface-container-low rounded-2xl overflow-x-auto border border-outline-variant/10">
                        <table className="w-full text-left border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
                          <colgroup>
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '15%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '12%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '12%' }} />
                          </colgroup>
                            <thead className="bg-surface-container-low">
                            <tr>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Data</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Trim</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Rotina</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Tipo</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Profissional</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Grupo</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Resultado</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Próxima</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Obs</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5 text-center">Ações</th>
                            </tr>
                          </thead>
                            <tbody className="divide-y divide-outline-variant/5">
                              {selectedPatientHistory.map((h) => (
                                <tr key={h.id_registro} className="hover:bg-white/50 transition-colors group">
                                  <td className="px-2 py-1.5">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <div className="text-[10px] font-bold text-on-surface">{new Date(h.data_realizacao).toLocaleDateString('pt-BR')}</div>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <div className="text-[10px] font-bold text-on-surface uppercase">
                                        {h.trimestre_realizacao === '1º TRIMESTRE' ? 'PRIMEIRO' : h.trimestre_realizacao === '2º TRIMESTRE' ? 'SEGUNDO' : h.trimestre_realizacao === '3º TRIMESTRE' ? 'TERCEIRO' : h.trimestre_realizacao}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <div className="text-[10px] font-black text-primary uppercase truncate">{h.rotinas?.descricao}</div>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <div className="text-[10px] font-medium text-on-surface-variant/60 uppercase">{h.tipo || h.rotinas?.tipo || '---'}</div>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <div className="text-[10px] font-bold text-on-surface uppercase truncate">{h.nome_profissional || '---'}</div>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <div className="text-[10px] font-bold text-on-surface bg-secondary/10 px-2 py-0.5 rounded-full">
                                        {h.grupo || '---'}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <div className={`text-[10px] font-bold uppercase ${
                                        (h.tipo || h.rotinas?.tipo) === 'CONSULTA' 
                                          ? 'text-on-surface-variant/40'
                                          : (() => {
                                              const res = (h.resultado || '').toUpperCase();
                                              const isPositive = (res.includes('POSITIVO') || res.includes('REAGENTE')) && !res.includes('NEGATIVO') && !res.includes('NAO') && !res.includes('NÃO');
                                              if (isPositive) return 'text-error';
                                              if (h.resultado === '-') return 'text-on-surface-variant/40';
                                              return 'text-success';
                                            })()
                                      }`}>
                                        {(h.tipo || h.rotinas?.tipo) === 'CONSULTA' ? '-' : h.resultado}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <div className="text-[10px] font-bold text-on-surface uppercase">
                                        {(h.tipo || h.rotinas?.tipo) === 'CONSULTA' && h.data_proxima_consulta 
                                          ? new Date(h.data_proxima_consulta).toLocaleDateString('pt-BR') 
                                          : '-'}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <div className="text-[10px] font-bold text-on-surface uppercase truncate max-w-[80px]">
                                        {(h.tipo || h.rotinas?.tipo) === 'CONSULTA' ? (h.observacoes || '-') : '-'}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="flex items-center justify-center gap-1">
                                      <button 
                                        type="button"
                                        onClick={() => handleEdit(h)} 
                                        className="p-1 rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all"
                                        title="Editar"
                                      >
                                        <span className="material-symbols-outlined text-sm">edit</span>
                                      </button>
                                      <button 
                                        type="button"
                                        onClick={() => setDeleteConfirmId(h.id_registro)} 
                                        className="p-1 rounded-lg bg-error text-white hover:bg-error/80 transition-all"
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
                    {error && <div className="mt-2 p-3 bg-error/10 rounded-xl text-error text-xs font-bold">{error}</div>}
                    {success && <div className="mt-2 p-3 bg-green-500/10 rounded-xl text-green-600 text-xs font-bold">{success}</div>}
                  </form>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-primary text-lg">history</span>
                      <h4 className="text-sm font-black text-primary uppercase tracking-widest">Movimento de Rotinas Realizadas</h4>
                    </div>
                      {formData.sispn && selectedPatientHistory.length > 0 ? (
                      <div id="history-table" className="bg-surface-container-low rounded-2xl overflow-x-auto border border-outline-variant/10">
                        <table className="w-full text-left border-separate border-spacing-0" style={{ tableLayout: 'fixed' }}>
                          <colgroup>
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '14%' }} />
                            <col style={{ width: '6%' }} />
                            <col style={{ width: '14%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '8%' }} />
                            <col style={{ width: '10%' }} />
                            <col style={{ width: '6%' }} />
                          </colgroup>
                          <thead className="bg-surface-container-low">
                            <tr>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Data</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Trim</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Rotina</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Tipo</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Profissional</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Grupo</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Resultado</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Próxima</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5">Obs</th>
                              <th className="px-2 py-1.5 text-xs font-black uppercase tracking-wider text-on-surface-variant/40 border-b border-outline-variant/5 text-center">Ações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-outline-variant/5">
                            {selectedPatientHistory.map((h) => (
                              <tr key={h.id_registro} className="hover:bg-white/50 transition-colors group">
                                <td className="px-2 py-1.5">
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                    <div className="text-[10px] font-bold text-on-surface">{new Date(h.data_realizacao).toLocaleDateString('pt-BR')}</div>
                                  </div>
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                    <div className="text-[10px] font-bold text-on-surface uppercase">
                                      {h.trimestre_realizacao === 'PRIMEIRO' ? 'PRIMEIRO' : h.trimestre_realizacao === 'SEGUNDO' ? 'SEGUNDO' : h.trimestre_realizacao === 'TERCEIRO' ? 'TERCEIRO' : h.trimestre_realizacao}
                                    </div>
                                  </div>
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                    <div className="text-[10px] font-black text-primary uppercase truncate">{h.rotinas?.descricao}</div>
                                  </div>
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                    <div className="text-[10px] font-medium text-on-surface-variant/60 uppercase">{h.tipo || h.rotinas?.tipo || '---'}</div>
                                  </div>
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                    <div className="text-[10px] font-bold text-on-surface uppercase truncate">{h.nome_profissional || '---'}</div>
                                  </div>
                                </td>
                                <td className="px-2 py-1.5">
                                  <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                    <div className="text-[10px] font-bold text-on-surface bg-secondary/10 px-2 py-0.5 rounded-full">
                                      {h.grupo || '---'}
                                    </div>
                                  </div>
                                </td>
                                  <td className="px-2 py-1.5">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <div className={`text-[10px] font-bold uppercase ${
                                        (h.tipo || h.rotinas?.tipo) === 'CONSULTA' 
                                          ? 'text-on-surface-variant/40'
                                          : (() => {
                                              const res = (h.resultado || '').toUpperCase();
                                              const isPositive = (res.includes('POSITIVO') || res.includes('REAGENTE')) && !res.includes('NEGATIVO') && !res.includes('NAO') && !res.includes('NÃO');
                                              if (isPositive) return 'text-error';
                                              if (h.resultado === '-') return 'text-on-surface-variant/40';
                                              return 'text-success';
                                            })()
                                      }`}>
                                        {(h.tipo || h.rotinas?.tipo) === 'CONSULTA' ? '-' : h.resultado}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <div className="text-[10px] font-bold text-on-surface uppercase">
                                        {(h.tipo || h.rotinas?.tipo) === 'CONSULTA' && h.data_proxima_consulta 
                                          ? new Date(h.data_proxima_consulta).toLocaleDateString('pt-BR') 
                                          : '-'}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl px-2 py-1">
                                      <div className="text-[10px] font-bold text-on-surface uppercase truncate max-w-[80px]">
                                        {(h.tipo || h.rotinas?.tipo) === 'CONSULTA' ? (h.observacoes || '-') : '-'}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="px-2 py-1.5">
                                  <div className="flex items-center justify-center gap-1">
                                    <button 
                                      type="button"
                                      onClick={() => handleEdit(h)} 
                                      className="p-1 rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all"
                                      title="Editar"
                                    >
                                      <span className="material-symbols-outlined text-sm">edit</span>
                                    </button>
                                    <Link href={`/dashboard/acompanhamento/${h.sispn}`} className="p-1 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all" title="Acompanhamento">
                                      <span className="material-symbols-outlined text-sm">monitoring</span>
                                    </Link>
                                    <button 
                                      type="button"
                                      onClick={() => setDeleteConfirmId(h.id_registro)} 
                                      className="p-1 rounded-lg bg-error text-white hover:bg-error/80 transition-all"
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
                    ) : (
                      <div className="rounded-2xl border border-outline-variant/10 bg-surface-container-low p-6 text-sm text-on-surface-variant font-bold uppercase tracking-wide">
                        Nenhum registro encontrado para essa gestante.
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <section className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-center gap-3 w-full md:w-auto">
              <select 
                className="w-full lg:w-auto px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filters.unidade}
                onChange={(e) => setFilters({ ...filters, unidade: e.target.value })}
              >
                <option value="">Todas</option>
                {uniqueUnidades.map(u => <option key={u.cnes} value={u.cnes}>{u.cnes} - {u.nome_fantasia}</option>)}
              </select>

              <select 
                className="w-full lg:w-auto px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <option value="">Status Gestação</option>
                <option value="ATIVA">GESTAÇÃO ATIVA</option>
                <option value="VENCIDA">GESTAÇÃO VENCIDA</option>
              </select>

              <select 
                className="w-full lg:w-auto px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filters.trimestre}
                onChange={(e) => setFilters({ ...filters, trimestre: e.target.value })}
              >
                <option value="">Trimestre</option>
                <option value="1º TRIMESTRE">1º TRIMESTRE</option>
                <option value="2º TRIMESTRE">2º TRIMESTRE</option>
                <option value="3º TRIMESTRE">3º TRIMESTRE</option>
              </select>

              <select 
                className="w-full lg:w-auto px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filters.tipo}
                onChange={(e) => setFilters({ ...filters, tipo: e.target.value, rotina: '' })}
              >
                <option value="">Tipo</option>
                <option value="EXAME">EXAME</option>
                <option value="VACINA">VACINA</option>
                <option value="CONSULTA">CONSULTA</option>
              </select>

              <select 
                className="w-full lg:w-auto px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filters.rotina}
                onChange={(e) => setFilters({ ...filters, rotina: e.target.value })}
              >
                <option value="">Rotina</option>
                {Array.from(new Set(
                  filters.tipo 
                    ? routines.filter(r => r.tipo === filters.tipo).map(r => r.descricao)
                    : routines.map(r => r.descricao)
                )).sort().map(desc => (
                  <option key={desc} value={desc}>{desc}</option>
                ))}
              </select>

              <select 
                className="w-full lg:w-auto px-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
                value={filters.equipe}
                onChange={(e) => setFilters({ ...filters, equipe: e.target.value })}
              >
                <option value="">Equipe</option>
                {uniqueEquipes.map(eq => <option key={eq} value={eq}>{eq}</option>)}
              </select>

              {(filters.status !== 'ATIVA' || filters.trimestre || filters.tipo || filters.rotina || filters.equipe || filters.unidade) && (
                <button 
                  onClick={() => setFilters({ status: 'ATIVA', trimestre: '', tipo: '', rotina: '', equipe: '', dpp: '', unidade: '' })}
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
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Gestante</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Status</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5 text-center">Exames</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5 text-center">Consultas</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5 text-center">Vacinas</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">DPP</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5">Alertas</th>
                    <th className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 font-headline border-b border-outline-variant/5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {loading ? (
                    <tr><td colSpan={8} className="p-24 text-center"><div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div></td></tr>
                  ) : filteredPatients.length === 0 ? (
                    <tr><td colSpan={8} className="p-24 text-center opacity-20 text-xl font-black uppercase tracking-widest">Nenhum paciente encontrado</td></tr>
                  ) : (
                    filteredPatients.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage).map((p) => (
                      <tr key={p.sispn} className="hover:bg-primary/[0.02] transition-colors group">
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-[11px] font-bold text-primary">CPF: {p.paciente_cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}</span>
                            <p className="font-black text-xs text-on-surface uppercase leading-tight">{p.paciente_nome}</p>
                            <span className="text-[11px] font-bold text-primary">SISPN: {p.sispn.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3.$4')}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${p.status === 'ATIVA' ? 'bg-success/10 text-success' : 'bg-surface-container-high text-on-surface-variant/40'}`}>
                              {p.status}
                            </span>
                            <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${
                              p.currentTrimester === '1º TRIMESTRE' ? 'bg-purple-100 text-purple-600' :
                              p.currentTrimester === '2º TRIMESTRE' ? 'bg-amber-100 text-amber-600' :
                              p.currentTrimester === '3º TRIMESTRE' ? 'bg-orange-100 text-orange-600' :
                              'bg-surface-container-high text-on-surface-variant/40'
                            }`}>
                              {p.currentTrimester === '1º TRIMESTRE' ? 'PRIMEIRO' : p.currentTrimester === '2º TRIMESTRE' ? 'SEGUNDO' : p.currentTrimester === '3º TRIMESTRE' ? 'TERCEIRO' : p.currentTrimester}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-bold text-on-surface">{p.examsCount}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-bold text-on-surface">{p.consultasCount}</span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-bold text-on-surface">{p.vaccinesCount}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className={`text-[11px] font-bold ${p.weeksToDpp !== null && p.weeksToDpp <= 4 ? 'text-error' : p.weeksToDpp !== null && p.weeksToDpp <= 12 ? 'text-warning' : 'text-on-surface'}`}>
                              {p.weeksToDpp !== null ? `${p.weeksToDpp} sem` : '---'}
                            </span>
                            <span className="text-[11px] font-bold text-on-surface">{p.dpp ? new Date(p.dpp).toLocaleDateString('pt-BR') : '---'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {p.hasPositive ? (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-error/10 text-error flex items-center gap-1 w-fit">
                              <span className="material-symbols-outlined text-[10px]">warning</span>
                              REAGENTE
                            </span>
                          ) : (
                            <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-success/10 text-success flex items-center gap-1 w-fit">
                              <span className="material-symbols-outlined text-[10px]">check_circle</span>
                              OK
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => handleViewPatient(p.sispn)} className="p-1.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all" title="Visualizar"><span className="material-symbols-outlined text-sm">visibility</span></button>
                            <button onClick={() => { 
                              setFormData({ sispn: p.sispn }); 
                              setPatientSearch(p.paciente_nome); 
                              setIsViewingHistory(false);
                              setIsFormOpen(true); 
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }} className="p-1.5 rounded-lg bg-surface-container-high text-on-surface-variant hover:bg-primary hover:text-white transition-all" title="Adicionar"><span className="material-symbols-outlined text-sm">add</span></button>
                            <Link href={`/dashboard/acompanhamento/${p.sispn}`} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all" title="Acompanhamento">
                              <span className="material-symbols-outlined text-sm">monitoring</span>
                            </Link>
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
