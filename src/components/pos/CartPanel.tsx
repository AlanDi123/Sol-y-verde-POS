// ========================================
// PANEL LATERAL DEL CARRITO (MÓVIL)
// ========================================

import { useUIStore } from '../../stores/uiStore';
import { Cart } from './Cart';

interface CartPanelProps {
  isOpen: boolean;
}

export function CartPanel({ isOpen }: CartPanelProps) {
  const cerrarPanelCarrito = useUIStore(state => state.cerrarPanelCarrito);
  
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={cerrarPanelCarrito}
        />
      )}
      
      {/* Panel */}
      <div className={`
        panel-lateral md:hidden
        ${isOpen ? '' : 'cerrado'}
      `}>
        {/* Header del panel */}
        <div className="flex items-center justify-between p-4 border-b border-dark-100">
          <h2 className="text-lg font-bold text-white">🛒 Carrito</h2>
          <button
            onClick={cerrarPanelCarrito}
            className="p-2 hover:bg-dark-200 rounded-lg transition-colors text-xl"
          >
            ✕
          </button>
        </div>
        
        {/* Contenido del carrito */}
        <div className="h-[calc(100%-65px)]">
          <Cart />
        </div>
      </div>
    </>
  );
}
