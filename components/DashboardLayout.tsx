'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import { useAuth } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoading, operator } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-primary animate-spin" />
      </div>
    );
  }

  if (!operator) {
    return <>{children}</>;
  }

  return (
    <div className="bg-surface text-on-surface min-h-screen font-body">
      <Sidebar />
      <TopBar />
      <main className="pl-64 pt-20 min-h-screen">
        {children}
      </main>
    </div>
  );
}
