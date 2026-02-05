// ========================================
// UTILIDADES DE VALIDACIÓN Y SEGURIDAD
// ========================================

/**
 * Valida que un número sea positivo
 */
export function validarNumeroPositivo(
  valor: number,
  nombreCampo: string = 'valor'
): boolean {
  if (!isFinite(valor)) {
    throw new Error(`${nombreCampo} debe ser un número válido`);
  }
  if (valor < 0) {
    throw new Error(`${nombreCampo} no puede ser negativo`);
  }
  return true;
}

/**
 * Valida que una cantidad sea válida para venta
 */
export function validarCantidad(cantidad: number): boolean {
  validarNumeroPositivo(cantidad, 'Cantidad');
  if (cantidad === 0) {
    throw new Error('La cantidad debe ser mayor a cero');
  }
  if (cantidad > 9999) {
    throw new Error('La cantidad excede el límite permitido');
  }
  return true;
}

/**
 * Valida que un precio sea válido
 */
export function validarPrecio(precio: number): boolean {
  validarNumeroPositivo(precio, 'Precio');
  if (precio === 0) {
    throw new Error('El precio debe ser mayor a cero');
  }
  if (precio > 999999999) {
    throw new Error('El precio excede el límite permitido');
  }
  return true;
}

/**
 * Sanitiza strings para prevenir XSS
 */
export function sanitizarTexto(texto: string): string {
  if (!texto) return '';
  
  return texto
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim()
    .slice(0, 500); // Límite de 500 caracteres
}

/**
 * Valida formato de fecha
 */
export function validarFecha(fecha: string | Date): boolean {
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  if (isNaN(fechaObj.getTime())) {
    throw new Error('Fecha inválida');
  }
  
  return true;
}

/**
 * Valida que una fecha no sea futura
 */
export function validarFechaNoFutura(fecha: string | Date): boolean {
  validarFecha(fecha);
  const fechaObj = typeof fecha === 'string' ? new Date(fecha) : fecha;
  
  if (fechaObj > new Date()) {
    throw new Error('La fecha no puede ser futura');
  }
  
  return true;
}

/**
 * Valida PIN de 4 dígitos
 */
export function validarPIN(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('El PIN debe ser de 4 dígitos numéricos');
  }
  return true;
}

/**
 * Genera un código único seguro
 */
export function generarCodigoSeguro(prefijo: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 9);
  return `${prefijo}${timestamp}-${random}`.toUpperCase();
}

/**
 * Formatea moneda de manera segura
 */
export function formatearMonedaSegura(monto: number): string {
  try {
    validarNumeroPositivo(monto, 'Monto');
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(monto);
  } catch (error) {
    return '$0';
  }
}

/**
 * Redondea precio a 2 decimales
 */
export function redondearPrecio(precio: number): number {
  return Math.round(precio * 100) / 100;
}

/**
 * Valida stock disponible
 */
export function validarStockDisponible(
  stockActual: number,
  cantidadRequerida: number,
  permitirStockCero: boolean = false
): boolean {
  validarNumeroPositivo(stockActual, 'Stock actual');
  validarNumeroPositivo(cantidadRequerida, 'Cantidad requerida');
  
  if (!permitirStockCero && stockActual < cantidadRequerida) {
    throw new Error(
      `Stock insuficiente. Disponible: ${stockActual}, Requerido: ${cantidadRequerida}`
    );
  }
  
  return true;
}
