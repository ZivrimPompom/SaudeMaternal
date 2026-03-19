'use client';

import React from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import Link from 'next/link';

export default function Page() {
  return (
    <DashboardLayout>
      <div className="p-12 max-w-7xl mx-auto space-y-12">
        <header className="space-y-2">
          <h2 className="text-5xl font-extrabold tracking-tight font-headline text-on-surface">Menu Inicial</h2>
          <p className="text-lg text-on-secondary-container font-body opacity-70">Bem-vindo ao sistema Saúde Maternal</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Link href="/operadores" className="bg-surface-container-lowest p-8 rounded-xl shadow-sm border border-outline-variant/15 hover:border-primary transition-colors group">
            <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary transition-colors">
              <span className="material-symbols-outlined text-primary group-hover:text-white">person_add</span>
            </div>
            <h3 className="text-xl font-bold font-headline mb-2">Operadores</h3>
            <p className="text-sm text-slate-500 font-body">Gerencie os perfis de acesso e operadores do sistema.</p>
          </Link>
          
          {/* Outros botões podem ser adicionados aqui conforme o código que você enviar */}
        </div>
      </div>
    </DashboardLayout>
  );
}
