// ========================================
// SERVICIO DE SINCRONIZACIÓN CON GOOGLE SHEETS
// ========================================

import { db } from '../db/database';
import { type ConfiguracionSistema, type SyncQueueItem } from '../types';

// Constantes
const MAX_INTENTOS = 5;
const INTERVALO_SYNC = 30000; // 30 segundos
const BATCH_SIZE = 20;

// Estado del servicio
let syncInterval: ReturnType<typeof setInterval> | null = null;
let sincronizando = false;

// ========================================
// INICIAR SERVICIO
// ========================================

export function iniciarServicioSync(): void {
  if (syncInterval) return;
  
  console.log('[Sync] Iniciando servicio de sincronización...');
  
  // Sincronizar inmediatamente
  procesarColaSincronizacion();
  
  // Configurar intervalo
  syncInterval = setInterval(() => {
    procesarColaSincronizacion();
  }, INTERVALO_SYNC);
  
  // Escuchar cambios de conectividad
  window.addEventListener('online', () => {
    console.log('[Sync] Conexión recuperada, sincronizando...');
    procesarColaSincronizacion();
  });
}

// ========================================
// DETENER SERVICIO
// ========================================

export function detenerServicioSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[Sync] Servicio detenido');
  }
}

// ========================================
// PROCESAR COLA DE SINCRONIZACIÓN
// ========================================

async function procesarColaSincronizacion(): Promise<void> {
  if (sincronizando) return;
  if (!navigator.onLine) {
    console.log('[Sync] Sin conexión, omitiendo sincronización');
    return;
  }
  
  sincronizando = true;
  
  try {
    // Obtener configuración
    const config = await db.configuracion.get('sistema') as ConfiguracionSistema | undefined;
    
    if (!config?.googleScriptUrl) {
      console.log('[Sync] URL de Google Script no configurada');
      return;
    }
    
    if (config.modoOfflineForzado) {
      console.log('[Sync] Modo offline forzado, omitiendo');
      return;
    }
    
    // Obtener items pendientes
    const pendientes = await db.syncQueue
      .where('estado')
      .equals('pendiente')
      .limit(BATCH_SIZE)
      .toArray();
    
    if (pendientes.length === 0) {
      return;
    }
    
    console.log(`[Sync] Procesando ${pendientes.length} items...`);
    
    // Procesar cada item
    for (const item of pendientes) {
      await sincronizarItem(item, config.googleScriptUrl);
    }
    
    // Actualizar última sincronización
    await db.configuracion.update('sistema', {
      ultimaSincronizacion: new Date().toISOString()
    });
    
    console.log('[Sync] Sincronización completada');
  } catch (error) {
    console.error('[Sync] Error en sincronización:', error);
  } finally {
    sincronizando = false;
  }
}

// ========================================
// SINCRONIZAR ITEM INDIVIDUAL
// ========================================

async function sincronizarItem(item: SyncQueueItem, scriptUrl: string): Promise<void> {
  try {
    // Marcar como procesando
    await db.syncQueue.update(item.id, {
      estado: 'procesando',
      ultimoIntento: Date.now()
    });
    
    // Enviar a Google Sheets
    await fetch(scriptUrl, {
      method: 'POST',
      mode: 'no-cors', // Google Apps Script requiere no-cors
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        action: item.tipo,
        data: item.datos,
        timestamp: item.timestamp
      })
    });
    
    // En modo no-cors no podemos leer la respuesta
    // Asumimos éxito si no hay excepción
    
    // Marcar como completado
    await db.syncQueue.update(item.id, {
      estado: 'completado'
    });
    
    // Marcar el registro original como sincronizado
    await marcarComoSincronizado(item.tipo, item.datos.id);
    
    console.log(`[Sync] Item ${item.tipo} sincronizado:`, item.datos.id);
  } catch (error) {
    console.error(`[Sync] Error sincronizando ${item.tipo}:`, error);
    
    const intentos = item.intentos + 1;
    
    if (intentos >= MAX_INTENTOS) {
      // Marcar como fallido permanentemente
      await db.syncQueue.update(item.id, {
        estado: 'fallido',
        intentos,
        ultimoIntento: Date.now()
      });
      console.error(`[Sync] Item ${item.id} marcado como fallido después de ${MAX_INTENTOS} intentos`);
    } else {
      // Reintentar más tarde
      await db.syncQueue.update(item.id, {
        estado: 'pendiente',
        intentos,
        ultimoIntento: Date.now()
      });
    }
  }
}

// ========================================
// MARCAR REGISTROS COMO SINCRONIZADOS
// ========================================

async function marcarComoSincronizado(tipo: string, id: string): Promise<void> {
  try {
    switch (tipo) {
      case 'venta':
        await db.ventas.update(id, { sincronizado: true });
        break;
      case 'vale':
        await db.vales.update(id, { sincronizado: true });
        break;
      case 'gasto':
        await db.gastos.update(id, { sincronizado: true });
        break;
      case 'cierre':
        await db.cierresCaja.update(id, { sincronizado: true });
        break;
      case 'turno':
        await db.turnos.update(id, { sincronizado: true });
        break;
    }
  } catch (error) {
    console.error(`[Sync] Error marcando ${tipo} ${id} como sincronizado:`, error);
  }
}

// ========================================
// ENCOLAR PARA SINCRONIZACIÓN
// ========================================

export async function encolarParaSync(
  tipo: SyncQueueItem['tipo'],
  datos: any
): Promise<void> {
  const item: SyncQueueItem = {
    id: `${tipo}-${datos.id}-${Date.now()}`,
    tipo,
    datos,
    timestamp: Date.now(),
    intentos: 0,
    ultimoIntento: null,
    estado: 'pendiente'
  };
  
  await db.syncQueue.add(item);
  console.log(`[Sync] Encolado ${tipo}:`, datos.id);
}

// ========================================
// ESTADÍSTICAS DE SINCRONIZACIÓN
// ========================================

export async function obtenerEstadisticasSync(): Promise<{
  pendientes: number;
  procesando: number;
  completados: number;
  fallidos: number;
  ultimaSync: string | null;
}> {
  const [pendientes, procesando, completados, fallidos] = await Promise.all([
    db.syncQueue.where('estado').equals('pendiente').count(),
    db.syncQueue.where('estado').equals('procesando').count(),
    db.syncQueue.where('estado').equals('completado').count(),
    db.syncQueue.where('estado').equals('fallido').count()
  ]);
  
  const config = await db.configuracion.get('sistema') as ConfiguracionSistema | undefined;
  
  return {
    pendientes,
    procesando,
    completados,
    fallidos,
    ultimaSync: config?.ultimaSincronizacion 
      ? new Date(config.ultimaSincronizacion).toISOString() 
      : null
  };
}

// ========================================
// REINTENTAR ITEMS FALLIDOS
// ========================================

export async function reintentarFallidos(): Promise<number> {
  const fallidos = await db.syncQueue
    .where('estado')
    .equals('fallido')
    .toArray();
  
  for (const item of fallidos) {
    await db.syncQueue.update(item.id, {
      estado: 'pendiente',
      intentos: 0
    });
  }
  
  console.log(`[Sync] ${fallidos.length} items marcados para reintento`);
  
  // Forzar sincronización inmediata
  procesarColaSincronizacion();
  
  return fallidos.length;
}

// ========================================
// LIMPIAR COLA COMPLETADOS
// ========================================

export async function limpiarColaCompletados(): Promise<number> {
  const completados = await db.syncQueue
    .where('estado')
    .equals('completado')
    .toArray();
  
  for (const item of completados) {
    await db.syncQueue.delete(item.id);
  }
  
  console.log(`[Sync] ${completados.length} items completados eliminados de la cola`);
  
  return completados.length;
}

// ========================================
// SINCRONIZACIÓN BIDIRECCIONAL (PULL)
// ========================================

export async function sincronizarProductosDesdeSheets(scriptUrl: string): Promise<boolean> {
  try {
    // En una implementación real, esto haría un GET al script
    // y actualizaría los productos locales
    
    const response = await fetch(`${scriptUrl}?action=getProductos`, {
      method: 'GET'
    });
    
    if (!response.ok) {
      throw new Error('Error obteniendo productos');
    }
    
    const productos = await response.json();
    
    // Actualizar productos locales
    for (const producto of productos) {
      await db.productos.put({
        ...producto,
        fechaActualizacion: new Date().toISOString()
      });
    }
    
    console.log(`[Sync] ${productos.length} productos actualizados desde Sheets`);
    return true;
  } catch (error) {
    console.error('[Sync] Error sincronizando productos:', error);
    return false;
  }
}
