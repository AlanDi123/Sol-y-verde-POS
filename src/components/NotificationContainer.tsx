// ========================================
// COMPONENTE DE NOTIFICACIONES
// ========================================

import { useNotificacionesStore } from '../stores/notificacionesStore';

export function NotificationContainer() {
  const notificaciones = useNotificacionesStore((state) => state.notificaciones);
  const eliminar = useNotificacionesStore((state) => state.eliminar);
  
  if (notificaciones.length === 0) return null;
  
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-md">
      {notificaciones.map((notif) => (
        <div
          key={notif.id}
          className={`notification notification-${notif.tipo}`}
        >
          {/* Icono según tipo */}
          <div className="flex-shrink-0 text-2xl">
            {notif.tipo === 'success' && '✅'}
            {notif.tipo === 'error' && '❌'}
            {notif.tipo === 'warning' && '⚠️'}
            {notif.tipo === 'info' && 'ℹ️'}
          </div>
          
          {/* Contenido */}
          <div className="flex-1">
            <h4 className="font-bold text-sm mb-1">{notif.titulo}</h4>
            <p className="text-sm opacity-90">{notif.mensaje}</p>
            
            {/* Acción opcional */}
            {notif.accion && (
              <button
                onClick={() => {
                  notif.accion!.callback();
                  eliminar(notif.id);
                }}
                className="mt-2 text-sm font-semibold underline hover:no-underline"
              >
                {notif.accion.texto}
              </button>
            )}
          </div>
          
          {/* Botón cerrar */}
          <button
            onClick={() => eliminar(notif.id)}
            className="flex-shrink-0 text-xl opacity-60 hover:opacity-100 transition-opacity"
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
