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

function App() {
  const [inicializado, setInicializado] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
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
        </div>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
