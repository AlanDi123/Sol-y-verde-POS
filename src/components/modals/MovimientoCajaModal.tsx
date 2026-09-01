// ========================================
// MODAL DE MOVIMIENTOS DE CAJA
// Entradas y salidas nocturnas de dinero
// ========================================

import { useState } from 'react';
import { db } from '../../db/database';
import type { MovimientoCaja } from '../../types';
import { notificar } from '../../stores/notificacionesStore';
import { useSesionStore } from '../../stores/sesionStore';

interface MovimientoCajaModalProps {
  onCerrar: () => void;
  onGuardado?: () => void;
}

export function MovimientoCajaModal({ onCerrar, onGuardado }: MovimientoCajaModalProps) {
  const [tipo, setTipo] = useState<'entrada' | 'salida'>('entrada');
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [guardando, setGuardando] = useState(false);
  
  const vendedorActual = useSesionStore((state) => state.vendedorActual);
  const turnoActual = useSesionStore((state) => state.turnoActual);
  
  const handleGuardar = async () => {
    // Validaciones
    if (!monto || parseFloat(monto) <= 0) {
      notificar.error('Error', 'Ingresa un monto válido');
      return;
    }
    
    if (!motivo.trim()) {
      notificar.error('Error', 'Debes especificar el motivo del movimiento');
      return;
    }
    
    if (!vendedorActual || !turnoActual) {
      notificar.error('Error', 'No hay sesión activa');
      return;
    }
    
    setGuardando(true);
    
    try {
      const movimiento: MovimientoCaja = {
        id: `mov-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        turnoId: turnoActual.id,
        fecha: new Date().toISOString(),
        tipo,
        monto: parseFloat(monto),
        motivo: motivo.trim(),
        descripcion: descripcion.trim(),
        vendedorId: vendedorActual.id,
        vendedorNombre: vendedorActual.nombre,
        timestamp: Date.now(),
        sincronizado: false,
      };
      
      await db.movimientosCaja.add(movimiento);
      
      // Encolar para sincronización
      const { encolarParaSync } = await import('../../services/syncService');
      await encolarParaSync('movimiento' as any, movimiento);
      
      notificar.exito(
        'Movimiento Registrado',
        `${tipo === 'entrada' ? 'Entrada' : 'Salida'} de $${parseFloat(monto).toLocaleString()} registrada`
      );
      
      onGuardado?.();
      onCerrar();
    } catch (error) {
      console.error('Error guardando movimiento:', error);
      notificar.error('Error', 'No se pudo guardar el movimiento');
    } finally {
      setGuardando(false);
    }
  };
  
  // Motivos predefinidos según tipo
  const motivosPredefinidos = tipo === 'entrada'
    ? [
        'Apertura de turno',
        'Depósito adicional',
        'Corrección de caja',
        'Devolución de préstamo',
        'Otro',
      ]
    : [
        'Pago a proveedor',
        'Gastos urgentes',
        'Retiro de efectivo',
        'Préstamo',
        'Corrección de caja',
        'Otro',
      ];
  
  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-content w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--sv-texto)' }}>
          💵 Movimiento de Caja
        </h2>
        
        {/* Tipo de movimiento */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--sv-texto-secundario)' }}>
            Tipo de movimiento
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setTipo('entrada')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                tipo === 'entrada'
                  ? 'btn-action-primary'
                  : 'btn-action-secondary'
              }`}
            >
              ➕ Entrada
            </button>
            <button
              onClick={() => setTipo('salida')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                tipo === 'salida'
                  ? 'btn-action-danger'
                  : 'btn-action-secondary'
              }`}
            >
              ➖ Salida
            </button>
          </div>
        </div>
        
        {/* Monto */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--sv-texto-secundario)' }}>
            Monto ($)
          </label>
          <input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            placeholder="Ingresa el monto"
            className="input-base text-xl"
            autoFocus
            min="0"
            step="100"
          />
        </div>
        
        {/* Motivo predefinido */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--sv-texto-secundario)' }}>
            Motivo *
          </label>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {motivosPredefinidos.map((m) => (
              <button
                key={m}
                onClick={() => setMotivo(m)}
                className={`py-2 px-3 rounded-lg text-sm transition-all ${
                  motivo === m
                    ? 'bg-[var(--sv-primario)] text-white'
                    : 'bg-[var(--sv-superficie)] border-2 border-[var(--sv-borde)]'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          
          {/* Motivo personalizado */}
          <input
            type="text"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            placeholder="O escribe un motivo personalizado"
            className="input-base"
            maxLength={100}
          />
        </div>
        
        {/* Descripción adicional (opcional) */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--sv-texto-secundario)' }}>
            Descripción adicional (opcional)
          </label>
          <textarea
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            placeholder="Detalles adicionales..."
            className="input-base resize-none"
            rows={3}
            maxLength={300}
          />
        </div>
        
        {/* Resumen */}
        {monto && motivo && (
          <div className="card mb-6 p-4" style={{
            borderLeft: `4px solid var(${tipo === 'entrada' ? '--sv-exito' : '--sv-peligro'})`
          }}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--sv-texto-secundario)' }}>
                  {tipo === 'entrada' ? 'Entrada de dinero' : 'Salida de dinero'}
                </p>
                <p className="font-semibold">{motivo}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold" style={{
                  color: `var(${tipo === 'entrada' ? '--sv-exito' : '--sv-peligro'})`
                }}>
                  {tipo === 'entrada' ? '+' : '-'}${parseFloat(monto).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        )}
        
        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onCerrar}
            className="flex-1 btn-action-secondary"
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            onClick={handleGuardar}
            className="flex-1 btn-action-primary"
            disabled={!monto || !motivo.trim() || guardando}
          >
            {guardando ? 'Guardando...' : 'Registrar Movimiento'}
          </button>
        </div>
      </div>
    </div>
  );
}
