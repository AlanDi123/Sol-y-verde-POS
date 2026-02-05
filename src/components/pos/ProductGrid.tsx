// ========================================
// GRID DE PRODUCTOS
// ========================================

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { useUIStore } from '../../stores/uiStore';
import { ProductButton } from './ProductButton';

export function ProductGrid() {
  const terminoBusqueda = useUIStore(state => state.terminoBusqueda);
  const categoriaSeleccionada = useUIStore(state => state.categoriaSeleccionada);
  
  // Query reactiva de productos
  const productos = useLiveQuery(async () => {
    // Filtrar productos activos
    let resultado = await db.productos.filter(p => p.activo).toArray();
    
    // Filtrar por categoría
    if (categoriaSeleccionada) {
      resultado = resultado.filter(p => p.categoria === categoriaSeleccionada);
    }
    
    // Filtrar por búsqueda
    if (terminoBusqueda) {
      const busqueda = terminoBusqueda.toLowerCase();
      resultado = resultado.filter(p => 
        p.nombre.toLowerCase().includes(busqueda) ||
        p.nombreCorto.toLowerCase().includes(busqueda) ||
        p.codigo.toLowerCase().includes(busqueda)
      );
    }
    
    // Ordenar: primero por stock (productos con stock primero), luego alfabéticamente
    resultado.sort((a, b) => {
      // Productos agotados al final
      if (a.stockActual === 0 && b.stockActual > 0) return 1;
      if (b.stockActual === 0 && a.stockActual > 0) return -1;
      // Luego alfabéticamente
      return a.nombreCorto.localeCompare(b.nombreCorto);
    });
    
    return resultado;
  }, [terminoBusqueda, categoriaSeleccionada]);
  
  // Estado de carga
  if (!productos) {
    return (
      <div className="products-grid">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="btn-product skeleton h-[120px]" />
        ))}
      </div>
    );
  }
  
  // Sin resultados
  if (productos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="text-6xl mb-4">🔍</div>
        <h3 className="text-xl font-semibold text-white mb-2">
          No se encontraron productos
        </h3>
        <p className="text-zinc-400">
          {terminoBusqueda 
            ? `No hay productos que coincidan con "${terminoBusqueda}"`
            : 'No hay productos en esta categoría'
          }
        </p>
      </div>
    );
  }
  
  return (
    <div className="products-grid">
      {productos.map((producto) => (
        <ProductButton key={producto.id} producto={producto} />
      ))}
    </div>
  );
}
