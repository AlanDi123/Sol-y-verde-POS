// ========================================
// LAYOUT PRINCIPAL DEL POS
// ========================================

import { ReactNode } from 'react';
import { useSesionStore } from '../stores/sesionStore';
import { useCarritoStore } from '../stores/carritoStore';
import { useUIStore } from '../stores/uiStore';
import { formatearMoneda } from '../types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface LayoutProps {
  children: ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const vendedorActual = useSesionStore(state => state.vendedorActual);
  const turnoActual = useSesionStore(state => state.turnoActual);
  const pausarTurno = useSesionStore(state => state.pausarTurno);
  
  const cantidadItems = useCarritoStore(state => state.items.length);
  const total = useCarritoStore(state => state.total);
  
  const online = useUIStore(state => state.online);
  const sincronizando = useUIStore(state => state.sincronizando);
  const togglePanelCarrito = useUIStore(state => state.togglePanelCarrito);
  const abrirModal = useUIStore(state => state.abrirModal);
  const mostrarIndicadorPapel = useUIStore(state => state.mostrarIndicadorPapel);
  
  const fechaActual = format(new Date(), "EEEE d 'de' MMMM", { locale: es });
  const horaActual = format(new Date(), 'HH:mm');
  
  return (
    <div className="min-h-screen bg-dark-400 flex flex-col">
      {/* Header */}
      <header className="bg-dark-300 border-b border-dark-100 px-4 py-2 flex items-center justify-between flex-shrink-0">
        {/* Logo y info */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🥬</span>
            <div>
              <h1 className="text-lg font-bold text-white leading-none">Sol y Verde</h1>
              <p className="text-xs text-zinc-500 capitalize">{fechaActual}</p>
            </div>
          </div>
          
          {/* Turno info */}
          <div className="hidden md:flex items-center gap-3 ml-4 pl-4 border-l border-dark-100">
            <div className="text-sm">
              <span className="text-zinc-400">Turno #</span>
              <span className="text-white font-semibold">{turnoActual?.numero}</span>
            </div>
            <div className="text-sm">
              <span className="text-zinc-400">Vendedor: </span>
              <span className="text-primary font-semibold">{vendedorActual?.nombre}</span>
            </div>
          </div>
        </div>
        
        {/* Indicadores y acciones */}
        <div className="flex items-center gap-3">
          {/* Indicador de papel bajo */}
          {mostrarIndicadorPapel && (
            <div className="bg-warning/20 text-warning px-3 py-1 rounded-full text-sm font-medium animate-pulse">
              ⚠️ Papel bajo
            </div>
          )}
          
          {/* Indicador de conexión */}
          <div className={`
            flex items-center gap-1.5 px-3 py-1 rounded-full text-sm
            ${online 
              ? 'bg-success/20 text-success' 
              : 'bg-danger/20 text-danger'
            }
          `}>
            <div className={`w-2 h-2 rounded-full ${online ? 'bg-success' : 'bg-danger'} ${sincronizando ? 'animate-pulse' : ''}`} />
            {online ? (sincronizando ? 'Sync...' : 'Online') : 'Offline'}
          </div>
          
          {/* Hora */}
          <div className="text-xl font-mono text-white hidden sm:block">
            {horaActual}
          </div>
          
          {/* Botón de configuración */}
          <button
            onClick={() => abrirModal('configuracion')}
            className="p-2 hover:bg-dark-200 rounded-lg transition-colors"
          >
            ⚙️
          </button>
          
          {/* Botón de bloqueo */}
          <button
            onClick={pausarTurno}
            className="p-2 hover:bg-dark-200 rounded-lg transition-colors"
            title="Bloquear pantalla"
          >
            🔒
          </button>
          
          {/* Botón de carrito móvil */}
          <button
            onClick={togglePanelCarrito}
            className="md:hidden relative p-2 bg-primary rounded-lg"
          >
            🛒
            {cantidadItems > 0 && (
              <span className="absolute -top-1 -right-1 bg-danger text-white text-xs w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {cantidadItems}
              </span>
            )}
          </button>
        </div>
      </header>
      
      {/* Contenido principal */}
      <main className="flex-1 overflow-hidden">
        {children}
      </main>
      
      {/* Footer móvil con total */}
      <footer className="md:hidden bg-dark-300 border-t border-dark-100 p-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-zinc-400 text-sm">Total: </span>
            <span className="text-2xl font-bold text-primary font-mono">
              {formatearMoneda(total)}
            </span>
          </div>
          <button
            onClick={togglePanelCarrito}
            className="bg-primary text-white px-6 py-3 rounded-xl font-semibold flex items-center gap-2"
          >
            Ver Carrito
            {cantidadItems > 0 && (
              <span className="bg-white/20 px-2 py-0.5 rounded-full text-sm">
                {cantidadItems}
              </span>
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
