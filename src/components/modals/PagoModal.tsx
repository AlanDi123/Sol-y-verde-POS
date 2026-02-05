// ========================================
// MODAL DE PAGO
// ========================================

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { useVentasStore } from '../../stores/ventasStore';
import { useUIStore } from '../../stores/uiStore';
import { formatearMoneda, type ConfigBanco } from '../../types';

interface PagoModalProps {
  onClose: () => void;
}

type PasoActual = 'metodo' | 'efectivo' | 'transferencia' | 'cheque' | 'resumen';

export function PagoModal({ onClose }: PagoModalProps) {
  const [paso, setPaso] = useState<PasoActual>('metodo');
  const [montoEfectivo, setMontoEfectivo] = useState('');
  const [bancoSeleccionado, setBancoSeleccionado] = useState<ConfigBanco | null>(null);
  const [conIva, setConIva] = useState(false);
  const [montoCheque, setMontoCheque] = useState('');
  const [datosCheque, setDatosCheque] = useState({
    banco: '',
    numero: '',
    vencimiento: ''
  });
  
  const ventaEnProceso = useVentasStore(state => state.ventaEnProceso);
  const agregarPago = useVentasStore(state => state.agregarPago);
  const eliminarPago = useVentasStore(state => state.eliminarPago);
  const finalizarVenta = useVentasStore(state => state.finalizarVenta);
  const cancelarVenta = useVentasStore(state => state.cancelarVenta);
  const procesando = useVentasStore(state => state.procesando);
  
  const agregarNotificacion = useUIStore(state => state.agregarNotificacion);
  
  // Obtener bancos
  const bancos = useLiveQuery(
    () => db.bancos.filter(b => b.activo).sortBy('orden'),
    []
  );
  
  if (!ventaEnProceso) {
    return null;
  }
  
  const totalPendiente = Math.max(0, ventaEnProceso.total - ventaEnProceso.totalPagado);
  const pagoCompleto = ventaEnProceso.totalPagado >= ventaEnProceso.total;
  
  // Agregar pago en efectivo
  const handlePagoEfectivo = () => {
    const monto = parseFloat(montoEfectivo) || totalPendiente;
    const vuelto = monto > totalPendiente ? monto - totalPendiente : 0;
    
    agregarPago({
      metodo: 'efectivo',
      monto: Math.min(monto, ventaEnProceso.total - ventaEnProceso.totalPagado + vuelto),
      detalleEfectivo: {
        montoRecibido: monto,
        vuelto
      }
    });
    
    setMontoEfectivo('');
    setPaso('resumen');
  };
  
  // Agregar pago con transferencia
  const handlePagoTransferencia = () => {
    if (!bancoSeleccionado) return;
    
    const montoBase = totalPendiente;
    void (conIva ? montoBase * 1.10 : montoBase); // Para mostrar al usuario
    
    agregarPago({
      metodo: 'transferencia',
      monto: montoBase,
      detalleTransferencia: {
        banco: bancoSeleccionado.nombre,
        alias: bancoSeleccionado.alias,
        conIva,
        montoSinIva: conIva ? montoBase : undefined
      }
    });
    
    setBancoSeleccionado(null);
    setConIva(false);
    setPaso('resumen');
  };
  
  // Agregar pago con cheque
  const handlePagoCheque = () => {
    const monto = parseFloat(montoCheque) || totalPendiente;
    
    if (!datosCheque.banco || !datosCheque.numero || !datosCheque.vencimiento) {
      agregarNotificacion('error', 'Datos incompletos', 'Complete todos los campos del cheque');
      return;
    }
    
    agregarPago({
      metodo: 'cheque',
      monto,
      detalleCheque: {
        banco: datosCheque.banco,
        numeroCheque: datosCheque.numero,
        fechaVencimiento: datosCheque.vencimiento
      }
    });
    
    setMontoCheque('');
    setDatosCheque({ banco: '', numero: '', vencimiento: '' });
    setPaso('resumen');
  };
  
  // Finalizar venta
  const handleFinalizar = async () => {
    const venta = await finalizarVenta();
    if (venta) {
      onClose();
    }
  };
  
  // Cancelar todo
  const handleCancelar = () => {
    cancelarVenta();
    onClose();
  };
  
  return (
    <div className="modal-overlay" onClick={handleCancelar}>
      <div 
        className="modal-content p-0 w-full max-w-md mx-4 max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 bg-dark-400 border-b border-dark-100 flex-shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-bold text-white">💰 Cobrar</h3>
            <button
              onClick={handleCancelar}
              className="text-zinc-400 hover:text-white text-xl"
            >
              ✕
            </button>
          </div>
          
          {/* Total y pendiente */}
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <span className="text-zinc-400 text-sm">Total</span>
              <div className="text-2xl font-bold text-white font-mono">
                {formatearMoneda(ventaEnProceso.total)}
              </div>
            </div>
            <div>
              <span className="text-zinc-400 text-sm">Pendiente</span>
              <div className={`text-2xl font-bold font-mono ${pagoCompleto ? 'text-success' : 'text-primary'}`}>
                {pagoCompleto ? '✓ Pagado' : formatearMoneda(totalPendiente)}
              </div>
            </div>
          </div>
          
          {/* Vuelto si hay */}
          {ventaEnProceso.vuelto > 0 && (
            <div className="mt-3 p-3 bg-warning/20 rounded-lg">
              <span className="text-warning font-bold">
                Vuelto: {formatearMoneda(ventaEnProceso.vuelto)}
              </span>
            </div>
          )}
        </div>
        
        {/* Contenido según paso */}
        <div className="flex-1 overflow-y-auto p-4">
          {paso === 'metodo' && (
            <PasoMetodo
              onEfectivo={() => setPaso('efectivo')}
              onTransferencia={() => setPaso('transferencia')}
              onCheque={() => setPaso('cheque')}
              totalPendiente={totalPendiente}
            />
          )}
          
          {paso === 'efectivo' && (
            <PasoEfectivo
              totalPendiente={totalPendiente}
              montoEfectivo={montoEfectivo}
              setMontoEfectivo={setMontoEfectivo}
              onConfirmar={handlePagoEfectivo}
              onVolver={() => setPaso('metodo')}
            />
          )}
          
          {paso === 'transferencia' && bancos && (
            <PasoTransferencia
              totalPendiente={totalPendiente}
              bancos={bancos}
              bancoSeleccionado={bancoSeleccionado}
              setBancoSeleccionado={setBancoSeleccionado}
              conIva={conIva}
              setConIva={setConIva}
              onConfirmar={handlePagoTransferencia}
              onVolver={() => setPaso('metodo')}
            />
          )}
          
          {paso === 'cheque' && (
            <PasoCheque
              totalPendiente={totalPendiente}
              montoCheque={montoCheque}
              setMontoCheque={setMontoCheque}
              datosCheque={datosCheque}
              setDatosCheque={setDatosCheque}
              onConfirmar={handlePagoCheque}
              onVolver={() => setPaso('metodo')}
            />
          )}
          
          {paso === 'resumen' && (
            <PasoResumen
              ventaEnProceso={ventaEnProceso}
              onAgregarMas={() => setPaso('metodo')}
              onEliminarPago={eliminarPago}
            />
          )}
        </div>
        
        {/* Footer con acciones */}
        <div className="p-4 bg-dark-400 border-t border-dark-100 flex-shrink-0">
          {pagoCompleto ? (
            <button
              onClick={handleFinalizar}
              disabled={procesando}
              className="w-full btn-action-primary py-4 text-lg disabled:opacity-50"
            >
              {procesando ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Procesando...
                </span>
              ) : (
                <>✓ Finalizar Venta</>
              )}
            </button>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleCancelar}
                className="btn-action-secondary py-3"
              >
                Cancelar
              </button>
              {paso !== 'metodo' && (
                <button
                  onClick={() => setPaso('metodo')}
                  className="btn-action-primary py-3"
                >
                  Agregar Pago
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ========================================
// COMPONENTES DE PASOS
// ========================================

function PasoMetodo({ 
  onEfectivo, 
  onTransferencia, 
  onCheque,
  totalPendiente: _totalPendiente 
}: {
  onEfectivo: () => void;
  onTransferencia: () => void;
  onCheque: () => void;
  totalPendiente: number;
}) {
  return (
    <div className="space-y-3">
      <p className="text-zinc-400 text-center mb-4">
        Seleccione método de pago
      </p>
      
      <button
        onClick={onEfectivo}
        className="w-full bg-dark-400 hover:bg-dark-200 p-4 rounded-xl flex items-center gap-4 transition-colors"
      >
        <span className="text-4xl">💵</span>
        <div className="text-left">
          <div className="font-semibold text-white text-lg">Efectivo</div>
          <div className="text-zinc-400 text-sm">Pago en efectivo con calculadora de vuelto</div>
        </div>
      </button>
      
      <button
        onClick={onTransferencia}
        className="w-full bg-dark-400 hover:bg-dark-200 p-4 rounded-xl flex items-center gap-4 transition-colors"
      >
        <span className="text-4xl">📱</span>
        <div className="text-left">
          <div className="font-semibold text-white text-lg">Transferencia</div>
          <div className="text-zinc-400 text-sm">Pago con transferencia bancaria</div>
        </div>
      </button>
      
      <button
        onClick={onCheque}
        className="w-full bg-dark-400 hover:bg-dark-200 p-4 rounded-xl flex items-center gap-4 transition-colors"
      >
        <span className="text-4xl">📄</span>
        <div className="text-left">
          <div className="font-semibold text-white text-lg">Cheque</div>
          <div className="text-zinc-400 text-sm">Pago con cheque (registrar datos)</div>
        </div>
      </button>
    </div>
  );
}

function PasoEfectivo({
  totalPendiente,
  montoEfectivo,
  setMontoEfectivo,
  onConfirmar,
  onVolver
}: {
  totalPendiente: number;
  montoEfectivo: string;
  setMontoEfectivo: (v: string) => void;
  onConfirmar: () => void;
  onVolver: () => void;
}) {
  const monto = parseFloat(montoEfectivo) || 0;
  const vuelto = monto > totalPendiente ? monto - totalPendiente : 0;
  
  // Montos rápidos
  const montosRapidos = [
    totalPendiente,
    Math.ceil(totalPendiente / 1000) * 1000,
    Math.ceil(totalPendiente / 5000) * 5000,
    Math.ceil(totalPendiente / 10000) * 10000,
  ].filter((v, i, arr) => arr.indexOf(v) === i && v >= totalPendiente);
  
  return (
    <div className="space-y-4">
      <button
        onClick={onVolver}
        className="text-zinc-400 hover:text-white text-sm flex items-center gap-1"
      >
        ← Cambiar método
      </button>
      
      <div className="text-center">
        <span className="text-5xl">💵</span>
        <h4 className="text-lg font-semibold text-white mt-2">Pago en Efectivo</h4>
      </div>
      
      {/* Monto recibido */}
      <div className="bg-dark-400 rounded-xl p-4">
        <label className="text-zinc-400 text-sm">Monto recibido</label>
        <input
          type="number"
          value={montoEfectivo}
          onChange={(e) => setMontoEfectivo(e.target.value)}
          placeholder={totalPendiente.toString()}
          className="input-dark text-3xl font-bold text-center font-mono mt-2"
          autoFocus
        />
      </div>
      
      {/* Montos rápidos */}
      <div className="grid grid-cols-2 gap-2">
        {montosRapidos.slice(0, 4).map((m) => (
          <button
            key={m}
            onClick={() => setMontoEfectivo(m.toString())}
            className="bg-dark-400 hover:bg-primary/20 hover:text-primary p-3 rounded-lg font-mono font-bold transition-colors"
          >
            {formatearMoneda(m)}
          </button>
        ))}
      </div>
      
      {/* Vuelto */}
      {vuelto > 0 && (
        <div className="bg-warning/20 rounded-xl p-4 text-center">
          <span className="text-zinc-400">Vuelto a entregar</span>
          <div className="text-3xl font-bold text-warning font-mono mt-1">
            {formatearMoneda(vuelto)}
          </div>
        </div>
      )}
      
      <button
        onClick={onConfirmar}
        className="w-full btn-action-primary py-4"
      >
        Confirmar Pago
      </button>
    </div>
  );
}

function PasoTransferencia({
  totalPendiente,
  bancos,
  bancoSeleccionado,
  setBancoSeleccionado,
  conIva,
  setConIva,
  onConfirmar,
  onVolver
}: {
  totalPendiente: number;
  bancos: ConfigBanco[];
  bancoSeleccionado: ConfigBanco | null;
  setBancoSeleccionado: (b: ConfigBanco | null) => void;
  conIva: boolean;
  setConIva: (v: boolean) => void;
  onConfirmar: () => void;
  onVolver: () => void;
}) {
  const montoConIva = totalPendiente * 1.10;
  
  return (
    <div className="space-y-4">
      <button
        onClick={onVolver}
        className="text-zinc-400 hover:text-white text-sm flex items-center gap-1"
      >
        ← Cambiar método
      </button>
      
      <div className="text-center">
        <span className="text-5xl">📱</span>
        <h4 className="text-lg font-semibold text-white mt-2">Transferencia</h4>
      </div>
      
      {/* Selector de banco */}
      <div className="space-y-2">
        <label className="text-zinc-400 text-sm">Seleccionar cuenta</label>
        {bancos.map((banco) => (
          <button
            key={banco.id}
            onClick={() => setBancoSeleccionado(banco)}
            className={`w-full p-4 rounded-xl text-left transition-colors ${
              bancoSeleccionado?.id === banco.id
                ? 'bg-primary/20 ring-2 ring-primary'
                : 'bg-dark-400 hover:bg-dark-200'
            }`}
          >
            <div className="font-semibold text-white">{banco.nombre}</div>
            <div className="text-primary font-mono text-lg mt-1">{banco.alias}</div>
          </button>
        ))}
      </div>
      
      {/* Alias grande cuando está seleccionado */}
      {bancoSeleccionado && (
        <div className="bg-primary/10 rounded-xl p-6 text-center">
          <span className="text-zinc-400 text-sm">Alias para transferir</span>
          <div className="text-2xl font-bold text-primary font-mono mt-2 select-all">
            {bancoSeleccionado.alias}
          </div>
          <div className="text-xl font-bold text-white mt-2">
            {formatearMoneda(conIva ? montoConIva : totalPendiente)}
          </div>
        </div>
      )}
      
      {/* Toggle IVA */}
      <button
        onClick={() => setConIva(!conIva)}
        className={`w-full p-4 rounded-xl flex items-center justify-between transition-colors ${
          conIva ? 'bg-info/20 ring-2 ring-info' : 'bg-dark-400'
        }`}
      >
        <span className="text-white">Agregar 10% IVA</span>
        <div className={`w-12 h-6 rounded-full transition-colors ${conIva ? 'bg-info' : 'bg-dark-200'}`}>
          <div className={`w-5 h-5 bg-white rounded-full transform transition-transform mt-0.5 ${conIva ? 'translate-x-6' : 'translate-x-0.5'}`} />
        </div>
      </button>
      
      {conIva && (
        <div className="text-center text-zinc-400 text-sm">
          Monto con IVA: {formatearMoneda(montoConIva)}
        </div>
      )}
      
      <button
        onClick={onConfirmar}
        disabled={!bancoSeleccionado}
        className="w-full btn-action-primary py-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Confirmar Transferencia
      </button>
    </div>
  );
}

function PasoCheque({
  totalPendiente,
  montoCheque,
  setMontoCheque,
  datosCheque,
  setDatosCheque,
  onConfirmar,
  onVolver
}: {
  totalPendiente: number;
  montoCheque: string;
  setMontoCheque: (v: string) => void;
  datosCheque: { banco: string; numero: string; vencimiento: string };
  setDatosCheque: (v: { banco: string; numero: string; vencimiento: string }) => void;
  onConfirmar: () => void;
  onVolver: () => void;
}) {
  return (
    <div className="space-y-4">
      <button
        onClick={onVolver}
        className="text-zinc-400 hover:text-white text-sm flex items-center gap-1"
      >
        ← Cambiar método
      </button>
      
      <div className="text-center">
        <span className="text-5xl">📄</span>
        <h4 className="text-lg font-semibold text-white mt-2">Pago con Cheque</h4>
      </div>
      
      {/* Campos del cheque */}
      <div className="space-y-3">
        <div>
          <label className="text-zinc-400 text-sm">Banco</label>
          <input
            type="text"
            value={datosCheque.banco}
            onChange={(e) => setDatosCheque({ ...datosCheque, banco: e.target.value })}
            placeholder="Ej: Banco Galicia"
            className="input-dark mt-1"
          />
        </div>
        
        <div>
          <label className="text-zinc-400 text-sm">Número de Cheque</label>
          <input
            type="text"
            value={datosCheque.numero}
            onChange={(e) => setDatosCheque({ ...datosCheque, numero: e.target.value })}
            placeholder="Ej: 12345678"
            className="input-dark mt-1"
          />
        </div>
        
        <div>
          <label className="text-zinc-400 text-sm">Fecha de Vencimiento</label>
          <input
            type="date"
            value={datosCheque.vencimiento}
            onChange={(e) => setDatosCheque({ ...datosCheque, vencimiento: e.target.value })}
            className="input-dark mt-1"
          />
        </div>
        
        <div>
          <label className="text-zinc-400 text-sm">Importe</label>
          <input
            type="number"
            value={montoCheque}
            onChange={(e) => setMontoCheque(e.target.value)}
            placeholder={totalPendiente.toString()}
            className="input-dark mt-1 text-xl font-mono"
          />
        </div>
      </div>
      
      <button
        onClick={onConfirmar}
        className="w-full btn-action-primary py-4"
      >
        Registrar Cheque
      </button>
    </div>
  );
}

function PasoResumen({
  ventaEnProceso,
  onAgregarMas,
  onEliminarPago
}: {
  ventaEnProceso: any;
  onAgregarMas: () => void;
  onEliminarPago: (id: string) => void;
}) {
  const totalPendiente = Math.max(0, ventaEnProceso.total - ventaEnProceso.totalPagado);
  
  return (
    <div className="space-y-4">
      <h4 className="text-lg font-semibold text-white">Resumen de Pagos</h4>
      
      {/* Lista de pagos */}
      <div className="space-y-2">
        {ventaEnProceso.pagos.map((pago: any) => (
          <div key={pago.id} className="bg-dark-400 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">
                {pago.metodo === 'efectivo' && '💵'}
                {pago.metodo === 'transferencia' && '📱'}
                {pago.metodo === 'cheque' && '📄'}
              </span>
              <div>
                <div className="font-semibold text-white capitalize">{pago.metodo}</div>
                {pago.detalleEfectivo && pago.detalleEfectivo.vuelto > 0 && (
                  <div className="text-xs text-warning">
                    Vuelto: {formatearMoneda(pago.detalleEfectivo.vuelto)}
                  </div>
                )}
                {pago.detalleTransferencia && (
                  <div className="text-xs text-zinc-400">
                    {pago.detalleTransferencia.banco}
                    {pago.detalleTransferencia.conIva && ' (+IVA)'}
                  </div>
                )}
                {pago.detalleCheque && (
                  <div className="text-xs text-zinc-400">
                    {pago.detalleCheque.banco} - #{pago.detalleCheque.numeroCheque}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-lg font-bold text-primary font-mono">
                {formatearMoneda(pago.monto)}
              </span>
              <button
                onClick={() => onEliminarPago(pago.id)}
                className="text-zinc-500 hover:text-danger text-xl transition-colors"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
      
      {/* Botón agregar más si falta */}
      {totalPendiente > 0 && (
        <button
          onClick={onAgregarMas}
          className="w-full bg-dark-400 hover:bg-dark-200 p-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
        >
          <span className="text-xl">➕</span>
          <span className="text-white">Agregar otro pago</span>
          <span className="text-primary font-mono font-bold">
            ({formatearMoneda(totalPendiente)} pendiente)
          </span>
        </button>
      )}
    </div>
  );
}
