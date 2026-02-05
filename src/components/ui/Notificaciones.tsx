// ========================================
// SISTEMA DE NOTIFICACIONES (TOASTS)
// ========================================

import { useState } from 'react';
import { useUIStore } from '../../stores/uiStore';
import type { Notificacion } from '../../types';

// Iconos por tipo
const ICONOS: Record<Notificacion['tipo'], string> = {
  success: '✅',
  error: '❌',
  warning: '⚠️',
  info: 'ℹ️'
};

// Colores por tipo
const COLORES: Record<Notificacion['tipo'], string> = {
  success: 'bg-success',
  error: 'bg-danger',
  warning: 'bg-warning text-black',
  info: 'bg-info'
};

export function Notificaciones() {
  const notificaciones = useUIStore(state => state.notificaciones);
  const eliminarNotificacion = useUIStore(state => state.eliminarNotificacion);
  
  if (notificaciones.length === 0) return null;
  
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
      {notificaciones.map((notif) => (
        <NotificacionItem
          key={notif.id}
          notificacion={notif}
          onClose={() => eliminarNotificacion(notif.id)}
        />
      ))}
    </div>
  );
}

// Componente individual de notificación
interface NotificacionItemProps {
  notificacion: Notificacion;
  onClose: () => void;
}

function NotificacionItem({ notificacion, onClose }: NotificacionItemProps) {
  const [saliendo, setSaliendo] = useState(false);
  
  const handleClose = () => {
    setSaliendo(true);
    setTimeout(onClose, 200);
  };
  
  return (
    <div
      className={`
        ${COLORES[notificacion.tipo]}
        ${saliendo ? 'opacity-0 translate-x-full' : 'opacity-100 translate-x-0'}
        p-4 rounded-xl shadow-overlay
        transition-all duration-200
        flex items-start gap-3
        cursor-pointer
      `}
      onClick={handleClose}
    >
      {/* Icono */}
      <span className="text-xl flex-shrink-0">
        {ICONOS[notificacion.tipo]}
      </span>
      
      {/* Contenido */}
      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-sm">
          {notificacion.titulo}
        </h4>
        <p className="text-sm opacity-90 mt-0.5">
          {notificacion.mensaje}
        </p>
      </div>
      
      {/* Botón cerrar */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleClose();
        }}
        className="flex-shrink-0 p-1 hover:opacity-70 transition-opacity"
      >
        ✕
      </button>
    </div>
  );
}
