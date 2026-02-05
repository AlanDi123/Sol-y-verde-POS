// ========================================
// STORE DE VENTAS - ZUSTAND
// ========================================

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import type {
  Venta,
  ItemVenta,
  PagoVenta,
  EnvaseVenta,
  ValeAplicado,
  Vale,
  DevolucionEnvaseDetalle
} from '../types';
import {
  db,
  guardarVenta,
  generarCUI,
  guardarVale,
  obtenerNumeroVentaDiario
} from '../db/database';
import { useCarritoStore } from './carritoStore';
import { useSesionStore } from './sesionStore';
import { notificar } from './uiStore';

// ========================================
// TIPOS
// ========================================

interface VentaEnProceso {
  items: ItemVenta[];
  envasesEntregados: EnvaseVenta[];
  envasesDevueltos: EnvaseVenta[];
  subtotalProductos: number;
  totalEnvases: number;
  totalDevolucionEnvases: number;
  descuento: number;
  total: number;
  pagos: PagoVenta[];
  valesAplicados: ValeAplicado[];
  totalPagado: number;
  vuelto: number;
  clienteNombre?: string;
  clienteInfo?: string;
}

interface VentasState {
  // Venta en proceso
  ventaEnProceso: VentaEnProceso | null;
  
  // Estados
  procesando: boolean;
  
  // Venta del día actual (para referencia rápida)
  ventasDelDia: Venta[];
  
  // Acciones
  iniciarVenta: () => void;
  agregarPago: (pago: Omit<PagoVenta, 'id' | 'timestamp'>) => void;
  eliminarPago: (pagoId: string) => void;
  aplicarVale: (vale: Vale, monto: number) => void;
  aplicarDescuento: (monto: number) => void;
  setClienteInfo: (nombre?: string, info?: string) => void;
  finalizarVenta: () => Promise<Venta | null>;
  cancelarVenta: () => void;
  
  // Carga de ventas
  cargarVentasDelDia: () => Promise<void>;
  
  // Vale por devolución
  generarValeDevolucion: (monto: number, devoluciones: DevolucionEnvaseDetalle[]) => Promise<Vale>;
}

// ========================================
// STORE
// ========================================

export const useVentasStore = create<VentasState>((set, get) => ({
  ventaEnProceso: null,
  procesando: false,
  ventasDelDia: [],

  // Iniciar una nueva venta desde el carrito
  iniciarVenta: () => {
    const carritoState = useCarritoStore.getState();
    
    if (carritoState.items.length === 0 && carritoState.devolucionesEnvases.length === 0) {
      notificar.error('Error', 'El carrito está vacío');
      return;
    }
    
    // Convertir items del carrito a items de venta
    const items: ItemVenta[] = carritoState.items.map(item => ({
      productoId: item.productoId,
      codigo: item.producto.codigo,
      nombre: item.producto.nombreCorto,
      cantidad: item.cantidad,
      esFraccion: item.esFraccion,
      cantidadUnidadesBase: item.cantidadUnidadesBase,
      precioUnitario: item.precioUnitario,
      precioLista: item.precioLista,
      subtotal: item.subtotal,
      tipoEnvaseId: item.tipoEnvaseId,
      valorSena: item.valorSena
    }));
    
    // Agrupar envases entregados
    const envasesMap = new Map<string, EnvaseVenta>();
    for (const item of carritoState.items) {
      if (item.cobrarSena && item.tipoEnvaseId) {
        const existing = envasesMap.get(item.tipoEnvaseId);
        if (existing) {
          existing.cantidad += Math.ceil(item.cantidadUnidadesBase);
          existing.subtotal += item.valorSena;
        } else {
          envasesMap.set(item.tipoEnvaseId, {
            tipoEnvaseId: item.tipoEnvaseId,
            nombre: '', // Se llenará al procesar
            cantidad: Math.ceil(item.cantidadUnidadesBase),
            valorUnitario: item.valorSena / Math.ceil(item.cantidadUnidadesBase),
            subtotal: item.valorSena
          });
        }
      }
    }
    
    // Envases devueltos
    const envasesDevueltos: EnvaseVenta[] = carritoState.devolucionesEnvases.map(dev => ({
      tipoEnvaseId: dev.tipoEnvaseId,
      nombre: dev.tipoEnvase.nombre,
      cantidad: dev.cantidad,
      valorUnitario: dev.tipoEnvase.valorSena,
      subtotal: dev.tipoEnvase.valorSena * dev.cantidad
    }));
    
    const ventaEnProceso: VentaEnProceso = {
      items,
      envasesEntregados: Array.from(envasesMap.values()),
      envasesDevueltos,
      subtotalProductos: carritoState.subtotalProductos,
      totalEnvases: carritoState.totalEnvasesCobrados,
      totalDevolucionEnvases: carritoState.totalDevolucionEnvases,
      descuento: 0,
      total: carritoState.total,
      pagos: [],
      valesAplicados: [],
      totalPagado: 0,
      vuelto: 0
    };
    
    set({ ventaEnProceso });
  },

  // Agregar pago
  agregarPago: (pago) => {
    const { ventaEnProceso } = get();
    if (!ventaEnProceso) return;
    
    const nuevoPago: PagoVenta = {
      ...pago,
      id: uuidv4(),
      timestamp: Date.now()
    };
    
    const nuevosPagos = [...ventaEnProceso.pagos, nuevoPago];
    const totalPagado = nuevosPagos.reduce((sum, p) => sum + p.monto, 0) +
                        ventaEnProceso.valesAplicados.reduce((sum, v) => sum + v.montoAplicado, 0);
    
    const vuelto = totalPagado > ventaEnProceso.total 
      ? totalPagado - ventaEnProceso.total 
      : 0;
    
    set({
      ventaEnProceso: {
        ...ventaEnProceso,
        pagos: nuevosPagos,
        totalPagado,
        vuelto
      }
    });
  },

  // Eliminar pago
  eliminarPago: (pagoId) => {
    const { ventaEnProceso } = get();
    if (!ventaEnProceso) return;
    
    const nuevosPagos = ventaEnProceso.pagos.filter(p => p.id !== pagoId);
    const totalPagado = nuevosPagos.reduce((sum, p) => sum + p.monto, 0) +
                        ventaEnProceso.valesAplicados.reduce((sum, v) => sum + v.montoAplicado, 0);
    
    set({
      ventaEnProceso: {
        ...ventaEnProceso,
        pagos: nuevosPagos,
        totalPagado,
        vuelto: Math.max(0, totalPagado - ventaEnProceso.total)
      }
    });
  },

  // Aplicar vale
  aplicarVale: (vale, monto) => {
    const { ventaEnProceso } = get();
    if (!ventaEnProceso) return;
    
    const valeAplicado: ValeAplicado = {
      valeId: vale.id,
      cui: vale.cui,
      montoAplicado: monto
    };
    
    const nuevosVales = [...ventaEnProceso.valesAplicados, valeAplicado];
    const totalPagado = ventaEnProceso.pagos.reduce((sum, p) => sum + p.monto, 0) +
                        nuevosVales.reduce((sum, v) => sum + v.montoAplicado, 0);
    
    set({
      ventaEnProceso: {
        ...ventaEnProceso,
        valesAplicados: nuevosVales,
        totalPagado,
        vuelto: Math.max(0, totalPagado - ventaEnProceso.total)
      }
    });
  },

  // Aplicar descuento
  aplicarDescuento: (monto) => {
    const { ventaEnProceso } = get();
    if (!ventaEnProceso) return;
    
    const nuevoTotal = Math.max(0, 
      ventaEnProceso.subtotalProductos + 
      ventaEnProceso.totalEnvases - 
      ventaEnProceso.totalDevolucionEnvases - 
      monto
    );
    
    set({
      ventaEnProceso: {
        ...ventaEnProceso,
        descuento: monto,
        total: nuevoTotal
      }
    });
  },

  // Establecer info del cliente
  setClienteInfo: (nombre, info) => {
    const { ventaEnProceso } = get();
    if (!ventaEnProceso) return;
    
    set({
      ventaEnProceso: {
        ...ventaEnProceso,
        clienteNombre: nombre,
        clienteInfo: info
      }
    });
  },

  // Finalizar venta
  finalizarVenta: async () => {
    const { ventaEnProceso } = get();
    const sesionState = useSesionStore.getState();
    
    if (!ventaEnProceso) {
      notificar.error('Error', 'No hay venta en proceso');
      return null;
    }
    
    if (!sesionState.vendedorActual || !sesionState.turnoActual) {
      notificar.error('Error', 'No hay sesión activa');
      return null;
    }
    
    // Verificar pago completo (con tolerancia de $1 por redondeos)
    const pendiente = ventaEnProceso.total - ventaEnProceso.totalPagado;
    if (pendiente > 1) {
      notificar.error('Pago incompleto', `Faltan $${pendiente.toLocaleString('es-AR')}`);
      return null;
    }
    
    set({ procesando: true });
    
    try {
      // Obtener número de venta
      const numeroVenta = await obtenerNumeroVentaDiario();
      
      // Crear objeto de venta
      const venta: Venta = {
        id: uuidv4(),
        numero: numeroVenta,
        items: ventaEnProceso.items,
        subtotalProductos: ventaEnProceso.subtotalProductos,
        totalEnvases: ventaEnProceso.totalEnvases,
        totalDevolucionEnvases: ventaEnProceso.totalDevolucionEnvases,
        descuento: ventaEnProceso.descuento,
        total: ventaEnProceso.total,
        pagos: ventaEnProceso.pagos,
        valesAplicados: ventaEnProceso.valesAplicados,
        totalPagado: ventaEnProceso.totalPagado,
        vuelto: ventaEnProceso.vuelto,
        envasesEntregados: ventaEnProceso.envasesEntregados,
        envasesDevueltos: ventaEnProceso.envasesDevueltos,
        clienteNombre: ventaEnProceso.clienteNombre,
        clienteInfo: ventaEnProceso.clienteInfo,
        estado: 'completada',
        vendedorId: sesionState.vendedorActual.id,
        vendedorNombre: sesionState.vendedorActual.nombre,
        turnoId: sesionState.turnoActual.id,
        timestamp: Date.now(),
        fechaFormateada: format(new Date(), 'yyyy-MM-dd', { locale: es }),
        sincronizado: false,
        impreso: false
      };
      
      // Guardar venta
      await guardarVenta(venta);
      
      // Actualizar vales usados
      for (const valeAplicado of ventaEnProceso.valesAplicados) {
        const vale = await db.vales.get(valeAplicado.valeId);
        if (vale) {
          const nuevoMontoUsado = vale.montoUsado + valeAplicado.montoAplicado;
          const nuevoMontoDisponible = vale.montoOriginal - nuevoMontoUsado;
          
          await db.vales.update(vale.id, {
            montoUsado: nuevoMontoUsado,
            montoDisponible: nuevoMontoDisponible,
            estado: nuevoMontoDisponible <= 0 ? 'consumido' : 'parcial',
            fechaUltimoUso: Date.now(),
            usos: [
              ...vale.usos,
              {
                id: uuidv4(),
                ventaId: venta.id,
                montoUsado: valeAplicado.montoAplicado,
                fecha: Date.now(),
                vendedorId: sesionState.vendedorActual.id
              }
            ]
          });
        }
      }
      
      // Limpiar carrito
      await useCarritoStore.getState().limpiarCarrito();
      
      // Limpiar venta en proceso
      set({ 
        ventaEnProceso: null,
        procesando: false 
      });
      
      // Recargar ventas del día
      get().cargarVentasDelDia();
      
      notificar.exito('Venta completada', `Venta #${numeroVenta} - $${venta.total.toLocaleString('es-AR')}`);
      
      return venta;
    } catch (error) {
      console.error('Error finalizando venta:', error);
      set({ procesando: false });
      notificar.error('Error', 'No se pudo completar la venta');
      return null;
    }
  },

  // Cancelar venta
  cancelarVenta: () => {
    set({ ventaEnProceso: null });
  },

  // Cargar ventas del día
  cargarVentasDelDia: async () => {
    try {
      const hoy = format(new Date(), 'yyyy-MM-dd');
      const ventas = await db.ventas
        .where('fechaFormateada')
        .equals(hoy)
        .reverse()
        .toArray();
      
      set({ ventasDelDia: ventas });
    } catch (error) {
      console.error('Error cargando ventas del día:', error);
    }
  },

  // Generar vale por devolución de envases
  generarValeDevolucion: async (monto, devoluciones) => {
    const sesionState = useSesionStore.getState();
    
    if (!sesionState.vendedorActual || !sesionState.turnoActual) {
      throw new Error('No hay sesión activa');
    }
    
    const cui = generarCUI();
    
    const vale: Vale = {
      id: uuidv4(),
      cui,
      montoOriginal: monto,
      montoUsado: 0,
      montoDisponible: monto,
      estado: 'activo',
      devolucionEnvasesDetalle: devoluciones,
      usos: [],
      vendedorCreadorId: sesionState.vendedorActual.id,
      turnoCreacionId: sesionState.turnoActual.id,
      fechaCreacion: Date.now(),
      sincronizado: false,
      impreso: false
    };
    
    await guardarVale(vale);
    
    notificar.exito('Vale generado', `CUI: ${cui} - $${monto.toLocaleString('es-AR')}`);
    
    return vale;
  }
}));

// ========================================
// SELECTORES
// ========================================

export const useVentaEnProceso = () => useVentasStore(state => state.ventaEnProceso);
export const useVentasDelDia = () => useVentasStore(state => state.ventasDelDia);
export const useProcesandoVenta = () => useVentasStore(state => state.procesando);

// Selector para verificar si el pago está completo
export const usePagoCompleto = () => useVentasStore(state => {
  if (!state.ventaEnProceso) return false;
  return state.ventaEnProceso.totalPagado >= state.ventaEnProceso.total;
});

// Selector para obtener el monto pendiente
export const useMontoPendiente = () => useVentasStore(state => {
  if (!state.ventaEnProceso) return 0;
  return Math.max(0, state.ventaEnProceso.total - state.ventaEnProceso.totalPagado);
});
