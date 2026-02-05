// ========================================
// PANTALLA DE LOGIN CON PIN
// ========================================

import { useState, useEffect, useCallback } from 'react';
import { useSesionStore } from '../stores/sesionStore';

export function LoginScreen() {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [intentando, setIntentando] = useState(false);
  
  const iniciarSesion = useSesionStore(state => state.iniciarSesion);
  const errorSesion = useSesionStore(state => state.error);
  const limpiarError = useSesionStore(state => state.limpiarError);
  
  // Mostrar error del store
  useEffect(() => {
    if (errorSesion) {
      setError(errorSesion);
      limpiarError();
    }
  }, [errorSesion, limpiarError]);
  
  // Manejar tecla presionada
  const handleKeyPress = useCallback((digit: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + digit);
      setError(null);
      
      // Vibración al presionar
      if ('vibrate' in navigator) {
        navigator.vibrate(20);
      }
    }
  }, [pin]);
  
  // Borrar último dígito
  const handleBackspace = useCallback(() => {
    setPin(prev => prev.slice(0, -1));
  }, []);
  
  // Limpiar todo
  const handleClear = useCallback(() => {
    setPin('');
    setError(null);
  }, []);
  
  // Intentar login cuando el PIN tenga 4 dígitos
  useEffect(() => {
    if (pin.length === 4) {
      const intentarLogin = async () => {
        setIntentando(true);
        const exito = await iniciarSesion(pin);
        setIntentando(false);
        
        if (!exito) {
          setPin('');
          // El error se maneja desde el store
        }
      };
      
      intentarLogin();
    }
  }, [pin, iniciarSesion]);
  
  // Teclado físico
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKeyPress(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        handleClear();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyPress, handleBackspace, handleClear]);
  
  return (
    <div className="min-h-screen bg-dark-400 flex flex-col items-center justify-center p-4">
      {/* Logo y título */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🥬🍅🥕</div>
        <h1 className="text-3xl font-bold text-white mb-2">Sol y Verde</h1>
        <p className="text-zinc-400">Ingrese su PIN para continuar</p>
      </div>
      
      {/* Indicadores de PIN */}
      <div className="flex gap-4 mb-8">
        {[0, 1, 2, 3].map((index) => (
          <div
            key={index}
            className={`
              w-5 h-5 rounded-full transition-all duration-100
              ${index < pin.length 
                ? 'bg-primary scale-110' 
                : 'bg-dark-200 border-2 border-dark-100'
              }
              ${intentando && index < pin.length ? 'animate-pulse' : ''}
            `}
          />
        ))}
      </div>
      
      {/* Mensaje de error */}
      {error && (
        <div className="bg-danger/20 text-danger px-4 py-2 rounded-lg mb-6 animate-shake">
          {error}
        </div>
      )}
      
      {/* Teclado numérico */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
          <button
            key={digit}
            onClick={() => handleKeyPress(digit)}
            disabled={intentando}
            className="btn-numpad disabled:opacity-50"
          >
            {digit}
          </button>
        ))}
        
        {/* Fila inferior */}
        <button
          onClick={handleClear}
          disabled={intentando}
          className="btn-numpad text-xl text-zinc-400"
        >
          C
        </button>
        
        <button
          onClick={() => handleKeyPress('0')}
          disabled={intentando}
          className="btn-numpad disabled:opacity-50"
        >
          0
        </button>
        
        <button
          onClick={handleBackspace}
          disabled={intentando}
          className="btn-numpad-delete text-2xl"
        >
          ⌫
        </button>
      </div>
      
      {/* Indicador de carga */}
      {intentando && (
        <div className="mt-6 flex items-center gap-2 text-primary">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span>Verificando...</span>
        </div>
      )}
      
      {/* Versión */}
      <p className="text-zinc-600 text-xs mt-8">
        Sol y Verde POS v2.0
      </p>
    </div>
  );
}
