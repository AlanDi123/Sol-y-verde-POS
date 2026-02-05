// ========================================
// STORE DE SESIÓN Y VENDEDOR - ZUSTAND
// ========================================

import { create } from 'zustand';
import type { Vendedor, SesionVendedor, Turno } from '../types';
import { 
  db, 
  obtenerTurnoActivo, 
  crearTurno,
  guardarEstado,
  obtenerEstado
} from '../db/database';

// ========================================
// TIPOS DEL STORE
// ========================================

interface SesionState {
  // Sesión actual
  sesionActiva: SesionVendedor | null;
  vendedorActual: Vendedor | null;
  turnoActual: Turno | null;
  
  // Estados
  autenticado: boolean;
  cargando: boolean;
  error: string | null;
  
  // Acciones de autenticación
  iniciarSesion: (pin: string) => Promise<boolean>;
  cerrarSesion: () => Promise<void>;
  
  // Acciones de turno
  iniciarTurno: (saldoInicial: number) => Promise<Turno>;
  cerrarTurno: () => Promise<void>;
  pausarTurno: () => Promise<void>;
  reanudarTurno: () => Promise<void>;
  
  // Cargar estado inicial
  cargarSesion: () => Promise<void>;
  
  // Limpiar errores
  limpiarError: () => void;
}

// ========================================
// STORE DE ZUSTAND
// ========================================

export const useSesionStore = create<SesionState>((set, get) => ({
  // Estado inicial
  sesionActiva: null,
  vendedorActual: null,
  turnoActual: null,
  autenticado: false,
  cargando: true,
  error: null,

  // Cargar sesión guardada al iniciar
  cargarSesion: async () => {
    try {
      set({ cargando: true });
      
      // Obtener sesión guardada
      const sesionId = await obtenerEstado<string>('sesionActual');
      
      if (sesionId) {
        const sesion = await db.sesiones.get(sesionId);
        
        if (sesion && sesion.activa) {
          const vendedor = await db.vendedores.get(sesion.vendedorId);
          const turno = await db.turnos.get(sesion.turnoId);
          
          if (vendedor && turno && turno.estado === 'activo') {
            set({
              sesionActiva: sesion,
              vendedorActual: vendedor,
              turnoActual: turno,
              autenticado: true,
              cargando: false
            });
            console.log('✅ Sesión restaurada:', vendedor.nombre);
            return;
          }
        }
      }
      
      // Verificar si hay turno activo sin sesión
      const turnoActivo = await obtenerTurnoActivo();
      if (turnoActivo) {
        const vendedor = await db.vendedores.get(turnoActivo.vendedorId);
        if (vendedor) {
          // Recrear sesión
          const nuevaSesion: SesionVendedor = {
            id: `sesion-${Date.now()}`,
            vendedorId: vendedor.id,
            vendedorNombre: vendedor.nombre,
            turnoId: turnoActivo.id,
            inicioSesion: Date.now(),
            activa: true
          };
          
          await db.sesiones.put(nuevaSesion);
          await guardarEstado('sesionActual', nuevaSesion.id);
          
          set({
            sesionActiva: nuevaSesion,
            vendedorActual: vendedor,
            turnoActual: turnoActivo,
            autenticado: true,
            cargando: false
          });
          console.log('✅ Sesión recreada desde turno activo:', vendedor.nombre);
          return;
        }
      }
      
      set({ cargando: false });
    } catch (error) {
      console.error('Error cargando sesión:', error);
      set({ cargando: false, error: 'Error al cargar la sesión' });
    }
  },

  // Iniciar sesión con PIN
  iniciarSesion: async (pin: string) => {
    try {
      set({ cargando: true, error: null });
      
      // Buscar vendedor por PIN
      const vendedor = await db.vendedores
        .filter(v => v.pin === pin && v.activo)
        .first();
      
      if (!vendedor) {
        set({ 
          cargando: false, 
          error: 'PIN incorrecto o vendedor inactivo' 
        });
        return false;
      }
      
      // Verificar si hay turno activo
      let turno = await obtenerTurnoActivo();
      
      if (!turno) {
        // No hay turno, se necesita iniciar uno
        set({
          vendedorActual: vendedor,
          cargando: false,
          autenticado: false // Aún no autenticado hasta que inicie turno
        });
        return true; // PIN válido, pero necesita iniciar turno
      }
      
      // Verificar que el turno sea del mismo vendedor
      if (turno.vendedorId !== vendedor.id) {
        set({
          cargando: false,
          error: `Hay un turno activo de ${turno.vendedorNombre}. Debe cerrarlo primero.`
        });
        return false;
      }
      
      // Crear sesión
      const nuevaSesion: SesionVendedor = {
        id: `sesion-${Date.now()}`,
        vendedorId: vendedor.id,
        vendedorNombre: vendedor.nombre,
        turnoId: turno.id,
        inicioSesion: Date.now(),
        activa: true
      };
      
      await db.sesiones.put(nuevaSesion);
      await guardarEstado('sesionActual', nuevaSesion.id);
      
      // Actualizar último acceso del vendedor
      await db.vendedores.update(vendedor.id, {
        ultimoAcceso: Date.now()
      });
      
      set({
        sesionActiva: nuevaSesion,
        vendedorActual: vendedor,
        turnoActual: turno,
        autenticado: true,
        cargando: false
      });
      
      console.log('✅ Sesión iniciada:', vendedor.nombre);
      return true;
    } catch (error) {
      console.error('Error iniciando sesión:', error);
      set({ 
        cargando: false, 
        error: 'Error al iniciar sesión' 
      });
      return false;
    }
  },

  // Cerrar sesión
  cerrarSesion: async () => {
    try {
      const { sesionActiva } = get();
      
      if (sesionActiva) {
        await db.sesiones.update(sesionActiva.id, { activa: false });
      }
      
      await guardarEstado('sesionActual', null);
      
      set({
        sesionActiva: null,
        vendedorActual: null,
        // No limpiar turnoActual - el turno sigue activo
        autenticado: false
      });
      
      console.log('✅ Sesión cerrada');
    } catch (error) {
      console.error('Error cerrando sesión:', error);
    }
  },

  // Iniciar nuevo turno
  iniciarTurno: async (saldoInicial: number) => {
    try {
      const { vendedorActual } = get();
      
      if (!vendedorActual) {
        throw new Error('No hay vendedor autenticado');
      }
      
      set({ cargando: true });
      
      // Crear nuevo turno
      const nuevoTurno = await crearTurno(
        vendedorActual.id,
        vendedorActual.nombre,
        saldoInicial
      );
      
      // Crear sesión
      const nuevaSesion: SesionVendedor = {
        id: `sesion-${Date.now()}`,
        vendedorId: vendedorActual.id,
        vendedorNombre: vendedorActual.nombre,
        turnoId: nuevoTurno.id,
        inicioSesion: Date.now(),
        activa: true
      };
      
      await db.sesiones.put(nuevaSesion);
      await guardarEstado('sesionActual', nuevaSesion.id);
      
      set({
        sesionActiva: nuevaSesion,
        turnoActual: nuevoTurno,
        autenticado: true,
        cargando: false
      });
      
      console.log('✅ Turno iniciado:', nuevoTurno.numero);
      return nuevoTurno;
    } catch (error) {
      console.error('Error iniciando turno:', error);
      set({ cargando: false, error: 'Error al iniciar turno' });
      throw error;
    }
  },

  // Cerrar turno (completar cierre de caja)
  cerrarTurno: async () => {
    try {
      const { turnoActual, sesionActiva } = get();
      
      if (!turnoActual) {
        throw new Error('No hay turno activo');
      }
      
      // Marcar turno como cerrado
      await db.turnos.update(turnoActual.id, {
        estado: 'cerrado',
        fechaFin: Date.now()
      });
      
      // Cerrar sesión
      if (sesionActiva) {
        await db.sesiones.update(sesionActiva.id, { activa: false });
      }
      
      await guardarEstado('sesionActual', null);
      await guardarEstado('turnoActual', null);
      
      set({
        sesionActiva: null,
        vendedorActual: null,
        turnoActual: null,
        autenticado: false
      });
      
      console.log('✅ Turno cerrado');
    } catch (error) {
      console.error('Error cerrando turno:', error);
      throw error;
    }
  },

  // Pausar turno (bloquear pantalla)
  pausarTurno: async () => {
    try {
      const { turnoActual, sesionActiva } = get();
      
      if (!turnoActual) return;
      
      await db.turnos.update(turnoActual.id, { estado: 'pausado' });
      
      if (sesionActiva) {
        await db.sesiones.update(sesionActiva.id, { activa: false });
      }
      
      set({
        turnoActual: { ...turnoActual, estado: 'pausado' },
        sesionActiva: null,
        autenticado: false
      });
      
      console.log('⏸️ Turno pausado');
    } catch (error) {
      console.error('Error pausando turno:', error);
    }
  },

  // Reanudar turno
  reanudarTurno: async () => {
    try {
      const { turnoActual, vendedorActual } = get();
      
      if (!turnoActual || !vendedorActual) return;
      
      await db.turnos.update(turnoActual.id, { estado: 'activo' });
      
      const nuevaSesion: SesionVendedor = {
        id: `sesion-${Date.now()}`,
        vendedorId: vendedorActual.id,
        vendedorNombre: vendedorActual.nombre,
        turnoId: turnoActual.id,
        inicioSesion: Date.now(),
        activa: true
      };
      
      await db.sesiones.put(nuevaSesion);
      await guardarEstado('sesionActual', nuevaSesion.id);
      
      set({
        turnoActual: { ...turnoActual, estado: 'activo' },
        sesionActiva: nuevaSesion,
        autenticado: true
      });
      
      console.log('▶️ Turno reanudado');
    } catch (error) {
      console.error('Error reanudando turno:', error);
    }
  },

  // Limpiar errores
  limpiarError: () => {
    set({ error: null });
  }
}));

// ========================================
// SELECTORES
// ========================================

export const useVendedorActual = () => useSesionStore(state => state.vendedorActual);
export const useTurnoActual = () => useSesionStore(state => state.turnoActual);
export const useEstaAutenticado = () => useSesionStore(state => state.autenticado);
export const useSesionCargando = () => useSesionStore(state => state.cargando);
