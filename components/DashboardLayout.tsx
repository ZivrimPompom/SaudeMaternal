'use client';

import React, { useEffect } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { LucideLoader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = React.useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
    // Inicia aberta no desktop, fechada no mobile
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setIsSidebarOpen(true);
    }
  }, []);

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router, mounted]);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);
  const closeSidebar = () => setIsSidebarOpen(false);

  if (!mounted || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <LucideLoader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body relative">
      <Sidebar isOpen={isSidebarOpen} onClose={closeSidebar} />
      
      <main className={`transition-all duration-300 pt-16 min-h-screen pb-24 overflow-y-auto ${isSidebarOpen ? 'lg:pl-64' : 'pl-0'}`}>
        <div className="p-4 md:p-8">
          {children}
        </div>
      </main>

      <TopBar onToggleSidebar={toggleSidebar} isSidebarOpen={isSidebarOpen} />
      
      {/* Botão para reabrir Sidebar no Desktop quando recolhida */}
      {!isSidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="hidden lg:flex fixed bottom-6 left-6 z-[70] w-10 h-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full items-center justify-center shadow-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-all duration-300 text-slate-600 dark:text-slate-400 hover:text-orange-600"
          title="Expandir Painel"
        >
          <span className="material-symbols-outlined">chevron_right</span>
        </button>
      )}
    </div>
  );
}
