// ========================================
// ITEM DE DEVOLUCIÓN DE ENVASE
// ========================================

import { useCarritoStore } from '../../stores/carritoStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearMoneda } from '../../types';
import type { TipoEnvase } from '../../types';

interface DevolucionItemProps {
  devolucion: {
    tipoEnvaseId: string;
    tipoEnvase: TipoEnvase;
    cantidad: number;
  };
}

export function DevolucionItem({ devolucion }: DevolucionItemProps) {
  const actualizarDevolucionEnvase = useCarritoStore(state => state.actualizarDevolucionEnvase);
  const eliminarDevolucionEnvase = useCarritoStore(state => state.eliminarDevolucionEnvase);
  const abrirNumpad = useUIStore(state => state.abrirNumpad);
  const abrirConfirmacion = useUIStore(state => state.abrirConfirmacion);
  
  const subtotal = devolucion.tipoEnvase.valorSena * devolucion.cantidad;
  
  // Editar cantidad
  const handleEditarCantidad = () => {
    abrirNumpad({
      titulo: `Cantidad - ${devolucion.tipoEnvase.nombre}`,
      valorInicial: devolucion.cantidad,
      tipo: 'cantidad',
      min: 0,
      onConfirm: (nuevaCantidad) => {
        if (nuevaCantidad === 0) {
          eliminarDevolucionEnvase(devolucion.tipoEnvaseId);
        } else {
          actualizarDevolucionEnvase(devolucion.tipoEnvaseId, nuevaCantidad);
        }
      }
    });
  };
  
  // Eliminar
  const handleEliminar = (e: React.MouseEvent) => {
    e.stopPropagation();
    abrirConfirmacion({
      titulo: 'Eliminar devolución',
      mensaje: `¿Eliminar la devolución de ${devolucion.tipoEnvase.nombre}?`,
      textoConfirmar: 'Eliminar',
      peligroso: true,
      onConfirm: () => eliminarDevolucionEnvase(devolucion.tipoEnvaseId)
    });
  };
  
  return (
    <div className="cart-item group bg-success/10 border border-success/20">
      {/* Info del envase */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-lg">{devolucion.tipoEnvase.emoji}</span>
          <span className="font-semibold text-success truncate">
            {devolucion.tipoEnvase.nombre}
          </span>
        </div>
        
        {/* Cantidad y valor */}
        <div className="flex items-center gap-2 mt-1 text-sm">
          <button
            onClick={handleEditarCantidad}
            className="bg-dark-400 px-2 py-0.5 rounded hover:bg-success/20 transition-colors"
          >
            <span className="text-success font-bold">{devolucion.cantidad}</span>
            <span className="text-zinc-400 ml-1">unidad(es)</span>
          </button>
          
          <span className="text-zinc-500">×</span>
          
          <span className="text-zinc-300 font-mono">
            {formatearMoneda(devolucion.tipoEnvase.valorSena)}
          </span>
        </div>
      </div>
      
      {/* Subtotal */}
      <div className="flex flex-col items-end">
        <span className="text-lg font-bold text-success font-mono">
          -{formatearMoneda(subtotal)}
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
