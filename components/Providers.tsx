'use client';

import { SearchProvider } from '@/context/SearchContext';
import { ReactNode } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <SearchProvider>
      {children}
    </SearchProvider>
  );
}
