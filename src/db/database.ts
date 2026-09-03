// ========================================
// BASE DE DATOS DEXIE.JS - PERSISTENCIA BUNKER-LEVEL
// Sol y Verde POS v3.0
// ========================================

import Dexie, { Table } from 'dexie';
import type {
  Producto,
  TipoEnvase,
  MovimientoEnvase,
  InventarioEnvases,
  Vale,
  Venta,
  GastoCaja,
  MovimientoCaja,
  Turno,
  CierreCaja,
  Vendedor,
  SesionVendedor,
  ConfiguracionSistema,
  ConfigBanco,
  RegistroSincronizacion,
  ItemCarrito,
  SyncQueueItem,
} from '../types';

// ========================================
// DEFINICIÓN DE LA BASE DE DATOS
// ========================================

export class SolYVerdeDB extends Dexie {
  // Tablas principales
  productos!: Table<Producto, string>;
  tiposEnvase!: Table<TipoEnvase, string>;
  movimientosEnvase!: Table<MovimientoEnvase, string>;
  inventarioEnvases!: Table<InventarioEnvases, string>;
  vales!: Table<Vale, string>;
  ventas!: Table<Venta, string>;
  gastosCaja!: Table<GastoCaja, string>;
  gastos!: Table<GastoCaja, string>; // Alias para gastosCaja
  movimientosCaja!: Table<MovimientoCaja, string>; // NUEVO: movimientos nocturnos
  turnos!: Table<Turno, string>;
  cierresCaja!: Table<CierreCaja, string>;
  vendedores!: Table<Vendedor, string>;
  sesiones!: Table<SesionVendedor, string>;
  configuracion!: Table<ConfiguracionSistema, string>;
  bancos!: Table<ConfigBanco, string>;
  sincronizacion!: Table<RegistroSincronizacion, string>;
  
  // Cola de sincronización
  syncQueue!: Table<SyncQueueItem, string>;
  
  // Carrito persistente (crítico para Bunker-Level)
  carritoActual!: Table<ItemCarrito, string>;
  
  // Estado de la app
  estadoApp!: Table<{ id: string; key: string; value: any }, string>;

  constructor() {
    super('SolYVerdePOS');
    
    // Versión 1: Schema inicial completo
    this.version(1).stores({
      // Productos: índices para búsqueda rápida por código, nombre y categoría
      productos: 'id, codigo, nombre, categoria, activo, stockActual',
      
      // Envases
      tiposEnvase: 'id, nombre, activo, orden',
      movimientosEnvase: 'id, tipoEnvaseId, tipoMovimiento, ventaId, valeId, turnoId, timestamp, sincronizado',
      inventarioEnvases: 'id, tipoEnvaseId',
      
      // Vales: índice por CUI para búsqueda rápida
      vales: 'id, cui, estado, clienteNombre, turnoCreacionId, fechaCreacion, sincronizado',
      
      // Ventas: múltiples índices para reportes
      ventas: 'id, numero, estado, vendedorId, turnoId, timestamp, sincronizado, fechaFormateada',
      
      // Gastos y movimientos de caja
      gastosCaja: 'id, categoria, vendedorId, turnoId, timestamp, sincronizado',
      gastos: 'id, categoria, vendedorId, turnoId, timestamp, sincronizado',
      movimientosCaja: 'id, tipo, turnoId, vendedorId, timestamp, sincronizado',
      
      // Turnos y cierres
      turnos: 'id, numero, vendedorId, estado, fechaInicio, sincronizado',
      cierresCaja: 'id, turnoId, timestamp, sincronizado',
      
      // Usuarios
      vendedores: 'id, nombre, activo, rol',
      sesiones: 'id, vendedorId, turnoId, activa',
      
      // Configuración
      configuracion: 'id',
      bancos: 'id, nombre, activo, orden',
      
      // Sincronización
      sincronizacion: 'id, tipo, registroId, estado, timestamp',
      syncQueue: 'id, tipo, estado, timestamp, prioridad',
      
      // Carrito persistente - CRÍTICO
      carritoActual: 'id, productoId',
      
      // Estado general de la app
      estadoApp: 'id, key'
    });
  }
}

// Instancia singleton de la base de datos
export const db = new SolYVerdeDB();

// ========================================
// INICIALIZACIÓN Y DATOS POR DEFECTO
// ========================================

// ========================================
// GARANTÍA DE VENDEDOR ADMIN (independiente del resto de la config)
// ========================================
// Se ejecuta en cada arranque. Si ya hay al menos un vendedor, no toca
// nada (no pisa PINs personalizados que el dueño ya haya configurado).
// Solo crea el admin por defecto si la tabla está realmente vacía.
export async function asegurarVendedorAdminExiste(): Promise<void> {
  const cantidadVendedores = await db.vendedores.count();
  if (cantidadVendedores > 0) return;

  console.warn('⚠️ No se encontró ningún vendedor. Creando administrador por defecto (PIN 1234)...');

  const { hashearPIN } = await import('../utils/security');
  const { obtenerPermisosPorRol } = await import('../utils/roles');
  const pinHasheado = await hashearPIN('1234');

  await db.vendedores.put({
    id: 'vendedor-admin',
    nombre: 'Administrador',
    pin: pinHasheado,
    activo: true,
    esAdmin: true,
    rol: 'dueno',
    permisos: obtenerPermisosPorRol('dueno'),
    fechaCreacion: Date.now(),
    email: 'admin@solyverde.com',
    telefono: ''
  });

  console.log('✅ Vendedor administrador recreado. Ingresar con PIN 1234 y cambiarlo cuanto antes.');
}

// ========================================
// AUTO-REPARACIÓN DE PINS CORRUPTOS
// ========================================
// Un hash de bcrypt siempre empieza con "$2a$", "$2b$" o "$2y$". Si algún
// vendedor tiene en 'pin' un valor que NO tiene esa forma (por ejemplo,
// alguien lo editó a mano en DevTools dejando el número en texto plano,
// como pasó acá), verificarPIN() jamás va a poder validarlo, sin importar
// qué PIN se escriba. Esta función corre en cada arranque, detecta esos
// casos y re-hashea automáticamente, tomando el valor guardado como el
// PIN real que se quiso poner.
export async function repararHashesDePinCorruptos(): Promise<number> {
  const { hashearPIN } = await import('../utils/security');
  const vendedores = await db.vendedores.toArray();
  let reparados = 0;

  for (const v of vendedores) {
    const pareceHashValido = /^\$2[aby]\$\d{2}\$/.test(v.pin || '');
    if (pareceHashValido) continue;

    // El valor guardado no es un hash válido: si parece un PIN de 4
    // dígitos, lo re-hasheamos. Si no tiene ni esa forma, no podemos
    // adivinar el PIN real, así que se deja como está y se avisa.
    if (/^\d{4}$/.test(v.pin || '')) {
      const nuevoHash = await hashearPIN(v.pin);
      await db.vendedores.update(v.id, { pin: nuevoHash });
      reparados++;
      console.warn(`🔧 PIN de "${v.nombre}" no estaba hasheado. Reparado automáticamente.`);
    } else {
      console.error(`❌ El vendedor "${v.nombre}" tiene un PIN inválido y no se pudo reparar automáticamente. Debe restablecerlo manualmente.`);
    }
  }

  return reparados;
}


export async function inicializarBaseDatos(): Promise<void> {
  try {
    // Verificar si ya está inicializada
    const config = await db.configuracion.get('config-principal');

    // CORRECCIÓN: antes, si 'config' ya existía se cortaba acá y JAMÁS
    // se volvía a verificar si el vendedor admin realmente se había
    // creado. Si la inicialización se interrumpía justo entre el paso
    // de guardar 'config' y el de crear el vendedor (recarga de página,
    // pestaña pausada, etc.), quedaba una config "completa" pero sin
    // ningún vendedor — y el login fallaba para siempre con
    // "PIN incorrecto o vendedor inválido" sin que nada lo repare solo.
    // Ahora, la existencia del vendedor admin se verifica SIEMPRE,
    // de forma independiente, sin importar si 'config' ya existía.
    await asegurarVendedorAdminExiste();

    if (config) {
      console.log('✅ Base de datos ya inicializada');
      return;
    }

    console.log('🔧 Inicializando base de datos por primera vez...');

    // Crear configuración por defecto
    await db.configuracion.put({
      id: 'config-principal',
      nombreNegocio: 'Sol y Verde',
      direccion: 'Mercado Central',
      telefono: '',
      impresionAutomatica: false,
      anchoTicket: 58,
      mostrarLogoTicket: true,
      pieTicket: '¡Gracias por su compra!',
      sincronizacionAutomatica: true,
      intervaloSincronizacion: 5,
      sonidosActivos: true,
      vibracionActiva: true,
      modoOscuro: true,
      diasExpiracionVales: 30,
      permitirVentaStockCero: true,
      ultimaModificacion: Date.now()
    });

    // Crear tipos de envase por defecto
    await db.tiposEnvase.bulkPut([
      {
        id: 'env-estandar',
        nombre: 'Cajón Estándar',
        descripcion: 'Cajón de madera estándar',
        valorSena: 2000,
        emoji: '📦',
        activo: true,
        orden: 1
      },
      {
        id: 'env-reforzado',
        nombre: 'Cajón Reforzado',
        descripcion: 'Cajón de madera reforzado',
        valorSena: 3000,
        emoji: '📦',
        activo: true,
        orden: 2
      },
      {
        id: 'env-jaula',
        nombre: 'Jaula Madera',
        descripcion: 'Jaula grande de madera',
        valorSena: 4000,
        emoji: '🪵',
        activo: true,
        orden: 3
      },
      {
        id: 'env-plastico',
        nombre: 'Cajón Plástico Premium',
        descripcion: 'Cajón plástico reutilizable',
        valorSena: 5000,
        emoji: '🧊',
        activo: true,
        orden: 4
      },
      {
        id: 'env-sin-sena',
        nombre: 'Sin Seña',
        descripcion: 'Producto sin envase retornable',
        valorSena: 0,
        emoji: '🚫',
        activo: true,
        orden: 5
      }
    ]);

    // Inicializar inventario de envases
    const tiposEnvase = await db.tiposEnvase.toArray();
    for (const tipo of tiposEnvase) {
      await db.inventarioEnvases.put({
        id: `inv-${tipo.id}`,
        tipoEnvaseId: tipo.id,
        cantidadFisica: 0,
        cantidadPrestada: 0,
        ultimaActualizacion: Date.now()
      });
    }

    // Crear bancos por defecto
    await db.bancos.bulkPut([
      { id: 'banco-galicia', nombre: 'Banco Galicia', alias: 'SOLYVERDE.GALICIA', activo: true, orden: 1 },
      { id: 'banco-nacion', nombre: 'Banco Nación', alias: 'SOLYVERDE.NACION', activo: true, orden: 2 },
      { id: 'banco-mp', nombre: 'Mercado Pago', alias: 'SOLYVERDE.MP', activo: true, orden: 3 },
      { id: 'banco-santander', nombre: 'Santander', alias: 'SOLYVERDE.SANTANDER', activo: false, orden: 4 },
    ]);

    // El vendedor administrador ya fue garantizado más arriba por
    // asegurarVendedorAdminExiste(), independientemente de si esta es
    // la primera vez o no.

    // Crear productos de ejemplo
    await crearProductosEjemplo();

    // Estado inicial
    await db.estadoApp.put({
      id: 'estado-turno',
      key: 'turnoActual',
      value: null
    });

    await db.estadoApp.put({
      id: 'estado-sesion',
      key: 'sesionActual',
      value: null
    });

    await db.estadoApp.put({
      id: 'estado-numero-venta',
      key: 'ultimoNumeroVenta',
      value: { fecha: new Date().toISOString().split('T')[0], numero: 0 }
    });

    console.log('✅ Base de datos inicializada correctamente');
  } catch (error) {
    console.error('❌ Error inicializando base de datos:', error);
    throw error;
  }
}

// ========================================
// PRODUCTOS DE EJEMPLO
// ========================================

async function crearProductosEjemplo(): Promise<void> {
  const productosEjemplo: Producto[] = [
    // VERDURAS
    {
      id: 'prod-tomate',
      codigo: 'TOM001',
      nombre: 'Tomate Redondo',
      nombreCorto: 'TOMATE',
      emoji: '🍅',
      categoria: 'verduras',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'cajón',
      precioSugerido: 15000,
      ultimoPrecioVenta: 15000,
      stockActual: 25,
      stockMinimo: 5,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-tomate-perita',
      codigo: 'TOM002',
      nombre: 'Tomate Perita',
      nombreCorto: 'TOM PERITA',
      emoji: '🍅',
      categoria: 'verduras',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'cajón',
      precioSugerido: 18000,
      ultimoPrecioVenta: 18000,
      stockActual: 15,
      stockMinimo: 5,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-lechuga',
      codigo: 'LEC001',
      nombre: 'Lechuga Criolla',
      nombreCorto: 'LECHUGA',
      emoji: '🥬',
      categoria: 'hojas',
      unidadBase: 'bulto',
      esFraccionable: true,
      factorDivisor: 12,
      nombreSubunidad: 'docena',
      precioSugerido: 8000,
      ultimoPrecioVenta: 8000,
      stockActual: 30,
      stockMinimo: 10,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-puerro',
      codigo: 'PUE001',
      nombre: 'Puerro',
      nombreCorto: 'PUERRO',
      emoji: '🥬',
      categoria: 'hojas',
      unidadBase: 'bulto',
      esFraccionable: true,
      factorDivisor: 10,
      nombreSubunidad: 'paquete',
      precioSugerido: 12000,
      ultimoPrecioVenta: 12000,
      stockActual: 20,
      stockMinimo: 5,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-cebolla',
      codigo: 'CEB001',
      nombre: 'Cebolla',
      nombreCorto: 'CEBOLLA',
      emoji: '🧅',
      categoria: 'verduras',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'bolsa',
      precioSugerido: 10000,
      ultimoPrecioVenta: 10000,
      stockActual: 40,
      stockMinimo: 10,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-papa',
      codigo: 'PAP001',
      nombre: 'Papa',
      nombreCorto: 'PAPA',
      emoji: '🥔',
      categoria: 'tuberculos',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'bolsa 25kg',
      precioSugerido: 12000,
      ultimoPrecioVenta: 12000,
      stockActual: 50,
      stockMinimo: 15,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-zanahoria',
      codigo: 'ZAN001',
      nombre: 'Zanahoria',
      nombreCorto: 'ZANAHORIA',
      emoji: '🥕',
      categoria: 'tuberculos',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'bolsa',
      precioSugerido: 8000,
      ultimoPrecioVenta: 8000,
      stockActual: 25,
      stockMinimo: 8,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-morron-rojo',
      codigo: 'MOR001',
      nombre: 'Morrón Rojo',
      nombreCorto: 'MORRON R',
      emoji: '🫑',
      categoria: 'verduras',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'cajón',
      precioSugerido: 25000,
      ultimoPrecioVenta: 25000,
      stockActual: 10,
      stockMinimo: 3,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-morron-verde',
      codigo: 'MOR002',
      nombre: 'Morrón Verde',
      nombreCorto: 'MORRON V',
      emoji: '🫑',
      categoria: 'verduras',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'cajón',
      precioSugerido: 20000,
      ultimoPrecioVenta: 20000,
      stockActual: 12,
      stockMinimo: 3,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    // FRUTAS
    {
      id: 'prod-naranja',
      codigo: 'NAR001',
      nombre: 'Naranja',
      nombreCorto: 'NARANJA',
      emoji: '🍊',
      categoria: 'citricos',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'cajón',
      precioSugerido: 15000,
      ultimoPrecioVenta: 15000,
      stockActual: 30,
      stockMinimo: 10,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-limon',
      codigo: 'LIM001',
      nombre: 'Limón',
      nombreCorto: 'LIMON',
      emoji: '🍋',
      categoria: 'citricos',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'cajón',
      precioSugerido: 12000,
      ultimoPrecioVenta: 12000,
      stockActual: 20,
      stockMinimo: 5,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-manzana',
      codigo: 'MAN001',
      nombre: 'Manzana Roja',
      nombreCorto: 'MANZANA R',
      emoji: '🍎',
      categoria: 'frutas',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'cajón',
      precioSugerido: 18000,
      ultimoPrecioVenta: 18000,
      stockActual: 15,
      stockMinimo: 5,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-manzana-verde',
      codigo: 'MAN002',
      nombre: 'Manzana Verde',
      nombreCorto: 'MANZANA V',
      emoji: '🍏',
      categoria: 'frutas',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'cajón',
      precioSugerido: 20000,
      ultimoPrecioVenta: 20000,
      stockActual: 10,
      stockMinimo: 3,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-banana',
      codigo: 'BAN001',
      nombre: 'Banana',
      nombreCorto: 'BANANA',
      emoji: '🍌',
      categoria: 'frutas',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'cajón',
      precioSugerido: 16000,
      ultimoPrecioVenta: 16000,
      stockActual: 25,
      stockMinimo: 8,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-frutilla',
      codigo: 'FRU001',
      nombre: 'Frutilla',
      nombreCorto: 'FRUTILLA',
      emoji: '🍓',
      categoria: 'frutas',
      unidadBase: 'bulto',
      esFraccionable: true,
      factorDivisor: 8,
      nombreSubunidad: 'bandeja',
      precioSugerido: 30000,
      ultimoPrecioVenta: 30000,
      stockActual: 8,
      stockMinimo: 2,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    // MÁS VERDURAS
    {
      id: 'prod-zapallito',
      codigo: 'ZAP001',
      nombre: 'Zapallito Verde',
      nombreCorto: 'ZAPALLITO',
      emoji: '🥒',
      categoria: 'verduras',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'cajón',
      precioSugerido: 10000,
      ultimoPrecioVenta: 10000,
      stockActual: 18,
      stockMinimo: 5,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-berenjena',
      codigo: 'BER001',
      nombre: 'Berenjena',
      nombreCorto: 'BERENJENA',
      emoji: '🍆',
      categoria: 'verduras',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'cajón',
      precioSugerido: 14000,
      ultimoPrecioVenta: 14000,
      stockActual: 12,
      stockMinimo: 3,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-choclo',
      codigo: 'CHO001',
      nombre: 'Choclo',
      nombreCorto: 'CHOCLO',
      emoji: '🌽',
      categoria: 'verduras',
      unidadBase: 'bulto',
      esFraccionable: true,
      factorDivisor: 50,
      nombreSubunidad: 'unidad',
      precioSugerido: 15000,
      ultimoPrecioVenta: 15000,
      stockActual: 20,
      stockMinimo: 5,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-acelga',
      codigo: 'ACE001',
      nombre: 'Acelga',
      nombreCorto: 'ACELGA',
      emoji: '🥬',
      categoria: 'hojas',
      unidadBase: 'bulto',
      esFraccionable: true,
      factorDivisor: 6,
      nombreSubunidad: 'atado',
      precioSugerido: 6000,
      ultimoPrecioVenta: 6000,
      stockActual: 15,
      stockMinimo: 5,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-espinaca',
      codigo: 'ESP001',
      nombre: 'Espinaca',
      nombreCorto: 'ESPINACA',
      emoji: '🥬',
      categoria: 'hojas',
      unidadBase: 'bulto',
      esFraccionable: true,
      factorDivisor: 6,
      nombreSubunidad: 'atado',
      precioSugerido: 7000,
      ultimoPrecioVenta: 7000,
      stockActual: 12,
      stockMinimo: 4,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-repollo',
      codigo: 'REP001',
      nombre: 'Repollo',
      nombreCorto: 'REPOLLO',
      emoji: '🥬',
      categoria: 'hojas',
      unidadBase: 'bulto',
      esFraccionable: false,
      factorDivisor: 1,
      nombreSubunidad: 'cajón',
      precioSugerido: 9000,
      ultimoPrecioVenta: 9000,
      stockActual: 10,
      stockMinimo: 3,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-ajo',
      codigo: 'AJO001',
      nombre: 'Ajo',
      nombreCorto: 'AJO',
      emoji: '🧄',
      categoria: 'verduras',
      unidadBase: 'bulto',
      esFraccionable: true,
      factorDivisor: 10,
      nombreSubunidad: 'ristra',
      precioSugerido: 25000,
      ultimoPrecioVenta: 25000,
      stockActual: 8,
      stockMinimo: 2,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
    {
      id: 'prod-perejil',
      codigo: 'PER001',
      nombre: 'Perejil',
      nombreCorto: 'PEREJIL',
      emoji: '🌿',
      categoria: 'hojas',
      unidadBase: 'bulto',
      esFraccionable: true,
      factorDivisor: 20,
      nombreSubunidad: 'atado',
      precioSugerido: 5000,
      ultimoPrecioVenta: 5000,
      stockActual: 25,
      stockMinimo: 8,
      activo: true,
      fechaCreacion: Date.now(),
      fechaModificacion: Date.now()
    },
  ];

  await db.productos.bulkPut(productosEjemplo);
}

// ========================================
// OPERACIONES DE CARRITO (PERSISTENCIA CRÍTICA)
// ========================================

export async function guardarCarrito(items: ItemCarrito[]): Promise<void> {
  await db.transaction('rw', db.carritoActual, async () => {
    await db.carritoActual.clear();
    if (items.length > 0) {
      await db.carritoActual.bulkPut(items);
    }
  });
}

export async function obtenerCarrito(): Promise<ItemCarrito[]> {
  return await db.carritoActual.toArray();
}

export async function limpiarCarrito(): Promise<void> {
  await db.carritoActual.clear();
}

// ========================================
// OPERACIONES DE ESTADO
// ========================================

export async function guardarEstado(key: string, value: any): Promise<void> {
  await db.estadoApp.put({
    id: `estado-${key}`,
    key,
    value
  });
}

export async function obtenerEstado<T>(key: string): Promise<T | null> {
  const estado = await db.estadoApp.get(`estado-${key}`);
  return estado?.value ?? null;
}

// ========================================
// OPERACIONES DE VENTAS
// ========================================

export async function obtenerNumeroVentaDiario(): Promise<number> {
  const { obtenerNumeroVentaAtomic } = await import('../utils/locks');
  
  const hoy = new Date().toISOString().split('T')[0];
  
  return obtenerNumeroVentaAtomic(
    async () => {
      const estado = await obtenerEstado<{ fecha: string; numero: number }>('ultimoNumeroVenta');
      
      if (estado && estado.fecha === hoy) {
        return estado.numero;
      }
      
      return 0;
    },
    async (nuevoNumero) => {
      await guardarEstado('ultimoNumeroVenta', { fecha: hoy, numero: nuevoNumero });
    }
  );
}

export async function guardarVenta(venta: Venta): Promise<void> {
  await db.transaction('rw', [db.ventas, db.productos, db.sincronizacion], async () => {
    // Guardar venta
    await db.ventas.put(venta);
    
    // Actualizar stock de productos
    for (const item of venta.items) {
      const producto = await db.productos.get(item.productoId);
      if (producto) {
        await db.productos.update(item.productoId, {
          stockActual: Math.max(0, producto.stockActual - item.cantidadUnidadesBase),
          ultimoPrecioVenta: item.precioUnitario,
          fechaModificacion: Date.now()
        });
      }
    }
    
    // Registrar para sincronización
    await db.sincronizacion.put({
      id: `sync-venta-${venta.id}`,
      tipo: 'venta',
      registroId: venta.id,
      estado: 'pendiente',
      intentos: 0,
      timestamp: Date.now()
    });
  });
}

// ========================================
// OPERACIONES DE VALES
// ========================================

export function generarCUI(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let codigo = 'SYV-';
  for (let i = 0; i < 4; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  codigo += '-';
  for (let i = 0; i < 4; i++) {
    codigo += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return codigo;
}

export async function buscarValePorCUI(cui: string): Promise<Vale | undefined> {
  return await db.vales
    .where('cui')
    .equals(cui.toUpperCase())
    .filter(v => v.estado === 'activo' || v.estado === 'parcial')
    .first();
}

export async function guardarVale(vale: Vale): Promise<void> {
  await db.transaction('rw', [db.vales, db.sincronizacion], async () => {
    await db.vales.put(vale);
    
    await db.sincronizacion.put({
      id: `sync-vale-${vale.id}`,
      tipo: 'vale',
      registroId: vale.id,
      estado: 'pendiente',
      intentos: 0,
      timestamp: Date.now()
    });
  });
}

// ========================================
// OPERACIONES DE TURNOS
// ========================================

export async function obtenerTurnoActivo(): Promise<Turno | undefined> {
  return await db.turnos.where('estado').equals('activo').first();
}

export async function crearTurno(vendedorId: string, vendedorNombre: string, saldoInicial: number): Promise<Turno> {
  const ultimoTurno = await db.turnos.orderBy('numero').last();
  const nuevoNumero = (ultimoTurno?.numero ?? 0) + 1;
  
  const turno: Turno = {
    id: `turno-${Date.now()}`,
    numero: nuevoNumero,
    vendedorId,
    vendedorNombre,
    fechaInicio: Date.now(),
    estado: 'activo',
    saldoInicial,
    fondoInicial: saldoInicial, // Alias
    sincronizado: false
  };
  
  await db.turnos.put(turno);
  await guardarEstado('turnoActual', turno.id);
  
  return turno;
}

// ========================================
// OPERACIONES DE GASTOS
// ========================================

export async function guardarGasto(gasto: GastoCaja): Promise<void> {
  await db.transaction('rw', [db.gastosCaja, db.sincronizacion], async () => {
    await db.gastosCaja.put(gasto);
    
    await db.sincronizacion.put({
      id: `sync-gasto-${gasto.id}`,
      tipo: 'gasto',
      registroId: gasto.id,
      estado: 'pendiente',
      intentos: 0,
      timestamp: Date.now()
    });
  });
}

// ========================================
// EXPORTACIÓN DE BACKUP JSON
// ========================================

export async function exportarBackupJSON(): Promise<string> {
  const backup = {
    version: '2.0',
    timestamp: Date.now(),
    fechaExportacion: new Date().toISOString(),
    datos: {
      productos: await db.productos.toArray(),
      tiposEnvase: await db.tiposEnvase.toArray(),
      movimientosEnvase: await db.movimientosEnvase.toArray(),
      inventarioEnvases: await db.inventarioEnvases.toArray(),
      vales: await db.vales.toArray(),
      ventas: await db.ventas.toArray(),
      gastosCaja: await db.gastosCaja.toArray(),
      turnos: await db.turnos.toArray(),
      cierresCaja: await db.cierresCaja.toArray(),
      vendedores: await db.vendedores.toArray(),
      configuracion: await db.configuracion.toArray(),
      bancos: await db.bancos.toArray(),
      carritoActual: await db.carritoActual.toArray(),
      estadoApp: await db.estadoApp.toArray(),
    }
  };
  
  return JSON.stringify(backup, null, 2);
}

export async function descargarBackup(): Promise<void> {
  const backup = await exportarBackupJSON();
  const blob = new Blob([backup], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup-solyverde-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ========================================
// REGISTROS PENDIENTES DE SINCRONIZACIÓN
// ========================================

export async function obtenerPendientesSincronizacion(): Promise<RegistroSincronizacion[]> {
  return await db.sincronizacion
    .where('estado')
    .equals('pendiente')
    .toArray();
}

export async function marcarComoSincronizado(registroId: string): Promise<void> {
  await db.sincronizacion.update(registroId, {
    estado: 'sincronizado',
    ultimoIntento: Date.now()
  });
}

export async function marcarErrorSincronizacion(registroId: string, error: string): Promise<void> {
  const registro = await db.sincronizacion.get(registroId);
  if (registro) {
    await db.sincronizacion.update(registroId, {
      estado: 'error',
      intentos: registro.intentos + 1,
      ultimoIntento: Date.now(),
      error
    });
  }
}

export { db as default };
