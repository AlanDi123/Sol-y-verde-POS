// ========================================
// SERVICIO DE MONITOREO DE STOCK
// Notificaciones automáticas para stock bajo/crítico
// ========================================

import { db } from '../db/database';
import { notificar } from '../stores/notificacionesStore';
import { STOCK_CONSTANTS } from '../utils/constants';

let intervaloMonitoreo: ReturnType<typeof setInterval> | null = null;

/**
 * Inicia el monitoreo automático de stock
 */
export function iniciarMonitoreoStock(intervaloMs: number = 300000) { // 5 minutos por defecto
  if (intervaloMonitoreo) {
    return; // Ya está corriendo
  }
  
  // Ejecutar inmediatamente
  verificarStockBajo();
  
  // Luego cada intervalo
  intervaloMonitoreo = setInterval(() => {
    verificarStockBajo();
  }, intervaloMs);
  
  console.log('[Stock Monitor] Monitoreo iniciado');
}

/**
 * Detiene el monitoreo automático
 */
export function detenerMonitoreoStock() {
  if (intervaloMonitoreo) {
    clearInterval(intervaloMonitoreo);
    intervaloMonitoreo = null;
    console.log('[Stock Monitor] Monitoreo detenido');
  }
}

/**
 * Verifica productos con stock bajo o crítico
 */
async function verificarStockBajo() {
  try {
    const productos = await db.productos
      .where('activo')
      .equals(1)
      .toArray();
    
    const productosBajoStock: typeof productos = [];
    const productosCriticos: typeof productos = [];
    const productosAgotados: typeof productos = [];
    
    for (const producto of productos) {
      const stock = producto.stockActual;
      
      if (stock <= STOCK_CONSTANTS.STOCK_AGOTADO) {
        productosAgotados.push(producto);
      } else if (stock <= STOCK_CONSTANTS.STOCK_CRITICO_THRESHOLD) {
        productosCriticos.push(producto);
      } else if (stock <= STOCK_CONSTANTS.STOCK_BAJO_THRESHOLD) {
        productosBajoStock.push(producto);
      }
    }
    
    // Notificar productos agotados (prioridad máxima)
    if (productosAgotados.length > 0) {
      for (const producto of productosAgotados.slice(0, 3)) { // Máximo 3 notificaciones
        notificar.error(
          '🚨 Producto Agotado',
          `${producto.emoji} ${producto.nombre} está agotado`,
        );
      }
    }
    
    // Notificar productos críticos
    if (productosCriticos.length > 0) {
      for (const producto of productosCriticos.slice(0, 2)) {
        notificar.stockCritico(producto.nombre, producto.stockActual);
      }
    }
    
    // Notificar productos con stock bajo (menos urgente)
    if (productosBajoStock.length > 0 && Math.random() < 0.3) { // 30% de probabilidad para no saturar
      const productoRandom = productosBajoStock[Math.floor(Math.random() * productosBajoStock.length)];
      notificar.stockBajo(productoRandom.nombre, productoRandom.stockActual);
    }
    
    // Log resumen
    if (productosAgotados.length > 0 || productosCriticos.length > 0 || productosBajoStock.length > 0) {
      console.log('[Stock Monitor] Resumen:', {
        agotados: productosAgotados.length,
        criticos: productosCriticos.length,
        bajos: productosBajoStock.length,
      });
    }
  } catch (error) {
    console.error('[Stock Monitor] Error verificando stock:', error);
  }
}

/**
 * Obtiene estadísticas de stock
 */
export async function obtenerEstadisticasStock() {
  try {
    const productos = await db.productos
      .where('activo')
      .equals(1)
      .toArray();
    
    const stats = {
      total: productos.length,
      agotados: 0,
      criticos: 0,
      bajos: 0,
      normales: 0,
    };
    
    for (const producto of productos) {
      const stock = producto.stockActual;
      
      if (stock <= STOCK_CONSTANTS.STOCK_AGOTADO) {
        stats.agotados++;
      } else if (stock <= STOCK_CONSTANTS.STOCK_CRITICO_THRESHOLD) {
        stats.criticos++;
      } else if (stock <= STOCK_CONSTANTS.STOCK_BAJO_THRESHOLD) {
        stats.bajos++;
      } else {
        stats.normales++;
      }
    }
    
    return stats;
  } catch (error) {
    console.error('[Stock Monitor] Error obteniendo estadísticas:', error);
    return {
      total: 0,
      agotados: 0,
      criticos: 0,
      bajos: 0,
      normales: 0,
    };
  }
}

/**
 * Obtiene lista de productos con problemas de stock
 */
export async function obtenerProductosConProblemas() {
  try {
    const productos = await db.productos
      .where('activo')
      .equals(1)
      .filter(p => p.stockActual <= STOCK_CONSTANTS.STOCK_BAJO_THRESHOLD)
      .toArray();
    
    return productos.sort((a, b) => a.stockActual - b.stockActual);
  } catch (error) {
    console.error('[Stock Monitor] Error obteniendo productos con problemas:', error);
    return [];
  }
}
