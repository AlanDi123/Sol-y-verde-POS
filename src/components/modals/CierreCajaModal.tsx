// ========================================
// MODAL DE CIERRE DE CAJA
// ========================================

import { useState, useEffect } from 'react';
import { db } from '../../db/database';
import { useSesionStore } from '../../stores/sesionStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearMoneda, type CierreCaja, type ConteoBilletes } from '../../types';
import { v4 as uuidv4 } from 'uuid';

interface CierreCajaModalProps {
  onClose: () => void;
}

// Denominaciones argentinas
const DENOMINACIONES: Array<{ valor: number; color: string }> = [
  { valor: 20000, color: 'from-blue-600 to-blue-800' },
  { valor: 10000, color: 'from-pink-500 to-pink-700' },
  { valor: 2000, color: 'from-blue-400 to-blue-600' },
  { valor: 1000, color: 'from-green-500 to-green-700' },
  { valor: 500, color: 'from-purple-500 to-purple-700' },
  { valor: 200, color: 'from-amber-500 to-amber-700' },
  { valor: 100, color: 'from-red-500 to-red-700' },
  { valor: 50, color: 'from-teal-500 to-teal-700' },
];

type PasoCierre = 'conteo' | 'resumen' | 'confirmacion';

export function CierreCajaModal({ onClose }: CierreCajaModalProps) {
  const [paso, setPaso] = useState<PasoCierre>('conteo');
  const [conteo, setConteo] = useState<ConteoBilletes>({
    b20000: 0,
    b10000: 0,
    b2000: 0,
    b1000: 0,
    b500: 0,
    b200: 0,
    b100: 0,
    b50: 0,
    monedas: 0
  });
  const [justificacion, setJustificacion] = useState('');
  const [guardando, setGuardando] = useState(false);
  
  // Datos del turno
  const [resumenTurno, setResumenTurno] = useState<{
    totalVentas: number;
    cantidadVentas: number;
    totalEfectivo: number;
    totalTransferencias: number;
    totalCheques: number;
    totalVales: number;
    totalGastos: number;
    totalDevoluciones: number;
    fondoInicial: number;
    efectivoEsperado: number;
  } | null>(null);
  
  const turnoActual = useSesionStore(state => state.turnoActual);
  const vendedorActual = useSesionStore(state => state.vendedorActual);
  const cerrarTurno = useSesionStore(state => state.cerrarTurno);
  const agregarNotificacion = useUIStore(state => state.agregarNotificacion);
  
  // Cargar resumen del turno
  useEffect(() => {
    const cargarResumen = async () => {
      if (!turnoActual) return;
      
      // Obtener ventas del turno
      const ventas = await db.ventas
        .where('turnoId')
        .equals(turnoActual.id)
        .toArray();
      
      // Obtener gastos del turno
      const gastos = await db.gastos
        .where('turnoId')
        .equals(turnoActual.id)
        .toArray();
      
      // Calcular totales
      let totalVentas = 0;
      let totalEfectivo = 0;
      let totalTransferencias = 0;
      let totalCheques = 0;
      let totalVales = 0;
      let totalDevoluciones = 0;
      
      ventas.forEach(venta => {
        totalVentas += venta.total;
        totalDevoluciones += venta.totalDevolucionEnvases;
        
        venta.pagos.forEach(pago => {
          switch (pago.metodo) {
            case 'efectivo':
              totalEfectivo += pago.monto;
              break;
            case 'transferencia':
              totalTransferencias += pago.monto;
              break;
            case 'cheque':
              totalCheques += pago.monto;
              break;
            case 'vale':
              totalVales += pago.monto;
              break;
          }
        });
        
        // Restar vuelto del efectivo
        if (venta.vuelto) {
          totalEfectivo -= venta.vuelto;
        }
      });
      
      const totalGastos = gastos.reduce((sum: number, g: { monto: number }) => sum + g.monto, 0);
      
      // Efectivo esperado = Fondo inicial + Efectivo recibido - Gastos - Devoluiones pagadas en efectivo
      const efectivoEsperado = turnoActual.fondoInicial + totalEfectivo - totalGastos;
      
      setResumenTurno({
        totalVentas,
        cantidadVentas: ventas.length,
        totalEfectivo,
        totalTransferencias,
        totalCheques,
        totalVales,
        totalGastos,
        totalDevoluciones,
        fondoInicial: turnoActual.fondoInicial,
        efectivoEsperado
      });
    };
    
    cargarResumen();
  }, [turnoActual]);
  
  // Calcular total contado
  const totalContado = 
    conteo.b20000 * 20000 +
    conteo.b10000 * 10000 +
    conteo.b2000 * 2000 +
    conteo.b1000 * 1000 +
    conteo.b500 * 500 +
    conteo.b200 * 200 +
    conteo.b100 * 100 +
    conteo.b50 * 50 +
    conteo.monedas;
  
  // Diferencia
  const diferencia = resumenTurno 
    ? totalContado - resumenTurno.efectivoEsperado 
    : 0;
  
  // Actualizar conteo
  const handleConteoChange = (key: keyof ConteoBilletes, delta: number) => {
    setConteo(prev => ({
      ...prev,
      [key]: Math.max(0, prev[key] + delta)
    }));
    
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  };
  
  // Realizar cierre
  const handleCerrar = async () => {
    if (!turnoActual || !vendedorActual || !resumenTurno) return;
    
    // Requerir justificación si hay diferencia significativa
    if (Math.abs(diferencia) > 500 && !justificacion.trim()) {
      agregarNotificacion('warning', 'Justificación requerida', 'Explique la diferencia de caja');
      return;
    }
    
    setGuardando(true);
    
    try {
      // Crear registro de cierre
      const cierre: CierreCaja = {
        id: uuidv4(),
        turnoId: turnoActual.id,
        fecha: new Date().toISOString(),
        fondoInicial: turnoActual.fondoInicial,
        totalVentas: resumenTurno.totalVentas,
        totalEfectivo: resumenTurno.totalEfectivo,
        totalTransferencias: resumenTurno.totalTransferencias,
        totalCheques: resumenTurno.totalCheques,
        totalVales: resumenTurno.totalVales,
        totalGastos: resumenTurno.totalGastos,
        totalDevoluciones: resumenTurno.totalDevoluciones,
        efectivoEsperado: resumenTurno.efectivoEsperado,
        efectivoContado: totalContado,
        diferencia,
        conteoBilletes: conteo,
        totalContado,
        totalEsperado: resumenTurno.efectivoEsperado,
        justificacionDiferencia: diferencia !== 0 ? justificacion.trim() : undefined,
        chequesEnMano: [],
        vendedorId: vendedorActual.id,
        timestamp: Date.now(),
        sincronizado: false
      };
      
      await db.cierresCaja.add(cierre);
      
      // Encolar para sincronización
      await db.syncQueue.add({
        id: uuidv4(),
        tipo: 'cierre',
        datos: cierre,
        timestamp: Date.now(),
        intentos: 0,
        ultimoIntento: null,
        estado: 'pendiente'
      });
      
      // Cerrar turno
      await cerrarTurno();
      
      agregarNotificacion(
        'success',
        'Turno cerrado',
        `Caja cerrada correctamente${diferencia !== 0 ? ` (Dif: ${formatearMoneda(diferencia)})` : ''}`
      );
      
      onClose();
    } catch (error) {
      agregarNotificacion('error', 'Error', 'No se pudo cerrar el turno');
    } finally {
      setGuardando(false);
    }
  };
  
  if (!turnoActual || !resumenTurno) {
    return null;
  }
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content p-0 w-full max-w-lg mx-4 max-h-[95vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-dark-400 border-b border-dark-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">🔒 Cierre de Caja</h3>
            <button
              onClick={onClose}
              className="text-zinc-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
          
          {/* Indicador de pasos */}
          <div className="flex gap-2 mt-4">
            {['conteo', 'resumen', 'confirmacion'].map((p, i) => (
              <div
                key={p}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  i <= ['conteo', 'resumen', 'confirmacion'].indexOf(paso)
                    ? 'bg-primary'
                    : 'bg-dark-200'
                }`}
              />
            ))}
          </div>
        </div>
        
        {/* Contenido */}
        <div className="flex-1 overflow-y-auto p-4">
          {paso === 'conteo' && (
            <PasoConteo
              conteo={conteo}
              onChange={handleConteoChange}
              totalContado={totalContado}
              efectivoEsperado={resumenTurno.efectivoEsperado}
            />
          )}
          
          {paso === 'resumen' && (
            <PasoResumen
              resumenTurno={resumenTurno}
              totalContado={totalContado}
              diferencia={diferencia}
              justificacion={justificacion}
              setJustificacion={setJustificacion}
            />
          )}
          
          {paso === 'confirmacion' && (
            <PasoConfirmacion
              resumenTurno={resumenTurno}
              totalContado={totalContado}
              diferencia={diferencia}
            />
          )}
        </div>
        
        {/* Footer */}
        <div className="p-4 bg-dark-400 border-t border-dark-100 flex-shrink-0">
          {paso === 'conteo' && (
            <button
              onClick={() => setPaso('resumen')}
              className="w-full btn-action-primary py-4"
            >
              Continuar →
            </button>
          )}
          
          {paso === 'resumen' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaso('conteo')}
                className="btn-action-secondary py-3"
              >
                ← Volver
              </button>
              <button
                onClick={() => setPaso('confirmacion')}
                className="btn-action-primary py-3"
              >
                Revisar →
              </button>
            </div>
          )}
          
          {paso === 'confirmacion' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setPaso('resumen')}
                className="btn-action-secondary py-3"
              >
                ← Volver
              </button>
              <button
                onClick={handleCerrar}
                disabled={guardando}
                className="btn-action-danger py-3 disabled:opacity-50"
              >
                {guardando ? 'Cerrando...' : '🔒 Cerrar Turno'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================
// PASO 1: CONTEO DE BILLETES
// ========================================

function PasoConteo({
  conteo,
  onChange,
  totalContado,
  efectivoEsperado
}: {
  conteo: ConteoBilletes;
  onChange: (key: keyof ConteoBilletes, delta: number) => void;
  totalContado: number;
  efectivoEsperado: number;
}) {
  const conteoKeys: Array<{ key: keyof ConteoBilletes; valor: number }> = [
    { key: 'b20000', valor: 20000 },
    { key: 'b10000', valor: 10000 },
    { key: 'b2000', valor: 2000 },
    { key: 'b1000', valor: 1000 },
    { key: 'b500', valor: 500 },
    { key: 'b200', valor: 200 },
    { key: 'b100', valor: 100 },
    { key: 'b50', valor: 50 },
  ];
  
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="text-lg font-semibold text-white">Conteo de Billetes</h4>
        <p className="text-zinc-400 text-sm">Cuente el efectivo en caja</p>
      </div>
      
      {/* Total parcial */}
      <div className="bg-dark-400 rounded-xl p-4 text-center sticky top-0 z-10">
        <span className="text-zinc-400 text-sm">Total contado</span>
        <div className="text-3xl font-bold text-primary font-mono mt-1">
          {formatearMoneda(totalContado)}
        </div>
        <div className={`text-sm mt-1 ${
          totalContado >= efectivoEsperado ? 'text-success' : 'text-warning'
        }`}>
          Esperado: {formatearMoneda(efectivoEsperado)}
        </div>
      </div>
      
      {/* Billetes */}
      <div className="space-y-2">
        {conteoKeys.map(({ key, valor }) => {
          const denom = DENOMINACIONES.find(d => d.valor === valor)!;
          const cantidad = conteo[key];
          
          return (
            <div
              key={key}
              className="flex items-center gap-3 bg-dark-400 rounded-xl p-3"
            >
              {/* Billete visual */}
              <div className={`w-16 h-10 rounded bg-gradient-to-br ${denom.color} flex items-center justify-center font-bold text-white text-xs shadow-lg`}>
                ${valor >= 1000 ? `${valor / 1000}K` : valor}
              </div>
              
              {/* Controles */}
              <div className="flex-1 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onChange(key, -1)}
                    disabled={cantidad === 0}
                    className="w-9 h-9 bg-dark-200 hover:bg-danger/20 hover:text-danger rounded-lg text-lg font-bold transition-colors disabled:opacity-30"
                  >
                    −
                  </button>
                  
                  <div className="w-10 text-center font-mono text-lg font-bold text-white">
                    {cantidad}
                  </div>
                  
                  <button
                    onClick={() => onChange(key, 1)}
                    className="w-9 h-9 bg-dark-200 hover:bg-success/20 hover:text-success rounded-lg text-lg font-bold transition-colors"
                  >
                    +
                  </button>
                </div>
                
                {/* Subtotal */}
                <div className="text-right font-mono">
                  <span className={cantidad > 0 ? 'text-primary' : 'text-zinc-600'}>
                    {formatearMoneda(cantidad * valor)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Monedas */}
        <div className="flex items-center gap-3 bg-dark-400 rounded-xl p-3">
          <div className="w-16 h-10 rounded bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center font-bold text-white text-xs shadow-lg">
            🪙
          </div>
          
          <div className="flex-1">
            <label className="text-zinc-400 text-xs">Monedas (total)</label>
            <input
              type="number"
              value={conteo.monedas || ''}
              onChange={(e) => {
                const valor = parseInt(e.target.value) || 0;
                onChange('monedas', valor - conteo.monedas);
              }}
              placeholder="0"
              className="input-dark mt-1 font-mono text-lg py-1"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ========================================
// PASO 2: RESUMEN
// ========================================

function PasoResumen({
  resumenTurno,
  totalContado,
  diferencia,
  justificacion,
  setJustificacion
}: {
  resumenTurno: any;
  totalContado: number;
  diferencia: number;
  justificacion: string;
  setJustificacion: (v: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-center">
        <h4 className="text-lg font-semibold text-white">Resumen del Turno</h4>
      </div>
      
      {/* Movimientos */}
      <div className="bg-dark-400 rounded-xl p-4 space-y-3">
        <div className="flex justify-between">
          <span className="text-zinc-400">Fondo inicial</span>
          <span className="font-mono text-white">{formatearMoneda(resumenTurno.fondoInicial)}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-zinc-400">Ventas ({resumenTurno.cantidadVentas})</span>
          <span className="font-mono text-success">+{formatearMoneda(resumenTurno.totalVentas)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500 pl-4">└ Efectivo</span>
          <span className="font-mono text-zinc-400">{formatearMoneda(resumenTurno.totalEfectivo)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500 pl-4">└ Transferencias</span>
          <span className="font-mono text-zinc-400">{formatearMoneda(resumenTurno.totalTransferencias)}</span>
        </div>
        
        <div className="flex justify-between text-sm">
          <span className="text-zinc-500 pl-4">└ Cheques</span>
          <span className="font-mono text-zinc-400">{formatearMoneda(resumenTurno.totalCheques)}</span>
        </div>
        
        {resumenTurno.totalVales > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-zinc-500 pl-4">└ Vales</span>
            <span className="font-mono text-zinc-400">{formatearMoneda(resumenTurno.totalVales)}</span>
          </div>
        )}
        
        {resumenTurno.totalGastos > 0 && (
          <div className="flex justify-between">
            <span className="text-zinc-400">Gastos</span>
            <span className="font-mono text-danger">-{formatearMoneda(resumenTurno.totalGastos)}</span>
          </div>
        )}
        
        {resumenTurno.totalDevoluciones > 0 && (
          <div className="flex justify-between">
            <span className="text-zinc-400">Devoluciones envases</span>
            <span className="font-mono text-warning">-{formatearMoneda(resumenTurno.totalDevoluciones)}</span>
          </div>
        )}
        
        <div className="border-t border-dark-200 pt-3 flex justify-between">
          <span className="font-semibold text-white">Efectivo esperado</span>
          <span className="font-mono font-bold text-primary">
            {formatearMoneda(resumenTurno.efectivoEsperado)}
          </span>
        </div>
      </div>
      
      {/* Comparación */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-dark-400 rounded-xl p-4 text-center">
          <span className="text-zinc-400 text-sm">Esperado</span>
          <div className="text-xl font-bold text-white font-mono mt-1">
            {formatearMoneda(resumenTurno.efectivoEsperado)}
          </div>
        </div>
        
        <div className="bg-dark-400 rounded-xl p-4 text-center">
          <span className="text-zinc-400 text-sm">Contado</span>
          <div className="text-xl font-bold text-primary font-mono mt-1">
            {formatearMoneda(totalContado)}
          </div>
        </div>
      </div>
      
      {/* Diferencia */}
      <div className={`rounded-xl p-4 text-center ${
        diferencia === 0 
          ? 'bg-success/20' 
          : diferencia > 0 
            ? 'bg-info/20'
            : 'bg-danger/20'
      }`}>
        <span className="text-zinc-300 text-sm">Diferencia</span>
        <div className={`text-3xl font-bold font-mono mt-1 ${
          diferencia === 0 
            ? 'text-success' 
            : diferencia > 0 
              ? 'text-info'
              : 'text-danger'
        }`}>
          {diferencia >= 0 ? '+' : ''}{formatearMoneda(diferencia)}
        </div>
        {diferencia === 0 && (
          <span className="text-success text-sm">✓ Caja cuadrada</span>
        )}
        {diferencia > 0 && (
          <span className="text-info text-sm">Sobrante de caja</span>
        )}
        {diferencia < 0 && (
          <span className="text-danger text-sm">Faltante de caja</span>
        )}
      </div>
      
      {/* Justificación si hay diferencia */}
      {diferencia !== 0 && (
        <div>
          <label className="text-zinc-400 text-sm">
            Justificación de diferencia {Math.abs(diferencia) > 500 && '*'}
          </label>
          <textarea
            value={justificacion}
            onChange={(e) => setJustificacion(e.target.value)}
            placeholder="Explique la diferencia..."
            rows={3}
            className="input-dark mt-1 resize-none"
          />
        </div>
      )}
    </div>
  );
}

// ========================================
// PASO 3: CONFIRMACIÓN
// ========================================

function PasoConfirmacion({
  resumenTurno,
  totalContado,
  diferencia
}: {
  resumenTurno: any;
  totalContado: number;
  diferencia: number;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center py-6">
        <span className="text-6xl">🔒</span>
        <h4 className="text-xl font-bold text-white mt-4">
          ¿Confirmar cierre de turno?
        </h4>
        <p className="text-zinc-400 mt-2">
          Esta acción no se puede deshacer
        </p>
      </div>
      
      <div className="bg-dark-400 rounded-xl p-6 space-y-4">
        <div className="flex justify-between text-lg">
          <span className="text-zinc-400">Ventas totales</span>
          <span className="font-mono font-bold text-success">
            {formatearMoneda(resumenTurno.totalVentas)}
          </span>
        </div>
        
        <div className="flex justify-between text-lg">
          <span className="text-zinc-400">Efectivo contado</span>
          <span className="font-mono font-bold text-primary">
            {formatearMoneda(totalContado)}
          </span>
        </div>
        
        <div className={`flex justify-between text-lg pt-3 border-t border-dark-200 ${
          diferencia === 0 ? 'text-success' : diferencia > 0 ? 'text-info' : 'text-danger'
        }`}>
          <span>Diferencia</span>
          <span className="font-mono font-bold">
            {diferencia >= 0 ? '+' : ''}{formatearMoneda(diferencia)}
          </span>
        </div>
      </div>
      
      <div className="bg-warning/20 rounded-xl p-4 text-center">
        <span className="text-warning text-sm">
          ⚠️ Al cerrar el turno, se generará el informe y se reiniciará la caja
        </span>
      </div>
    </div>
  );
}
