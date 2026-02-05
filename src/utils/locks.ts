// ========================================
// UTILIDADES DE LOCKS ATÓMICOS
// Prevención de race conditions
// ========================================

/**
 * Sistema de locks simple usando localStorage con timeout
 */
class LockManager {
  private locks: Map<string, number> = new Map();
  private readonly LOCK_TIMEOUT = 5000; // 5 segundos
  
  /**
   * Intenta adquirir un lock
   * Retorna true si se adquirió, false si ya está bloqueado
   */
  async acquire(lockKey: string, maxWaitTime: number = 10000): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      // Verificar si el lock ya existe
      const existingLock = this.locks.get(lockKey);
      
      if (existingLock) {
        // Verificar si el lock ha expirado
        if (Date.now() - existingLock > this.LOCK_TIMEOUT) {
          // Lock expirado, eliminarlo
          this.locks.delete(lockKey);
        } else {
          // Lock activo, esperar un poco
          await this.sleep(50);
          continue;
        }
      }
      
      // Intentar adquirir el lock
      this.locks.set(lockKey, Date.now());
      
      // Verificar que realmente lo adquirimos (double-check)
      await this.sleep(10);
      const currentLock = this.locks.get(lockKey);
      
      if (currentLock && Math.abs(currentLock - Date.now()) < 100) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Libera un lock
   */
  release(lockKey: string): void {
    this.locks.delete(lockKey);
  }
  
  /**
   * Ejecuta una función con un lock
   */
  async withLock<T>(
    lockKey: string,
    fn: () => Promise<T>,
    maxWaitTime: number = 10000
  ): Promise<T> {
    const acquired = await this.acquire(lockKey, maxWaitTime);
    
    if (!acquired) {
      throw new Error(`No se pudo adquirir el lock: ${lockKey}`);
    }
    
    try {
      return await fn();
    } finally {
      this.release(lockKey);
    }
  }
  
  /**
   * Limpia locks expirados
   */
  cleanExpiredLocks(): void {
    const now = Date.now();
    for (const [key, timestamp] of this.locks.entries()) {
      if (now - timestamp > this.LOCK_TIMEOUT) {
        this.locks.delete(key);
      }
    }
  }
  
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Instancia global del lock manager
export const lockManager = new LockManager();

// Limpiar locks expirados cada 10 segundos
setInterval(() => {
  lockManager.cleanExpiredLocks();
}, 10000);

/**
 * Genera un número de venta de manera atómica
 * Previene race conditions usando locks
 */
export async function obtenerNumeroVentaAtomic(
  obtenerNumeroFn: () => Promise<number>,
  guardarNumeroFn: (numero: number) => Promise<void>
): Promise<number> {
  return lockManager.withLock('numero-venta-diario', async () => {
    const numeroActual = await obtenerNumeroFn();
    const nuevoNumero = numeroActual + 1;
    await guardarNumeroFn(nuevoNumero);
    return nuevoNumero;
  });
}

/**
 * Ejecuta una operación crítica con retry en caso de fallo por lock
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 100
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        // Esperar antes de reintentar con backoff exponencial
        await new Promise((resolve) => setTimeout(resolve, delayMs * Math.pow(2, i)));
      }
    }
  }
  
  throw lastError || new Error('Max retries reached');
}
