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
    <div className={`relative flex-1 min-w-[200px] ${className}`}>
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <span className="material-symbols-outlined w-4 h-4 text-on-surface-variant/40">search</span>
      </div>
      <input 
        type="text"
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2.5 text-sm bg-surface-container-lowest border border-outline-variant/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      />
      {searchQuery && (
        <button 
          onClick={() => setSearchQuery('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-lg hover:bg-primary/5 text-on-surface-variant/40 hover:text-primary transition-all group"
        >
          <span className="material-symbols-outlined text-base font-bold group-active:scale-90 transition-transform">close</span>
        </button>
      )}
    </div>
  );
}
