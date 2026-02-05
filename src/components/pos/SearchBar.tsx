// ========================================
// BARRA DE BÚSQUEDA DE PRODUCTOS
// ========================================

import { useUIStore } from '../../stores/uiStore';
import { useEffect, useRef } from 'react';

export function SearchBar() {
  const terminoBusqueda = useUIStore(state => state.terminoBusqueda);
  const setBusqueda = useUIStore(state => state.setBusqueda);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Atajo de teclado para enfocar búsqueda
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+F o F3 para buscar
      if ((e.ctrlKey && e.key === 'f') || e.key === 'F3') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      // Escape para limpiar y desenfocar
      if (e.key === 'Escape' && document.activeElement === inputRef.current) {
        setBusqueda('');
        inputRef.current?.blur();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setBusqueda]);
  
  return (
    <div className="relative flex-1">
      {/* Icono de búsqueda */}
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">
        🔍
      </span>
      
      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={terminoBusqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar producto... (Ctrl+F)"
        className="w-full bg-dark-400 border border-dark-100 rounded-xl
                   pl-10 pr-10 py-3 text-white placeholder-zinc-500
                   focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent
                   transition-all"
      />
      
      {/* Botón limpiar */}
      {terminoBusqueda && (
        <button
          onClick={() => setBusqueda('')}
          className="absolute right-3 top-1/2 -translate-y-1/2 
                     text-zinc-500 hover:text-white transition-colors
                     p-1"
        >
          ✕
        </button>
      )}
    </div>
  );
}
