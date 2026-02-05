// ========================================
// SERVICIO DE IMPRESIÓN ESC/POS
// ========================================

import { db } from '../db/database';
import { 
  formatearMoneda, 
  formatearFecha, 
  type Venta, 
  type CierreCaja,
  type Vale,
  type ConfiguracionSistema 
} from '../types';

// ========================================
// CONSTANTES ESC/POS
// ========================================

const ESC = '\x1B';
const GS = '\x1D';

// Comandos básicos
const CMD = {
  INIT: ESC + '@',                    // Inicializar impresora
  CUT: GS + 'V' + '\x00',            // Corte parcial
  CUT_FULL: GS + 'V' + '\x01',       // Corte total
  BEEP: ESC + 'B' + '\x05' + '\x05', // Beep
  
  // Alineación
  ALIGN_LEFT: ESC + 'a' + '\x00',
  ALIGN_CENTER: ESC + 'a' + '\x01',
  ALIGN_RIGHT: ESC + 'a' + '\x02',
  
  // Tamaño de texto
  SIZE_NORMAL: GS + '!' + '\x00',
  SIZE_DOUBLE_WIDTH: GS + '!' + '\x10',
  SIZE_DOUBLE_HEIGHT: GS + '!' + '\x01',
  SIZE_DOUBLE: GS + '!' + '\x11',     // Doble ancho y alto
  
  // Estilo
  BOLD_ON: ESC + 'E' + '\x01',
  BOLD_OFF: ESC + 'E' + '\x00',
  UNDERLINE_ON: ESC + '-' + '\x01',
  UNDERLINE_OFF: ESC + '-' + '\x00',
  
  // Alimentación
  FEED_LINE: '\n',
  FEED_LINES: (n: number) => ESC + 'd' + String.fromCharCode(n),
};

// Ancho de línea según papel
const CHARS_58MM = 32;
const CHARS_80MM = 48;

// ========================================
// TIPOS
// ========================================

interface ConfigImpresion {
  impresoraUrl: string;
  anchoTicket: number;
  imprimirAuto: boolean;
}

// ========================================
// FUNCIONES DE UTILIDAD
// ========================================

function obtenerAnchoLinea(ancho: number): number {
  return ancho === 58 ? CHARS_58MM : CHARS_80MM;
}

function lineaDoble(ancho: number): string {
  return '='.repeat(ancho);
}

function lineaSimple(ancho: number): string {
  return '-'.repeat(ancho);
}

function formatearLinea(izq: string, der: string, ancho: number): string {
  const espacios = Math.max(1, ancho - izq.length - der.length);
  return izq + ' '.repeat(espacios) + der;
}

function truncar(texto: string, maxLen: number): string {
  return texto.length > maxLen ? texto.substring(0, maxLen - 1) + '…' : texto;
}

// ========================================
// OBTENER CONFIGURACIÓN
// ========================================

async function obtenerConfigImpresion(): Promise<ConfigImpresion | null> {
  try {
    const config = await db.configuracion.get('config-principal');
    if (!config) return null;
    return {
      impresoraUrl: config.impresoraUrl || '',
      anchoTicket: config.anchoTicket,
      imprimirAuto: config.impresionAutomatica
    };
  } catch {
    return null;
  }
}

// ========================================
// ENVIAR A IMPRESORA
// ========================================

async function enviarAImpresora(comandos: string): Promise<boolean> {
  const config = await obtenerConfigImpresion();
  
  if (!config?.impresoraUrl) {
    console.error('[Print] URL de impresora no configurada');
    return false;
  }
  
  try {
    // Enviar via HTTP POST
    const response = await fetch(config.impresoraUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/octet-stream'
      },
      body: comandos
    });
    
    return response.ok;
  } catch (error) {
    console.error('[Print] Error enviando a impresora:', error);
    return false;
  }
}

// ========================================
// IMPRIMIR TICKET DE VENTA
// ========================================

export async function imprimirTicketVenta(venta: Venta): Promise<boolean> {
  const config = await obtenerConfigImpresion();
  if (!config) return false;
  
  const ancho = obtenerAnchoLinea(config.anchoTicket);
  const configSistema = await db.configuracion.get('sistema') as ConfiguracionSistema | undefined;
  
  let ticket = CMD.INIT;
  
  // Header
  ticket += CMD.ALIGN_CENTER;
  ticket += CMD.SIZE_DOUBLE;
  ticket += (configSistema?.nombreNegocio || 'SOL Y VERDE') + '\n';
  ticket += CMD.SIZE_NORMAL;
  ticket += CMD.BOLD_ON;
  ticket += 'VERDULERIA MAYORISTA\n';
  ticket += CMD.BOLD_OFF;
  
  if (configSistema?.direccion) {
    ticket += configSistema.direccion + '\n';
  }
  if (configSistema?.telefono) {
    ticket += 'Tel: ' + configSistema.telefono + '\n';
  }
  
  ticket += lineaDoble(ancho) + '\n';
  
  // Info de venta
  ticket += CMD.ALIGN_LEFT;
  ticket += formatearLinea('Fecha:', venta.fechaFormateada, ancho) + '\n';
  ticket += formatearLinea('Ticket:', venta.numero.toString(), ancho) + '\n';
  ticket += formatearLinea('Vendedor:', venta.vendedorNombre, ancho) + '\n';
  
  ticket += lineaSimple(ancho) + '\n';
  
  // Items - PRODUCTOS EN MAYÚSCULAS
  ticket += CMD.BOLD_ON;
  
  for (const item of venta.items) {
    const nombreProducto = item.nombre.toUpperCase();
    const cantidadStr = item.esFraccion 
      ? `${item.cantidad} (frac)` 
      : item.cantidad.toString();
    
    // Línea del producto
    ticket += truncar(nombreProducto, ancho - 12) + '\n';
    
    // Línea de detalle con precio - TAMAÑO DOBLE PARA PRECIO
    const detalle = `  ${cantidadStr} x ${formatearMoneda(item.precioUnitario)}`;
    ticket += CMD.SIZE_NORMAL;
    ticket += detalle;
    
    // Subtotal
    ticket += CMD.SIZE_DOUBLE_WIDTH;
    ticket += formatearLinea('', formatearMoneda(item.subtotal), ancho - detalle.length) + '\n';
    ticket += CMD.SIZE_NORMAL;
    
    // Envases (si hay seña)
    if (item.tipoEnvaseId && item.valorSena > 0) {
      ticket += `    + Envase: ${formatearMoneda(item.valorSena)}\n`;
    }
  }
  
  ticket += CMD.BOLD_OFF;
  
  // Devoluciones de envases
  if (venta.envasesDevueltos && venta.envasesDevueltos.length > 0) {
    ticket += lineaSimple(ancho) + '\n';
    ticket += CMD.ALIGN_CENTER + 'DEVOLUCIONES\n' + CMD.ALIGN_LEFT;
    
    for (const dev of venta.envasesDevueltos) {
      ticket += formatearLinea(
        `${dev.cantidad} ${dev.nombre}`,
        `-${formatearMoneda(dev.subtotal)}`,
        ancho
      ) + '\n';
    }
  }
  
  // Totales
  ticket += lineaDoble(ancho) + '\n';
  
  if (venta.subtotalProductos !== venta.total) {
    ticket += formatearLinea('Subtotal productos:', formatearMoneda(venta.subtotalProductos), ancho) + '\n';
    ticket += formatearLinea('Subtotal envases:', formatearMoneda(venta.totalEnvases), ancho) + '\n';
    
    if (venta.totalDevolucionEnvases > 0) {
      ticket += formatearLinea('Devoluciones:', `-${formatearMoneda(venta.totalDevolucionEnvases)}`, ancho) + '\n';
    }
    
    ticket += lineaSimple(ancho) + '\n';
  }
  
  // Total grande
  ticket += CMD.ALIGN_CENTER;
  ticket += CMD.SIZE_DOUBLE;
  ticket += CMD.BOLD_ON;
  ticket += 'TOTAL: ' + formatearMoneda(venta.total) + '\n';
  ticket += CMD.SIZE_NORMAL;
  ticket += CMD.BOLD_OFF;
  ticket += CMD.ALIGN_LEFT;
  
  // Pagos
  ticket += lineaSimple(ancho) + '\n';
  
  for (const pago of venta.pagos) {
    let metodoPago = pago.metodo.toUpperCase();
    if (pago.detalleTransferencia?.conIva) {
      metodoPago += ' (+IVA)';
    }
    ticket += formatearLinea(metodoPago + ':', formatearMoneda(pago.monto), ancho) + '\n';
  }
  
  // Vuelto
  if (venta.vuelto > 0) {
    ticket += CMD.BOLD_ON;
    ticket += formatearLinea('VUELTO:', formatearMoneda(venta.vuelto), ancho) + '\n';
    ticket += CMD.BOLD_OFF;
  }
  
  // Vale generado
  if (venta.valeGenerado) {
    ticket += '\n';
    ticket += CMD.ALIGN_CENTER;
    ticket += lineaSimple(ancho) + '\n';
    ticket += CMD.BOLD_ON;
    ticket += '*** VALE GENERADO ***\n';
    ticket += CMD.SIZE_DOUBLE;
    // Obtener vale
    const vale = await db.vales.get(venta.valeGenerado);
    if (vale) {
      ticket += vale.cui + '\n';
      ticket += formatearMoneda(vale.montoDisponible) + '\n';
    }
    ticket += CMD.SIZE_NORMAL;
    ticket += CMD.BOLD_OFF;
    ticket += lineaSimple(ancho) + '\n';
  }
  
  // Footer
  ticket += '\n';
  ticket += CMD.ALIGN_CENTER;
  ticket += '¡Gracias por su compra!\n';
  ticket += 'Conserve su ticket\n';
  ticket += '\n';
  
  // Cortar
  ticket += CMD.FEED_LINES(3);
  ticket += CMD.CUT;
  
  return await enviarAImpresora(ticket);
}

// ========================================
// IMPRIMIR CIERRE DE CAJA
// ========================================

export async function imprimirCierreCaja(cierre: CierreCaja): Promise<boolean> {
  const config = await obtenerConfigImpresion();
  if (!config) return false;
  
  const ancho = obtenerAnchoLinea(config.anchoTicket);
  const configSistema = await db.configuracion.get('sistema') as ConfiguracionSistema | undefined;
  
  let ticket = CMD.INIT;
  
  // Header
  ticket += CMD.ALIGN_CENTER;
  ticket += CMD.SIZE_DOUBLE;
  ticket += 'CIERRE DE CAJA\n';
  ticket += CMD.SIZE_NORMAL;
  ticket += (configSistema?.nombreNegocio || 'SOL Y VERDE') + '\n';
  
  ticket += lineaDoble(ancho) + '\n';
  
  // Info
  ticket += CMD.ALIGN_LEFT;
  ticket += formatearLinea('Fecha:', formatearFecha(cierre.fecha), ancho) + '\n';
  ticket += formatearLinea('Turno:', cierre.turnoId, ancho) + '\n';
  
  ticket += lineaSimple(ancho) + '\n';
  
  // Movimientos
  ticket += CMD.BOLD_ON;
  ticket += 'MOVIMIENTOS\n';
  ticket += CMD.BOLD_OFF;
  
  ticket += formatearLinea('Fondo inicial:', formatearMoneda(cierre.fondoInicial), ancho) + '\n';
  ticket += formatearLinea('+ Efectivo ventas:', formatearMoneda(cierre.totalEfectivo), ancho) + '\n';
  ticket += formatearLinea('- Gastos:', formatearMoneda(cierre.totalGastos), ancho) + '\n';
  ticket += formatearLinea('- Devoluciones:', formatearMoneda(cierre.totalDevoluciones), ancho) + '\n';
  
  ticket += lineaSimple(ancho) + '\n';
  
  ticket += CMD.BOLD_ON;
  ticket += formatearLinea('ESPERADO:', formatearMoneda(cierre.efectivoEsperado), ancho) + '\n';
  ticket += formatearLinea('CONTADO:', formatearMoneda(cierre.efectivoContado), ancho) + '\n';
  ticket += CMD.BOLD_OFF;
  
  // Diferencia
  ticket += lineaDoble(ancho) + '\n';
  ticket += CMD.ALIGN_CENTER;
  ticket += CMD.SIZE_DOUBLE;
  
  const difStr = cierre.diferencia >= 0 
    ? `+${formatearMoneda(cierre.diferencia)}`
    : formatearMoneda(cierre.diferencia);
  
  ticket += `DIFERENCIA: ${difStr}\n`;
  ticket += CMD.SIZE_NORMAL;
  
  if (cierre.justificacionDiferencia) {
    ticket += CMD.ALIGN_LEFT;
    ticket += `Nota: ${cierre.justificacionDiferencia}\n`;
  }
  
  // Ventas por método
  ticket += lineaSimple(ancho) + '\n';
  ticket += CMD.ALIGN_LEFT;
  ticket += CMD.BOLD_ON;
  ticket += 'RESUMEN VENTAS\n';
  ticket += CMD.BOLD_OFF;
  
  ticket += formatearLinea('Total ventas:', formatearMoneda(cierre.totalVentas), ancho) + '\n';
  ticket += formatearLinea('  Efectivo:', formatearMoneda(cierre.totalEfectivo), ancho) + '\n';
  ticket += formatearLinea('  Transferencias:', formatearMoneda(cierre.totalTransferencias), ancho) + '\n';
  ticket += formatearLinea('  Cheques:', formatearMoneda(cierre.totalCheques), ancho) + '\n';
  
  if (cierre.totalVales > 0) {
    ticket += formatearLinea('  Vales:', formatearMoneda(cierre.totalVales), ancho) + '\n';
  }
  
  // Conteo de billetes
  ticket += lineaSimple(ancho) + '\n';
  ticket += CMD.BOLD_ON;
  ticket += 'CONTEO BILLETES\n';
  ticket += CMD.BOLD_OFF;
  
  const conteo = cierre.conteoBilletes;
  if (conteo.b20000 > 0) ticket += formatearLinea(`$20.000 x ${conteo.b20000}:`, formatearMoneda(conteo.b20000 * 20000), ancho) + '\n';
  if (conteo.b10000 > 0) ticket += formatearLinea(`$10.000 x ${conteo.b10000}:`, formatearMoneda(conteo.b10000 * 10000), ancho) + '\n';
  if (conteo.b2000 > 0) ticket += formatearLinea(`$2.000 x ${conteo.b2000}:`, formatearMoneda(conteo.b2000 * 2000), ancho) + '\n';
  if (conteo.b1000 > 0) ticket += formatearLinea(`$1.000 x ${conteo.b1000}:`, formatearMoneda(conteo.b1000 * 1000), ancho) + '\n';
  if (conteo.b500 > 0) ticket += formatearLinea(`$500 x ${conteo.b500}:`, formatearMoneda(conteo.b500 * 500), ancho) + '\n';
  if (conteo.b200 > 0) ticket += formatearLinea(`$200 x ${conteo.b200}:`, formatearMoneda(conteo.b200 * 200), ancho) + '\n';
  if (conteo.b100 > 0) ticket += formatearLinea(`$100 x ${conteo.b100}:`, formatearMoneda(conteo.b100 * 100), ancho) + '\n';
  if (conteo.b50 > 0) ticket += formatearLinea(`$50 x ${conteo.b50}:`, formatearMoneda(conteo.b50 * 50), ancho) + '\n';
  if (conteo.monedas > 0) ticket += formatearLinea('Monedas:', formatearMoneda(conteo.monedas), ancho) + '\n';
  
  // Footer
  ticket += '\n';
  ticket += CMD.ALIGN_CENTER;
  ticket += lineaDoble(ancho) + '\n';
  ticket += '\n';
  
  // Cortar
  ticket += CMD.FEED_LINES(3);
  ticket += CMD.CUT;
  
  return await enviarAImpresora(ticket);
}

// ========================================
// IMPRIMIR VALE
// ========================================

export async function imprimirVale(vale: Vale): Promise<boolean> {
  const config = await obtenerConfigImpresion();
  if (!config) return false;
  
  const ancho = obtenerAnchoLinea(config.anchoTicket);
  const configSistema = await db.configuracion.get('sistema') as ConfiguracionSistema | undefined;
  
  let ticket = CMD.INIT;
  
  // Header
  ticket += CMD.ALIGN_CENTER;
  ticket += CMD.SIZE_DOUBLE;
  ticket += CMD.BOLD_ON;
  ticket += '*** VALE ***\n';
  ticket += CMD.BOLD_OFF;
  ticket += CMD.SIZE_NORMAL;
  ticket += (configSistema?.nombreNegocio || 'SOL Y VERDE') + '\n';
  
  ticket += lineaDoble(ancho) + '\n';
  
  // Código CUI grande
  ticket += '\n';
  ticket += CMD.SIZE_DOUBLE;
  ticket += vale.cui + '\n';
  ticket += CMD.SIZE_NORMAL;
  ticket += '\n';
  
  // Monto
  ticket += CMD.SIZE_DOUBLE;
  ticket += CMD.BOLD_ON;
  ticket += formatearMoneda(vale.montoDisponible) + '\n';
  ticket += CMD.BOLD_OFF;
  ticket += CMD.SIZE_NORMAL;
  
  ticket += lineaSimple(ancho) + '\n';
  
  // Detalles
  ticket += CMD.ALIGN_LEFT;
  ticket += formatearLinea('Generado:', new Date(vale.fechaCreacion).toLocaleDateString(), ancho) + '\n';
  
  if (vale.fechaExpiracion) {
    ticket += formatearLinea('Vence:', new Date(vale.fechaExpiracion).toLocaleDateString(), ancho) + '\n';
  } else {
    ticket += 'Sin vencimiento\n';
  }
  
  if (vale.montoDisponible !== vale.montoOriginal) {
    ticket += formatearLinea('Monto original:', formatearMoneda(vale.montoOriginal), ancho) + '\n';
  }
  
  // Footer
  ticket += '\n';
  ticket += CMD.ALIGN_CENTER;
  ticket += lineaSimple(ancho) + '\n';
  ticket += 'Presente este vale para\n';
  ticket += 'descontarlo de su proxima compra\n';
  ticket += lineaSimple(ancho) + '\n';
  ticket += '\n';
  
  // Cortar
  ticket += CMD.FEED_LINES(3);
  ticket += CMD.CUT;
  
  return await enviarAImpresora(ticket);
}

// ========================================
// ABRIR CAJÓN
// ========================================

export async function abrirCajon(): Promise<boolean> {
  const comandos = CMD.INIT + ESC + 'p' + '\x00' + '\x19' + '\xFA';
  return await enviarAImpresora(comandos);
}

// ========================================
// PROBAR CONEXIÓN
// ========================================

export async function probarImpresora(): Promise<boolean> {
  const config = await obtenerConfigImpresion();
  if (!config?.impresoraUrl) return false;
  
  const ancho = obtenerAnchoLinea(config.anchoTicket);
  
  let ticket = CMD.INIT;
  ticket += CMD.ALIGN_CENTER;
  ticket += CMD.SIZE_DOUBLE;
  ticket += 'TEST IMPRESORA\n';
  ticket += CMD.SIZE_NORMAL;
  ticket += lineaSimple(ancho) + '\n';
  ticket += 'Sol y Verde POS\n';
  ticket += 'Conexion OK\n';
  ticket += lineaSimple(ancho) + '\n';
  ticket += '\n';
  ticket += CMD.BEEP;
  ticket += CMD.FEED_LINES(3);
  ticket += CMD.CUT;
  
  return await enviarAImpresora(ticket);
}
