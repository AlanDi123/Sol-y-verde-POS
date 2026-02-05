// ========================================
// ITEM INDIVIDUAL DEL CARRITO
// ========================================

import { useCarritoStore } from '../../stores/carritoStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearMoneda } from '../../types';
import type { ItemCarrito } from '../../types';

interface CartItemProps {
  item: ItemCarrito;
}

export function CartItem({ item }: CartItemProps) {
  const actualizarItem = useCarritoStore(state => state.actualizarItem);
  const eliminarItem = useCarritoStore(state => state.eliminarItem);
  const abrirNumpad = useUIStore(state => state.abrirNumpad);
  const abrirConfirmacion = useUIStore(state => state.abrirConfirmacion);
  
  // Mostrar numpad para editar cantidad
  const handleEditarCantidad = () => {
    abrirNumpad({
      titulo: `Cantidad - ${item.producto.nombreCorto}`,
      valorInicial: item.cantidad,
      tipo: 'cantidad',
      min: 0,
      onConfirm: (nuevaCantidad) => {
        if (nuevaCantidad === 0) {
          abrirConfirmacion({
            titulo: 'Eliminar producto',
            mensaje: `¿Eliminar ${item.producto.nombreCorto} del carrito?`,
            textoConfirmar: 'Eliminar',
            peligroso: true,
            onConfirm: () => eliminarItem(item.id)
          });
        } else {
          actualizarItem(item.id, nuevaCantidad, item.precioUnitario);
        }
      }
    });
  };
  
  // Mostrar numpad para editar precio
  const handleEditarPrecio = () => {
    abrirNumpad({
      titulo: `Precio - ${item.producto.nombreCorto}`,
      valorInicial: item.precioUnitario,
      tipo: 'precio',
      onConfirm: (nuevoPrecio) => {
        actualizarItem(item.id, item.cantidad, nuevoPrecio);
      }
    });
  };
  
  // Eliminar item
  const handleEliminar = (e: React.MouseEvent) => {
    e.stopPropagation();
    abrirConfirmacion({
      titulo: 'Eliminar producto',
      mensaje: `¿Eliminar ${item.producto.nombreCorto} del carrito?`,
      textoConfirmar: 'Eliminar',
      peligroso: true,
      onConfirm: () => eliminarItem(item.id)
    });
  };
  
  // Texto de unidad
  const unidadTexto = item.esFraccion 
    ? item.producto.nombreSubunidad 
    : item.producto.unidadBase;
  
  return (
    <div className="cart-item group">
      {/* Info del producto */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{item.producto.emoji}</span>
          <span className="font-semibold text-white truncate">
            {item.producto.nombreCorto}
          </span>
        </div>
        
        {/* Cantidad y precio */}
        <div className="flex items-center gap-2 mt-1 text-sm">
          {/* Cantidad - clickeable */}
          <button
            onClick={handleEditarCantidad}
            className="bg-dark-400 px-2 py-0.5 rounded hover:bg-primary/20 transition-colors"
          >
            <span className="text-primary font-bold">{item.cantidad}</span>
            <span className="text-zinc-400 ml-1">{unidadTexto}(s)</span>
          </button>
          
          <span className="text-zinc-500">×</span>
          
          {/* Precio - clickeable */}
          <button
            onClick={handleEditarPrecio}
            className="bg-dark-400 px-2 py-0.5 rounded hover:bg-primary/20 transition-colors"
          >
            <span className="text-zinc-300 font-mono">
              {formatearMoneda(item.precioUnitario)}
            </span>
          </button>
        </div>
        
        {/* Indicador de envase */}
        {item.cobrarSena && item.valorSena > 0 && (
          <div className="text-xs text-zinc-500 mt-1">
            + Envase: {formatearMoneda(item.valorSena)}
          </div>
        )}
      </div>
      
      {/* Subtotal */}
      <div className="flex flex-col items-end">
        <span className="text-lg font-bold text-primary font-mono">
          {formatearMoneda(item.subtotal)}
        </span>
        
        {/* Botón eliminar */}
        <button
          onClick={handleEliminar}
          className="text-zinc-500 hover:text-danger text-xl transition-colors 
                     opacity-0 group-hover:opacity-100 mt-1"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
