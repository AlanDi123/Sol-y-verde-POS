// ========================================
// MODAL DE DESCUENTOS
// ========================================

import { useState } from 'react';

interface Descuento {
  id: string;
  tipo: 'porcentaje' | 'monto_fijo';
  valor: number;
  razon: string;
  aplicadoPor: string;
  timestamp: number;
}

interface DescuentoModalProps {
  subtotal: number;
  onAplicar: (descuento: Descuento) => void;
  onCerrar: () => void;
}

export function DescuentoModal({ subtotal, onAplicar, onCerrar }: DescuentoModalProps) {
  const [tipo, setTipo] = useState<'porcentaje' | 'monto_fijo'>('porcentaje');
  const [valor, setValor] = useState('');
  const [razon, setRazon] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const handleAplicar = () => {
    // Validaciones
    if (!valor || parseFloat(valor) <= 0) {
      setError('Ingresa un valor válido');
      return;
    }
    
    if (!razon.trim()) {
      setError('Debes especificar la razón del descuento');
      return;
    }
    
    const valorNum = parseFloat(valor);
    
    // Validar según tipo
    if (tipo === 'porcentaje' && valorNum > 100) {
      setError('El porcentaje no puede ser mayor a 100%');
      return;
    }
    
    if (tipo === 'monto_fijo' && valorNum > subtotal) {
      setError('El descuento no puede ser mayor al subtotal');
      return;
    }
    
    // Crear objeto descuento
    const descuento: Descuento = {
      id: `desc-${Date.now()}`,
      tipo,
      valor: valorNum,
      razon: razon.trim(),
      aplicadoPor: 'vendedor-actual', // Se debe obtener del store de sesión
      timestamp: Date.now(),
    };
    
    onAplicar(descuento);
  };
  
  const calcularDescuento = (): number => {
    if (!valor) return 0;
    const valorNum = parseFloat(valor);
    
    if (tipo === 'porcentaje') {
      return (subtotal * valorNum) / 100;
    } else {
      return valorNum;
    }
  };
  
  const descuentoCalculado = calcularDescuento();
  const totalConDescuento = Math.max(0, subtotal - descuentoCalculado);
  
  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-content w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--sv-texto)' }}>
          💰 Aplicar Descuento
        </h2>
        
        {/* Tipo de descuento */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--sv-texto-secundario)' }}>
            Tipo de descuento
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setTipo('porcentaje')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                tipo === 'porcentaje'
                  ? 'btn-action-primary'
                  : 'btn-action-secondary'
              }`}
            >
              % Porcentaje
            </button>
            <button
              onClick={() => setTipo('monto_fijo')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                tipo === 'monto_fijo'
                  ? 'btn-action-primary'
                  : 'btn-action-secondary'
              }`}
            >
              $ Monto Fijo
            </button>
          </div>
        </div>
        
        {/* Valor del descuento */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--sv-texto-secundario)' }}>
            {tipo === 'porcentaje' ? 'Porcentaje (%)' : 'Monto ($)'}
          </label>
          <input
            type="number"
            value={valor}
            onChange={(e) => {
              setValor(e.target.value);
              setError(null);
            }}
            placeholder={tipo === 'porcentaje' ? 'Ej: 10' : 'Ej: 5000'}
            className="input-base text-xl"
            autoFocus
            min="0"
            max={tipo === 'porcentaje' ? '100' : subtotal.toString()}
            step={tipo === 'porcentaje' ? '1' : '100'}
          />
        </div>
        
        {/* Razón del descuento - OBLIGATORIO */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--sv-texto-secundario)' }}>
            Razón del descuento *
          </label>
          <textarea
            value={razon}
            onChange={(e) => {
              setRazon(e.target.value);
              setError(null);
            }}
            placeholder="Ej: Cliente frecuente, Promoción especial, Producto próximo a vencer..."
            className="input-base resize-none"
            rows={3}
            maxLength={200}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--sv-texto-muted)' }}>
            {razon.length}/200 caracteres
          </p>
        </div>
        
        {/* Resumen */}
        {valor && (
          <div className="card mb-6 p-4">
            <div className="flex justify-between mb-2">
              <span style={{ color: 'var(--sv-texto-secundario)' }}>Subtotal:</span>
              <span className="font-semibold">${subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span style={{ color: 'var(--sv-texto-secundario)' }}>Descuento:</span>
              <span className="font-semibold" style={{ color: 'var(--sv-secundario)' }}>
                -${descuentoCalculado.toLocaleString()}
              </span>
            </div>
            <div className="border-t pt-2 mt-2" style={{ borderColor: 'var(--sv-borde)' }}>
              <div className="flex justify-between">
                <span className="font-bold">Total:</span>
                <span className="font-bold text-xl" style={{ color: 'var(--sv-primario)' }}>
                  ${totalConDescuento.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: 'var(--sv-peligro)', color: 'white' }}>
            {error}
          </div>
        )}
        
        {/* Botones */}
        <div className="flex gap-3">
          <button
            onClick={onCerrar}
            className="flex-1 btn-action-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={handleAplicar}
            className="flex-1 btn-action-primary"
            disabled={!valor || !razon.trim()}
          >
            Aplicar Descuento
          </button>
        </div>
      </div>
    </div>
  );
}
