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

  React.useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router, mounted]);

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
    <div className="bg-surface text-on-surface min-h-screen font-body">
      <Sidebar />
      <TopBar />
      <main className="pl-64 pt-16 min-h-screen pb-24 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
