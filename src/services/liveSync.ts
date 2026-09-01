// ========================================
// LIVE SYNC — refleja cambios de OTRAS tablets casi al instante
// ========================================
// syncService.ts ya sube lo que pasa en ESTA tablet (ventas, gastos...).
// Esto complementa bajando lo que cambió en el servidor por culpa de
// OTRAS tablets (stock que bajó, un producto nuevo, un precio editado),
// vía polling corto. No es push real (Apps Script no tiene WebSockets),
// pero con un intervalo de 5-6s el vendedor lo percibe como instantáneo.

import { db } from '../db/database';
import { SYNC_CONSTANTS } from '../utils/constants';
import { runGoogleScript } from '../utils/gas';

const { INTERVALO_LIVE } = SYNC_CONSTANTS;

let liveInterval: ReturnType<typeof setInterval> | null = null;
let consultando = false;

export function iniciarLiveSync(): void {
  if (liveInterval) return;

  console.log('[LiveSync] Iniciando polling de estado en vivo...');
  consultarEstadoLive();

  liveInterval = setInterval(() => {
    consultarEstadoLive();
  }, INTERVALO_LIVE);

  window.addEventListener('online', () => consultarEstadoLive());
}

export function detenerLiveSync(): void {
  if (liveInterval) {
    clearInterval(liveInterval);
    liveInterval = null;
  }
}

async function consultarEstadoLive(): Promise<void> {
  if (consultando) return;
  if (!navigator.onLine) return;

  consultando = true;
  try {
    const respuesta = await runGoogleScript('obtenerEstadoLive', null);

    if (!respuesta?.success || !Array.isArray(respuesta.productos)) return;

    // Merge: el servidor es la fuente de verdad para stock y catálogo.
    // No pisamos campos que solo existen localmente (ej. favoritos de UI).
    for (const producto of respuesta.productos) {
      const local = await db.productos.get(producto.id);
      await db.productos.put({
        ...local,
        ...producto,
        fechaActualizacion: new Date().toISOString()
      });
    }
  } catch (error) {
    // Un fallo de polling no debe interrumpir la venta en curso.
    console.warn('[LiveSync] Error consultando estado en vivo:', error);
  } finally {
    consultando = false;
  }
}
