// ========================================
// TIPOS PRINCIPALES DEL SISTEMA POS SOL Y VERDE
// ========================================

// ========================================
// PRODUCTOS Y UNIDADES
// ========================================

export interface Producto {
  id: string;
  codigo: string;
  nombre: string;
  nombreCorto: string;
  emoji: string;
  categoria: CategoriaProducto;
  // Gestión de unidades
  unidadBase: 'bulto' | 'kg' | 'unidad';
  esFraccionable: boolean;
  factorDivisor: number; // Ej: 1 Bulto = 10 Paquetes -> factorDivisor = 10
  nombreSubunidad: string; // "paquete", "docena", "kg"
  // Precios
  precioSugerido: number;
  ultimoPrecioVenta: number;
  // Stock
  stockActual: number;
  stockMinimo: number;
  // Metadata
  activo: boolean;
  fechaCreacion: number;
  fechaModificacion: number;
}

export type CategoriaProducto = 
  | 'verduras'
  | 'frutas'
  | 'hortalizas'
  | 'tuberculos'
  | 'hojas'
  | 'citricos'
  | 'otros';

// ========================================
// ENVASES Y SEÑAS
// ========================================

export interface TipoEnvase {
  id: string;
  nombre: string;
  descripcion: string;
  valorSena: number; // En pesos argentinos
  seña?: number; // Alias opcional para valorSena
  emoji: string;
  activo: boolean;
  orden: number;
}

export interface MovimientoEnvase {
  id: string;
  tipoEnvaseId: string;
  tipoMovimiento: 'entrada' | 'salida' | 'devolucion' | 'ajuste';
  cantidad: number;
  valorUnitario: number;
  valorTotal: number;
  ventaId?: string;
  valeId?: string;
  vendedorId: string;
  turnoId: string;
  observacion?: string;
  timestamp: number;
  sincronizado: boolean;
}

export interface InventarioEnvases {
  id: string;
  tipoEnvaseId: string;
  cantidadFisica: number;
  cantidadPrestada: number; // Cajones que fueron dados con seña
  ultimaActualizacion: number;
}

// ========================================
// VALES DIGITALES (TOKENS DE CRÉDITO)
// ========================================

export interface Vale {
  id: string;
  cui: string; // Código Único de Identificación (formato: SYV-XXXX-XXXX)
  clienteNombre?: string;
  clienteTelefono?: string;
  montoOriginal: number;
  montoUsado: number;
  montoDisponible: number;
  saldoActual?: number; // Alias opcional para montoDisponible
  estado: EstadoVale;
  // Origen
  ventaOrigenId?: string;
  devolucionEnvasesDetalle?: DevolucionEnvaseDetalle[];
  // Uso
  usos: UsoVale[];
  // Metadata
  vendedorCreadorId: string;
  turnoCreacionId: string;
  fechaCreacion: number;
  fechaGeneracion?: string; // Fecha formateada (opcional)
  fechaExpiracion?: number; // Opcional: vencimiento
  fechaVencimiento?: string; // Fecha formateada de vencimiento
  fechaUltimoUso?: number;
  sincronizado: boolean;
  impreso: boolean;
}

export type EstadoVale = 'activo' | 'parcial' | 'consumido' | 'vencido' | 'anulado';

export interface DevolucionEnvaseDetalle {
  tipoEnvaseId: string;
  cantidad: number;
  valorUnitario: number;
  subtotal: number;
}

export interface UsoVale {
  id: string;
  ventaId: string;
  montoUsado: number;
  fecha: number;
  vendedorId: string;
}

// ========================================
// CARRITO Y VENTA
// ========================================

export interface ItemCarrito {
  id: string;
  productoId: string;
  producto: Producto;
  cantidad: number;
  esFraccion: boolean; // true si se vendió fraccionado (paquetes en vez de bultos)
  cantidadUnidadesBase: number; // Cantidad convertida a unidad base
  precioUnitario: number;
  precioLista: number;
  subtotal: number;
  // Envase asociado
  tipoEnvaseId?: string;
  cobrarSena: boolean;
  valorSena: number;
}

export interface Venta {
  id: string;
  numero: number; // Número secuencial del día
  items: ItemVenta[];
  // Totales
  subtotalProductos: number;
  totalEnvases: number;
  totalDevolucionEnvases: number;
  descuento: number;
  descuentoDetalle?: Descuento; // Detalle del descuento aplicado
  total: number;
  // Pagos
  pagos: PagoVenta[];
  valesAplicados: ValeAplicado[];
  totalPagado: number;
  vuelto: number;
  // Envases
  envasesEntregados: EnvaseVenta[];
  envasesDevueltos: EnvaseVenta[];
  // Cliente
  clienteNombre?: string;
  clienteInfo?: string;
  // Estado
  estado: EstadoVenta;
  valeGenerado?: string; // ID del vale si se generó crédito
  // Alertas y problemas (para rol administrativo)
  tieneProblemas?: boolean;
  problemasReportados?: ProblemaVenta[];
  // Metadata
  vendedorId: string;
  vendedorNombre: string;
  turnoId: string;
  timestamp: number;
  fechaFormateada: string;
  sincronizado: boolean;
  impreso: boolean;
  observaciones?: string;
}

// Problemas reportados en ventas (por rol administrativo)
export interface ProblemaVenta {
  id: string;
  tipo: 'error_precio' | 'error_cantidad' | 'error_pago' | 'error_envases' | 'otro';
  descripcion: string;
  reportadoPor: string; // ID del vendedor administrativo
  reportadoEn: number; // Timestamp
  resuelto: boolean;
  resolucion?: string;
}

export interface ItemVenta {
  productoId: string;
  codigo: string;
  nombre: string;
  cantidad: number;
  esFraccion: boolean;
  cantidadUnidadesBase: number;
  precioUnitario: number;
  precioLista: number;
  subtotal: number;
  tipoEnvaseId?: string;
  valorSena: number;
}

export interface EnvaseVenta {
  tipoEnvaseId: string;
  nombre: string;
  cantidad: number;
  valorUnitario: number;
  subtotal: number;
}

export interface ValeAplicado {
  valeId: string;
  cui: string;
  montoAplicado: number;
}

export type EstadoVenta = 'pendiente' | 'completada' | 'anulada';

// ========================================
// PAGOS
// ========================================

export interface PagoVenta {
  id: string;
  metodo: MetodoPago;
  monto: number;
  // Específico por método
  detalleEfectivo?: {
    montoRecibido: number;
    vuelto: number;
  };
  detalleTransferencia?: {
    banco: string;
    alias: string;
    conIva: boolean;
    montoSinIva?: number;
  };
  detalleCheque?: {
    banco: string;
    numeroCheque: string;
    fechaVencimiento: string;
    titular?: string;
  };
  timestamp: number;
}

export type MetodoPago = 'efectivo' | 'transferencia' | 'cheque' | 'vale' | 'mixto';

export interface ConfigBanco {
  id: string;
  nombre: string;
  alias: string;
  cbu?: string;
  titular?: string;
  activo: boolean;
  orden: number;
}

// ========================================
// GASTOS DE CAJA Y MOVIMIENTOS
// ========================================

export interface GastoCaja {
  id: string;
  turnoId: string;
  fecha: string; // ISO date string
  categoria: CategoriaGasto;
  categoriaPersonalizada?: string;
  descripcion?: string;
  proveedor?: string;
  monto: number;
  comprobante?: string; // Número de factura/ticket
  vendedorId: string;
  vendedorNombre?: string;
  timestamp?: number;
  sincronizado: boolean;
}

export type CategoriaGasto = 
  | 'almuerzo'
  | 'flete'
  | 'compra_mercaderia'
  | 'limpieza'
  | 'insumos'
  | 'reparaciones'
  | 'otros';

export const CATEGORIAS_GASTO: Record<CategoriaGasto, string> = {
  almuerzo: 'Almuerzo / Comida',
  flete: 'Flete',
  compra_mercaderia: 'Compra de Mercadería',
  limpieza: 'Limpieza',
  insumos: 'Insumos',
  reparaciones: 'Reparaciones',
  otros: 'Otros'
};

// Movimientos de caja (entradas/salidas nocturnas)
export interface MovimientoCaja {
  id: string;
  turnoId: string;
  fecha: string;
  tipo: 'entrada' | 'salida';
  monto: number;
  motivo: string;
  descripcion?: string;
  vendedorId: string;
  vendedorNombre: string;
  timestamp: number;
  sincronizado: boolean;
}

// Descuentos aplicados a ventas
export interface Descuento {
  id: string;
  tipo: 'porcentaje' | 'monto_fijo';
  valor: number; // Porcentaje (ej: 10 para 10%) o monto fijo
  razon: string; // Razón obligatoria del descuento
  aplicadoPor: string; // ID del vendedor que aplicó el descuento
  timestamp: number;
}

// ========================================
// TURNOS Y CIERRE DE CAJA
// ========================================

export interface Turno {
  id: string;
  numero: number;
  vendedorId: string;
  vendedorNombre: string;
  fechaInicio: number;
  fechaFin?: number;
  estado: EstadoTurno;
  // Saldos
  saldoInicial: number;
  fondoInicial: number; // Alias para saldoInicial
  saldoFinal?: number;
  // Resumen calculado al cierre
  resumen?: ResumenTurno;
  // Cierre
  cierreCaja?: CierreCaja;
  sincronizado: boolean;
}

export type EstadoTurno = 'activo' | 'pausado' | 'cerrado';

export interface ResumenTurno {
  // Ventas
  cantidadVentas: number;
  totalVentasBruto: number;
  totalDescuentos: number;
  totalVentasNeto: number;
  // Desglose por método de pago
  totalEfectivo: number;
  totalTransferencias: number;
  totalCheques: number;
  totalValesUsados: number;
  // Envases
  totalEnvasesEntregados: number;
  totalEnvasesDevueltos: number;
  saldoEnvases: number; // Diferencia monetaria
  cantidadEnvasesFisicos: {
    tipoEnvaseId: string;
    nombre: string;
    entregados: number;
    devueltos: number;
    balance: number;
  }[];
  // Vales emitidos
  cantidadValesEmitidos: number;
  totalValesEmitidos: number;
  // Gastos
  cantidadGastos: number;
  totalGastos: number;
  detalleGastos: {
    categoria: CategoriaGasto;
    total: number;
  }[];
  // Balance final
  efectivoEsperado: number;
}

export interface CierreCaja {
  id: string;
  turnoId: string;
  fecha: string; // Fecha ISO
  // Fondos
  fondoInicial: number;
  // Totales
  totalVentas: number;
  totalEfectivo: number;
  totalTransferencias: number;
  totalCheques: number;
  totalVales: number;
  totalGastos: number;
  totalDevoluciones: number;
  // Conteo y comparación
  efectivoEsperado: number;
  efectivoContado: number;
  diferencia: number;
  // Conteo de billetes
  conteoBilletes: ConteoBilletes;
  totalContado: number;
  // Comparación legacy
  totalEsperado: number;
  // Justificación obligatoria si hay diferencia
  justificacionDiferencia?: string;
  // Cheques en mano
  chequesEnMano: ChequeEnMano[];
  // Observaciones
  observaciones?: string;
  // Metadata
  vendedorId: string;
  timestamp: number;
  sincronizado: boolean;
}

export interface ConteoBilletes {
  b20000: number;
  b10000: number;
  b2000: number;
  b1000: number;
  b500: number;
  b200: number;
  b100: number;
  b50: number;
  monedas: number;
}

export const DENOMINACIONES_BILLETES: { key: keyof Omit<ConteoBilletes, 'monedas'>; valor: number; label: string }[] = [
  { key: 'b20000', valor: 20000, label: '$20.000' },
  { key: 'b10000', valor: 10000, label: '$10.000' },
  { key: 'b2000', valor: 2000, label: '$2.000' },
  { key: 'b1000', valor: 1000, label: '$1.000' },
  { key: 'b500', valor: 500, label: '$500' },
  { key: 'b200', valor: 200, label: '$200' },
  { key: 'b100', valor: 100, label: '$100' },
  { key: 'b50', valor: 50, label: '$50' },
];

export interface ChequeEnMano {
  id: string;
  banco: string;
  numero: string;
  monto: number;
  fechaVencimiento: string;
  titular?: string;
  ventaId: string;
}

// ========================================
// VENDEDORES Y AUTENTICACIÓN
// ========================================

export type RolVendedor = 'dueno' | 'vendedor' | 'administrativo';

export interface Vendedor {
  id: string;
  nombre: string;
  pin: string; // PIN hasheado con bcrypt
  activo: boolean;
  esAdmin: boolean; // Deprecated - usar rol en su lugar
  rol: RolVendedor; // Rol del usuario
  permisos: PermisosVendedor;
  fechaCreacion: number;
  ultimoAcceso?: number;
  email?: string;
  telefono?: string;
}

export interface PermisosVendedor {
  // Permisos de ventas
  puedeRegistrarVentas: boolean;
  puedeEditarVentas: boolean;
  puedeAnularVentas: boolean;
  puedeModificarPrecios: boolean;
  puedeAplicarDescuentos: boolean;
  
  // Permisos de caja
  puedeHacerCierres: boolean;
  puedeEditarCierresCerrados: boolean;
  puedeIngresarGastos: boolean;
  puedeIngresarMovimientos: boolean; // Movimientos nocturnos
  
  // Permisos de administración
  puedeVerReportes: boolean;
  puedeEditarProductos: boolean;
  puedeEditarConfig: boolean;
  puedeGestionarUsuarios: boolean;
  
  // Notificaciones y alertas
  puedeNotificarErrores: boolean;
  puedeMarcarProblemasVentas: boolean;
}

export interface SesionVendedor {
  id: string;
  vendedorId: string;
  vendedorNombre: string;
  turnoId: string;
  inicioSesion: number;
  activa: boolean;
}

// ========================================
// CONFIGURACIÓN DEL SISTEMA
// ========================================

export interface ConfiguracionSistema {
  id: string;
  // Negocio
  nombreNegocio: string;
  direccion: string;
  telefono: string;
  cuit?: string;
  // Impresión
  impresionAutomatica: boolean;
  imprimirAuto?: boolean; // Alias opcional
  impresoraUrl?: string;
  anchoTicket: 58 | 80;
  mostrarLogoTicket: boolean;
  pieTicket: string;
  // Sincronización
  googleSheetId?: string;
  googleScriptUrl?: string;
  sincronizacionAutomatica: boolean;
  intervaloSincronizacion: number; // minutos
  ultimaSincronizacion?: number; // Timestamp última sincronización
  modoOfflineForzado?: boolean; // Forzar modo offline
  // UI
  sonidosActivos: boolean;
  vibracionActiva: boolean;
  modoOscuro: boolean;
  // Envases y vales
  diasExpiracionVales: number; // 0 = sin expiración
  permitirVentaStockCero: boolean;
  // Última actualización
  ultimaModificacion: number;
}

// ========================================
// SINCRONIZACIÓN
// ========================================

export interface RegistroSincronizacion {
  id: string;
  tipo: 'venta' | 'gasto' | 'cierre' | 'vale' | 'envase';
  registroId: string;
  estado: 'pendiente' | 'sincronizado' | 'error';
  intentos: number;
  ultimoIntento?: number;
  error?: string;
  timestamp: number;
}

// ========================================
// UTILIDADES
// ========================================

export interface Notificacion {
  id: string;
  tipo: 'success' | 'error' | 'warning' | 'info';
  titulo: string;
  mensaje: string;
  duracion?: number;
  timestamp: number;
}

// Tipos para el formateo de moneda
export const formatearMoneda = (monto: number): string => {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(monto);
};

// Formatear fecha
export const formatearFecha = (fecha: string | number | Date): string => {
  const d = typeof fecha === 'string' || typeof fecha === 'number' 
    ? new Date(fecha) 
    : fecha;
  return d.toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

// ========================================
// TIPOS ADICIONALES PARA COMPATIBILIDAD
// ========================================

// Alias para compatibilidad
export type Gasto = GastoCaja;

// Item de cola de sincronización
export interface SyncQueueItem {
  id: string;
  tipo: 'venta' | 'vale' | 'gasto' | 'cierre' | 'turno';
  datos: any;
  timestamp: number;
  intentos: number;
  ultimoIntento: number | null;
  estado: 'pendiente' | 'procesando' | 'completado' | 'fallido';
}

// Tipo para respuestas de la API de Google Sheets
export interface RespuestaSync {
  success: boolean;
  message?: string;
  timestamp?: number;
  error?: string;
}
