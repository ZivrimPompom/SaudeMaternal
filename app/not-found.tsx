'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

export default function NotFound() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-8">
          <span className="material-symbols-outlined text-primary text-5xl">error_outline</span>
        </div>
        <h1 className="text-4xl font-black font-headline text-on-surface tracking-tighter">404</h1>
        <h2 className="text-xl font-bold font-headline text-on-surface-variant">Página não encontrada</h2>
        <p className="text-sm text-on-surface-variant/60 font-body">
          A página que você está procurando não existe ou foi movida.
        </p>
        <Link 
          href="/"
          className="inline-flex items-center gap-2 bg-primary text-white px-8 py-4 rounded-2xl font-black font-headline uppercase tracking-widest text-xs shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <span className="material-symbols-outlined text-sm">home</span>
          Voltar para o Início
        </Link>
      </div>
    </div>
  );
}
