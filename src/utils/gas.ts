/**
 * Utilidad para comunicar React nativamente con Google Apps Script.
 * Convierte el sistema de callbacks de GAS en Promesas modernas (async/await).
 */

// Le decimos a TypeScript que la variable global 'google' existe en tiempo de ejecución
declare const google: any;

export const runGoogleScript = (functionName: string, ...args: any[]): Promise<any> => {
  return new Promise((resolve, reject) => {
    // 1. Verificamos si estamos dentro de Google Apps Script
    if (typeof google !== 'undefined' && google.script && google.script.run) {
      
      // Llamada nativa a Apps Script
      google.script.run
        .withSuccessHandler((result: any) => resolve(result))
        .withFailureHandler((error: any) => reject(error))
        [functionName](...args); // Ejecuta la función con los argumentos pasados

    } else {
      // 2. MODO DESARROLLO (Localhost)
      // Si ejecutas 'npm run dev', google.script no existe. 
      // Esto evita que la app se rompa y te permite simular respuestas en consola.
      console.warn(`[DEV MODE] Simulando llamada a backend: ${functionName}`, args);
      
      // Puedes personalizar estos mocks según la función que estés probando
      if (functionName === 'obtenerInventario') {
        resolve([{ id: '1', name: 'Manzanas', stock: 100 }]); // Ejemplo
      } else {
        resolve({ success: true, message: 'Simulado en modo local' });
      }
    }
  });
};