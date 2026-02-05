// ========================================
// MODAL DE TECLADO NUMÉRICO
// ========================================

import { useState, useEffect, useCallback } from 'react';
import { useUIStore } from '../../stores/uiStore';
import { formatearMoneda } from '../../types';

interface NumpadModalProps {
  onClose: () => void;
}

export function NumpadModal({ onClose }: NumpadModalProps) {
  const numpadData = useUIStore(state => state.numpadData);
  
  const [valor, setValor] = useState('');
  
  // Inicializar con valor inicial
  useEffect(() => {
    if (numpadData?.valorInicial) {
      setValor(numpadData.valorInicial.toString());
    }
  }, [numpadData?.valorInicial]);
  
  // Manejar tecla
  const handleKeyPress = useCallback((key: string) => {
    if (key === 'backspace') {
      setValor(prev => prev.slice(0, -1));
    } else if (key === 'clear') {
      setValor('');
    } else if (key === '000') {
      setValor(prev => prev + '000');
    } else if (key === '.') {
      if (!valor.includes('.')) {
        setValor(prev => prev + '.');
      }
    } else {
      setValor(prev => prev + key);
    }
    
    // Vibración
    if ('vibrate' in navigator) {
      navigator.vibrate(15);
    }
  }, [valor]);
  
  // Confirmar
  const handleConfirmar = useCallback(() => {
    const valorNumerico = parseFloat(valor) || 0;
    
    // Validar mínimo
    if (numpadData?.min !== undefined && valorNumerico < numpadData.min) {
      return;
    }
    
    // Validar máximo
    if (numpadData?.max !== undefined && valorNumerico > numpadData.max) {
      return;
    }
    
    numpadData?.onConfirm(valorNumerico);
    onClose();
  }, [valor, numpadData, onClose]);
  
  // Teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleKeyPress('backspace');
      } else if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'Enter') {
        handleConfirmar();
      } else if (e.key === '.' || e.key === ',') {
        handleKeyPress('.');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleConfirmar, onClose]);
  
  if (!numpadData) return null;
  
  const valorNumerico = parseFloat(valor) || 0;
  const esPrecio = numpadData.tipo === 'precio' || numpadData.tipo === 'dinero';
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content p-6 w-full max-w-sm mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Título */}
        <h3 className="text-xl font-bold text-white text-center mb-4">
          {numpadData.titulo}
        </h3>
        
        {/* Display del valor */}
        <div className="bg-dark-400 rounded-xl p-4 mb-4">
          <div className={`
            text-right font-mono font-bold
            ${esPrecio ? 'text-4xl text-primary' : 'text-5xl text-white'}
          `}>
            {esPrecio ? formatearMoneda(valorNumerico) : (valor || '0')}
          </div>
        </div>
        
        {/* Teclado numérico */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              onClick={() => handleKeyPress(digit)}
              className="btn-numpad"
            >
              {digit}
            </button>
          ))}
          
          {/* Fila inferior */}
          {esPrecio ? (
            <button
              onClick={() => handleKeyPress('000')}
              className="btn-numpad text-xl"
            >
              000
            </button>
          ) : (
            <button
              onClick={() => handleKeyPress('.')}
              className="btn-numpad text-xl"
            >
              .
            </button>
          )}
          
          <button
            onClick={() => handleKeyPress('0')}
            className="btn-numpad"
          >
            0
          </button>
          
          <button
            onClick={() => handleKeyPress('backspace')}
            className="btn-numpad-delete"
          >
            ⌫
          </button>
        </div>
        
        {/* Botones de acción */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="btn-action-secondary py-4"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirmar}
            className="btn-action-primary py-4"
          >
            ✓ Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
