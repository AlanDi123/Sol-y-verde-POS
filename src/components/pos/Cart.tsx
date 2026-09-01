// ========================================
// CARRITO DE COMPRAS
// ========================================

import { useEffect, useState } from 'react';
import { useCarritoStore, type VentaEnEspera } from '../../stores/carritoStore';
import { useVentasStore } from '../../stores/ventasStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearMoneda } from '../../types';
import { CartItem } from './CartItem';
import { DevolucionItem } from './DevolucionItem';

export function Cart() {
  const [mostrarVentasEnEspera, setMostrarVentasEnEspera] = useState(false);
  const items = useCarritoStore(state => state.items);
  const devolucionesEnvases = useCarritoStore(state => state.devolucionesEnvases);
  const subtotalProductos = useCarritoStore(state => state.subtotalProductos);
  const totalEnvasesCobrados = useCarritoStore(state => state.totalEnvasesCobrados);
  const totalDevolucionEnvases = useCarritoStore(state => state.totalDevolucionEnvases);
  const total = useCarritoStore(state => state.total);
  const limpiarCarrito = useCarritoStore(state => state.limpiarCarrito);
  const ventasEnEspera = useCarritoStore(state => state.ventasEnEspera);
  const pausarVenta = useCarritoStore(state => state.pausarVenta);
  const recuperarVenta = useCarritoStore(state => state.recuperarVenta);
  
  const iniciarVenta = useVentasStore(state => state.iniciarVenta);
  const generarValeDevolucion = useVentasStore(state => state.generarValeDevolucion);
  const ventaEnProceso = useVentasStore(state => state.ventaEnProceso);
  
  const abrirModal = useUIStore(state => state.abrirModal);
  const abrirConfirmacion = useUIStore(state => state.abrirConfirmacion);
  const agregarNotificacion = useUIStore(state => state.agregarNotificacion);
  
  // Verificar si genera vale (devolución > compra)
  const montoNeto = subtotalProductos + totalEnvasesCobrados - totalDevolucionEnvases;
  const generaVale = montoNeto < 0;
  const montoVale = Math.abs(montoNeto);
  
  // Manejar cobrar
  const handleCobrar = () => {
    if (items.length === 0 && devolucionesEnvases.length === 0) {
      return;
    }
    
    // Si genera vale (solo devoluciones)
    if (generaVale) {
      abrirConfirmacion({
        titulo: 'Generar Vale',
        mensaje: `Esta operación genera un vale por ${formatearMoneda(montoVale)}. ¿Desea continuar?`,
        textoConfirmar: 'Generar Vale',
        onConfirm: async () => {
          const devoluciones = devolucionesEnvases.map(d => ({
            tipoEnvaseId: d.tipoEnvaseId,
            cantidad: d.cantidad,
            valorUnitario: d.tipoEnvase.valorSena,
            subtotal: d.tipoEnvase.valorSena * d.cantidad
          }));
          
          await generarValeDevolucion(montoVale, devoluciones);
          await limpiarCarrito();
        }
      });
      return;
    }
    
    // Iniciar proceso de venta normal
    iniciarVenta();
    abrirModal('pago');
  };
  
  // Manejar limpiar carrito
  const handleLimpiar = () => {
    if (items.length === 0 && devolucionesEnvases.length === 0) {
      return;
    }
    
    abrirConfirmacion({
      titulo: 'Limpiar Carrito',
      mensaje: '¿Está seguro de que desea eliminar todos los productos del carrito?',
      textoConfirmar: 'Limpiar',
      peligroso: true,
      onConfirm: () => {
        limpiarCarrito();
      }
    });
  };
  
  const carritoVacio = items.length === 0 && devolucionesEnvases.length === 0;

  const handlePausarVenta = async () => {
    if (ventaEnProceso) return;

    const pausada = await pausarVenta();
    if (pausada) {
      agregarNotificacion('info', 'Venta en espera', 'La venta se guardó para continuarla más tarde.');
    }
  };

  const handleRecuperarVenta = (venta: VentaEnEspera) => {
    const recuperar = async () => {
      const recuperada = await recuperarVenta(venta.id);
      if (recuperada) {
        setMostrarVentasEnEspera(false);
        agregarNotificacion('success', 'Venta recuperada', 'La venta volvió al carrito.');
      }
    };

    if (carritoVacio) {
      void recuperar();
      return;
    }

    abrirConfirmacion({
      titulo: 'Reemplazar carrito',
      mensaje: 'El carrito actual será reemplazado por la venta en espera.',
      textoConfirmar: 'Recuperar venta',
      peligroso: true,
      onConfirm: () => void recuperar()
    });
  };

  useEffect(() => {
    const manejarAtajo = (evento: KeyboardEvent) => {
      if (evento.key === 'F2' && !carritoVacio && !ventaEnProceso) {
        evento.preventDefault();
        void handlePausarVenta();
      }

      if (evento.key === 'F4' && !carritoVacio && !ventaEnProceso) {
        evento.preventDefault();
        handleCobrar();
      }
    };

    window.addEventListener('keydown', manejarAtajo);
    return () => window.removeEventListener('keydown', manejarAtajo);
  }, [carritoVacio, ventaEnProceso, pausarVenta, items, devolucionesEnvases]);
  
  return (
    <div className="flex flex-col h-full">
      {/* Header del carrito */}
      <div className="p-4 border-b border-dark-100 flex items-center justify-between">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          🛒 Carrito
          {items.length > 0 && (
            <span className="bg-primary text-white text-sm px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </h2>

        <div className="flex items-center gap-3">
          {ventasEnEspera.length > 0 && (
            <button
              onClick={() => setMostrarVentasEnEspera(true)}
              className="text-warning transition-colors text-sm"
            >
              ⏱ {ventasEnEspera.length}
            </button>
          )}
          {!carritoVacio && (
            <button
              onClick={handleLimpiar}
              className="text-zinc-400 hover:text-danger transition-colors text-sm"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>
      
      {/* Lista de items */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {carritoVacio ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <span className="text-5xl mb-3">🛒</span>
            <p className="text-zinc-400">El carrito está vacío</p>
            <p className="text-zinc-500 text-sm mt-1">
              Toque un producto para agregarlo
            </p>
          </div>
        ) : (
          <>
            {/* Items de productos */}
            {items.map((item) => (
              <CartItem key={item.id} item={item} />
            ))}
            
            {/* Separador si hay devoluciones */}
            {devolucionesEnvases.length > 0 && items.length > 0 && (
              <div className="border-t border-dark-100 my-3 pt-3">
                <span className="text-sm text-zinc-400 font-medium">
                  📦 Devolución de Envases
                </span>
              </div>
            )}
            
            {/* Items de devolución */}
            {devolucionesEnvases.map((dev) => (
              <DevolucionItem key={dev.tipoEnvaseId} devolucion={dev} />
            ))}
          </>
        )}
      </div>
      
      {/* Resumen y totales */}
      <div className="border-t border-dark-100 p-4 space-y-3">
        {/* Subtotales */}
        {(subtotalProductos > 0 || totalEnvasesCobrados > 0 || totalDevolucionEnvases > 0) && (
          <div className="space-y-1 text-sm">
            {subtotalProductos > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>Productos</span>
                <span className="font-mono">{formatearMoneda(subtotalProductos)}</span>
              </div>
            )}
            {totalEnvasesCobrados > 0 && (
              <div className="flex justify-between text-zinc-400">
                <span>+ Envases (seña)</span>
                <span className="font-mono">{formatearMoneda(totalEnvasesCobrados)}</span>
              </div>
            )}
            {totalDevolucionEnvases > 0 && (
              <div className="flex justify-between text-success">
                <span>- Devolución envases</span>
                <span className="font-mono">-{formatearMoneda(totalDevolucionEnvases)}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Total */}
        <div className="flex items-center justify-between py-2 border-t border-dark-100">
          <span className="text-lg font-semibold text-white">
            {generaVale ? 'Vale a generar' : 'TOTAL'}
          </span>
          <span className={`text-3xl font-bold font-mono ${generaVale ? 'text-warning' : 'text-primary'}`}>
            {formatearMoneda(generaVale ? montoVale : total)}
          </span>
        </div>
        
        {/* Botones de acción */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => void handlePausarVenta()}
            disabled={carritoVacio || !!ventaEnProceso}
            className="btn-action-secondary text-sm py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ⏸ Esperar
          </button>
          <button
            onClick={() => abrirModal('devolucion-envases')}
            className="btn-action-secondary text-sm py-3"
          >
            📦 Devolución
          </button>
          
          <button
            onClick={handleCobrar}
            disabled={carritoVacio}
            title="Atajo: F4"
            className={`
              btn-action text-sm py-3 font-bold
              ${carritoVacio 
                ? 'bg-dark-200 text-zinc-500 cursor-not-allowed' 
                : generaVale
                  ? 'bg-warning text-black hover:bg-yellow-400'
                  : 'bg-primary text-white hover:bg-primary-700'
              }
            `}
          >
            {generaVale ? '🎫 Generar Vale' : '💰 Cobrar (F4)'}
          </button>
        </div>
      </div>

      {mostrarVentasEnEspera && (
        <VentasEnEsperaModal
          ventas={ventasEnEspera}
          onClose={() => setMostrarVentasEnEspera(false)}
          onRecuperar={handleRecuperarVenta}
        />
      )}
    </div>
  );
}

function VentasEnEsperaModal({
  ventas,
  onClose,
  onRecuperar
}: {
  ventas: VentaEnEspera[];
  onClose: () => void;
  onRecuperar: (venta: VentaEnEspera) => void;
}) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content w-full max-w-md mx-4 p-0 overflow-hidden" onClick={evento => evento.stopPropagation()}>
        <div className="flex items-center justify-between bg-dark-400 p-4">
          <h3 className="text-lg font-bold text-white">Ventas en espera</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-white text-xl" aria-label="Cerrar">✕</button>
        </div>
        <div className="max-h-96 space-y-3 overflow-y-auto p-4">
          {ventas.map(venta => (
            <div key={venta.id} className="flex items-center justify-between gap-3 rounded-lg bg-dark-400 p-3">
              <div>
                <p className="font-medium text-white">Venta {venta.id.slice(0, 6).toUpperCase()}</p>
                <p className="text-sm text-zinc-400">
                  {venta.items.length} productos · {formatearMoneda(venta.total)}
                </p>
              </div>
              <button onClick={() => onRecuperar(venta)} className="btn-action-primary px-3 py-2 text-sm">
                Recuperar
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
