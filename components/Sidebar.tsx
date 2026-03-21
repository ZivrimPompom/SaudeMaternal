'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { 
  Home, 
  UserPlus, 
  Repeat, 
  LayoutDashboard, 
  BarChart3, 
  ChevronDown, 
  Settings, 
  HelpCircle,
  ShieldCheck
} from 'lucide-react';

interface SubItem {
  name: string;
  href: string;
}

interface MenuItem {
  name: string;
  icon: React.ElementType;
  href?: string;
  subItems?: SubItem[];
}

export default function Sidebar() {
  const pathname = usePathname();
  const { operator } = useAuth();
  const [openMenus, setOpenMenus] = useState<string[]>(['Cadastros']);

  if (!operator) return null;

  const toggleMenu = (name: string) => {
    setOpenMenus((prev) =>
      prev.includes(name) ? prev.filter((item) => item !== name) : [...prev, name]
    );
  };

  const menuItems: MenuItem[] = [
    { name: 'Home', icon: Home, href: '/' },
    {
      name: 'Cadastros',
      icon: UserPlus,
      subItems: [
        { name: 'Operadores', href: '/operadores' },
      ],
    },
    { name: 'Movimento', icon: Repeat, href: '#' },
    { name: 'Dashboards', icon: LayoutDashboard, href: '#' },
    { name: 'Relatórios', icon: BarChart3, href: '#' },
  ];

  return (
    <aside className="bg-surface-container-lowest/80 backdrop-blur-2xl h-screen w-64 fixed left-0 top-0 overflow-y-auto flex flex-col py-8 px-4 z-50 border-r border-outline-variant/10 shadow-2xl shadow-black/5">
      <div className="mb-12 px-3 flex items-center gap-4 group cursor-pointer">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform duration-500">
          <ShieldCheck className="text-white w-7 h-7" />
        </div>
        <div>
          <h1 className="text-xl font-black text-on-surface tracking-tight font-headline leading-none">Saúde Maternal</h1>
          <p className="text-[9px] uppercase tracking-[0.2em] text-primary font-black mt-1">Curadoria Clínica</p>
        </div>
      </div>
      <nav className="flex-1 space-y-2">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const hasSubItems = item.subItems && item.subItems.length > 0;
          const isOpen = openMenus.includes(item.name);
          const isParentActive = hasSubItems && item.subItems?.some(sub => pathname === sub.href);
          const isActive = pathname === item.href || isParentActive;

          return (
            <div key={item.name} className="space-y-1">
              {item.href ? (
                <Link
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 font-headline text-sm font-bold tracking-tight group ${
                    isActive
                      ? 'text-primary bg-primary/5 shadow-inner'
                      : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container-high/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-primary' : 'text-on-surface-variant/40'}`} />
                    <span>{item.name}</span>
                  </div>
                  {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary shadow-sm shadow-primary/50"></div>}
                </Link>
              ) : (
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl transition-all duration-300 font-headline text-sm font-bold tracking-tight group ${
                    isActive
                      ? 'text-primary bg-primary/5'
                      : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container-high/50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-primary' : 'text-on-surface-variant/40'}`} />
                    <span>{item.name}</span>
                  </div>
                  <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isOpen ? 'rotate-180 text-primary' : 'text-on-surface-variant/30'}`} />
                </button>
              )}

              {hasSubItems && isOpen && (
                <div className="ml-6 pl-4 space-y-1 border-l-2 border-surface-container-high animate-in slide-in-from-left-2 duration-300">
                  {item.subItems?.map((sub) => {
                    const isSubActive = pathname === sub.href;
                    return (
                      <Link
                        key={sub.name}
                        href={sub.href}
                        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all duration-200 font-headline text-xs font-bold tracking-tight ${
                          isSubActive
                            ? 'text-primary bg-primary/5'
                            : 'text-on-surface-variant/50 hover:text-on-surface hover:bg-surface-container-high/30'
                        }`}
                      >
                        <span>{sub.name}</span>
                        {isSubActive && <div className="w-1 h-1 rounded-full bg-primary/50"></div>}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
      <div className="mt-auto pt-8 border-t border-outline-variant/10 space-y-2">
        <Link href="#" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container-high/50 transition-all duration-300 font-headline text-sm font-bold tracking-tight group">
          <Settings className="w-5 h-5 text-on-surface-variant/40 group-hover:rotate-45 transition-transform" />
          <span>Configurações</span>
        </Link>
        <Link href="#" className="flex items-center gap-3 px-4 py-3.5 rounded-2xl text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container-high/50 transition-all duration-300 font-headline text-sm font-bold tracking-tight group">
          <HelpCircle className="w-5 h-5 text-on-surface-variant/40 group-hover:scale-110 transition-transform" />
          <span>Suporte</span>
        </Link>
      </div>
    </aside>
  );
}
