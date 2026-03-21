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
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-20 z-40 bg-surface-container-lowest/80 backdrop-blur-2xl border-b border-outline-variant/10 flex justify-between items-center px-10">
      <div className="flex items-center gap-6">
        {!isHomePage && (
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em] leading-none mb-1">Busca Rápida</span>
              <span className="text-lg font-bold text-on-surface font-headline leading-none">Operadores</span>
            </div>
            <div className="h-8 w-px bg-outline-variant/20 mx-2"></div>
            <div className="flex items-center bg-surface-container-low rounded-2xl px-5 py-2.5 gap-3 w-80 border border-transparent focus-within:border-primary/20 focus-within:bg-white focus-within:ring-4 focus-within:ring-primary/5 transition-all group">
              <Search className="text-on-surface-variant/40 group-focus-within:text-primary w-4 h-4 transition-colors" />
              <input 
                className="bg-transparent border-none text-sm focus:ring-0 placeholder-on-surface-variant/30 w-full font-body outline-none" 
                placeholder="Pesquisar por nome ou CPF..." 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <button className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant/60 hover:text-primary hover:bg-primary/5 transition-all relative group">
            <Bell className="w-5 h-5 group-hover:rotate-12 transition-transform" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full border-2 border-surface-container-lowest"></span>
          </button>
          <button className="w-10 h-10 rounded-xl flex items-center justify-center text-on-surface-variant/60 hover:text-primary hover:bg-primary/5 transition-all group">
            <LayoutGrid className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
        <div className="flex items-center gap-4 border-l border-outline-variant/10 pl-8">
          <div className="flex flex-col items-end hidden lg:flex">
            <p className="text-sm font-bold text-on-surface font-headline leading-none mb-1">{operator.name}</p>
            <p className="text-[10px] text-primary font-black uppercase tracking-widest leading-none">Acesso Master</p>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-primary-container flex items-center justify-center text-white font-black text-sm shadow-lg shadow-primary/20 border-2 border-white/20">
            {operator.initials || operator.name.substring(0, 2).toUpperCase()}
          </div>
          <button 
            onClick={logout}
            className="p-2.5 rounded-xl hover:bg-error/10 text-on-surface-variant/40 hover:text-error transition-all group"
            title="Sair do Sistema"
          >
            <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          </button>
        </div>
      </div>
    </header>
  );
}
