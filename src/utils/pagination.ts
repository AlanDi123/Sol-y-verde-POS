// ========================================
// UTILIDADES DE PAGINACIÓN
// ========================================

import { PAGINATION_CONSTANTS } from './constants';

export interface PaginationInfo {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo;
}

/**
 * Pagina un array de datos
 */
export function paginate<T>(
  data: T[],
  page: number = 1,
  pageSize: number = PAGINATION_CONSTANTS.PAGE_SIZE_DEFAULT
): PaginatedResult<T> {
  const totalItems = data.length;
  const totalPages = Math.ceil(totalItems / pageSize);
  
  // Validar página
  const validPage = Math.max(1, Math.min(page, totalPages || 1));
  
  // Calcular índices
  const startIndex = (validPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  
  // Obtener datos de la página
  const paginatedData = data.slice(startIndex, endIndex);
  
  return {
    data: paginatedData,
    pagination: {
      page: validPage,
      pageSize,
      totalItems,
      totalPages,
      hasNext: validPage < totalPages,
      hasPrevious: validPage > 1,
    },
  };
}

/**
 * Calcula el rango de items mostrados
 */
export function getItemRange(pagination: PaginationInfo): string {
  const start = (pagination.page - 1) * pagination.pageSize + 1;
  const end = Math.min(pagination.page * pagination.pageSize, pagination.totalItems);
  return `${start}-${end} de ${pagination.totalItems}`;
}

/**
 * Genera array de números de página para mostrar
 */
export function getPageNumbers(
  currentPage: number,
  totalPages: number,
  maxVisible: number = 5
): (number | 'ellipsis')[] {
  if (totalPages <= maxVisible) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  
  const pages: (number | 'ellipsis')[] = [];
  const halfVisible = Math.floor(maxVisible / 2);
  
  // Siempre mostrar primera página
  pages.push(1);
  
  let startPage = Math.max(2, currentPage - halfVisible);
  let endPage = Math.min(totalPages - 1, currentPage + halfVisible);
  
  // Ajustar si estamos cerca del inicio
  if (currentPage <= halfVisible + 1) {
    endPage = Math.min(totalPages - 1, maxVisible - 1);
  }
  
  // Ajustar si estamos cerca del final
  if (currentPage >= totalPages - halfVisible) {
    startPage = Math.max(2, totalPages - maxVisible + 2);
  }
  
  // Agregar ellipsis inicial si es necesario
  if (startPage > 2) {
    pages.push('ellipsis');
  }
  
  // Agregar páginas intermedias
  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }
  
  // Agregar ellipsis final si es necesario
  if (endPage < totalPages - 1) {
    pages.push('ellipsis');
  }
  
  // Siempre mostrar última página
  if (totalPages > 1) {
    pages.push(totalPages);
  }
  
  return pages;
}

/**
 * Hook de paginación con localStorage
 */
export function usePagination(
  storageKey: string,
  defaultPageSize: number = PAGINATION_CONSTANTS.PAGE_SIZE_DEFAULT
) {
  const getStoredPage = (): number => {
    try {
      const stored = localStorage.getItem(`pagination-${storageKey}`);
      return stored ? parseInt(stored, 10) : 1;
    } catch {
      return 1;
    }
  };
  
  const setStoredPage = (page: number): void => {
    try {
      localStorage.setItem(`pagination-${storageKey}`, page.toString());
    } catch {
      // Silently fail if localStorage is not available
    }
  };
  
  return {
    getStoredPage,
    setStoredPage,
    defaultPageSize,
  };
}
