// ========================================
// CONSTANTES CENTRALIZADAS - SOL Y VERDE POS
// ========================================

/**
 * Constantes de UI y UX
 */
export const UI_CONSTANTS = {
  // Touch targets
  TOUCH_TARGET_MIN: 44, // px - mínimo para accesibilidad táctil
  
  // Vibración táctil
  VIBRATION_TAP: 30, // ms
  VIBRATION_SUCCESS: [30, 30, 30], // ms
  VIBRATION_ERROR: [50, 50, 50, 50], // ms
  
  // Animaciones
  TRANSITION_FAST: 150, // ms
  TRANSITION_NORMAL: 250, // ms
  TRANSITION_SLOW: 350, // ms
  
  // Debounce
  DEBOUNCE_SEARCH: 300, // ms
  DEBOUNCE_INPUT: 500, // ms
} as const;

/**
 * Constantes de sincronización
 */
export const SYNC_CONSTANTS = {
  MAX_INTENTOS: 5,
  INTERVALO_SYNC: 30000, // 30 segundos
  BATCH_SIZE: 20,
  BACKOFF_BASE: 1000, // 1 segundo
  TIMEOUT_REQUEST: 10000, // 10 segundos
  MAX_BACKOFF: 60000, // 60 segundos
} as const;

/**
 * Constantes de paginación
 */
export const PAGINATION_CONSTANTS = {
  PAGE_SIZE_VENTAS: 50,
  PAGE_SIZE_PRODUCTOS: 100,
  PAGE_SIZE_DEFAULT: 30,
  MAX_PAGE_SIZE: 200,
} as const;

/**
 * Constantes de validación
 */
export const VALIDATION_CONSTANTS = {
  // Cantidades
  CANTIDAD_MIN: 0.01,
  CANTIDAD_MAX: 9999,
  
  // Precios
  PRECIO_MIN: 0.01,
  PRECIO_MAX: 999999999,
  
  // Texto
  TEXT_MAX_LENGTH: 500,
  DESCRIPCION_MAX_LENGTH: 1000,
  
  // PIN
  PIN_LENGTH: 4,
  
  // CUI Vale
  CUI_LENGTH: 12,
} as const;

/**
 * Constantes de stock
 */
export const STOCK_CONSTANTS = {
  STOCK_BAJO_THRESHOLD: 10,
  STOCK_CRITICO_THRESHOLD: 3,
  STOCK_AGOTADO: 0,
} as const;

/**
 * Constantes de notificaciones
 */
export const NOTIFICATION_CONSTANTS = {
  DURATION_SUCCESS: 3000, // ms
  DURATION_ERROR: 5000, // ms
  DURATION_WARNING: 4000, // ms
  DURATION_INFO: 3000, // ms
  MAX_NOTIFICATIONS: 5,
} as const;

/**
 * Constantes de caché
 */
export const CACHE_CONSTANTS = {
  PRODUCTOS_POPULARES_COUNT: 20,
  CACHE_DURATION: 300000, // 5 minutos
  MAX_CACHE_SIZE: 100,
} as const;

/**
 * Constantes de archivado
 */
export const ARCHIVE_CONSTANTS = {
  DAYS_TO_ARCHIVE: 365, // 1 año
  ARCHIVE_BATCH_SIZE: 100,
} as const;

/**
 * Constantes de impresión
 */
export const PRINT_CONSTANTS = {
  CHARS_58MM: 32,
  CHARS_80MM: 48,
  TIMEOUT_PRINT: 5000, // ms
} as const;

/**
 * Constantes de roles y permisos
 */
export const ROLE_CONSTANTS = {
  ROLES: {
    DUENO: 'dueno',
    VENDEDOR: 'vendedor',
    ADMINISTRATIVO: 'administrativo',
  },
  COLORS: {
    dueno: '#2E7D32',
    vendedor: '#00ACC1',
    administrativo: '#FF6F00',
  },
} as const;

/**
 * Formatos de fecha
 */
export const DATE_FORMATS = {
  DISPLAY: 'dd/MM/yyyy HH:mm',
  DATE_ONLY: 'dd/MM/yyyy',
  TIME_ONLY: 'HH:mm',
  ISO: "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'",
  FILE_NAME: 'yyyyMMdd_HHmmss',
} as const;

/**
 * Mensajes de error comunes
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Error de conexión. Verifica tu internet.',
  SYNC_ERROR: 'Error al sincronizar. Se reintentará automáticamente.',
  VALIDATION_ERROR: 'Los datos ingresados no son válidos.',
  PERMISSION_DENIED: 'No tienes permisos para realizar esta acción.',
  STOCK_INSUFFICIENT: 'Stock insuficiente para completar la venta.',
  PIN_INCORRECT: 'PIN incorrecto.',
  SAVE_ERROR: 'Error al guardar los datos.',
  LOAD_ERROR: 'Error al cargar los datos.',
} as const;

/**
 * Mensajes de éxito comunes
 */
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: 'Guardado exitosamente',
  SYNC_SUCCESS: 'Sincronizado correctamente',
  SALE_COMPLETED: 'Venta registrada con éxito',
  PAYMENT_PROCESSED: 'Pago procesado correctamente',
  SETTINGS_SAVED: 'Configuración guardada',
} as const;
