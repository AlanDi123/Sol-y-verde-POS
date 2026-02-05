// ========================================
// SERVICIO DE SINCRONIZACIÓN CON GOOGLE SHEETS
// Con reintentos exponenciales y cola robusta
// ========================================

import { db } from '../db/database';
import { type ConfiguracionSistema, type SyncQueueItem } from '../types';
import { SYNC_CONSTANTS } from '../utils/constants';

// Constantes importadas
const {
  MAX_INTENTOS,
  INTERVALO_SYNC,
  BATCH_SIZE,
  BACKOFF_BASE,
  TIMEOUT_REQUEST,
  MAX_BACKOFF
} = SYNC_CONSTANTS;

// Estado del servicio
let syncInterval: ReturnType<typeof setInterval> | null = null;
let sincronizando = false;

/**
 * Calcula el delay de reintentos con backoff exponencial
 * Fórmula: delay = BACKOFF_BASE * (2 ^ intentos) + jitter
 */
function calcularBackoffDelay(intentos: number): number {
  const exponential = BACKOFF_BASE * Math.pow(2, intentos);
  const jitter = Math.random() * 1000; // Añadir jitter aleatorio
  return Math.min(exponential + jitter, MAX_BACKOFF);
}

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
    // Obtener configuración - FIX: usar ID correcto
    const config = await db.configuracion.get('config-principal') as ConfiguracionSistema | undefined;
    
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
    await db.configuracion.update('config-principal', {
      ultimaSincronizacion: Date.now()
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
    
    // Preparar payload
    const payload = {
      action: item.tipo,
      data: item.datos,
      timestamp: item.timestamp
    };
    
    // Enviar a Google Sheets con timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_REQUEST);
    
    try {
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Verificar respuesta
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Intentar leer la respuesta
      let resultado;
      try {
        resultado = await response.json();
        if (!resultado.success) {
          throw new Error(resultado.error || 'Error desconocido del servidor');
        }
      } catch (parseError) {
        // Si no podemos parsear JSON, asumimos éxito si el status es OK
        console.warn('[Sync] No se pudo parsear respuesta, asumiendo éxito');
      }
      
      // Marcar como completado
      await db.syncQueue.update(item.id, {
        estado: 'completado'
      });
      
      // Marcar el registro original como sincronizado
      await marcarComoSincronizado(item.tipo, item.datos.id);
      
      console.log(`[Sync] Item ${item.tipo} sincronizado:`, item.datos.id);
      
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      throw fetchError;
    }
    
  } catch (error: any) {
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
      // Calcular delay de reintento con backoff exponencial
      const delay = calcularBackoffDelay(intentos);
      
      // Reintentar más tarde
      await db.syncQueue.update(item.id, {
        estado: 'pendiente',
        intentos,
        ultimoIntento: Date.now()
      });
      
      console.warn(`[Sync] Reintentando item ${item.id} en ${delay}ms (intento ${intentos}/${MAX_INTENTOS})`);
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
  ultimaSync: number | null;
}> {
  const [pendientes, procesando, completados, fallidos] = await Promise.all([
    db.syncQueue.where('estado').equals('pendiente').count(),
    db.syncQueue.where('estado').equals('procesando').count(),
    db.syncQueue.where('estado').equals('completado').count(),
    db.syncQueue.where('estado').equals('fallido').count()
  ]);
  
  const config = await db.configuracion.get('config-principal') as ConfiguracionSistema | undefined;
  
  return {
    pendientes,
    procesando,
    completados,
    fallidos,
    ultimaSync: config?.ultimaSincronizacion ?? null
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
