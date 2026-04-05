'use client';

import React from 'react';
import { motion } from 'motion/react';
import { Database, Filter } from 'lucide-react';

interface RecordsSummaryProps {
  total: number;
  filtered: number;
  className?: string;
}

export default function RecordsSummary({ total, filtered, className = '' }: RecordsSummaryProps) {
  const isFiltered = filtered < total;

  return (
    <div className={`flex items-center gap-3 bg-surface-container-low p-1.5 rounded-[2rem] border border-outline-variant/5 shadow-inner ${className}`}>
      {/* Total Badge */}
      <div className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-white shadow-sm border border-outline-variant/5 group transition-all hover:scale-105">
        <div className="w-6 h-6 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary transition-colors">
          <Database className="text-primary w-3.5 h-3.5 group-hover:text-white transition-colors" />
        </div>
        <div className="flex flex-col">
          <span className="text-[10px] font-black text-on-surface uppercase tracking-tight leading-none">{total}</span>
          <span className="text-[8px] font-bold text-on-surface-variant/40 uppercase tracking-widest leading-none mt-0.5">Total</span>
        </div>
      </div>

      {/* Filtered Badge */}
      {isFiltered && (
        <motion.div 
          initial={{ opacity: 0, x: -10, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          className="flex items-center gap-3 px-6 py-2.5 rounded-full bg-primary/5 border border-primary/10 group transition-all hover:scale-105"
        >
          <div className="w-6 h-6 rounded-xl bg-primary/20 flex items-center justify-center group-hover:bg-primary transition-colors">
            <Filter className="text-primary w-3.5 h-3.5 group-hover:text-white transition-colors" />
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-primary uppercase tracking-tight leading-none">{filtered}</span>
            <span className="text-[8px] font-bold text-primary/40 uppercase tracking-widest leading-none mt-0.5">Filtrados</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
