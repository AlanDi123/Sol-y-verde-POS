// ========================================
// STORE PRINCIPAL DEL CARRITO - ZUSTAND
// Persistencia Bunker-Level con Dexie.js
// ========================================

import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { 
  ItemCarrito, 
  Producto, 
  TipoEnvase,
  DevolucionEnvaseDetalle 
} from '../types';
import { 
  guardarCarrito, 
  obtenerCarrito, 
  limpiarCarrito as limpiarCarritoDB 
} from '../db/database';

// ========================================
// TIPOS DEL STORE
// ========================================

interface DevolucionEnvase {
  tipoEnvaseId: string;
  tipoEnvase: TipoEnvase;
  cantidad: number;
}

interface CarritoState {
  // Items del carrito
  items: ItemCarrito[];
  
  // Devoluciones de envases
  devolucionesEnvases: DevolucionEnvase[];
  
  // Totales calculados
  subtotalProductos: number;
  totalEnvasesCobrados: number;
  totalDevolucionEnvases: number;
  total: number;
  
  // Estado de carga
  cargado: boolean;
  
  // Acciones
  cargarCarrito: () => Promise<void>;
  agregarProducto: (producto: Producto, cantidad: number, esFraccion: boolean, precioUnitario: number, tipoEnvase?: TipoEnvase, cobrarSena?: boolean) => Promise<void>;
  actualizarItem: (itemId: string, cantidad: number, precioUnitario: number) => Promise<void>;
  eliminarItem: (itemId: string) => Promise<void>;
  agregarDevolucionEnvase: (tipoEnvase: TipoEnvase, cantidad: number) => void;
  actualizarDevolucionEnvase: (tipoEnvaseId: string, cantidad: number) => void;
  eliminarDevolucionEnvase: (tipoEnvaseId: string) => void;
  limpiarCarrito: () => Promise<void>;
  limpiarDevoluciones: () => void;
  recalcularTotales: () => void;
}

// ========================================
// FUNCIONES AUXILIARES
// ========================================

function calcularTotales(
  items: ItemCarrito[],
  devoluciones: DevolucionEnvase[]
): {
  subtotalProductos: number;
  totalEnvasesCobrados: number;
  totalDevolucionEnvases: number;
  total: number;
} {
  const subtotalProductos = items.reduce((sum, item) => sum + item.subtotal, 0);
  const totalEnvasesCobrados = items.reduce((sum, item) => sum + (item.cobrarSena ? item.valorSena : 0), 0);
  const totalDevolucionEnvases = devoluciones.reduce(
    (sum, dev) => sum + (dev.tipoEnvase.valorSena * dev.cantidad), 
    0
  );
  const total = subtotalProductos + totalEnvasesCobrados - totalDevolucionEnvases;
  
  return {
    subtotalProductos,
    totalEnvasesCobrados,
    totalDevolucionEnvases,
    total: Math.max(0, total) // El total no puede ser negativo (genera vale si es así)
  };
}

// ========================================
// STORE DE ZUSTAND
// ========================================

export const useCarritoStore = create<CarritoState>((set, get) => ({
  // Estado inicial
  items: [],
  devolucionesEnvases: [],
  subtotalProductos: 0,
  totalEnvasesCobrados: 0,
  totalDevolucionEnvases: 0,
  total: 0,
  cargado: false,

  // Cargar carrito desde IndexedDB al iniciar
  cargarCarrito: async () => {
    try {
      const itemsGuardados = await obtenerCarrito();
      const totales = calcularTotales(itemsGuardados, []);
      set({
        items: itemsGuardados,
        ...totales,
        cargado: true
      });
      console.log('🛒 Carrito cargado:', itemsGuardados.length, 'items');
    } catch (error) {
      console.error('Error cargando carrito:', error);
      set({ cargado: true });
    }
  },

  // Agregar producto al carrito
  agregarProducto: async (
    producto: Producto,
    cantidad: number,
    esFraccion: boolean,
    precioUnitario: number,
    tipoEnvase?: TipoEnvase,
    cobrarSena: boolean = true
  ) => {
    const { items, devolucionesEnvases } = get();
    
    // Calcular cantidad en unidades base
    const cantidadUnidadesBase = esFraccion 
      ? cantidad / producto.factorDivisor 
      : cantidad;
    
    // Verificar si ya existe el producto con mismo precio y tipo de venta
    const itemExistente = items.find(
      item => 
        item.productoId === producto.id && 
        item.precioUnitario === precioUnitario &&
        item.esFraccion === esFraccion &&
        item.tipoEnvaseId === tipoEnvase?.id
    );
    
    let nuevosItems: ItemCarrito[];
    
    if (itemExistente) {
      // Actualizar cantidad del item existente
      nuevosItems = items.map(item => {
        if (item.id === itemExistente.id) {
          const nuevaCantidad = item.cantidad + cantidad;
          const nuevaCantidadUnidades = item.cantidadUnidadesBase + cantidadUnidadesBase;
          return {
            ...item,
            cantidad: nuevaCantidad,
            cantidadUnidadesBase: nuevaCantidadUnidades,
            subtotal: nuevaCantidad * precioUnitario,
            valorSena: cobrarSena && tipoEnvase ? tipoEnvase.valorSena * Math.ceil(nuevaCantidadUnidades) : 0
          };
        }
        return item;
      });
    } else {
      // Crear nuevo item
      const nuevoItem: ItemCarrito = {
        id: uuidv4(),
        productoId: producto.id,
        producto,
        cantidad,
        esFraccion,
        cantidadUnidadesBase,
        precioUnitario,
        precioLista: producto.precioSugerido,
        subtotal: cantidad * precioUnitario,
        tipoEnvaseId: tipoEnvase?.id,
        cobrarSena: cobrarSena && !!tipoEnvase,
        valorSena: cobrarSena && tipoEnvase ? tipoEnvase.valorSena * Math.ceil(cantidadUnidadesBase) : 0
      };
      nuevosItems = [...items, nuevoItem];
    }
    
    // Guardar en IndexedDB
    await guardarCarrito(nuevosItems);
    
    // Recalcular totales y actualizar estado
    const totales = calcularTotales(nuevosItems, devolucionesEnvases);
    set({
      items: nuevosItems,
      ...totales
    });
    
    // Feedback háptico
    if ('vibrate' in navigator) {
      navigator.vibrate(30);
    }
  },

  // Actualizar item existente
  actualizarItem: async (itemId: string, cantidad: number, precioUnitario: number) => {
    const { items, devolucionesEnvases } = get();
    
    const nuevosItems = items.map(item => {
      if (item.id === itemId) {
        const cantidadUnidadesBase = item.esFraccion 
          ? cantidad / item.producto.factorDivisor 
          : cantidad;
        
        return {
          ...item,
          cantidad,
          cantidadUnidadesBase,
          precioUnitario,
          subtotal: cantidad * precioUnitario,
          valorSena: item.cobrarSena && item.tipoEnvaseId 
            ? (items.find(i => i.tipoEnvaseId === item.tipoEnvaseId)?.valorSena ?? 0) / item.cantidad * Math.ceil(cantidadUnidadesBase)
            : 0
        };
      }
      return item;
    });
    
    await guardarCarrito(nuevosItems);
    const totales = calcularTotales(nuevosItems, devolucionesEnvases);
    set({
      items: nuevosItems,
      ...totales
    });
  },

  // Eliminar item del carrito
  eliminarItem: async (itemId: string) => {
    const { items, devolucionesEnvases } = get();
    
    const nuevosItems = items.filter(item => item.id !== itemId);
    
    await guardarCarrito(nuevosItems);
    const totales = calcularTotales(nuevosItems, devolucionesEnvases);
    set({
      items: nuevosItems,
      ...totales
    });
  },

  // Agregar devolución de envase
  agregarDevolucionEnvase: (tipoEnvase: TipoEnvase, cantidad: number) => {
    const { items, devolucionesEnvases } = get();
    
    const existente = devolucionesEnvases.find(d => d.tipoEnvaseId === tipoEnvase.id);
    
    let nuevasDevoluciones: DevolucionEnvase[];
    if (existente) {
      nuevasDevoluciones = devolucionesEnvases.map(d => {
        if (d.tipoEnvaseId === tipoEnvase.id) {
          return { ...d, cantidad: d.cantidad + cantidad };
        }
        return d;
      });
    } else {
      nuevasDevoluciones = [
        ...devolucionesEnvases,
        { tipoEnvaseId: tipoEnvase.id, tipoEnvase, cantidad }
      ];
    }
    
    const totales = calcularTotales(items, nuevasDevoluciones);
    set({
      devolucionesEnvases: nuevasDevoluciones,
      ...totales
    });
    
    // Feedback háptico
    if ('vibrate' in navigator) {
      navigator.vibrate([30, 30, 30]);
    }
  },

  // Actualizar cantidad de devolución
  actualizarDevolucionEnvase: (tipoEnvaseId: string, cantidad: number) => {
    const { items, devolucionesEnvases } = get();
    
    if (cantidad <= 0) {
      const nuevasDevoluciones = devolucionesEnvases.filter(d => d.tipoEnvaseId !== tipoEnvaseId);
      const totales = calcularTotales(items, nuevasDevoluciones);
      set({
        devolucionesEnvases: nuevasDevoluciones,
        ...totales
      });
    } else {
      const nuevasDevoluciones = devolucionesEnvases.map(d => {
        if (d.tipoEnvaseId === tipoEnvaseId) {
          return { ...d, cantidad };
        }
        return d;
      });
      const totales = calcularTotales(items, nuevasDevoluciones);
      set({
        devolucionesEnvases: nuevasDevoluciones,
        ...totales
      });
    }
  },

  // Eliminar devolución de envase
  eliminarDevolucionEnvase: (tipoEnvaseId: string) => {
    const { items, devolucionesEnvases } = get();
    
    const nuevasDevoluciones = devolucionesEnvases.filter(d => d.tipoEnvaseId !== tipoEnvaseId);
    const totales = calcularTotales(items, nuevasDevoluciones);
    set({
      devolucionesEnvases: nuevasDevoluciones,
      ...totales
    });
  },

  // Limpiar carrito completo
  limpiarCarrito: async () => {
    await limpiarCarritoDB();
    set({
      items: [],
      devolucionesEnvases: [],
      subtotalProductos: 0,
      totalEnvasesCobrados: 0,
      totalDevolucionEnvases: 0,
      total: 0
    });
  },

  // Limpiar solo devoluciones
  limpiarDevoluciones: () => {
    const { items } = get();
    const totales = calcularTotales(items, []);
    set({
      devolucionesEnvases: [],
      ...totales
    });
  },

  // Recalcular totales manualmente
  recalcularTotales: () => {
    const { items, devolucionesEnvases } = get();
    const totales = calcularTotales(items, devolucionesEnvases);
    set(totales);
  }
}));

// ========================================
// SELECTORES DERIVADOS
// ========================================

export const useCarritoItems = () => useCarritoStore(state => state.items);
export const useCarritoTotal = () => useCarritoStore(state => state.total);
export const useCarritoCantidadItems = () => useCarritoStore(state => state.items.length);
export const useDevoluciones = () => useCarritoStore(state => state.devolucionesEnvases);

// Selector para obtener el monto que genera vale (cuando devolución > compra)
export const useMontoVale = () => useCarritoStore(state => {
  const montoNeto = state.subtotalProductos + state.totalEnvasesCobrados - state.totalDevolucionEnvases;
  return montoNeto < 0 ? Math.abs(montoNeto) : 0;
});

// Verificar si hay items en el carrito
export const useCarritoVacio = () => useCarritoStore(state => state.items.length === 0);

// Obtener resumen para exportar a venta
export const useResumenCarrito = () => useCarritoStore(state => ({
  items: state.items,
  devoluciones: state.devolucionesEnvases.map(d => ({
    tipoEnvaseId: d.tipoEnvaseId,
    cantidad: d.cantidad,
    valorUnitario: d.tipoEnvase.valorSena,
    subtotal: d.tipoEnvase.valorSena * d.cantidad
  } as DevolucionEnvaseDetalle)),
  subtotalProductos: state.subtotalProductos,
  totalEnvasesCobrados: state.totalEnvasesCobrados,
  totalDevolucionEnvases: state.totalDevolucionEnvases,
  total: state.total,
  generaVale: state.subtotalProductos + state.totalEnvasesCobrados < state.totalDevolucionEnvases
}));
