/**
 * Utilidad para comunicar React con Google Apps Script.
 *
 * CORRECCIÓN CRÍTICA respecto a la versión original:
 * la versión anterior SOLO funcionaba si `google.script.run` existía
 * (es decir, si la app corre embebida dentro del HtmlService del editor
 * de Apps Script). Si la app corre como PWA independiente (Vercel,
 * instalada en una tablet, index.html servido por nginx/Docker, etc.),
 * `google.script.run` no existe nunca, y el código caía en un modo
 * "simulado" que devolvía éxito sin escribir NADA en Google Sheets.
 * Esto significa que la sincronización podía estar fallando en
 * silencio en producción sin que nadie lo notara hasta revisar
 * la planilla y encontrarla vacía.
 *
 * Ahora hay tres modos, en este orden de prioridad:
 *  1. google.script.run   -> app embebida en Apps Script HtmlService.
 *  2. fetch() a la URL del Web App (VITE_GOOGLE_SCRIPT_URL) -> PWA
 *     independiente (Vercel, Docker, tablets instaladas).
 *  3. Mock de desarrollo -> SOLO si no hay conexión Y no hay URL
 *     configurada, y siempre marcado bien visible en consola para
 *     que nunca se confunda con una sincronización real.
 */

declare const google: any;

const GOOGLE_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL as string | undefined;
const TIMEOUT_MS = 15000;

function fetchConTimeout(url: string, options: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return fetch(url, { ...options, signal: controller.signal }).finally(() => {
    clearTimeout(timeoutId);
  });
}

export const runGoogleScript = async (functionName: string, ...args: any[]): Promise<any> => {
  // MODO 1: embebido dentro de Apps Script (google.script.run)
  if (typeof google !== 'undefined' && google.script && google.script.run) {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler((result: any) => resolve(result))
        .withFailureHandler((error: any) => reject(error))
        [functionName](...args);
    });
  }

  // MODO 2: PWA independiente, hablando por HTTP con el Web App desplegado.
  // Convención: el backend expone `ejecutarAccion(action, payload)` y
  // `obtenerProductos()` / `obtenerVale(cui)`. Mapeamos la llamada a la
  // forma que espera doPost/doGet en Code.gs.
  if (GOOGLE_SCRIPT_URL) {
    try {
      if (functionName === 'ejecutarAccion') {
        const [action, payload] = args;
        const response = await fetchConTimeout(GOOGLE_SCRIPT_URL, {
          method: 'POST',
          // 'text/plain' evita el preflight OPTIONS de CORS, que
          // Apps Script Web Apps no siempre responde bien.
          headers: { 'Content-Type': 'text/plain;charset=utf-8' },
          body: JSON.stringify({ action, data: payload }),
        }, TIMEOUT_MS);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status} al llamar a Apps Script`);
        }
        return await response.json();
      }

      if (functionName === 'obtenerProductos') {
        const url = `${GOOGLE_SCRIPT_URL}?action=getProductos`;
        const response = await fetchConTimeout(url, { method: 'GET' }, TIMEOUT_MS);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      }

      if (functionName === 'obtenerVale') {
        const [cui] = args;
        const url = `${GOOGLE_SCRIPT_URL}?action=getVale&cui=${encodeURIComponent(cui)}`;
        const response = await fetchConTimeout(url, { method: 'GET' }, TIMEOUT_MS);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
      }

      // Cualquier otra función server-side directa, vía POST genérico.
      const response = await fetchConTimeout(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: functionName, data: args[0] }),
      }, TIMEOUT_MS);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      // Un fallo de red real debe propagarse como error, NO como
      // éxito simulado, para que syncService.ts lo reintente.
      throw error;
    }
  }

  // MODO 3: sin google.script.run y sin URL configurada -> desarrollo local.
  console.warn(
    `%c[DEV MODE - SIN BACKEND REAL] Simulando "${functionName}". ` +
    `Configurá VITE_GOOGLE_SCRIPT_URL en .env para probar contra Apps Script de verdad.`,
    'color: orange; font-weight: bold;',
    args
  );
  return { success: true, message: 'Simulado en modo local (sin backend configurado)' };
};
