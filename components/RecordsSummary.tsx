'use client';

import React from 'react';

interface RecordsSummaryProps {
  total: number;
  filtered: number;
  itemName?: string;
  className?: string;
}

export default function RecordsSummary({ 
  total, 
  filtered, 
  itemName = 'Registros',
  className = '' 
}: RecordsSummaryProps) {
  return (
    <div className={`flex items-center gap-3 bg-surface-container-low px-4 py-2 rounded-2xl border border-outline-variant/10 shadow-sm ${className}`}>
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <span className="material-symbols-outlined text-primary text-xl" style={{ fontVariationSettings: '"FILL" 1' }}>
          assignment_ind
        </span>
      </div>
      <div className="flex flex-col">
        <div className="flex items-baseline gap-1">
          <span className="text-sm font-black text-on-surface tracking-tight">{total}</span>
          <span className="text-[10px] font-bold text-on-surface-variant/60 uppercase tracking-widest leading-none">
            {itemName}
          </span>
        </div>
        <div className="flex items-baseline gap-1">
          <span className="text-xs font-black text-primary tracking-tight">{filtered}</span>
          <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest leading-none">Filtrados</span>
        </div>
      </div>
    </div>
  );
}
