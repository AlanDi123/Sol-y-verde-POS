// ========================================
// PANTALLA DE INICIO DE TURNO
// ========================================

import { useState, useCallback, useEffect } from 'react';
import { useSesionStore } from '../stores/sesionStore';
import { formatearMoneda } from '../types';

export function InicioTurno() {
  const [saldoInicial, setSaldoInicial] = useState('');
  const [iniciando, setIniciando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const vendedorActual = useSesionStore(state => state.vendedorActual);
  const iniciarTurno = useSesionStore(state => state.iniciarTurno);
  const cerrarSesion = useSesionStore(state => state.cerrarSesion);
  
  // Manejar tecla del numpad
  const handleKeyPress = useCallback((key: string) => {
    if (key === 'backspace') {
      setSaldoInicial(prev => prev.slice(0, -1));
    } else if (key === 'clear') {
      setSaldoInicial('');
    } else if (key === '000') {
      setSaldoInicial(prev => prev + '000');
    } else {
      setSaldoInicial(prev => prev + key);
    }
    setError(null);
    
    // Vibración
    if ('vibrate' in navigator) {
      navigator.vibrate(20);
    }
  }, []);
  
  // Confirmar inicio de turno
  const handleIniciar = async () => {
    const monto = parseInt(saldoInicial) || 0;
    
    if (monto < 0) {
      setError('El saldo no puede ser negativo');
      return;
    }
    
    setIniciando(true);
    setError(null);
    
    try {
      await iniciarTurno(monto);
    } catch (err) {
      setError('Error al iniciar turno');
      setIniciando(false);
    }
  };
  
  // Teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleKeyPress('backspace');
      } else if (e.key === 'Escape') {
        handleKeyPress('clear');
      } else if (e.key === 'Enter') {
        handleIniciar();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleIniciar]);
  
  const montoNumerico = parseInt(saldoInicial) || 0;
  
  return (
    <div className="min-h-screen bg-dark-400 flex flex-col items-center justify-center p-4">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">👋</div>
        <h1 className="text-2xl font-bold text-white mb-1">
          ¡Hola, {vendedorActual?.nombre}!
        </h1>
        <p className="text-zinc-400">
          Ingrese el saldo inicial de caja para comenzar
        </p>
      </div>
      
      {/* Display del monto */}
      <div className="bg-dark-300 rounded-2xl p-6 w-full max-w-sm mb-6">
        <label className="text-zinc-400 text-sm mb-2 block">
          Saldo Inicial
        </label>
        <div className="text-4xl font-bold text-primary font-mono text-right">
          {formatearMoneda(montoNumerico)}
        </div>
      </div>
      
      {/* Error */}
      {error && (
        <div className="bg-danger/20 text-danger px-4 py-2 rounded-lg mb-4 animate-shake">
          {error}
        </div>
      )}
      
      {/* Teclado numérico */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-sm mb-6">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            onClick={() => handleKeyPress(digit)}
            disabled={iniciando}
            className="btn-numpad disabled:opacity-50"
          >
            {digit}
          </button>
        ))}
        
        {/* Fila inferior */}
        <button
          onClick={() => handleKeyPress('000')}
          disabled={iniciando}
          className="btn-numpad text-xl disabled:opacity-50"
        >
          000
        </button>
        
        <button
          onClick={() => handleKeyPress('0')}
          disabled={iniciando}
          className="btn-numpad disabled:opacity-50"
        >
          0
        </button>
        
        <button
          onClick={() => handleKeyPress('backspace')}
          disabled={iniciando}
          className="btn-numpad-delete text-2xl"
        >
          ⌫
        </button>
      </div>
      
      {/* Botones de acción */}
      <div className="w-full max-w-sm space-y-3">
        <button
          onClick={handleIniciar}
          disabled={iniciando}
          className="w-full btn-action-primary disabled:opacity-50"
        >
          {iniciando ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Iniciando...
            </span>
          ) : (
            <>
              <span>▶️</span>
              Iniciar Turno
            </>
          )}
        </button>
        
        <button
          onClick={cerrarSesion}
          disabled={iniciando}
          className="w-full btn-action-secondary text-zinc-400"
        >
          ← Cambiar de Usuario
        </button>
      </div>
      
      {/* Nota */}
      <p className="text-zinc-500 text-xs mt-6 text-center max-w-xs">
        El saldo inicial debe corresponder al efectivo físico en caja al comenzar el turno.
      </p>
    </div>
  );
}
