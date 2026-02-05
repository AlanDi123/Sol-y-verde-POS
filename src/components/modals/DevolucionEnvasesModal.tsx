// ========================================
// MODAL DE DEVOLUCIÓN DE ENVASES
// ========================================

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { useCarritoStore } from '../../stores/carritoStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearMoneda, type TipoEnvase } from '../../types';

interface DevolucionEnvasesModalProps {
  onClose: () => void;
}

export function DevolucionEnvasesModal({ onClose }: DevolucionEnvasesModalProps) {
  const [cantidades, setCantidades] = useState<Record<string, number>>({});
  
  const agregarDevolucionEnvase = useCarritoStore(state => state.agregarDevolucionEnvase);
  const agregarNotificacion = useUIStore(state => state.agregarNotificacion);
  
  // Obtener tipos de envase
  const tiposEnvase = useLiveQuery(
    () => db.tiposEnvase.filter(e => e.activo).toArray(),
    []
  );
  
  // Calcular total de devolución
  const totalDevolucion = tiposEnvase?.reduce((total, envase) => {
    const cantidad = cantidades[envase.id] || 0;
    return total + (cantidad * envase.valorSena);
  }, 0) || 0;
  
  // Cambiar cantidad
  const handleCantidadChange = (envaseId: string, delta: number) => {
    setCantidades(prev => {
      const actual = prev[envaseId] || 0;
      const nueva = Math.max(0, actual + delta);
      return { ...prev, [envaseId]: nueva };
    });
    
    // Vibración
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  };
  
  // Confirmar devoluciones
  const handleConfirmar = () => {
    if (!tiposEnvase) return;
    
    let agregados = 0;
    
    tiposEnvase.forEach(envase => {
      const cantidad = cantidades[envase.id] || 0;
      if (cantidad > 0) {
        agregarDevolucionEnvase(envase, cantidad);
        agregados += cantidad;
      }
    });
    
    if (agregados > 0) {
      agregarNotificacion(
        'success',
        'Envases registrados',
        `${agregados} envase(s) agregados como devolución`
      );
    }
    
    onClose();
  };
  
  // Limpiar todo
  const handleLimpiar = () => {
    setCantidades({});
  };
  
  if (!tiposEnvase) {
    return null;
  }
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content p-0 w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-dark-400 border-b border-dark-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">📦 Devolución de Envases</h3>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
          <p className="text-zinc-400 text-sm mt-1">
            Registre los envases que el cliente devuelve
          </p>
        </div>
        
        {/* Lista de envases */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {tiposEnvase.map(envase => (
            <EnvaseItem
              key={envase.id}
              envase={envase}
              cantidad={cantidades[envase.id] || 0}
              onCantidadChange={(delta) => handleCantidadChange(envase.id, delta)}
            />
          ))}
        </div>
        
        {/* Total */}
        {totalDevolucion > 0 && (
          <div className="px-4 pb-4">
            <div className="bg-success/20 rounded-xl p-4 text-center">
              <span className="text-zinc-300">Total a devolver al cliente</span>
              <div className="text-3xl font-bold text-success font-mono mt-1">
                {formatearMoneda(totalDevolucion)}
              </div>
            </div>
          </div>
        )}
        
        {/* Acciones */}
        <div className="p-4 bg-dark-400 border-t border-dark-100 grid grid-cols-2 gap-3">
          <button
            onClick={handleLimpiar}
            className="btn-action-secondary py-3"
          >
            Limpiar
          </button>
          <button
            onClick={handleConfirmar}
            disabled={totalDevolucion === 0}
            className="btn-action-primary py-3 disabled:opacity-50"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}

// ========================================
// COMPONENTE DE ITEM DE ENVASE
// ========================================

function EnvaseItem({
  envase,
  cantidad,
  onCantidadChange
}: {
  envase: TipoEnvase;
  cantidad: number;
  onCantidadChange: (delta: number) => void;
}) {
  const subtotal = cantidad * envase.valorSena;
  
  return (
    <div className={`bg-dark-400 rounded-xl p-4 transition-all ${
      cantidad > 0 ? 'ring-2 ring-success/50' : ''
    }`}>
      <div className="flex items-center justify-between">
        {/* Info del envase */}
        <div className="flex items-center gap-3">
          <span className="text-3xl">{envase.emoji}</span>
          <div>
            <div className="font-semibold text-white">{envase.nombre}</div>
            <div className="text-primary font-mono font-bold">
              {formatearMoneda(envase.valorSena)}
            </div>
          </div>
        </div>
        
        {/* Control de cantidad */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onCantidadChange(-1)}
            disabled={cantidad === 0}
            className="w-10 h-10 bg-dark-200 hover:bg-danger/20 hover:text-danger rounded-lg text-xl font-bold transition-colors disabled:opacity-30"
          >
            −
          </button>
          
          <div className={`w-12 h-10 flex items-center justify-center font-bold text-xl font-mono ${
            cantidad > 0 ? 'text-success' : 'text-zinc-500'
          }`}>
            {cantidad}
          </div>
          
          <button
            onClick={() => onCantidadChange(1)}
            className="w-10 h-10 bg-dark-200 hover:bg-success/20 hover:text-success rounded-lg text-xl font-bold transition-colors"
          >
            +
          </button>
        </div>
      </div>
      
      {/* Subtotal */}
      {cantidad > 0 && (
        <div className="mt-3 pt-3 border-t border-dark-200 flex justify-between items-center">
          <span className="text-zinc-400 text-sm">Subtotal devolución</span>
          <span className="text-success font-mono font-bold">
            {formatearMoneda(subtotal)}
          </span>
        </div>
      )}
    </div>
  );
}
