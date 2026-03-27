'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

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
  const [openMenus, setOpenMenus] = useState<string[]>([]);

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
        { name: 'Operadores', href: '/operadores' },
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
      ]
    },
    { name: 'Dashboards', icon: 'dashboard', href: '#' },
    { name: 'Relatórios', icon: 'analytics', href: '#' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={`fixed inset-0 bg-black/50 z-40 lg:hidden transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={onClose}
      />

      <aside className={`bg-slate-100 dark:bg-slate-900 h-screen w-64 fixed left-0 top-0 overflow-y-auto flex flex-col py-8 px-4 z-50 transition-transform duration-300 shadow-2xl lg:shadow-none ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="mb-10 px-2 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary-container flex items-center justify-center">
              <span className="material-symbols-outlined text-white" style={{ fontVariationSettings: '"FILL" 1' }}>health_and_safety</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tighter">Saúde Maternal</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Curadoria Clínica</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-500 transition-colors"
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
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 font-headline text-sm font-semibold tracking-tight ${
                    isActive
                      ? 'text-slate-900 dark:text-white border-l-4 border-primary bg-white/50 dark:bg-white/10 translate-x-1'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className={`material-symbols-outlined ${isActive ? 'text-primary dark:text-primary-container' : ''}`}>
                    {item.icon}
                  </span>
                  <span>{item.name}</span>
                </Link>
              ) : (
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all duration-200 font-headline text-sm font-semibold tracking-tight ${
                    isActive
                      ? 'text-slate-900 dark:text-white border-l-4 border-primary bg-white/50 dark:bg-white/10'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50'
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span className={`material-symbols-outlined ${isActive ? 'text-primary dark:text-primary-container' : ''}`}>
                      {item.icon}
                    </span>
                    <span>{item.name}</span>
                  </span>
                  <span className={`material-symbols-outlined text-xs transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                    expand_more
                  </span>
                </button>
              )}

              {hasSubItems && isExpanded && (
                <div className="ml-9 space-y-1 border-l border-slate-200 dark:border-slate-800">
                  {item.subItems?.map((sub) => {
                    const isSubActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        className={`flex items-center gap-3 px-4 py-2 rounded-r-lg transition-all duration-200 font-headline text-xs font-medium tracking-tight ${
                          isSubActive
                            ? 'text-primary dark:text-primary-container bg-primary/5 dark:bg-primary/10'
                            : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/30'
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
      <div className="mt-auto pt-8 border-t border-slate-200/50 dark:border-slate-800 space-y-1">
        <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors duration-200 font-headline text-sm font-semibold tracking-tight">
          <span className="material-symbols-outlined">settings</span>
          <span>Settings</span>
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors duration-200 font-headline text-sm font-semibold tracking-tight">
          <span className="material-symbols-outlined">help_outline</span>
          <span>Support</span>
        </Link>
        <button 
          onClick={onClose}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-slate-500 dark:text-slate-400 hover:text-primary dark:hover:text-primary-container hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors duration-200 font-headline text-sm font-semibold tracking-tight mt-4"
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
