// ========================================
// MODAL DE REGISTRO DE GASTOS
// ========================================

import { useState } from 'react';
import { db } from '../../db/database';
import { useSesionStore } from '../../stores/sesionStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearMoneda, type CategoriaGasto, type Gasto } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface GastoModalProps {
  onClose: () => void;
}

const CATEGORIAS_GASTO: Array<{
  id: CategoriaGasto;
  nombre: string;
  emoji: string;
  descripcion: string;
}> = [
  { id: 'almuerzo', nombre: 'Almuerzo', emoji: '🍽️', descripcion: 'Comida del personal' },
  { id: 'flete', nombre: 'Flete', emoji: '🚛', descripcion: 'Transporte de mercadería' },
  { id: 'compra_mercaderia', nombre: 'Compra', emoji: '📦', descripcion: 'Compra de mercadería' },
  { id: 'limpieza', nombre: 'Limpieza', emoji: '🧹', descripcion: 'Artículos de limpieza' },
  { id: 'insumos', nombre: 'Insumos', emoji: '📎', descripcion: 'Insumos varios' },
  { id: 'reparaciones', nombre: 'Reparaciones', emoji: '🔧', descripcion: 'Arreglos y mantenimiento' },
  { id: 'otros', nombre: 'Otros', emoji: '📝', descripcion: 'Gastos varios' },
];

export function GastoModal({ onClose }: GastoModalProps) {
  const [paso, setPaso] = useState<'categoria' | 'detalle'>('categoria');
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState<CategoriaGasto | null>(null);
  const [monto, setMonto] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [proveedor, setProveedor] = useState('');
  const [guardando, setGuardando] = useState(false);
  
  const turnoActual = useSesionStore(state => state.turnoActual);
  const vendedorActual = useSesionStore(state => state.vendedorActual);
  const agregarNotificacion = useUIStore(state => state.agregarNotificacion);
  
  // Seleccionar categoría
  const handleSelectCategoria = (cat: CategoriaGasto) => {
    setCategoriaSeleccionada(cat);
    setPaso('detalle');
  };
  
  // Guardar gasto
  const handleGuardar = async () => {
    if (!turnoActual || !vendedorActual || !categoriaSeleccionada) return;
    
    const montoNumerico = parseFloat(monto);
    
    if (!montoNumerico || montoNumerico <= 0) {
      agregarNotificacion('error', 'Monto inválido', 'Ingrese un monto válido');
      return;
    }
    
    setGuardando(true);
    
    try {
      const nuevoGasto: Gasto = {
        id: uuidv4(),
        turnoId: turnoActual.id,
        fecha: new Date().toISOString(),
        categoria: categoriaSeleccionada,
        monto: montoNumerico,
        descripcion: descripcion.trim() || undefined,
        proveedor: proveedor.trim() || undefined,
        vendedorId: vendedorActual.id,
        sincronizado: false
      };
      
      await db.gastos.add(nuevoGasto);
      
      // Encolar para sincronización
      await db.syncQueue.add({
        id: uuidv4(),
        tipo: 'gasto',
        datos: nuevoGasto,
        timestamp: Date.now(),
        intentos: 0,
        ultimoIntento: null,
        estado: 'pendiente'
      });
      
      agregarNotificacion(
        'success',
        'Gasto registrado',
        `${getCategoriaInfo(categoriaSeleccionada)?.emoji} ${formatearMoneda(montoNumerico)}`
      );
      
      onClose();
    } catch (error) {
      agregarNotificacion('error', 'Error', 'No se pudo guardar el gasto');
    } finally {
      setGuardando(false);
    }
  };
  
  // Obtener info de categoría
  const getCategoriaInfo = (cat: CategoriaGasto) => {
    return CATEGORIAS_GASTO.find(c => c.id === cat);
  };
  
  // Montos rápidos
  const MONTOS_RAPIDOS = [500, 1000, 2000, 5000, 10000, 20000];
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content p-0 w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-dark-400 border-b border-dark-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {paso === 'detalle' && (
                <button
                  onClick={() => setPaso('categoria')}
                  className="text-zinc-400 hover:text-white"
                >
                  ←
                </button>
              )}
              <h3 className="text-xl font-bold text-white">💸 Registrar Gasto</h3>
            </div>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Contenido */}
        <div className="p-4">
          {paso === 'categoria' && (
            <div className="space-y-3">
              <p className="text-zinc-400 text-sm text-center mb-4">
                Seleccione el tipo de gasto
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                {CATEGORIAS_GASTO.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleSelectCategoria(cat.id)}
                    className="bg-dark-400 hover:bg-dark-200 p-4 rounded-xl text-left transition-colors"
                  >
                    <span className="text-3xl">{cat.emoji}</span>
                    <div className="font-semibold text-white mt-2">{cat.nombre}</div>
                    <div className="text-zinc-500 text-xs mt-1">{cat.descripcion}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
          
          {paso === 'detalle' && categoriaSeleccionada && (
            <div className="space-y-4">
              {/* Categoría seleccionada */}
              <div className="flex items-center justify-center gap-3 py-4">
                <span className="text-4xl">{getCategoriaInfo(categoriaSeleccionada)?.emoji}</span>
                <div className="text-xl font-semibold text-white">
                  {getCategoriaInfo(categoriaSeleccionada)?.nombre}
                </div>
              </div>
              
              {/* Monto */}
              <div>
                <label className="text-zinc-400 text-sm">Monto *</label>
                <div className="relative mt-1">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500">$</span>
                  <input
                    type="number"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    placeholder="0"
                    className="input-dark pl-8 text-2xl font-mono text-center"
                    autoFocus
                  />
                </div>
              </div>
              
              {/* Montos rápidos */}
              <div className="grid grid-cols-3 gap-2">
                {MONTOS_RAPIDOS.map((m) => (
                  <button
                    key={m}
                    onClick={() => setMonto(m.toString())}
                    className="bg-dark-400 hover:bg-primary/20 hover:text-primary p-2 rounded-lg font-mono text-sm transition-colors"
                  >
                    {formatearMoneda(m)}
                  </button>
                ))}
              </div>
              
              {/* Proveedor */}
              <div>
                <label className="text-zinc-400 text-sm">Proveedor / Pagado a</label>
                <input
                  type="text"
                  value={proveedor}
                  onChange={(e) => setProveedor(e.target.value)}
                  placeholder="Opcional"
                  className="input-dark mt-1"
                />
              </div>
              
              {/* Descripción */}
              <div>
                <label className="text-zinc-400 text-sm">Descripción</label>
                <textarea
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Detalles adicionales (opcional)"
                  rows={2}
                  className="input-dark mt-1 resize-none"
                />
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        {paso === 'detalle' && (
          <div className="p-4 bg-dark-400 border-t border-dark-100">
            <button
              onClick={handleGuardar}
              disabled={guardando || !monto}
              className="w-full btn-action-primary py-4 disabled:opacity-50"
            >
              {guardando ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Guardando...
                </span>
              ) : (
                <>Registrar Gasto</>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
