// ========================================
// MODAL DE VALE (BÚSQUEDA Y APLICACIÓN)
// ========================================

import { useState, useEffect } from 'react';
import { db } from '../../db/database';
import { useVentasStore } from '../../stores/ventasStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearMoneda, type Vale } from '../../types';

interface ValeModalProps {
  onClose: () => void;
}

export function ValeModal({ onClose }: ValeModalProps) {
  const [codigoBusqueda, setCodigoBusqueda] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [valeEncontrado, setValeEncontrado] = useState<Vale | null>(null);
  const [error, setError] = useState('');
  const [historial, setHistorial] = useState<Vale[]>([]);
  
  const ventaEnProceso = useVentasStore(state => state.ventaEnProceso);
  const aplicarVale = useVentasStore(state => state.aplicarVale);
  const agregarNotificacion = useUIStore(state => state.agregarNotificacion);
  
  // Cargar historial de vales recientes
  useEffect(() => {
    const cargarHistorial = async () => {
      const valesRecientes = await db.vales
        .where('estado')
        .equals('activo')
        .reverse()
        .limit(5)
        .toArray();
      setHistorial(valesRecientes);
    };
    
    cargarHistorial();
  }, []);
  
  // Buscar vale por código
  const buscarVale = async () => {
    const codigo = codigoBusqueda.trim().toUpperCase();
    
    if (!codigo) {
      setError('Ingrese un código de vale');
      return;
    }
    
    setBuscando(true);
    setError('');
    setValeEncontrado(null);
    
    try {
      const vale = await db.vales
        .where('cui')
        .equals(codigo)
        .first();
      
      if (!vale) {
        setError('Vale no encontrado. Verifique el código.');
        return;
      }
      
      if (vale.estado !== 'activo' && vale.estado !== 'parcial') {
        setError(`Este vale no está disponible (estado: ${vale.estado}).`);
        return;
      }
      
      if (vale.fechaVencimiento && new Date(vale.fechaVencimiento) < new Date()) {
        setError('Este vale está vencido.');
        return;
      }
      
      setValeEncontrado(vale);
    } catch (err) {
      setError('Error al buscar el vale');
    } finally {
      setBuscando(false);
    }
  };
  
  // Aplicar vale a la venta
  const handleAplicarVale = async (vale: Vale) => {
    if (!ventaEnProceso) {
      agregarNotificacion('warning', 'Sin venta', 'Primero inicie una venta para aplicar el vale');
      return;
    }
    
    try {
      // Calcular monto a aplicar (el menor entre saldo vale y total pendiente)
      const totalPendiente = ventaEnProceso.total - ventaEnProceso.totalPagado;
      const montoAplicar = Math.min(vale.montoDisponible, totalPendiente);
      
      aplicarVale(vale, montoAplicar);
      agregarNotificacion(
        'success',
        'Vale aplicado',
        `Se aplicó ${formatearMoneda(montoAplicar)} del vale ${vale.cui}`
      );
      onClose();
    } catch {
      agregarNotificacion('error', 'Error', 'No se pudo aplicar el vale');
    }
  };
  
  // Formatear código mientras se escribe
  const handleCodigoChange = (valor: string) => {
    // Formato: SYV-XXXX-XXXX
    let limpio = valor.toUpperCase().replace(/[^A-Z0-9-]/g, '');
    
    // Autoformatear
    if (limpio.length > 3 && !limpio.includes('-')) {
      limpio = `SYV-${limpio.slice(3)}`;
    }
    
    setCodigoBusqueda(limpio);
    setError('');
    setValeEncontrado(null);
  };
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content p-0 w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-dark-400 border-b border-dark-100">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">🎫 Buscar Vale</h3>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
          <p className="text-zinc-400 text-sm mt-1">
            Ingrese el código CUI del vale a aplicar
          </p>
        </div>
        
        {/* Búsqueda */}
        <div className="p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={codigoBusqueda}
              onChange={(e) => handleCodigoChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && buscarVale()}
              placeholder="SYV-XXXX-XXXX"
              className="input-dark flex-1 font-mono text-lg tracking-wider text-center uppercase"
              autoFocus
            />
            <button
              onClick={buscarVale}
              disabled={buscando}
              className="btn-action-primary px-6"
            >
              {buscando ? '...' : '🔍'}
            </button>
          </div>
          
          {/* Error */}
          {error && (
            <div className="mt-3 p-3 bg-danger/20 text-danger rounded-lg text-sm">
              {error}
            </div>
          )}
        </div>
        
        {/* Vale encontrado */}
        {valeEncontrado && (
          <div className="px-4 pb-4">
            <ValeCard 
              vale={valeEncontrado} 
              onAplicar={() => handleAplicarVale(valeEncontrado)}
              destacado
            />
          </div>
        )}
        
        {/* Historial de vales activos */}
        {historial.length > 0 && !valeEncontrado && (
          <div className="px-4 pb-4">
            <h4 className="text-sm font-semibold text-zinc-400 mb-3">
              Vales activos recientes
            </h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {historial.map(vale => (
                <ValeCard
                  key={vale.id}
                  vale={vale}
                  onAplicar={() => handleAplicarVale(vale)}
                  compacto
                />
              ))}
            </div>
          </div>
        )}
        
        {/* Info */}
        <div className="p-4 bg-dark-400 border-t border-dark-100">
          <div className="text-zinc-500 text-xs text-center">
            💡 El vale se genera automáticamente cuando el cliente tiene más devoluciones que compras
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// COMPONENTE DE TARJETA DE VALE
// ========================================

function ValeCard({
  vale,
  onAplicar,
  destacado = false,
  compacto = false
}: {
  vale: Vale;
  onAplicar: () => void;
  destacado?: boolean;
  compacto?: boolean;
}) {
  const saldoActual = vale.montoDisponible;
  const porcentajeUsado = ((vale.montoOriginal - saldoActual) / vale.montoOriginal) * 100;
  
  if (compacto) {
    return (
      <button
        onClick={onAplicar}
        className="w-full bg-dark-400 hover:bg-dark-200 p-3 rounded-xl flex items-center justify-between transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">🎫</span>
          <div className="text-left">
            <div className="font-mono text-primary text-sm">{vale.cui}</div>
            <div className="text-zinc-400 text-xs">
              Generado {new Date(vale.fechaCreacion).toLocaleDateString()}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-bold text-success font-mono">
            {formatearMoneda(saldoActual)}
          </div>
          {saldoActual < vale.montoOriginal && (
            <div className="text-xs text-zinc-500">
              de {formatearMoneda(vale.montoOriginal)}
            </div>
          )}
        </div>
      </button>
    );
  }
  
  return (
    <div className={`rounded-xl overflow-hidden ${
      destacado ? 'ring-2 ring-success' : 'bg-dark-400'
    }`}>
      {/* Header del vale */}
      <div className="bg-gradient-to-r from-success/30 to-primary/30 p-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-zinc-400 text-xs uppercase tracking-wider">
              Vale Sol y Verde
            </span>
            <div className="font-mono text-xl text-white font-bold mt-1">
              {vale.cui}
            </div>
          </div>
          <span className="text-4xl">🎫</span>
        </div>
      </div>
      
      {/* Contenido */}
      <div className="p-4 bg-dark-400">
        {/* Saldo */}
        <div className="text-center mb-4">
          <span className="text-zinc-400 text-sm">Saldo disponible</span>
          <div className="text-4xl font-bold text-success font-mono mt-1">
            {formatearMoneda(saldoActual)}
          </div>
        </div>
        
        {/* Barra de progreso si fue usado parcialmente */}
        {saldoActual < vale.montoOriginal && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-zinc-400 mb-1">
              <span>Usado: {formatearMoneda(vale.montoOriginal - saldoActual)}</span>
              <span>Original: {formatearMoneda(vale.montoOriginal)}</span>
            </div>
            <div className="h-2 bg-dark-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-success to-primary transition-all"
                style={{ width: `${100 - porcentajeUsado}%` }}
              />
            </div>
          </div>
        )}
        
        {/* Detalles */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <span className="text-zinc-500">Generado</span>
            <div className="text-white">{new Date(vale.fechaCreacion).toLocaleDateString()}</div>
          </div>
          <div>
            <span className="text-zinc-500">Vence</span>
            <div className="text-white">
              {vale.fechaExpiracion 
                ? new Date(vale.fechaExpiracion).toLocaleDateString()
                : 'Sin vencimiento'
              }
            </div>
          </div>
        </div>
        
        {/* Botón aplicar */}
        <button
          onClick={onAplicar}
          className="w-full btn-action-primary mt-4 py-3"
        >
          Aplicar Vale
        </button>
      </div>
    </div>
  );
}
