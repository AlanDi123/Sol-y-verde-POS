// ========================================
// PANTALLA PRINCIPAL DEL POS
// ========================================

import { ProductGrid } from './pos/ProductGrid';
import { Cart } from './pos/Cart';
import { ActionBar } from './pos/ActionBar';
import { SearchBar } from './pos/SearchBar';
import { CategoryFilter } from './pos/CategoryFilter';
import { CartPanel } from './pos/CartPanel';
import { useUIStore } from '../stores/uiStore';

export function POSMain() {
  const panelCarritoAbierto = useUIStore(state => state.panelCarritoAbierto);
  
  return (
    <div className="h-full flex">
      {/* Área principal - Productos */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Barra de búsqueda y filtros */}
        <div className="p-3 bg-dark-300 border-b border-dark-100 flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <SearchBar />
            <CategoryFilter />
          </div>
        </div>
        
        {/* Grid de productos */}
        <div className="flex-1 overflow-auto">
          <ProductGrid />
        </div>
        
        {/* Barra de acciones rápidas */}
        <ActionBar />
      </div>
      
      {/* Panel del carrito - Desktop */}
      <div className="hidden md:flex w-96 flex-col bg-dark-300 border-l border-dark-100">
        <Cart />
      </div>
      
      {/* Panel del carrito - Móvil (overlay) */}
      <CartPanel isOpen={panelCarritoAbierto} />
    </div>
  );
}
