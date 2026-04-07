'use client';

import React from 'react';
import { useSearch } from '@/context/SearchContext';

export default function SearchInput({ 
  className = "", 
  placeholder = "Digite Nome ou CPF ou SISPN" 
}: { 
  className?: string;
  placeholder?: string;
}) {
  const { searchQuery, setSearchQuery } = useSearch();

  return (
    <div className={`relative flex-1 min-w-0 ${className}`}>
      <span className="material-symbols-outlined absolute left-3 md:left-4 top-1/2 -translate-y-1/2 text-primary/40 z-10">search</span>
      <input 
        type="text"
        placeholder={placeholder}
        className="w-full pl-10 md:pl-12 pr-4 md:pr-12 py-3 md:py-4 bg-white dark:bg-surface-container-low border-2 border-transparent focus:border-primary/30 rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-wider transition-all outline-none placeholder:text-on-surface-variant/30 dark:placeholder:text-on-surface-variant/50"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchQuery && (
        <button 
          onClick={() => setSearchQuery('')}
          className="absolute right-3 md:right-4 top-1/2 -translate-y-1/2 w-6 h-6 md:w-8 md:h-8 flex items-center justify-center rounded-lg md:rounded-xl hover:bg-primary/5 text-primary/40 hover:text-primary transition-all group"
        >
          <span className="material-symbols-outlined text-base md:text-xl font-bold group-active:scale-90 transition-transform">close</span>
        </button>
      )}
    </div>
  );
}
