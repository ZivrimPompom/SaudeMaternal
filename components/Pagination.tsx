'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { motion } from 'motion/react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  itemName?: string;
}

export default function Pagination({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  totalItems, 
  itemsPerPage,
  itemName = 'registros'
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="p-6 md:p-10 border-t border-outline-variant/5 flex flex-col md:flex-row justify-between items-center gap-6 bg-surface-container-low/30 backdrop-blur-sm">
      {/* Items Info */}
      <div className="flex items-center gap-4">
        <div className="w-1.5 h-6 bg-primary/20 rounded-full" />
        <p className="text-[10px] font-black text-on-surface-variant/40 uppercase tracking-[0.3em]">
          Mostrando <span className="text-on-surface font-black">{startItem} - {endItem}</span> de <span className="text-on-surface font-black">{totalItems}</span> {itemName}
        </p>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center gap-2">
        <button 
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-10 h-10 rounded-2xl bg-white border border-outline-variant/10 flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-on-surface-variant transition-all shadow-sm active:scale-90 group"
        >
          <ChevronLeft className="w-5 h-5 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <div className="flex items-center gap-1.5 mx-2">
          {getPageNumbers().map((page, index) => (
            <React.Fragment key={index}>
              {page === '...' ? (
                <div className="w-10 h-10 flex items-center justify-center text-on-surface-variant/30">
                  <MoreHorizontal className="w-4 h-4" />
                </div>
              ) : (
                <button 
                  onClick={() => onPageChange(Number(page))}
                  className={`w-10 h-10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-sm active:scale-90 ${
                    currentPage === page 
                      ? 'bg-primary text-white shadow-primary/20 scale-110' 
                      : 'bg-white border border-outline-variant/10 text-on-surface-variant hover:bg-surface-container-low'
                  }`}
                >
                  {page}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        <button 
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-10 h-10 rounded-2xl bg-white border border-outline-variant/10 flex items-center justify-center text-on-surface-variant hover:bg-primary hover:text-white disabled:opacity-30 disabled:hover:bg-white disabled:hover:text-on-surface-variant transition-all shadow-sm active:scale-90 group"
        >
          <ChevronRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </div>
  );
}
