// ========================================
// FILTRO DE CATEGORÍAS
// ========================================

import { useUIStore } from '../../stores/uiStore';
import type { CategoriaProducto } from '../../types';

const CATEGORIAS: { id: CategoriaProducto | null; nombre: string; emoji: string }[] = [
  { id: null, nombre: 'Todos', emoji: '📦' },
  { id: 'verduras', nombre: 'Verduras', emoji: '🥬' },
  { id: 'frutas', nombre: 'Frutas', emoji: '🍎' },
  { id: 'hojas', nombre: 'Hojas', emoji: '🥗' },
  { id: 'tuberculos', nombre: 'Tubérculos', emoji: '🥔' },
  { id: 'citricos', nombre: 'Cítricos', emoji: '🍊' },
  { id: 'otros', nombre: 'Otros', emoji: '🧺' },
];

export function CategoryFilter() {
  const categoriaSeleccionada = useUIStore(state => state.categoriaSeleccionada);
  const setCategoria = useUIStore(state => state.setCategoria);
  
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {CATEGORIAS.map((cat) => (
        <button
          key={cat.id ?? 'todos'}
          onClick={() => setCategoria(cat.id)}
          className={`
            categoria-pill flex items-center gap-1.5 whitespace-nowrap
            ${categoriaSeleccionada === cat.id ? 'active' : ''}
          `}
        >
          <span>{cat.emoji}</span>
          <span>{cat.nombre}</span>
        </button>
      ))}
    </div>
  );
}
