'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Users, 
  Heart, 
  Stethoscope, 
  TestTube, 
  Baby, 
  Building2, 
  Briefcase, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight,
  ShieldCheck,
  UserCircle
} from 'lucide-react';

const menuItems = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard, color: 'text-primary' },
  { name: 'Pacientes', path: '/pacientes', icon: Users, color: 'text-primary' },
  { name: 'Gestações', path: '/gestacoes', icon: Heart, color: 'text-primary' },
  { name: 'Consultas', path: '/consultas', icon: Stethoscope, color: 'text-primary' },
  { name: 'Exames', path: '/exames', icon: TestTube, color: 'text-primary' },
  { name: 'Desfechos', path: '/desfechos', icon: Baby, color: 'text-primary' },
];

const configItems = [
  { name: 'Unidades', path: '/unidades', icon: Building2, color: 'text-on-surface-variant' },
  { name: 'Categorias', path: '/categorias', icon: Briefcase, color: 'text-on-surface-variant' },
  { name: 'Operadores', path: '/operadores', icon: ShieldCheck, color: 'text-on-surface-variant', adminOnly: true },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const isAdmin = user?.perfil === 'ADMINISTRADOR';

  const NavLink = ({ item }: { item: any }) => {
    const isActive = pathname === item.path;
    if (item.adminOnly && !isAdmin) return null;

    return (
      <Link 
        href={item.path}
        onClick={() => setIsOpen(false)}
        className={`group flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-300 relative overflow-hidden ${
          isActive 
            ? 'bg-primary text-white shadow-xl shadow-primary/20 scale-[1.02]' 
            : 'hover:bg-surface-container-low text-on-surface-variant hover:text-primary hover:translate-x-1'
        }`}
      >
        {isActive && (
          <motion.div 
            layoutId="sidebar-active"
            className="absolute inset-0 bg-primary"
            transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
          />
        )}
        <item.icon className={`w-5 h-5 relative z-10 ${isActive ? 'text-white' : item.color} group-hover:scale-110 transition-transform`} />
        <span className={`text-[11px] font-black uppercase tracking-[0.2em] relative z-10 ${isActive ? 'text-white' : ''}`}>
          {item.name}
        </span>
        {isActive && (
          <ChevronRight className="w-4 h-4 ml-auto relative z-10 text-white/50" />
        )}
      </Link>
    );
  };

  return (
    <>
      {/* Mobile Menu Toggle */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-[60] w-12 h-12 bg-white rounded-2xl shadow-xl border border-outline-variant/10 flex items-center justify-center text-primary active:scale-90 transition-transform"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar Container */}
      <AnimatePresence mode="wait">
        {(isOpen || (typeof window !== 'undefined' && window.innerWidth >= 1024)) && (
          <motion.aside 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -300, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={`fixed top-0 left-0 h-screen w-72 bg-surface-container-lowest border-r border-outline-variant/10 z-50 flex flex-col p-6 lg:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
          >
            {/* Logo Section */}
            <div className="mb-10 px-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-primary rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
                  <Heart className="text-white w-6 h-6" fill="currentColor" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-primary uppercase tracking-tighter leading-none">Mãe</h1>
                  <p className="text-[10px] font-black text-on-surface-variant uppercase tracking-[0.3em] leading-none">Paulistana</p>
                </div>
              </div>
              <div className="h-1 w-12 bg-primary/10 rounded-full mt-4" />
            </div>

            {/* Navigation Sections */}
            <div className="flex-1 space-y-10 overflow-y-auto scrollbar-none pb-8">
              <div className="space-y-2">
                <p className="px-6 text-[9px] font-black text-on-surface-variant/30 uppercase tracking-[0.4em] mb-4">Menu Principal</p>
                {menuItems.map((item) => <NavLink key={item.path} item={item} />)}
              </div>

              <div className="space-y-2">
                <p className="px-6 text-[9px] font-black text-on-surface-variant/30 uppercase tracking-[0.4em] mb-4">Configurações</p>
                {configItems.map((item) => <NavLink key={item.path} item={item} />)}
              </div>
            </div>

            {/* User Profile & Logout Section */}
            <div className="mt-auto pt-6 border-t border-outline-variant/10">
              <div className="bg-surface-container-low rounded-[2.5rem] p-4 mb-4 flex items-center gap-4 group">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
                  <UserCircle className="text-primary w-7 h-7 group-hover:text-white transition-colors" />
                </div>
                <div className="flex-1 overflow-hidden">
                  <p className="text-[11px] font-black text-on-surface uppercase truncate tracking-tight">{user?.nome || 'Usuário'}</p>
                  <p className="text-[9px] font-bold text-on-surface-variant/50 uppercase truncate tracking-widest">{user?.perfil || 'Perfil'}</p>
                </div>
              </div>

              <button 
                onClick={signOut}
                className="w-full flex items-center gap-4 px-6 py-4 rounded-3xl text-red-500 hover:bg-red-50 transition-all group"
              >
                <LogOut className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                <span className="text-[11px] font-black uppercase tracking-[0.3em]">Sair do Sistema</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Mobile Overlay */}
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
        />
      )}
    </>
  );
}
