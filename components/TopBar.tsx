'use client';

import React from 'react';
import Image from 'next/image';
import { useSearch } from '@/context/SearchContext';
import { usePathname } from 'next/navigation';

export default function TopBar() {
  const { searchQuery, setSearchQuery } = useSearch();
  const pathname = usePathname();
  const isHomePage = pathname === '/';

  return (
    <header className="fixed top-0 right-0 w-[calc(100%-16rem)] h-16 z-40 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800/50 flex justify-between items-center px-8">
      <div className="flex items-center gap-4">
        {!isHomePage && (
          <>
            <span className="text-lg font-black text-orange-600 dark:text-orange-500 font-headline">Nome ou CPF</span>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 mx-2"></div>
            <div className="flex items-center bg-surface-container rounded-full px-4 py-1.5 gap-2 w-64">
              <span className="material-symbols-outlined text-slate-400 text-sm">search</span>
              <input 
                className="bg-transparent border-none text-sm focus:ring-0 placeholder-slate-400 w-full font-body" 
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
          <button className="material-symbols-outlined text-slate-600 dark:text-slate-400 hover:text-orange-600 transition-colors">notifications</button>
          <button className="material-symbols-outlined text-slate-600 dark:text-slate-400 hover:text-orange-600 transition-colors">apps</button>
        </div>
        <div className="flex items-center gap-3">
          <Image 
            className="w-8 h-8 rounded-full object-cover" 
            src="https://lh3.googleusercontent.com/aida-public/AB6AXuBuK0dD07Bb098IzkuaKkpyjh4zYD_cz-seHFyT0G6q39GfNBN9eiY9SHQ9QAZjTx7q5YEL85x_5S2weSUgaTn2Y29pTByi1TkwF1QzQpCGjSO1KH9050hhbq7rFlJP9UnB787iuTr29ZATubzS3IhF9q8JC3pe_WS1BVmYm1-qLCo5jgmGaWjiIwQ2NLCN7eD4TWRuZBYroF8_UOXpV1MhoJBy1nx3fjwRMp0oIUMHc6tKCxPe1VoIZSjikiLQvSkI9CBFhTZnsSyR" 
            alt="Administrador"
            width={32}
            height={32}
            referrerPolicy="no-referrer"
          />
          <div className="hidden lg:block">
            <p className="text-xs font-bold leading-none mb-1">Administrador</p>
            <p className="text-[10px] text-slate-500 leading-none">Administrator</p>
          </div>
        </div>
      </div>
    </header>
  );
}
