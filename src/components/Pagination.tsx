// ========================================
// COMPONENTE DE PAGINACIÓN
// ========================================

import { getPageNumbers, getItemRange, type PaginationInfo } from '../utils/pagination';

interface PaginationProps {
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
  className?: string;
}

export function Pagination({ pagination, onPageChange, className = '' }: PaginationProps) {
  const { page, totalPages, hasNext, hasPrevious } = pagination;
  const pageNumbers = getPageNumbers(page, totalPages);
  const itemRange = getItemRange(pagination);
  
  if (totalPages <= 1) return null;
  
  return (
    <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${className}`}>
      {/* Info de items */}
      <div className="text-sm" style={{ color: 'var(--sv-texto-secundario)' }}>
        Mostrando <span className="font-semibold">{itemRange}</span>
      </div>
      
      {/* Controles de paginación */}
      <div className="flex items-center gap-2">
        {/* Botón anterior */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevious}
          className="px-3 py-2 rounded-lg font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            backgroundColor: hasPrevious ? 'var(--sv-primario)' : 'var(--sv-superficie)',
            color: hasPrevious ? 'white' : 'var(--sv-texto-muted)',
            border: `2px solid ${hasPrevious ? 'var(--sv-primario)' : 'var(--sv-borde)'}`,
          }}
          aria-label="Página anterior"
        >
          ← Anterior
        </button>
        
        {/* Números de página */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((pageNum, index) => {
            if (pageNum === 'ellipsis') {
              return (
                <span
                  key={`ellipsis-${index}`}
                  className="px-3 py-2"
                  style={{ color: 'var(--sv-texto-muted)' }}
                >
                  ...
                </span>
              );
            }
            
            const isActive = pageNum === page;
            
            return (
              <button
                key={pageNum}
                onClick={() => onPageChange(pageNum)}
                className="px-3 py-2 rounded-lg font-semibold transition-all min-w-[44px]"
                style={{
                  backgroundColor: isActive ? 'var(--sv-primario)' : 'var(--sv-superficie)',
                  color: isActive ? 'white' : 'var(--sv-texto)',
                  border: `2px solid ${isActive ? 'var(--sv-primario)' : 'var(--sv-borde)'}`,
                }}
                aria-label={`Página ${pageNum}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>
        
        {/* Indicador de página en móvil */}
        <div className="sm:hidden px-4 py-2 rounded-lg" style={{
          backgroundColor: 'var(--sv-superficie)',
          border: '2px solid var(--sv-borde)',
        }}>
          <span className="font-semibold">{page}</span>
          <span style={{ color: 'var(--sv-texto-muted)' }}> / {totalPages}</span>
        </div>
        
        {/* Botón siguiente */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNext}
          className="px-3 py-2 rounded-lg font-semibold transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            backgroundColor: hasNext ? 'var(--sv-primario)' : 'var(--sv-superficie)',
            color: hasNext ? 'white' : 'var(--sv-texto-muted)',
            border: `2px solid ${hasNext ? 'var(--sv-primario)' : 'var(--sv-borde)'}`,
          }}
          aria-label="Página siguiente"
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
