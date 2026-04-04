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
    <div className={`relative flex-1 ${className}`}>
      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-primary/30">search</span>
      <input 
        type="text"
        placeholder={placeholder}
        className="w-full pl-12 pr-12 py-4 bg-surface-container-low border-2 border-transparent focus:border-primary/20 rounded-2xl text-xs font-black uppercase tracking-widest transition-all shadow-inner outline-none placeholder:text-on-surface-variant/20"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchQuery && (
        <button 
          onClick={() => setSearchQuery('')}
          className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-primary/5 text-primary/40 hover:text-primary transition-all group"
        >
          <span className="material-symbols-outlined text-xl font-bold group-active:scale-90 transition-transform">close</span>
        </button>
      )}
    </div>
  );
}
