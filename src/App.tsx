// ========================================
// COMPONENTE PRINCIPAL DE LA APLICACIÓN
// ========================================

import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';

// Base de datos
import { inicializarBaseDatos } from './db/database';

// Stores
import { useCarritoStore, useSesionStore, useUIStore } from './stores';

// Componentes
import { Layout } from './components/Layout';
import { LoginScreen } from './components/LoginScreen';
import { InicioTurno } from './components/InicioTurno';
import { POSMain } from './components/POSMain';
import { Notificaciones } from './components/ui/Notificaciones';
import { ModalManager } from './components/modals/ModalManager';
import { ErrorBoundary } from './components/ErrorBoundary';
import { SplashScreen } from './components/ui/SplashScreen';

const PIN_BLOQUEO = '1234';
const INACTIVIDAD_MAXIMA_MS = 5 * 60 * 1000;

function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const desbloquear = () => {
    if (pin === PIN_BLOQUEO) {
      localStorage.setItem('lastActivity', Date.now().toString());
      setPin('');
      onUnlock();
      return;
    }

    setError(true);
    setPin('');
  };

  useEffect(() => {
    if (pin.length === PIN_BLOQUEO.length) {
      const temporizador = window.setTimeout(desbloquear, 100);
      return () => window.clearTimeout(temporizador);
    }
  }, [pin]);

  const ingresarDigito = (digito: string) => {
    if (pin.length < PIN_BLOQUEO.length) {
      setPin(valorActual => valorActual + digito);
      setError(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[10000] flex flex-col items-center justify-center bg-dark-400 p-6 text-white">
      <div className="w-full max-w-sm text-center">
        <div className="mb-4 text-5xl">🔒</div>
        <h1 className="text-2xl font-bold">Caja bloqueada</h1>
        <p className="mt-2 text-zinc-400">Ingrese el PIN para continuar</p>

        <div className="my-8 flex justify-center gap-4" aria-label="PIN ingresado">
          {Array.from({ length: PIN_BLOQUEO.length }).map((_, indice) => (
            <span
              key={indice}
              className={`h-4 w-4 rounded-full border-2 ${
                indice < pin.length ? 'border-primary bg-primary' : 'border-zinc-500'
              }`}
            />
          ))}
        </div>

        {error && <p className="mb-4 font-medium text-danger">PIN incorrecto</p>}

        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(numero => (
            <button
              key={numero}
              onClick={() => ingresarDigito(numero.toString())}
              className="h-16 rounded-lg bg-dark-300 text-2xl font-bold transition-colors hover:bg-primary"
            >
              {numero}
            </button>
          ))}
          <button
            onClick={() => setPin('')}
            className="h-16 rounded-lg bg-dark-300 text-lg font-bold text-danger transition-colors hover:bg-danger hover:text-white"
          >
            C
          </button>
          <button
            onClick={() => ingresarDigito('0')}
            className="h-16 rounded-lg bg-dark-300 text-2xl font-bold transition-colors hover:bg-primary"
          >
            0
          </button>
          <button
            onClick={desbloquear}
            className="h-16 rounded-lg bg-primary text-xl font-bold transition-colors hover:bg-primary-700"
            aria-label="Desbloquear caja"
          >
            Abrir
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const [inicializado, setInicializado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bloqueado, setBloqueado] = useState(false);
  
  const cargarCarrito = useCarritoStore(state => state.cargarCarrito);
  const cargarSesion = useSesionStore(state => state.cargarSesion);
  const sesionCargando = useSesionStore(state => state.cargando);
  const autenticado = useSesionStore(state => state.autenticado);
  const turnoActual = useSesionStore(state => state.turnoActual);
  const vendedorActual = useSesionStore(state => state.vendedorActual);
  const setOnline = useUIStore(state => state.setOnline);
  
  // Inicializar la aplicación
  useEffect(() => {
    const inicializar = async () => {
      try {
        console.log('🔧 Inicializando aplicación...');
        
        // Inicializar base de datos
        await inicializarBaseDatos();
        
        // Cargar carrito persistido
        await cargarCarrito();
        
        // Cargar sesión guardada
        await cargarSesion();
        
        // Configurar listeners de conexión
        const handleOnline = () => setOnline(true);
        const handleOffline = () => setOnline(false);
        
        document.addEventListener('app:online', handleOnline);
        document.addEventListener('app:offline', handleOffline);
        
        setInicializado(true);
        console.log('✅ Aplicación inicializada');
        
        return () => {
          document.removeEventListener('app:online', handleOnline);
          document.removeEventListener('app:offline', handleOffline);
        };
      } catch (err) {
        console.error('❌ Error inicializando:', err);
        setError('Error al inicializar la aplicación. Intente recargar la página.');
      }
    };
    
    inicializar();
  }, [cargarCarrito, cargarSesion, setOnline]);

  useEffect(() => {
    const registrarActividad = () => {
      localStorage.setItem('lastActivity', Date.now().toString());
    };

    const bloquearConAtajo = (evento: KeyboardEvent) => {
      if (evento.key === 'F12') {
        evento.preventDefault();
        setBloqueado(true);
      }
    };

    registrarActividad();
    window.addEventListener('keydown', bloquearConAtajo);
    window.addEventListener('pointerdown', registrarActividad);
    window.addEventListener('keydown', registrarActividad);
    window.addEventListener('touchstart', registrarActividad);
    window.addEventListener('click', registrarActividad);

    const intervalo = window.setInterval(() => {
      const ultimaActividad = Number(localStorage.getItem('lastActivity')) || Date.now();
      if (Date.now() - ultimaActividad >= INACTIVIDAD_MAXIMA_MS) {
        setBloqueado(true);
      }
    }, 10000);

    return () => {
      window.clearInterval(intervalo);
      window.removeEventListener('keydown', bloquearConAtajo);
      window.removeEventListener('pointerdown', registrarActividad);
      window.removeEventListener('keydown', registrarActividad);
      window.removeEventListener('touchstart', registrarActividad);
      window.removeEventListener('click', registrarActividad);
    };
  }, []);
  
  // Mostrar splash mientras inicializa
  if (!inicializado || sesionCargando) {
    return <SplashScreen />;
  }
  
  // Mostrar error si falló la inicialización
  if (error) {
    return (
      <div className="min-h-screen bg-dark-400 flex items-center justify-center p-4">
        <div className="bg-dark-300 rounded-xl p-6 max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold text-white mb-2">Error de Inicialización</h1>
          <p className="text-zinc-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-action-primary"
          >
            Recargar Página
          </button>
        </div>
      </div>
    );
  }
  
  // Determinar qué pantalla mostrar
  const renderContent = () => {
    // Si no está autenticado y no hay vendedor validado, mostrar login
    if (!autenticado && !vendedorActual) {
      return <LoginScreen />;
    }
    
    // Si el vendedor está validado pero no hay turno, mostrar inicio de turno
    if (vendedorActual && !turnoActual) {
      return <InicioTurno />;
    }
    
    // Si está autenticado y hay turno, mostrar POS
    if (autenticado && turnoActual) {
      return (
        <Layout>
          <POSMain />
        </Layout>
      );
    }
    
    // Fallback a login
    return <LoginScreen />;
  };
  
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <div className="min-h-screen bg-dark-400">
          {renderContent()}
          
          {/* Notificaciones globales */}
          <Notificaciones />
          
          {/* Modales globales */}
          <ModalManager />

          {bloqueado && <LockScreen onUnlock={() => setBloqueado(false)} />}
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
