// ========================================
// STORE DE NOTIFICACIONES - ZUSTAND
// Sistema de notificaciones push inteligente
// ========================================

import { create } from 'zustand';
import { NOTIFICATION_CONSTANTS } from '../utils/constants';

export type TipoNotificacion = 'success' | 'error' | 'warning' | 'info';

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  titulo: string;
  mensaje: string;
  timestamp: number;
  duracion?: number;
  accion?: {
    texto: string;
    callback: () => void;
  };
}

interface NotificacionState {
  notificaciones: Notificacion[];
  agregar: (notif: Omit<Notificacion, 'id' | 'timestamp'>) => void;
  eliminar: (id: string) => void;
  limpiar: () => void;
}

export const useNotificacionesStore = create<NotificacionState>((set) => ({
  notificaciones: [],
  
  agregar: (notif) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const nuevaNotif: Notificacion = {
      ...notif,
      id,
      timestamp: Date.now(),
      duracion: notif.duracion ?? obtenerDuracionPorTipo(notif.tipo),
    };
    
    set((state) => {
      // Limitar a MAX_NOTIFICATIONS
      const notificaciones = [
        nuevaNotif,
        ...state.notificaciones.slice(0, NOTIFICATION_CONSTANTS.MAX_NOTIFICATIONS - 1),
      ];
      
      // Auto-eliminar después de la duración
      if (nuevaNotif.duracion) {
        setTimeout(() => {
          set((state) => ({
            notificaciones: state.notificaciones.filter((n) => n.id !== id),
          }));
        }, nuevaNotif.duracion);
      }
      
      return { notificaciones };
    });
    
    // Vibración según tipo
    if ('vibrate' in navigator) {
      switch (notif.tipo) {
        case 'success':
          navigator.vibrate([30, 30, 30]);
          break;
        case 'error':
          navigator.vibrate([50, 50, 50, 50]);
          break;
        case 'warning':
          navigator.vibrate([40, 40]);
          break;
        default:
          navigator.vibrate(30);
      }
    }
  },
  
  eliminar: (id) => {
    set((state) => ({
      notificaciones: state.notificaciones.filter((n) => n.id !== id),
    }));
  },
  
  limpiar: () => {
    set({ notificaciones: [] });
  },
}));

/**
 * Obtiene la duración por defecto según el tipo de notificación
 */
function obtenerDuracionPorTipo(tipo: TipoNotificacion): number {
  switch (tipo) {
    case 'success':
      return NOTIFICATION_CONSTANTS.DURATION_SUCCESS;
    case 'error':
      return NOTIFICATION_CONSTANTS.DURATION_ERROR;
    case 'warning':
      return NOTIFICATION_CONSTANTS.DURATION_WARNING;
    case 'info':
      return NOTIFICATION_CONSTANTS.DURATION_INFO;
    default:
      return NOTIFICATION_CONSTANTS.DURATION_INFO;
  }
}

/**
 * Helpers para agregar notificaciones rápidamente
 */
export const notificar = {
  exito: (titulo: string, mensaje: string) => {
    useNotificacionesStore.getState().agregar({
      tipo: 'success',
      titulo,
      mensaje,
    });
  },
  
  error: (titulo: string, mensaje: string) => {
    useNotificacionesStore.getState().agregar({
      tipo: 'error',
      titulo,
      mensaje,
    });
  },
  
  advertencia: (titulo: string, mensaje: string) => {
    useNotificacionesStore.getState().agregar({
      tipo: 'warning',
      titulo,
      mensaje,
    });
  },
  
  info: (titulo: string, mensaje: string) => {
    useNotificacionesStore.getState().agregar({
      tipo: 'info',
      titulo,
      mensaje,
    });
  },
  
  stockBajo: (nombreProducto: string, cantidadActual: number) => {
    useNotificacionesStore.getState().agregar({
      tipo: 'warning',
      titulo: '⚠️ Stock Bajo',
      mensaje: `${nombreProducto} tiene solo ${cantidadActual} unidades`,
    });
  },
  
  stockCritico: (nombreProducto: string, cantidadActual: number) => {
    useNotificacionesStore.getState().agregar({
      tipo: 'error',
      titulo: '🚨 Stock Crítico',
      mensaje: `${nombreProducto} tiene solo ${cantidadActual} unidades. ¡Reabastecer urgente!`,
      duracion: 10000,
    });
  },
  
  sincronizacionError: (intentosRestantes: number) => {
    useNotificacionesStore.getState().agregar({
      tipo: 'warning',
      titulo: 'Error de Sincronización',
      mensaje: `No se pudo sincronizar. Se reintentará automáticamente (${intentosRestantes} intentos restantes)`,
    });
  },
  
  sincronizacionExitosa: (itemsSincronizados: number) => {
    useNotificacionesStore.getState().agregar({
      tipo: 'success',
      titulo: 'Sincronizado',
      mensaje: `${itemsSincronizados} items sincronizados con Google Sheets`,
    });
  },
};
