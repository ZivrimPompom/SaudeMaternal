'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

interface SubItem {
  name: string;
  href: string;
}

interface MenuItem {
  name: string;
  icon: string;
  href?: string;
  subItems?: SubItem[];
}

export default function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const isAdministrator = user?.nivel_acesso === 'Administrador';

  // Close sidebar on mobile when route changes
  useEffect(() => {
    if (window.innerWidth < 1024) {
      onClose();
    }
  }, [pathname, onClose]);

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const menuItems: MenuItem[] = [
    { name: 'Home', icon: 'home', href: '/' },
    { 
      name: 'Pacientes', 
      icon: 'group', 
      subItems: [
        { name: 'Pacientes', href: '/pacientes' },
        { name: 'Gestações', href: '/gestacoes' },
      ] 
    },
    {
      name: 'Cadastros',
      icon: 'person_add',
      subItems: [
        { name: 'Unidades de Saúde', href: '/unidades' },
        ...(isAdministrator ? [{ name: 'Operadores', href: '/operadores' }] : []),
        { name: 'Categorias Profissionais', href: '/categorias' },
        { name: 'Profissionais', href: '/profissionais' },
        { name: 'Rotinas', href: '/rotinas' },
      ],
    },
    { 
      name: 'Movimento', 
      icon: 'sync_alt', 
      subItems: [
        { name: 'Atendimentos', href: '/atendimentos' },
        { name: 'Exames e Vacinas', href: '/exames' },
        { name: 'Desfecho da Gestação', href: '/desfechos' },
      ]
    },
    { 
      name: 'Dashboards', 
      icon: 'dashboard', 
      subItems: [
        { name: 'Visão Geral', href: '/dashboard/overview' },
      ]
    },
    { 
      name: 'Manutenção', 
      icon: 'settings', 
      subItems: [
        { name: 'Backup Dados', href: '/manutencao/backup' },
        { name: 'Histórico', href: '/manutencao/historico' },
        { name: 'Exportar Layout Pacientes', href: 'export:pacientes' },
        { name: 'Exportar Layout Gestações', href: 'export:gestacoes' },
        { name: 'Exportar Layout Unidades', href: 'export:unidades' },
        { name: 'Exportar Layout Operadores', href: 'export:operadores' },
        { name: 'Exportar Layout Categorias', href: 'export:categorias' },
        { name: 'Exportar Layout Profissionais', href: 'export:profissionais' },
        { name: 'Exportar Layout Rotinas', href: 'export:rotinas' },
        { name: 'Exportar Layout Atendimentos', href: 'export:atendimentos' },
        { name: 'Exportar Layout Exames', href: 'export:exames' },
        { name: 'Exportar Layout Desfechos', href: 'export:desfechos' },
      ]
    },
    { 
      name: 'Relatórios', 
      icon: 'analytics', 
      href: '#' 
    }
  ];

  const handleExportLayout = (table: string) => {
    const layouts: Record<string, string[]> = {
      pacientes: ['gestante', 'cpf', 'cns', 'prontuario', 'data_nascimento', 'nome_mae', 'contato', 'email', 'logradouro', 'numero', 'complemento', 'bairro', 'cidade', 'uf'],
      profissionais: ['nome', 'cpf', 'cns', 'cbo', 'unidade_cnes', 'equipe', 'situacao', 'vinculo', 'tipo_vinculo', 'chs'],
      unidades: ['nome_fantasia', 'cnes', 'telefone', 'logradouro', 'numero', 'complemento', 'bairro', 'municipio', 'uf', 'cep'],
      gestacoes: ['sispn', 'cpf_paciente', 'dum', 'dpp', 'data_abertura', 'data_cadastro', 'referencia_tecnica', 'acs', 'equipe', 'gestacao_anterior', 'aborto', 'parto', 'sifilis', 'sifilis_tratada', 'hiv', 'hepatite_b', 'hepatite_c', 'classificacao_pn', 'alto_risco_compartilhado'],
      atendimentos: ['sispn', 'data_consulta', 'trimestre_consulta', 'cpf', 'data_proxima_consulta', 'observacoes_clinicas'],
      desfechos: ['sispn', 'tipo_desfecho', 'data_desfecho'],
      recem_nascidos: ['id_desfecho', 'nome_rn', 'cpf_rn', 'data_nascimento', 'data_consulta_rn', 'comparecimento'],
      exames: ['sispn', 'id_rotina', 'data_realizacao', 'resultado', 'cpf_profissional'],
      operadores: ['nome', 'cpf', 'unidade_cnes', 'status', 'nivel_acesso', 'senha'],
      rotinas: ['tipo', 'trimestre', 'categoria', 'descricao'],
      categorias: ['cbo', 'categoria']
    };

    const columns = layouts[table];
    if (!columns) return;

    const csvContent = columns.join(',') + '\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `layout_${table}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside className={`bg-white dark:bg-slate-900 h-screen w-64 fixed left-0 top-0 overflow-y-auto flex flex-col py-8 px-4 z-50 transition-transform duration-300 shadow-2xl lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-10 px-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-white text-2xl" style={{ fontVariationSettings: '"FILL" 1' }}>health_and_safety</span>
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter">Saúde Maternal</h1>
              <p className="text-[11px] uppercase tracking-widest text-slate-500 dark:text-slate-400 font-bold">Curadoria Clínica</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400 transition-colors"
            title="Recolher Painel"
          >
            <span className="material-symbols-outlined">menu_open</span>
          </button>
        </div>
        <nav className="flex-1 space-y-1">
        {menuItems.map((item) => {
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isExpanded = openMenus.includes(item.name);
          const isParentActive = hasSubItems && item.subItems?.some(sub => pathname === sub.href);
          const isActive = pathname === item.href || isParentActive;

          return (
            <div key={item.name} className="space-y-1">
              {item.href ? (
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-headline text-base font-semibold tracking-tight ${
                    isActive
                      ? 'text-primary border-l-4 border-primary bg-primary/5 translate-x-1'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className={`material-symbols-outlined ${isActive ? 'text-primary' : ''}`}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </Link>
              ) : (
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 font-headline text-base font-semibold tracking-tight ${
                    isActive
                      ? 'text-primary border-l-4 border-primary bg-primary/5'
                      : 'text-slate-600 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${isActive ? 'text-primary' : ''}`}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </span>
                  <span className={`material-symbols-outlined transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
              )}

              {hasSubItems && isExpanded && (
                <div className="ml-9 space-y-1 border-l border-slate-200 dark:border-slate-700">
                  {item.subItems?.map((sub) => {
                    const isSubActive = pathname === sub.href;
                    const isExport = sub.href.startsWith('export:');
                    
                    if (isExport) {
                      return (
                        <button
                          key={sub.name}
                          onClick={() => handleExportLayout(sub.href.split(':')[1])}
                          className="w-full flex items-center gap-3 px-4 py-2 rounded-r-lg transition-all duration-200 font-headline text-sm font-medium tracking-tight text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-primary/5 text-left"
                        >
                          <span className="material-symbols-outlined">download</span>
                          <span>{sub.name}</span>
                        </button>
                      );
                    }

                    return (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        className={`flex items-center gap-3 px-4 py-2 rounded-r-lg transition-all duration-200 font-headline text-sm font-medium tracking-tight ${
                          isSubActive
                            ? 'text-primary bg-primary/5'
                            : 'text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>{sub.name}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto pt-8 border-t border-slate-200 dark:border-slate-700 space-y-1">
        <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 font-headline text-base font-semibold tracking-tight">
          <span className="material-symbols-outlined">help_outline</span>
          <span>Support</span>
        </Link>
        <button 
          onClick={onClose}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-500 dark:text-slate-400 hover:text-primary hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 font-headline text-base font-semibold tracking-tight mt-4"
          title="Recolher Painel"
        >
          <span className="material-symbols-outlined">chevron_left</span>
          <span>Recolher Painel</span>
        </button>
      </div>
    </aside>
  </>
  );
}
