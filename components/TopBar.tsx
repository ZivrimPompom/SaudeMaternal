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
  const { searchQuery, setSearchQuery, isFormOpen, setIsFormOpen, triggerRefresh } = useSearch();
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
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSearchMobileOpen, setIsSearchMobileOpen] = useState(false);
  const [pacientes, setPacientes] = useState<any[]>([]);
  const [profissionais, setProfissionais] = useState<any[]>([]);

  useEffect(() => {
    if (isGestacoesPage) {
      const fetchData = async () => {
        const { data: pacData } = await supabase.from('pacientes').select('cpf, gestante, data_nascimento');
        const { data: profData } = await supabase.from('profissionais').select('cpf, nome, equipe, cbo');
        setPacientes(pacData || []);
        setProfissionais(profData || []);
      };
      fetchData();
    }
  }, [isGestacoesPage]);

  const getSearchLabel = () => {
    if (isCategoriesPage) return 'Categorias Profissionais';
    if (isProfessionalsPage) return 'Profissionais';
    if (isOperatorsPage) return 'Operadores';
    if (isRotinasPage) return 'Rotinas';
    if (isPacientesPage) return 'Pacientes';
    if (isUnidadesPage) return 'Unidades de Saúde';
    if (isGestacoesPage) return 'Gestações';
    if (isAtendimentosPage) return 'Atendimentos';
    if (isExamesPage) return 'Exames e Vacinas';
    return 'Busca';
  };

  const getSearchPlaceholder = () => {
    if (isCategoriesPage) return 'CBO ou Categoria...';
    if (isProfessionalsPage) return 'Nome, CPF ou CNS...';
    if (isOperatorsPage) return 'Nome ou CPF...';
    if (isRotinasPage) return 'Descrição ou Tipo...';
    if (isPacientesPage) return 'Nome ou CPF...';
    if (isUnidadesPage) return 'CNES ou Nome...';
    if (isGestacoesPage) return 'SISPN ou CPF...';
    if (isAtendimentosPage) return 'Nome, CPF ou SISPN...';
    if (isExamesPage) return 'Nome, SISPN ou Exame...';
    return 'Pesquisar...';
  };

  const getImporterProps = () => {
    if (isPacientesPage) return {
      tableName: "pacientes",
      expectedColumns: ['gestante', 'cpf', 'nome_mae', 'prontuario', 'cns', 'data_nascimento', 'logradouro', 'numero', 'complemento', 'bairro', 'contato', 'email', 'cpf_operador'],
      requiredColumns: ['nome', 'cpf'],
      conflictColumn: "cpf",
      transformData: (data: any[]) => data.map(item => {
        // Convert DD/MM/YYYY to YYYY-MM-DD for Supabase
        let dataNascimento = item.data_nascimento;
        if (dataNascimento && typeof dataNascimento === 'string') {
          const ddmmyyyy = dataNascimento.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
          if (ddmmyyyy) {
            const [_, day, month, year] = ddmmyyyy;
            dataNascimento = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          }
        }

        return {
          ...item,
          gestante: (item.gestante || '').toUpperCase(),
          nome_mae: (item.nome_mae || 'NÃO INFORMADO').toUpperCase(),
          cpf: (item.cpf || '').replace(/\D/g, ''),
          data_nascimento: dataNascimento,
          logradouro: (item.logradouro || '').toUpperCase(),
          complemento: (item.complemento || '').toUpperCase(),
          bairro: (item.bairro || '').toUpperCase(),
          cidade: 'SÃO PAULO',
          uf: 'SP',
          operador_responsavel: user?.nome || 'SISTEMA',
          cpf_operador: item.cpf_operador || user?.cpf || null
        };
      })
    };
    if (isProfessionalsPage) return {
      tableName: "profissionais",
      expectedColumns: ['nome', 'cpf', 'cbo', 'cns', 'conselho', 'uf_conselho', 'numero_conselho'],
      requiredColumns: ['nome', 'cpf', 'cbo'],
      conflictColumn: "cpf",
      transformData: (data: any[]) => data.map(item => ({
        ...item,
        nome: (item.nome || '').toUpperCase(),
        cpf: (item.cpf || '').replace(/\D/g, ''),
        cbo: (item.cbo || '').replace(/\D/g, ''),
        cns: (item.cns || '').replace(/\D/g, ''),
        conselho: (item.conselho || '').toUpperCase(),
        uf_conselho: (item.uf_conselho || 'SP').toUpperCase()
      }))
    };
    if (isUnidadesPage) return {
      tableName: "unidades_saude",
      expectedColumns: ['cnes', 'nome_fantasia', 'logradouro', 'numero', 'complemento', 'bairro', 'municipio', 'uf', 'cep', 'telefone'],
      requiredColumns: ['cnes', 'nome_fantasia'],
      conflictColumn: "cnes",
      transformData: (data: any[]) => data.map(item => ({
        ...item,
        nome_fantasia: (item.nome_fantasia || '').toUpperCase(),
        logradouro: (item.logradouro || '').toUpperCase(),
        complemento: (item.complemento || '').toUpperCase(),
        bairro: (item.bairro || '').toUpperCase(),
        municipio: (item.municipio || 'SAO PAULO').toUpperCase(),
        uf: (item.uf || 'SP').toUpperCase()
      }))
    };
    if (isGestacoesPage) return {
      tableName: "gestacoes",
      expectedColumns: [
        'sispn', 'cpf_paciente', 'dum', 'dpp', 'data_abertura', 'data_cadastro',
        'referencia_tecnica', 'acs', 'equipe', 'idade_cadastro', 'fase_vida_cadastro',
        'gestacao_anterior', 'aborto', 'parto', 'sifilis', 'sifilis_tratada',
        'hiv', 'hepatite_b', 'hepatite_c', 'classificacao_pn', 'alto_risco_compartilhado'
      ],
      requiredColumns: ['sispn', 'cpf_paciente'],
      conflictColumn: "sispn",
      transformData: (data: any[]) => {
        const todayStr = new Date().toISOString().split('T')[0];
        
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

        return data.reduce((acc: any[], row: any) => {
          const sispn = row.sispn?.toString().replace(/\D/g, '');
          if (!sispn) return acc;

          const cpf = row.cpf_paciente?.toString().replace(/\D/g, '').padStart(11, '0');
          const pac = pacientes.find(p => p.cpf === cpf);
          if (!pac) return acc;

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
            operador: user?.cpf?.replace(/\D/g, '') || 'IMPORTAÇÃO',
            gestacao_anterior: Math.max(0, parseInt(row.gestacao_anterior) || 0),
            aborto: Math.max(0, parseInt(row.aborto) || 0),
            parto: Math.max(0, parseInt(row.parto) || 0),
            referencia_tecnica: rtCpf,
            acs: acsCpf,
            equipe: prof?.equipe || row.equipe || 'NÃO INFORMADO',
          });
          return acc;
        }, []);
      }
    };
    if (isAtendimentosPage) return {
      tableName: "atendimentos",
      expectedColumns: ['sispn', 'data_consulta', 'cbo', 'cpf', 'data_proxima_consulta', 'observacoes_clinicas'],
      requiredColumns: ['sispn', 'data_consulta', 'cbo'],
      conflictColumn: "id_atendimento",
      transformData: (data: any[]) => data.map(item => {
        const formatDate = (dateStr: string) => {
          if (!dateStr) return null;
          if (dateStr.includes('/')) {
            const [d, m, y] = dateStr.split('/');
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
          return dateStr;
        };
        return {
          ...item,
          sispn: (item.sispn || '').replace(/\D/g, ''),
          cpf: (item.cpf || '').replace(/\D/g, ''),
          data_consulta: formatDate(item.data_consulta),
          data_proxima_consulta: formatDate(item.data_proxima_consulta),
          cbo: (item.cbo || '').replace(/\D/g, ''),
          cpf_operador: user?.cpf || null,
          observacoes_clinicas: (item.observacoes_clinicas || '').toUpperCase()
        };
      })
    };
    if (isExamesPage) return {
      tableName: "registro_rotinas",
      expectedColumns: ['sispn', 'id_rotina', 'tipo', 'data_realizacao', 'resultado', 'cbo', 'cpf_profissional'],
      requiredColumns: ['sispn', 'id_rotina', 'tipo', 'data_realizacao'],
      conflictColumn: "id_registro",
      transformData: (data: any[]) => data.map(item => {
        const formatDate = (dateStr: string) => {
          if (!dateStr) return null;
          if (dateStr.includes('/')) {
            const [d, m, y] = dateStr.split('/');
            return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
          }
          return dateStr;
        };
        const cpfProf = (item.cpf_profissional || '').replace(/\D/g, '');
        return {
          ...item,
          sispn: (item.sispn || '').replace(/\D/g, ''),
          tipo: (item.tipo || 'EXAME').toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
          cpf_profissional: cpfProf || 'NÃO INFORMADO',
          data_realizacao: formatDate(item.data_realizacao),
          resultado: (item.resultado || '').toUpperCase(),
          cbo: (item.cbo || '').replace(/\D/g, ''),
          cpf_operador: user?.cpf || null
        };
      })
    };
    if (isOperatorsPage) return {
      tableName: "operadores",
      expectedColumns: ['nome', 'cpf', 'senha', 'status', 'nivel_acesso', 'sigla', 'unidade_cnes'],
      requiredColumns: ['nome', 'cpf', 'senha'],
      conflictColumn: "cpf",
      transformData: (data: any[]) => data.map(item => ({
        ...item,
        nome: (item.nome || '').toUpperCase(),
        cpf: (item.cpf || '').replace(/\D/g, ''),
        status: item.status || 'Ativo',
        unidade_cnes: item.unidade_cnes || null
      }))
    };
    if (isRotinasPage) return {
      tableName: "rotinas",
      expectedColumns: ['tipo', 'descricao', 'trimestre', 'categoria'],
      requiredColumns: ['tipo', 'descricao'],
      conflictColumn: "id",
      transformData: (data: any[]) => data.map(item => ({
        ...item,
        tipo: (item.tipo || 'EXAME').toUpperCase(),
        descricao: (item.descricao || '').toUpperCase(),
        trimestre: (item.trimestre || 'PRIMEIRO').toUpperCase(),
        categoria: (item.categoria || 'OBRIGATORIO').toUpperCase()
      }))
    };
    if (isCategoriesPage) return {
      tableName: "categorias_profissionais",
      expectedColumns: ['cbo', 'categoria'],
      requiredColumns: ['cbo', 'categoria'],
      conflictColumn: "cbo",
      transformData: (data: any[]) => data.map(item => ({
        ...item,
        cbo: (item.cbo || '').replace(/\D/g, ''),
        categoria: (item.categoria || '').toUpperCase()
      }))
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
    <header className={`fixed top-0 right-0 h-16 z-40 bg-surface/80 backdrop-blur-xl border-b border-outline-variant/10 flex justify-between items-center px-4 md:px-8 transition-all duration-300 ${isSidebarOpen ? 'w-full lg:w-[calc(100%-16rem)]' : 'w-full'}`}>
      <div className="flex items-center gap-1 md:gap-4 flex-1">
        {!isSearchMobileOpen && (
          <>
            <button 
              onClick={onToggleSidebar}
              className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors"
              title={isSidebarOpen ? 'Recolher Menu' : 'Expandir Menu'}
            >
              <span className="material-symbols-outlined">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
            </button>

            <Link 
              href="/"
              className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors flex items-center gap-2"
              title="Ir para Home"
            >
              <span className="material-symbols-outlined">home</span>
              <span className="hidden sm:inline text-sm font-semibold">Home</span>
            </Link>
          </>
        )}
        
        {!isHomePage && (
          <div className={`flex items-center gap-2 flex-1 ${isSearchMobileOpen ? 'px-0' : 'ml-1 md:ml-2'}`}>
            {!isSearchMobileOpen && (
              <>
                <span className="hidden lg:block text-lg font-black text-primary font-headline whitespace-nowrap">{getSearchLabel()}</span>
                <div className="hidden lg:block h-6 w-px bg-outline-variant/20 mx-2"></div>
              </>
            )}

            {/* Search Bar - Desktop and Mobile Toggle */}
            <div className={`flex items-center gap-2 ${isSearchMobileOpen ? 'w-full' : 'w-auto'}`}>
              <div className={`${isSearchMobileOpen ? 'flex flex-1' : 'hidden sm:flex'} items-center bg-surface-container rounded-full px-4 py-1.5 gap-2 w-full max-w-md transition-all duration-300`}>
                <span className="material-symbols-outlined text-on-surface-variant/40 text-sm">search</span>
                <input 
                  className="bg-transparent border-none text-sm focus:ring-0 placeholder-on-surface-variant/40 w-full font-body text-on-surface" 
                  placeholder={getSearchPlaceholder()} 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  autoFocus={isSearchMobileOpen}
                />
                {isSearchMobileOpen && (
                  <button onClick={() => setIsSearchMobileOpen(false)} className="material-symbols-outlined text-on-surface-variant/40 text-sm">close</button>
                )}
              </div>

              {!isSearchMobileOpen && (
                <button 
                  onClick={() => setIsSearchMobileOpen(true)}
                  className="sm:hidden p-2 rounded-full bg-surface-container text-on-surface-variant/60"
                >
                  <span className="material-symbols-outlined text-sm">search</span>
                </button>
              )}
            </div>

            {!isSearchMobileOpen && (
              <div className="flex items-center gap-1 md:gap-2">
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

                {(isCategoriesPage || isProfessionalsPage || isOperatorsPage || isRotinasPage || isPacientesPage || isUnidadesPage || isGestacoesPage || isAtendimentosPage || isExamesPage) && (
                  <button
                    onClick={() => setIsFormOpen(!isFormOpen)}
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
        )}
      </div>

      {!isSearchMobileOpen && (
        <div className="flex items-center gap-2 md:gap-6 ml-2">
          <div className="flex items-center gap-1 md:gap-4">
            <button 
              onClick={toggleTheme}
              className="p-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors flex items-center justify-center"
              title={getThemeTitle()}
            >
              <span className="material-symbols-outlined text-lg">
                {getThemeIcon()}
              </span>
            </button>
            <button className="hidden sm:block material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">notifications</button>
            <button className="hidden sm:block material-symbols-outlined text-on-surface-variant hover:text-primary transition-colors">apps</button>
          </div>
          
          <div className="relative">
            <button 
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 md:gap-3 hover:bg-surface-container-low p-1 rounded-xl transition-colors"
            >
              <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs shrink-0">
                {userInitials}
              </span>
              <span className="hidden lg:block text-left">
                <span className="block text-xs font-bold leading-none mb-1 capitalize text-on-surface">{userName}</span>
                <span className="block text-[10px] text-on-surface-variant/60 leading-none truncate max-w-[120px]">{userRole}</span>
              </span>
              <span className={`material-symbols-outlined text-on-surface-variant/40 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`}>expand_more</span>
            </button>

          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-surface-container-lowest rounded-xl shadow-xl border border-outline-variant/10 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-outline-variant/5 mb-1">
                <p className="text-xs font-bold text-on-surface truncate">{userName}</p>
                <p className="text-[10px] text-on-surface-variant/60 truncate">{user?.cpf}</p>
              </div>
              <button 
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-error hover:bg-error/5 transition-colors"
              >
                <span className="material-symbols-outlined text-lg">logout</span>
                <span>Sair do Sistema</span>
              </button>
            </div>
          )}
        </div>
      </div>
    )}
  </header>
  );
}
