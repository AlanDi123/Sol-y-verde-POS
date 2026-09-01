// ========================================
// BÚSQUEDA POR VOZ
// ========================================

import { useState, useEffect } from 'react';

interface VoiceSearchProps {
  onResult: (transcript: string) => void;
  onClose: () => void;
  placeholder?: string;
}

export function VoiceSearch({ onResult, onClose, placeholder = 'Di el nombre del producto...' }: VoiceSearchProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    // Verificar soporte de Web Speech API
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError('Tu navegador no soporta reconocimiento de voz');
      return;
    }
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = 'es-AR'; // Español de Argentina
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    
    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };
    
    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcriptResult = event.results[current][0].transcript;
      setTranscript(transcriptResult);
      
      if (event.results[current].isFinal) {
        onResult(transcriptResult);
        setIsListening(false);
      }
    };
    
    recognition.onerror = (event: any) => {
      console.error('Error de reconocimiento de voz:', event.error);
      setIsListening(false);
      
      switch (event.error) {
        case 'no-speech':
          setError('No se detectó ninguna voz. Intenta de nuevo.');
          break;
        case 'audio-capture':
          setError('No se pudo acceder al micrófono');
          break;
        case 'not-allowed':
          setError('Permiso de micrófono denegado');
          break;
        default:
          setError('Error en el reconocimiento de voz');
      }
    };
    
    recognition.onend = () => {
      setIsListening(false);
    };
    
    // Iniciar reconocimiento automáticamente
    try {
      recognition.start();
    } catch (err) {
      console.error('Error iniciando reconocimiento:', err);
      setError('No se pudo iniciar el reconocimiento de voz');
    }
    
    return () => {
      recognition.stop();
    };
  }, [onResult]);
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6 text-center" style={{ color: 'var(--sv-texto)' }}>
          🎤 Búsqueda por Voz
        </h2>
        
        {/* Animación de escucha */}
        <div className="flex flex-col items-center mb-6">
          <div className={`relative w-32 h-32 rounded-full flex items-center justify-center mb-4 ${
            isListening ? 'animate-pulse' : ''
          }`} style={{
            background: isListening
              ? 'linear-gradient(135deg, var(--sv-primario) 0%, var(--sv-primario-claro) 100%)'
              : 'var(--sv-superficie)',
            border: '4px solid var(--sv-borde)',
          }}>
            <span className="text-6xl">
              {isListening ? '🎙️' : '🔇'}
            </span>
          </div>
          
          <p className="text-lg font-semibold mb-2" style={{ color: 'var(--sv-texto)' }}>
            {isListening ? 'Escuchando...' : 'Esperando...'}
          </p>
          
          <p className="text-sm text-center" style={{ color: 'var(--sv-texto-muted)' }}>
            {placeholder}
          </p>
        </div>
        
        {/* Transcripción en tiempo real */}
        {transcript && (
          <div className="card mb-4 p-4">
            <p className="text-sm" style={{ color: 'var(--sv-texto-secundario)' }}>
              Detectado:
            </p>
            <p className="text-lg font-semibold" style={{ color: 'var(--sv-texto)' }}>
              "{transcript}"
            </p>
          </div>
        )}
        
        {/* Error */}
        {error && (
          <div className="notification notification-error mb-4">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold">Error</p>
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}
        
        {/* Botón cerrar */}
        <button
          onClick={onClose}
          className="w-full btn-action-secondary"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
