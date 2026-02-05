// ========================================
// BARRA DE ACCIONES RÁPIDAS
// ========================================

import { useUIStore } from '../../stores/uiStore';
import { useSesionStore } from '../../stores/sesionStore';

export function ActionBar() {
  const abrirModal = useUIStore(state => state.abrirModal);
  const vendedorActual = useSesionStore(state => state.vendedorActual);
  
  const acciones = [
    {
      id: 'devolucion',
      emoji: '📦',
      label: 'Devolución Cajones',
      onClick: () => abrirModal('devolucion-envases'),
      color: 'hover:bg-success/20 hover:text-success'
    },
    {
      id: 'vale',
      emoji: '🎫',
      label: 'Canjear Vale',
      onClick: () => abrirModal('vale'),
      color: 'hover:bg-warning/20 hover:text-warning'
    },
    {
      id: 'gasto',
      emoji: '💸',
      label: 'Registrar Gasto',
      onClick: () => abrirModal('gasto'),
      color: 'hover:bg-danger/20 hover:text-danger'
    },
    {
      id: 'cierre',
      emoji: '📊',
      label: 'Cierre de Caja',
      onClick: () => abrirModal('cierre-caja'),
      color: 'hover:bg-info/20 hover:text-info',
      requiereAdmin: false
    },
  ];
  
  // Filtrar acciones según permisos
  const accionesFiltradas = acciones.filter(accion => {
    if (accion.requiereAdmin && !vendedorActual?.esAdmin) {
      return false;
    }
    return true;
  });
  
  return (
    <div className="bg-dark-300 border-t border-dark-100 p-3 flex-shrink-0">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {accionesFiltradas.map((accion) => (
          <button
            key={accion.id}
            onClick={accion.onClick}
            className={`
              flex items-center gap-2 px-4 py-3 
              bg-dark-400 rounded-xl
              text-zinc-300 font-medium text-sm
              transition-all whitespace-nowrap
              ${accion.color}
            `}
          >
            <span className="text-xl">{accion.emoji}</span>
            <span className="hidden sm:inline">{accion.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
