'use client';

import React from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-surface text-on-surface min-h-screen font-body">
      <Sidebar />
      <TopBar />
      <main className="pl-64 pt-16 min-h-screen">
        {children}
      </main>
    </div>
  );
}
