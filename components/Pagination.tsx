import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  itemName: string;
}

const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  itemName
}) => {
  if (totalPages <= 1) return null;

  // Logic to show a limited number of page buttons
  const getPageNumbers = () => {
    const pages = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage < maxVisiblePages - 1) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="p-6 border-t border-outline-variant/5 flex flex-col md:flex-row items-center justify-between bg-surface-container-lowest/50 gap-4">
      <p className="text-[10px] font-black uppercase tracking-widest text-on-surface-variant/40 order-2 md:order-1">
        Mostrando {Math.min(totalItems, (currentPage - 1) * itemsPerPage + 1)} - {Math.min(totalItems, currentPage * itemsPerPage)} de {totalItems} {itemName}
      </p>
      
      <div className="flex items-center gap-2 order-1 md:order-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-6 py-3 rounded-xl bg-[#F1F3F4] text-[#70757A] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#E8EAED] transition-all text-[10px] font-black uppercase tracking-widest"
        >
          Anterior
        </button>
        
        <div className="flex items-center gap-1.5">
          {getPageNumbers().map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-[11px] font-black transition-all ${
                currentPage === pageNum
                  ? 'bg-[#A32E00] text-white shadow-lg shadow-[#A32E00]/30 scale-110 z-10'
                  : 'bg-[#F1F3F4] text-[#70757A] hover:bg-[#E8EAED]'
              }`}
            >
              {pageNum}
            </button>
          ))}
        </div>
        
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-6 py-3 rounded-xl bg-[#F1F3F4] text-[#70757A] disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#E8EAED] transition-all text-[10px] font-black uppercase tracking-widest"
        >
          Próxima
        </button>
      </div>
    </div>
  );
};

export default Pagination;
