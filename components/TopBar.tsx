'use client';

import React from 'react';
import Image from 'next/image';
import { useSearch } from '@/context/SearchContext';
import { useAuth } from '@/context/AuthContext';
import { usePathname } from 'next/navigation';
import { LogOut, Bell, LayoutGrid, Search } from 'lucide-react';

export default function TopBar() {
  const { searchQuery, setSearchQuery } = useSearch();
  const { operator, logout } = useAuth();
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  if (!operator) return null;

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center px-8">
      <div className="flex items-center gap-4">
        {!isHomePage && (
          <>
            <span className="text-lg font-black text-primary font-headline">Nome ou CPF</span>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
            <div className="flex items-center bg-surface-container rounded-full px-4 py-1.5 gap-2 w-64">
              <Search className="text-slate-400 w-4 h-4" />
              <input 
                className="bg-transparent border-none text-sm focus:ring-0 placeholder-slate-400 w-full font-body outline-none" 
                placeholder="Nome ou CPF..." 
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
          <button className="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
            <Bell className="w-5 h-5" />
          </button>
          <button className="text-slate-600 dark:text-slate-400 hover:text-primary transition-colors">
            <LayoutGrid className="w-5 h-5" />
          </button>
        </div>
        <div className="flex items-center gap-3 border-l border-slate-100 dark:border-slate-800 pl-6">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
            {operator.initials || operator.name.substring(0, 2).toUpperCase()}
          </div>
          <div className="hidden lg:block">
            <p className="text-xs font-bold leading-none mb-1">{operator.name}</p>
            <p className="text-[10px] text-slate-500 leading-none">Operador</p>
          </div>
          <button 
            onClick={logout}
            className="ml-2 p-2 rounded-lg hover:bg-error/10 text-slate-400 hover:text-error transition-all"
            title="Sair"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
