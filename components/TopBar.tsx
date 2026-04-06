'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearch } from '@/context/SearchContext';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import CSVImporter from './CSVImporter';
import { supabase } from '@/lib/supabase';

import { useTheme } from '@/context/ThemeContext';

export default function TopBar({ onToggleSidebar, isSidebarOpen }: { onToggleSidebar: () => void; isSidebarOpen: boolean }) {
  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen, triggerRefresh, onExportCSV } = useSearch();
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  const getThemeIcon = () => {
    if (theme === 'light') return 'dark_mode';
    if (theme === 'dark') return 'contrast';
    return 'light_mode';
  };

  const getThemeTitle = () => {
    if (theme === 'light') return 'Ativar Modo Escuro';
    if (theme === 'dark') return 'Ativar Alto Contraste';
    return 'Ativar Modo Claro';
  };

  // Limpar a busca ao mudar de página para evitar "sujeira" entre as telas
  useEffect(() => {
    setSearchQuery('');
  }, [pathname, setSearchQuery]);

  const isHomePage = pathname === '/';
  const isCategoriesPage = pathname === '/categorias';
  const isProfessionalsPage = pathname === '/profissionais';
  const isOperatorsPage = pathname === '/operadores';
  const isRotinasPage = pathname === '/rotinas';
  const isPacientesPage = pathname === '/pacientes';
  const isUnidadesPage = pathname === '/unidades';
  const isGestacoesPage = pathname === '/gestacoes';
  const isAtendimentosPage = pathname === '/atendimentos';
  const isExamesPage = pathname === '/exames';
  const isDesfechosPage = pathname === '/desfechos';
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);
  const [rotinas, setRotinas] = useState<any[]>([]);
  const [gestacoes, setGestacoes] = useState<any[]>([]);

  useEffect(() => {
    if (isGestacoesPage || isExamesPage || isAtendimentosPage || isDesfechosPage) {
      const fetchData = async () => {
        console.log('Fetching data for import validation...', { isGestacoesPage, isExamesPage, isAtendimentosPage, isDesfechosPage });
        
        const fetchChunked = async (tableName: string, selectStr: string) => {
          let allData: any[] = [];
          let from = 0;
          const limit = 1000;
          let hasMore = true;
          
          while (hasMore) {
            const { data, error } = await supabase
              .from(tableName)
              .select(selectStr)
              .range(from, from + limit - 1);
            
            if (error) {
              console.error(`Error fetching ${tableName}:`, error);
              hasMore = false;
            } else if (data) {
              allData = [...allData, ...data];
              if (data.length < limit) {
                hasMore = false;
              } else {
                from += limit;
              }
            } else {
              hasMore = false;
            }
            // Safety break
            if (from > 50000) break;
          }
          return allData;
        };

        if (isGestacoesPage) {
          const pacData = await fetchChunked('pacientes', 'cpf, gestante, data_nascimento');
          const profData = await fetchChunked('profissionais', 'cpf, nome, equipe, cbo');
          setPacientes(pacData);
          setProfissionais(profData);
          console.log('Fetched', pacData.length, 'pacientes and', profData.length, 'profissionais');
        }
        if (isExamesPage || isAtendimentosPage) {
          const rotData = await fetchChunked('rotinas', 'id, descricao, tipo, trimestre');
          const gestData = await fetchChunked('gestacoes', 'sispn, dum');
          setRotinas(rotData);
          setGestacoes(gestData);
          console.log('Fetched', rotData.length, 'rotinas and', gestData.length, 'gestacoes');
        }
      };
      fetchData();
    }
  }, [isGestacoesPage, isExamesPage, isAtendimentosPage, isDesfechosPage, triggerRefresh]);


  const getImporterProps = () => {
    if (isPacientesPage) return {
      tableName: "pacientes",
      expectedColumns: ['gestante', 'cpf', 'cns', 'prontuario', 'data_nascimento', 'nome_mae', 'contato', 'email', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'],
      requiredColumns: ['gestante', 'cpf'],
      conflictColumn: "cpf",
      transformData: (data: any[]) => {
        const valid: any[] = [];
        const rejected: any[] = [];
        data.forEach(item => {
          const cpf = (item.cpf || '').replace(/\D/g, '');
          if (cpf.length !== 11) {
            rejected.push({ ...item, MOTIVO_REJEICAO: 'CPF inválido (deve ter 11 dígitos)' });
            return;
          }

          let dataNascimento = item.data_nascimento;
          if (dataNascimento && typeof dataNascimento === 'string') {
            const ddmmyyyy = dataNascimento.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (ddmmyyyy) {
              const [_, day, month, year] = ddmmyyyy;
              dataNascimento = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            }
          }

          valid.push({
            ...item,
            gestante: (item.gestante || '').toUpperCase(),
            cpf,
            cns: (item.cns || '').replace(/\D/g, ''),
            prontuario: (item.prontuario || '').toUpperCase(),
            data_nascimento: dataNascimento,
            nome_mae: (item.nome_mae || 'NÃO INFORMADO').toUpperCase(),
            contato: (item.contato || '').replace(/\D/g, ''),
            email: (item.email || '').toLowerCase(),
            logradouro: (item.logradouro || '').toUpperCase(),
            numero: (item.numero || '').toUpperCase(),
            complemento: (item.complemento || '').toUpperCase(),
            bairro: (item.bairro || '').toUpperCase(),
            cidade: 'SÃO PAULO',
            uf: 'SP',
            operador_responsavel: user?.nome || 'SISTEMA',
            cpf_operador: item.cpf_operador || user?.cpf || null
          });
        });
        return { valid, rejected };
      }
    };
    if (isProfessionalsPage) return {
      tableName: "profissionais",
      expectedColumns: ['nome', 'cpf', 'cns', 'cbo', 'unidade_cnes', 'equipe', 'situacao', 'vinculo', 'tipo_vinculo', 'chs'],
      requiredColumns: ['nome', 'cpf', 'cbo'],
      conflictColumn: "cpf",
      transformData: (data: any[]) => {
        const valid: any[] = [];
        const rejected: any[] = [];
        data.forEach(item => {
          const cpf = (item.cpf || '').replace(/\D/g, '');
          if (cpf.length !== 11) {
            rejected.push({ ...item, MOTIVO_REJEICAO: 'CPF inválido' });
          } else {
            valid.push({
              ...item,
              nome: (item.nome || '').toUpperCase(),
              cpf,
              cns: (item.cns || '').replace(/\D/g, ''),
              cbo: (item.cbo || '').replace(/\D/g, ''),
              unidade_cnes: item.unidade_cnes || null,
              equipe: item.equipe || 'SEM EQUIPE',
              situacao: (item.situacao || 'ATIVO').toUpperCase(),
              vinculo: (item.vinculo || 'INTERMEDIADO').toUpperCase(),
              tipo_vinculo: (item.tipo_vinculo || 'CLT').toUpperCase(),
              chs: parseInt(item.chs) || 20
            });
          }
        });
        return { valid, rejected };
      }
    };
    if (isUnidadesPage) return {
      tableName: "unidades_saude",
      expectedColumns: ['nome_fantasia', 'cnes', 'telefone', 'logradouro', 'numero', 'complemento', 'bairro', 'municipio', 'uf', 'cep'],
      requiredColumns: ['cnes', 'nome_fantasia'],
      conflictColumn: "cnes",
      transformData: (data: any[]) => {
        const valid = data.map(item => ({
          ...item,
          nome_fantasia: (item.nome_fantasia || '').toUpperCase(),
          cnes: item.cnes,
          telefone: (item.telefone || '').replace(/\D/g, ''),
          logradouro: (item.logradouro || '').toUpperCase(),
          numero: (item.numero || '').toUpperCase(),
          complemento: (item.complemento || '').toUpperCase(),
          bairro: (item.bairro || '').toUpperCase(),
          municipio: (item.municipio || 'SAO PAULO').toUpperCase(),
          uf: (item.uf || 'SP').toUpperCase(),
          cep: item.cep || ''
        }));
        return { valid, rejected: [] };
      }
    };
    if (isGestacoesPage) return {
      tableName: "gestacoes",
      expectedColumns: [
        'sispn', 'cpf_paciente', 'dum', 'dpp', 'data_abertura', 'data_cadastro',
        'referencia_tecnica', 'acs', 'equipe',
        'gestacao_anterior', 'aborto', 'parto', 'sifilis', 'sifilis_tratada',
        'hiv', 'hepatite_b', 'hepatite_c', 'classificacao_pn', 'alto_risco_compartilhado'
      ],
      requiredColumns: ['sispn', 'cpf_paciente'],
      conflictColumn: "sispn",
      transformData: (data: any[]) => {
        const todayStr = new Date().toISOString().split('T')[0];
        const valid: any[] = [];
        const rejected: any[] = [];
        
        const parseDate = (dateStr: any) => {
          if (!dateStr || dateStr.toString().trim() === '') return null;
          const str = dateStr.toString().trim();
          const ddmmyyyy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (ddmmyyyy) {
            const [_, day, month, year] = ddmmyyyy;
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
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

        const normalizeSispn = (val: any) => {
          if (!val) return '';
          return val.toString().replace(/\D/g, '').replace(/^0+/, '');
        };

        data.forEach(row => {
          const sispn = normalizeSispn(row.sispn);
          if (!sispn) {
            rejected.push({ ...row, MOTIVO_REJEICAO: 'SISPN ausente' });
            return;
          }

          const cpf = row.cpf_paciente?.toString().replace(/\D/g, '').padStart(11, '0');
          const pac = pacientes.find(p => (p.cpf || '').toString().replace(/\D/g, '') === cpf);
          if (!pac) {
            rejected.push({ ...row, MOTIVO_REJEICAO: `Paciente com CPF ${cpf} não encontrada no Cadastro de Pacientes.` });
            return;
          }

          let dum = parseDate(row.dum);
          let dpp = parseDate(row.dpp);
          let data_abertura = parseDate(row.data_abertura);
          let data_cadastro = parseDate(row.data_cadastro);

          if (dum && dum > todayStr) dum = todayStr;
          if (data_abertura && data_abertura > todayStr) data_abertura = todayStr;
          if (data_cadastro && data_cadastro > todayStr) data_cadastro = todayStr;

          if (!dpp && dum) dpp = calculateDPP(dum);

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

          valid.push({
            ...row,
            sispn,
            cpf_paciente: cpf,
            dum,
            dpp,
            data_abertura,
            data_cadastro,
            idade_cadastro: idade || null,
            fase_vida_cadastro: fase || null,
            operador: user?.cpf?.replace(/\D/g, '') || 'IMPORTAÇÃO',
            gestacao_anterior: Math.max(0, parseInt(row.gestacao_anterior) || 0),
            aborto: Math.max(0, parseInt(row.aborto) || 0),
            parto: Math.max(0, parseInt(row.parto) || 0),
            referencia_tecnica: rtCpf,
            acs: acsCpf,
            equipe: prof?.equipe || row.equipe || 'NÃO INFORMADO',
          });
        });

        return { valid, rejected };
      }
    };
    if (isAtendimentosPage) return {
      tableName: "atendimentos",
      expectedColumns: ['sispn', 'data_consulta', 'trimestre_consulta', 'cpf', 'data_proxima_consulta', 'observacoes_clinicas'],
      requiredColumns: ['sispn', 'data_consulta', 'cpf'],
      conflictColumn: "id_atendimento",
      transformData: (data: any[]) => {
        const valid: any[] = [];
        const rejected: any[] = [];
        
        const formatDate = (dateStr: string) => {
          if (!dateStr) return null;
          if (dateStr.includes('/')) {
            const [d, m, y] = dateStr.split('/');
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
          return dateStr;
        };

        const normalizeSispn = (val: any) => {
          if (!val) return '';
          return val.toString().replace(/\D/g, '').replace(/^0+/, '');
        };

        data.forEach(item => {
          const sispn = normalizeSispn(item.sispn);
          let rejectionReason = '';

          if (!sispn) {
            rejectionReason = 'SISPN ausente';
          } else {
            const gestacao = gestacoes.find(g => normalizeSispn(g.sispn) === sispn);
            if (!gestacao) {
              rejectionReason = `Gestação com SISPN ${sispn} não encontrada no Cadastro de Gestações.`;
            }
          }

          if (rejectionReason) {
            rejected.push({ ...item, MOTIVO_REJEICAO: rejectionReason });
          } else {
            valid.push({
              ...item,
              sispn,
              cpf: (item.cpf || '').replace(/\D/g, ''),
              data_consulta: formatDate(item.data_consulta),
              data_proxima_consulta: formatDate(item.data_proxima_consulta),
              cbo: (item.cbo || '').replace(/\D/g, ''),
              trimestre_consulta: (item.trimestre_consulta || '1º TRIMESTRE').toUpperCase(),
              cpf_operador: user?.cpf || null,
              observacoes_clinicas: (item.observacoes_clinicas || '').toUpperCase()
            });
          }
        });
        return { valid, rejected };
      }
    };
    if (isExamesPage) return {
      tableName: "registro_rotinas",
      expectedColumns: ['sispn', 'id_rotina', 'data_realizacao', 'resultado', 'cpf_profissional'],
      requiredColumns: ['sispn', 'id_rotina', 'data_realizacao'],
      conflictColumn: "id_registro",
      transformData: (data: any[]) => {
        console.log('Starting transformation for', data.length, 'rows');
        const valid: any[] = [];
        const rejected: any[] = [];

        data.forEach((item, index) => {
          const formatDate = (dateStr: string) => {
            if (!dateStr) return null;
            if (dateStr.includes('/')) {
              const [d, m, y] = dateStr.split('/');
              return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            }
            return dateStr;
          };

          const calculateTrimestre = (dumStr: string, realizacaoStr: string) => {
            if (!dumStr || !realizacaoStr) return '1º TRIMESTRE';
            const dum = new Date(dumStr);
            const realizacao = new Date(realizacaoStr);
            if (isNaN(dum.getTime()) || isNaN(realizacao.getTime())) return '1º TRIMESTRE';
            const diffTime = realizacao.getTime() - dum.getTime();
            const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
            if (diffWeeks <= 13) return '1º TRIMESTRE';
            if (diffWeeks <= 27) return '2º TRIMESTRE';
            return '3º TRIMESTRE';
          };

          const mapToRotinaTrimestre = (trim: string) => {
            if (trim === '1º TRIMESTRE') return 'PRIMEIRO';
            if (trim === '2º TRIMESTRE') return 'SEGUNDO';
            return 'TERCEIRO';
          };

          const normalizeSispn = (val: any) => {
            if (!val) return '';
            return val.toString().replace(/\D/g, '').replace(/^0+/, '');
          };

          const sispn = normalizeSispn(item.sispn);
          const dataRealizacao = formatDate(item.data_realizacao);
          const gestacao = gestacoes.find(g => normalizeSispn(g.sispn) === sispn);
          
          let rejectionReason = '';
          if (!gestacao) {
            rejectionReason = `Gestação com SISPN ${sispn} não encontrada no Cadastro de Gestações.`;
          }

          const calculatedTrimestre = item.trimestre_realizacao || calculateTrimestre(gestacao?.dum || '', dataRealizacao || '');
          const rotinaTrimestre = mapToRotinaTrimestre(calculatedTrimestre);

          const normalizeDescription = (desc: string) => {
            if (!desc) return '';
            return desc
              .toUpperCase()
              .replace(/\uFFFD/g, 'A')
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .trim();
          };

          const descricaoCsv = normalizeDescription(item.id_rotina || '');

          let rotina = rotinas.find(r =>
            normalizeDescription(r.descricao) === descricaoCsv &&
            r.trimestre === rotinaTrimestre
          );

          if (!rotina) {
            rotina = rotinas.find(r =>
              normalizeDescription(r.descricao) === descricaoCsv
            );
          }

          // Partial match if exact match fails
          if (!rotina) {
            rotina = rotinas.find(r => {
              const dbDesc = normalizeDescription(r.descricao);
              return (dbDesc.includes(descricaoCsv) || descricaoCsv.includes(dbDesc));
            });
          }

          if (!rotina) {
            rejectionReason = rejectionReason ? `${rejectionReason} | ` : '';
            rejectionReason += `Rotina "${descricaoCsv}" não encontrada.`;
          }

          const cpfProf = (item.cpf_profissional || '').replace(/\D/g, '');
          const transformedItem = {
            ...item,
            sispn,
            id_rotina: rotina?.id || item.id_rotina,
            cpf_profissional: cpfProf || 'NÃO INFORMADO',
            data_realizacao: dataRealizacao,
            resultado: (item.resultado || '').toUpperCase(),
            trimestre_realizacao: calculatedTrimestre,
            cbo: (item.cbo || '').replace(/\D/g, ''),
            cpf_operador: user?.cpf || null,
            observacoes: (item.observacoes || '').toUpperCase(),
            tipo: (item.tipo || rotina?.tipo || 'EXAME').toUpperCase()
          };

          const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(transformedItem.id_rotina);
          if (!isUuid) {
            rejectionReason = rejectionReason ? `${rejectionReason} | ` : '';
            rejectionReason += `ID da Rotina inválido (${transformedItem.id_rotina}).`;
          }
          if (!transformedItem.sispn) {
            rejectionReason = rejectionReason ? `${rejectionReason} | ` : '';
            rejectionReason += `SISPN ausente.`;
          }

          if (rejectionReason) {
            rejected.push({ ...item, MOTIVO_REJEICAO: rejectionReason });
          } else {
            valid.push(transformedItem);
          }
        });

        console.log('Transformation complete.', valid.length, 'valid,', rejected.length, 'rejected');
        return { valid, rejected };
      }
    };
    if (isOperatorsPage) return {
      tableName: "operadores",
      expectedColumns: ['name', 'cpf', 'unidade_cnes', 'status', 'nivel_acesso', 'password'],
      requiredColumns: ['name', 'cpf', 'password'],
      conflictColumn: "cpf",
      transformData: (data: any[]) => {
        const valid: any[] = [];
        const rejected: any[] = [];
        data.forEach(item => {
          const cpf = (item.cpf || '').replace(/\D/g, '');
          if (cpf.length !== 11) {
            rejected.push({ ...item, MOTIVO_REJEICAO: 'CPF inválido (deve ter 11 dígitos)' });
          } else {
            valid.push({
              ...item,
              name: (item.name || item.nome || '').toUpperCase(),
              cpf,
              status: item.status || 'Ativo',
              unidade_cnes: item.unidade_cnes || null,
              nivel_acesso: item.nivel_acesso || 'Usuário',
              password: item.password || item.senha || null
            });
          }
        });
        return { valid, rejected };
      }
    };
    if (isRotinasPage) return {
      tableName: "rotinas",
      expectedColumns: ['tipo', 'descricao', 'trimestre', 'categoria'],
      requiredColumns: ['tipo', 'descricao'],
      conflictColumn: "id",
      transformData: (data: any[]) => {
        const valid = data.map(item => ({
          ...item,
          tipo: (item.tipo || 'EXAME').toUpperCase(),
          descricao: (item.descricao || '').toUpperCase(),
          trimestre: (item.trimestre || 'PRIMEIRO').toUpperCase(),
          categoria: (item.categoria || 'OBRIGATORIO').toUpperCase()
        }));
        return { valid, rejected: [] };
      }
    };
    if (isCategoriesPage) return {
      tableName: "categorias_profissionais",
      expectedColumns: ['cbo', 'categoria'],
      requiredColumns: ['cbo', 'categoria'],
      conflictColumn: "cbo",
      transformData: (data: any[]) => {
        const valid = data.map(item => ({
          ...item,
          cbo: (item.cbo || '').replace(/\D/g, ''),
          categoria: (item.categoria || '').toUpperCase()
        }));
        return { valid, rejected: [] };
      }
    };
    if (isDesfechosPage) return {
      tableName: "desfechos",
      expectedColumns: ['sispn', 'tipo_desfecho', 'data_desfecho'],
      requiredColumns: ['sispn', 'tipo_desfecho', 'data_desfecho'],
      conflictColumn: "id",
      transformData: (data: any[]) => {
        const valid: any[] = [];
        const rejected: any[] = [];
        
        const formatDate = (dateStr: string) => {
          if (!dateStr) return null;
          if (dateStr.includes('/')) {
            const [d, m, y] = dateStr.split('/');
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
          return dateStr;
        };

        const normalizeSispn = (val: any) => {
          if (!val) return '';
          return val.toString().replace(/\D/g, '').replace(/^0+/, '');
        };

        const desfechoOptions = ['PARTO', 'ABORTO', 'MUDOU-SE', 'ÓBITO', 'CONVÊNIO MÉDICO', 'OUTROS'];

        data.forEach(item => {
          const sispn = normalizeSispn(item.sispn);
          let rejectionReason = '';

          if (!sispn) {
            rejectionReason = 'SISPN ausente';
          } else {
            const gestacao = gestacoes.find(g => normalizeSispn(g.sispn) === sispn);
            if (!gestacao) {
              rejectionReason = `Gestação com SISPN ${sispn} não encontrada no Cadastro de Gestações.`;
            }
          }

          const tipo = (item.tipo_desfecho || '').toUpperCase().trim();
          if (!desfechoOptions.includes(tipo)) {
            rejectionReason = rejectionReason ? `${rejectionReason} | ` : '';
            rejectionReason += `Tipo de desfecho "${tipo}" inválido. Opções: ${desfechoOptions.join(', ')}`;
          }

          if (rejectionReason) {
            rejected.push({ ...item, MOTIVO_REJEICAO: rejectionReason });
          } else {
            valid.push({
              ...item,
              sispn,
              tipo_desfecho: tipo,
              data_desfecho: formatDate(item.data_desfecho),
              unidade_cnes: user?.unidade_cnes || null
            });
          }
        });
        return { valid, rejected };
      }
    };
    return null;
  };

  const importerProps = getImporterProps();

  const handleExportLayout = () => {
    if (!importerProps || !importerProps.expectedColumns) return;
    
    const headers = importerProps.expectedColumns.join(',');
    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `layout_importacao_${importerProps.tableName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const userName = user?.nome || 'Usuário';
  const userRole = user?.nivel_acesso || 'Usuário';
  const userInitials = user?.sigla || userName.substring(0, 2).toUpperCase();

  return (
    <header className={`fixed top-0 right-0 h-16 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center px-4 md:px-8 transition-all duration-300 ${isSidebarOpen ? 'w-full lg:w-[calc(100%-16rem)]' : 'w-full'}`}>
      <div className="flex items-center gap-1 md:gap-4 flex-1">
        <button 
          onClick={onToggleSidebar}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
          title={isSidebarOpen ? 'Recolher Menu' : 'Expandir Menu'}
        >
          <span className="material-symbols-outlined">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
        </button>

        <Link 
          href="/"
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors flex items-center gap-2"
          title="Ir para Home"
        >
          <span className="material-symbols-outlined">home</span>
          <span className="hidden sm:inline text-sm font-semibold">Home</span>
        </Link>
        
        {!isHomePage && (
          <div className="flex items-center gap-1 md:gap-2 ml-auto">
            {importerProps && (
              <CSVImporter 
                {...importerProps}
                onSuccess={triggerRefresh}
                title="Importar"
                hideTitleOnMobile={true}
                className="flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all duration-300 bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
              />
            )}

            {importerProps && (
              <button
                onClick={handleExportLayout}
                className="flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all duration-300 bg-white text-primary border border-primary hover:bg-primary/5 shadow-lg shadow-primary/5"
                title="Baixar modelo de planilha para importação"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span className="hidden md:inline">Exportar Layout</span>
              </button>
            )}

            {onExportCSV && (
              <button
                onClick={onExportCSV}
                className="flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all duration-300 bg-white text-primary border border-primary hover:bg-primary/5 shadow-lg shadow-primary/5"
                title="Exportar dados atuais para CSV"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                <span className="hidden md:inline">Exportar CSV</span>
              </button>
            )}

            {(isCategoriesPage || isProfessionalsPage || isOperatorsPage || isRotinasPage || isPacientesPage || isUnidadesPage || isGestacoesPage || isAtendimentosPage || isExamesPage || isDesfechosPage) && (
              <button
                onClick={() => { if (!isFormOpen) setSearchQuery(''); setIsFormOpen(!isFormOpen); }}
                className={`flex items-center gap-2 px-3 md:px-4 py-1.5 rounded-full text-xs md:text-sm font-bold transition-all duration-300 ${
                  isFormOpen 
                    ? 'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-200' 
                    : 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20'
                }`}
              >
                <span className="material-symbols-outlined text-sm">{isFormOpen ? 'close' : 'add'}</span>
                <span className="hidden md:inline">{isFormOpen ? 'Fechar' : 'Cadastrar'}</span>
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-6 ml-2">
        <div className="flex items-center gap-1 md:gap-4">
          <button 
            onClick={toggleTheme}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors flex items-center justify-center"
            title={getThemeTitle()}
          >
            <span className="material-symbols-outlined text-lg">
              {getThemeIcon()}
            </span>
          </button>
          <button className="hidden sm:block material-symbols-outlined text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">notifications</button>
          <button className="hidden sm:block material-symbols-outlined text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">apps</button>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 md:gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 p-1 rounded-xl transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs shrink-0">
              {userInitials}
            </span>
            <span className="hidden lg:block text-left">
              <span className="block text-xs font-bold leading-none mb-1 capitalize text-slate-900 dark:text-slate-100">{userName}</span>
              <span className="block text-[10px] text-slate-500 dark:text-slate-400 leading-none truncate max-w-[120px]">{userRole}</span>
            </span>
            <span className={`material-symbols-outlined text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}>expand_more</span>
          </button>

          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 mb-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{userName}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.cpf}</p>
              </div>
              <button 
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                <span>Sair do Sistema</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
