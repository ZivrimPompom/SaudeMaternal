'use client';

import { SearchProvider } from '@/context/SearchContext';
import { AuthProvider } from '@/context/AuthContext';
import { ThemeProvider } from '@/context/ThemeContext';
import React, { ReactNode, useState, useEffect } from 'react';

export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <AuthProvider>
        <SearchProvider>
          {children}
        </SearchProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
