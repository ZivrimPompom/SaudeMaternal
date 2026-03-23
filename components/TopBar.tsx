'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useSearch } from '@/context/SearchContext';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { LucideLogOut, LucideUser, LucideChevronDown } from 'lucide-react';

export default function TopBar({ onToggleSidebar, isSidebarOpen }: { onToggleSidebar: () => void; isSidebarOpen: boolean }) {
  const { searchQuery, setSearchQuery } = useSearch();
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const isHomePage = pathname === '/';
  const isCategoriesPage = pathname === '/categorias';
  const isProfessionalsPage = pathname === '/profissionais';
  const isOperatorsPage = pathname === '/operadores';
  const isRotinasPage = pathname === '/rotinas';
  const isPacientesPage = pathname === '/pacientes';
  const isUnidadesPage = pathname === '/unidades';
  
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const getSearchLabel = () => {
    if (isCategoriesPage) return 'Categorias Profissionais';
    if (isProfessionalsPage) return 'Profissionais';
    if (isOperatorsPage) return 'Operadores';
    if (isRotinasPage) return 'Rotinas';
    if (isPacientesPage) return 'Pacientes';
    if (isUnidadesPage) return 'Unidades de Saúde';
    return 'Busca';
  };

  const getSearchPlaceholder = () => {
    if (isCategoriesPage) return 'CBO ou Categoria...';
    if (isProfessionalsPage) return 'Nome, CPF ou CNS...';
    if (isOperatorsPage) return 'Nome ou CPF...';
    if (isRotinasPage) return 'Descrição ou Tipo...';
    if (isPacientesPage) return 'Nome ou CPF...';
    if (isUnidadesPage) return 'CNES ou Nome...';
    return 'Pesquisar...';
  };

  const userName = user?.nome || 'Usuário';
  const userRole = user?.nivel_acesso || 'Operador';
  const userInitials = user?.sigla || userName.substring(0, 2).toUpperCase();

  return (
    <header className={`fixed top-0 right-0 h-16 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center px-4 md:px-8 transition-all duration-300 ${isSidebarOpen ? 'w-full lg:w-[calc(100%-16rem)]' : 'w-full'}`}>
      <div className="flex items-center gap-2 md:gap-4">
        <button 
          onClick={onToggleSidebar}
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors"
          title={isSidebarOpen ? 'Recolher Menu' : 'Expandir Menu'}
        >
          <span className="material-symbols-outlined">{isSidebarOpen ? 'menu_open' : 'menu'}</span>
        </button>

        <Link 
          href="/"
          className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 transition-colors flex items-center gap-2"
          title="Ir para Home"
        >
          <span className="material-symbols-outlined">home</span>
          <span className="hidden sm:inline text-sm font-semibold">Home</span>
        </Link>
        
        {!isHomePage && (
          <>
            <span className="hidden sm:block text-lg font-black text-primary dark:text-primary-container font-headline">{getSearchLabel()}</span>
            <div className="hidden sm:block h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
            <div className="flex items-center bg-surface-container rounded-full px-4 py-1.5 gap-2 w-40 md:w-64">
              <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
              <input 
                className="bg-transparent border-none text-sm focus:ring-0 placeholder-slate-400 w-full font-body" 
                placeholder={getSearchPlaceholder()} 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </>
        )}
      </div>
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <button className="material-symbols-outlined text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">notifications</button>
          <button className="material-symbols-outlined text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">apps</button>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-3 hover:bg-slate-50 p-1.5 rounded-xl transition-colors"
          >
            <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
              {userInitials}
            </span>
            <span className="hidden lg:block text-left">
              <span className="block text-xs font-bold leading-none mb-1 capitalize">{userName}</span>
              <span className="block text-[10px] text-slate-500 leading-none truncate max-w-[120px]">{userRole}</span>
            </span>
            <LucideChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isProfileOpen ? 'rotate-180' : ''}`} />
          </button>

          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-100 dark:border-slate-800 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-800 mb-1">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">{userName}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{user?.cpf}</p>
              </div>
              <button 
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LucideLogOut className="w-4 h-4" />
                <span>Sair do Sistema</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
