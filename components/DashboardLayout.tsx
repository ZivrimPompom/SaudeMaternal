'use client';

import React from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'motion/react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function DashboardLayout({ children, title }: DashboardLayoutProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  React.useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-container-lowest flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full"></div>
          <p className="text-xs font-black uppercase tracking-[0.4em] text-primary/40 animate-pulse">Iniciando Sistema</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-surface-container-lowest font-body selection:bg-primary/10 selection:text-primary">
      <Sidebar />
      <div className="lg:ml-72 min-h-screen flex flex-col">
        <Topbar title={title} />
        <motion.main 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="flex-1 p-4 md:p-8 lg:p-10"
        >
          {children}
        </motion.main>
        
        <footer className="p-8 text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-on-surface-variant/20">
            &copy; {new Date().getFullYear()} MÃE PAULISTANA &bull; SISTEMA DE GESTÃO E MONITORAMENTO
          </p>
        </footer>
      </div>
    </div>
  );
}
