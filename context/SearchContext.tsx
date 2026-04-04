'use client';

import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { usePathname } from 'next/navigation';

interface SearchContextType {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  isFormOpen: boolean;
  setIsFormOpen: (isOpen: boolean) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
  onExportCSV: (() => void) | null;
  setOnExportCSV: (fn: (() => void) | null) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [onExportCSV, setOnExportCSV] = useState<(() => void) | null>(null);
  const pathname = usePathname();

  // Limpa a busca ao trocar de tela
  useEffect(() => {
    setSearchQuery('');
    setIsFormOpen(false);
  }, [pathname]);

  const triggerRefresh = () => setRefreshTrigger(prev => prev + 1);

  return (
    <SearchContext.Provider value={{ 
      searchQuery, 
      setSearchQuery, 
      isFormOpen, 
      setIsFormOpen,
      refreshTrigger,
      triggerRefresh,
      onExportCSV,
      setOnExportCSV
    }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
}
