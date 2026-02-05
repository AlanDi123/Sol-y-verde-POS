// ========================================
// STORE DE NOTIFICACIONES Y UI - ZUSTAND
// ========================================

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Notificacion } from '../types';

// ========================================
// TIPOS
// ========================================

type ModalType = 
  | 'none'
  | 'numpad'
  | 'pago'
  | 'devolucion-envases'
  | 'vale'
  | 'gasto'
  | 'cierre-caja'
  | 'configuracion'
  | 'productos'
  | 'vendedores'
  | 'confirmar';

interface NumpadData {
  titulo: string;
  valorInicial: number;
  tipo: 'precio' | 'cantidad' | 'dinero';
  onConfirm: (valor: number) => void;
  min?: number;
  max?: number;
}

interface ConfirmData {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  peligroso?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface UIState {
  // Notificaciones
  notificaciones: Notificacion[];
  
  // Modal actual
  modalActivo: ModalType;
  numpadData: NumpadData | null;
  confirmData: ConfirmData | null;
  
  // Panel lateral en móvil
  panelCarritoAbierto: boolean;
  
  // Búsqueda
  terminoBusqueda: string;
  categoriaSeleccionada: string | null;
  
  // Estado de conexión
  online: boolean;
  sincronizando: boolean;
  
  // Indicadores
  mostrarIndicadorPapel: boolean;
  
  // Acciones de notificaciones
  agregarNotificacion: (tipo: Notificacion['tipo'], titulo: string, mensaje: string, duracion?: number) => void;
  eliminarNotificacion: (id: string) => void;
  limpiarNotificaciones: () => void;
  
  // Acciones de modales
  abrirModal: (tipo: ModalType) => void;
  cerrarModal: () => void;
  abrirNumpad: (data: NumpadData) => void;
  abrirConfirmacion: (data: ConfirmData) => void;
  
  // Acciones de panel
  togglePanelCarrito: () => void;
  cerrarPanelCarrito: () => void;
  
  // Acciones de búsqueda
  setBusqueda: (termino: string) => void;
  setCategoria: (categoria: string | null) => void;
  
  // Acciones de estado
  setOnline: (online: boolean) => void;
  setSincronizando: (sincronizando: boolean) => void;
  setIndicadorPapel: (mostrar: boolean) => void;
}

// ========================================
// STORE
// ========================================

export const useUIStore = create<UIState>((set, get) => ({
  // Estado inicial
  notificaciones: [],
  modalActivo: 'none',
  numpadData: null,
  confirmData: null,
  panelCarritoAbierto: false,
  terminoBusqueda: '',
  categoriaSeleccionada: null,
  online: navigator.onLine,
  sincronizando: false,
  mostrarIndicadorPapel: false,

  // Agregar notificación
  agregarNotificacion: (tipo, titulo, mensaje, duracion = 4000) => {
    const nuevaNotificacion: Notificacion = {
      id: uuidv4(),
      tipo,
      titulo,
      mensaje,
      duracion,
      timestamp: Date.now()
    };
    
    set(state => ({
      notificaciones: [...state.notificaciones, nuevaNotificacion]
    }));
    
    // Auto-eliminar después de la duración
    if (duracion > 0) {
      setTimeout(() => {
        get().eliminarNotificacion(nuevaNotificacion.id);
      }, duracion);
    }
    
    // Sonido de notificación
    if (tipo === 'error') {
      // Vibración para errores
      if ('vibrate' in navigator) {
        navigator.vibrate([100, 50, 100]);
      }
    }
  },

  // Eliminar notificación
  eliminarNotificacion: (id) => {
    set(state => ({
      notificaciones: state.notificaciones.filter(n => n.id !== id)
    }));
  },

  // Limpiar todas las notificaciones
  limpiarNotificaciones: () => {
    set({ notificaciones: [] });
  },

  // Abrir modal
  abrirModal: (tipo) => {
    set({ modalActivo: tipo });
  },

  // Cerrar modal
  cerrarModal: () => {
    set({ 
      modalActivo: 'none',
      numpadData: null,
      confirmData: null
    });
  },

  // Abrir numpad
  abrirNumpad: (data) => {
    set({
      modalActivo: 'numpad',
      numpadData: data
    });
  },

  // Abrir confirmación
  abrirConfirmacion: (data) => {
    set({
      modalActivo: 'confirmar',
      confirmData: data
    });
  },

  // Toggle panel carrito (móvil)
  togglePanelCarrito: () => {
    set(state => ({ panelCarritoAbierto: !state.panelCarritoAbierto }));
  },

  // Cerrar panel carrito
  cerrarPanelCarrito: () => {
    set({ panelCarritoAbierto: false });
  },

  // Establecer búsqueda
  setBusqueda: (termino) => {
    set({ terminoBusqueda: termino });
  },

  // Establecer categoría
  setCategoria: (categoria) => {
    set({ categoriaSeleccionada: categoria });
  },

  // Establecer estado online
  setOnline: (online) => {
    set({ online });
    if (!online) {
      get().agregarNotificacion(
        'warning',
        'Sin conexión',
        'Trabajando en modo offline. Los datos se sincronizarán cuando vuelva la conexión.'
      );
    }
  },

  // Establecer estado de sincronización
  setSincronizando: (sincronizando) => {
    set({ sincronizando });
  },

  // Establecer indicador de papel bajo
  setIndicadorPapel: (mostrar) => {
    set({ mostrarIndicadorPapel: mostrar });
  }
}));

// ========================================
// SELECTORES
// ========================================

export const useNotificaciones = () => useUIStore(state => state.notificaciones);
export const useModalActivo = () => useUIStore(state => state.modalActivo);
export const useNumpadData = () => useUIStore(state => state.numpadData);
export const useConfirmData = () => useUIStore(state => state.confirmData);
export const usePanelCarritoAbierto = () => useUIStore(state => state.panelCarritoAbierto);
export const useBusqueda = () => useUIStore(state => state.terminoBusqueda);
export const useCategoriaSeleccionada = () => useUIStore(state => state.categoriaSeleccionada);
export const useOnline = () => useUIStore(state => state.online);
export const useSincronizando = () => useUIStore(state => state.sincronizando);

// ========================================
// HELPERS
// ========================================

// Función helper para mostrar notificaciones rápidas
export const notificar = {
  exito: (titulo: string, mensaje: string) => 
    useUIStore.getState().agregarNotificacion('success', titulo, mensaje),
  error: (titulo: string, mensaje: string) => 
    useUIStore.getState().agregarNotificacion('error', titulo, mensaje, 6000),
  advertencia: (titulo: string, mensaje: string) => 
    useUIStore.getState().agregarNotificacion('warning', titulo, mensaje),
  info: (titulo: string, mensaje: string) => 
    useUIStore.getState().agregarNotificacion('info', titulo, mensaje),
};

// Función helper para confirmar acción
export const confirmar = (
  titulo: string,
  mensaje: string,
  onConfirm: () => void,
  options?: {
    textoConfirmar?: string;
    textoCancelar?: string;
    peligroso?: boolean;
    onCancel?: () => void;
  }
) => {
  useUIStore.getState().abrirConfirmacion({
    titulo,
    mensaje,
    onConfirm,
    ...options
  });
};
