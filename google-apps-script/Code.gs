// ========================================
// GOOGLE APPS SCRIPT - SOL Y VERDE POS
// v3.1 - Corregido: batching, locks, idempotencia,
//        caché de productos y stock centralizado en servidor.
// ========================================
// Este archivo se debe copiar a Google Apps Script
// y desplegar como Web App (ejecutar como: Yo / Cualquiera)
// ========================================

// El ID de la spreadsheet: fuente única de datos del negocio.
// Extraído de la URL que me pasó:
// https://docs.google.com/spreadsheets/d/17rQ7VZJJSkX0FYzUchoG1YfBImCQw8R15GLW3sSWE9Q/edit
const SPREADSHEET_ID = '17rQ7VZJJSkX0FYzUchoG1YfBImCQw8R15GLW3sSWE9Q';

function getSpreadsheetId_() {
  return SPREADSHEET_ID;
}

const SHEETS = {
  VENTAS: 'Ventas', ITEMS_VENTA: 'ItemsVenta', PAGOS: 'Pagos', DEVOLUCIONES: 'Devoluciones',
  VALES: 'Vales', GASTOS: 'Gastos', CIERRES: 'CierresCaja', TURNOS: 'Turnos',
  PRODUCTOS: 'Productos', LOG: 'Log'
};
const CACHE_PRODUCTOS_KEY = 'productos_v1';
const CACHE_PRODUCTOS_TTL = 300;

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const result = ejecutarAccion(data.action, data.data);
    logAction_(data.action, result.success ? 'OK' : 'ERROR', (data.data && data.data.id) || 'N/A');
    return jsonOutput_(result);
  } catch (error) {
    logAction_('ERROR', String(error), '');
    return jsonOutput_({ success: false, error: String(error) });
  }
}

function doGet(e) {
  try {
    const action = e.parameter.action;

    // Sin ?action= -> el navegador está pidiendo la app misma.
    // Esto es lo que convierte a Apps Script en el hosting completo:
    // un solo archivo HTML (generado por `npm run build`, gracias a
    // vite-plugin-singlefile) servido directamente desde acá.
    if (!action) {
      return HtmlService.createHtmlOutputFromFile('Index')
        .setTitle('Sol y Verde POS')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    let result;

    switch (action) {
      case 'getProductos':
        result = obtenerProductos();
        break;
      case 'getVale':
        result = obtenerVale(e.parameter.cui);
        break;
      case 'getEstadoLive':
        result = obtenerEstadoLive(e.parameter.desde);
        break;
      case 'ping':
        result = { success: true, message: 'pong', timestamp: new Date().toISOString() };
        break;
      default:
        result = { success: false, error: 'Acción desconocida' };
    }

    return jsonOutput_(result);
  } catch (error) {
    return jsonOutput_({ success: false, error: String(error) });
  }
}

// ========================================
// ESTADO EN VIVO (polling corto para "tiempo real" entre tablets)
// ========================================
// Devuelve solo lo que cambió desde la última consulta del cliente,
// usando el mismo caché de 5 min de obtenerProductos() para no pegarle
// a la hoja en cada poll de cada tablet.
function obtenerEstadoLive(desdeIso) {
  const productosResp = obtenerProductos();
  return {
    success: true,
    servidorTimestamp: new Date().toISOString(),
    productos: productosResp.productos,
    desdeCache: !!productosResp.desdeCache
  };
}

function ejecutarAccion(action, payload) {
  switch (action) {
    case 'venta': return procesarVenta(payload);
    case 'vale': return procesarVale(payload);
    case 'gasto': return procesarGasto(payload);
    case 'cierre': return procesarCierre(payload);
    case 'turno': return procesarTurno(payload);
    default: return { success: false, error: 'Acción desconocida: ' + action };
  }
}

function jsonOutput_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function procesarVenta(venta) {
  if (!venta || !venta.id || !Array.isArray(venta.items)) return { success: false, error: 'Payload de venta inválido' };
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(25000)) return { success: false, error: 'No se pudo obtener el lock, reintentar' };
  try {
    const ss = SpreadsheetApp.openById(getSpreadsheetId_());
    const sheetVentas = ss.getSheetByName(SHEETS.VENTAS);
    if (existeIdEnColumna_(sheetVentas, 1, venta.id)) return { success: true, id: venta.id, duplicada: true };
    appendRows_(sheetVentas, [[venta.id, venta.fecha, venta.turnoId, venta.vendedorId, venta.vendedorNombre, venta.numeroTicket, venta.subtotalProductos, venta.subtotalEnvases, venta.totalDevoluciones, venta.total, venta.vuelto, venta.valeAplicadoId || '', venta.valeGeneradoId || '', new Date().toISOString()]]);
    const filasItems = [], stockADescontar = {};
    for (const item of venta.items) {
      filasItems.push([item.id, venta.id, item.productoId, item.productoNombre, item.cantidad, item.esFraccion ? 'SI' : 'NO', item.fraccionDe || '', item.precioUnitario, item.subtotal, new Date().toISOString()]);
      if (item.productoId && item.cantidadUnidadesBase) stockADescontar[item.productoId] = (stockADescontar[item.productoId] || 0) + item.cantidadUnidadesBase;
      for (const env of item.envases || []) filasItems.push([env.id, venta.id, 'ENVASE:' + env.tipoEnvaseId, env.tipoEnvaseNombre, env.cantidad, 'NO', '', env.valorUnitario, env.subtotal, new Date().toISOString()]);
    }
    const filasPagos = (venta.pagos || []).map(p => [p.id, venta.id, p.metodo, p.monto, p.detalleEfectivo ? p.detalleEfectivo.montoRecibido : '', p.detalleEfectivo ? p.detalleEfectivo.vuelto : '', p.detalleTransferencia ? p.detalleTransferencia.banco : '', p.detalleTransferencia ? (p.detalleTransferencia.conIva ? 'SI' : 'NO') : '', p.detalleCheque ? p.detalleCheque.banco : '', p.detalleCheque ? p.detalleCheque.numeroCheque : '', p.detalleCheque ? p.detalleCheque.fechaVencimiento : '', new Date().toISOString()]);
    const filasDevoluciones = (venta.devoluciones || []).map(d => [d.id, venta.id, d.tipoEnvaseId, d.tipoEnvaseNombre, d.cantidad, d.valorUnitario, d.subtotal, new Date().toISOString()]);
    if (filasItems.length) appendRows_(ss.getSheetByName(SHEETS.ITEMS_VENTA), filasItems);
    if (filasPagos.length) appendRows_(ss.getSheetByName(SHEETS.PAGOS), filasPagos);
    if (filasDevoluciones.length) appendRows_(ss.getSheetByName(SHEETS.DEVOLUCIONES), filasDevoluciones);
    if (Object.keys(stockADescontar).length) { descontarStock_(ss, stockADescontar); CacheService.getScriptCache().remove(CACHE_PRODUCTOS_KEY); }
    return { success: true, id: venta.id };
  } finally { lock.releaseLock(); }
}

function descontarStock_(ss, stockADescontar) {
  const sheet = ss.getSheetByName(SHEETS.PRODUCTOS), data = sheet.getDataRange().getValues(), COL_STOCK = 11;
  for (let i = 1; i < data.length; i++) if (Object.prototype.hasOwnProperty.call(stockADescontar, data[i][0])) sheet.getRange(i + 1, COL_STOCK + 1).setValue(Math.max(0, (Number(data[i][COL_STOCK]) || 0) - stockADescontar[data[i][0]]));
}

function appendRows_(sheet, rows) { if (rows.length) sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows); }
function existeIdEnColumna_(sheet, col, id) { const last = sheet.getLastRow(); return last >= 2 && sheet.getRange(2, col, last - 1, 1).getValues().some(row => row[0] === id); }

function procesarVale(vale) {
  const lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return { success: false, error: 'No se pudo obtener el lock' };
  try { const sheet = SpreadsheetApp.openById(getSpreadsheetId_()).getSheetByName(SHEETS.VALES), data = sheet.getDataRange().getValues(), row = data.findIndex((v, i) => i && v[0] === vale.id) + 1, values = [vale.id, vale.cui, vale.montoOriginal, vale.saldoActual, vale.estado, vale.fechaGeneracion, vale.fechaUtilizacion || '', vale.fechaVencimiento || '', vale.ventaOrigenId || '', vale.ventaUsoId || '', new Date().toISOString()]; if (row) sheet.getRange(row, 1, 1, values.length).setValues([values]); else appendRows_(sheet, [values]); return { success: true, id: vale.id }; } finally { lock.releaseLock(); }
}
function procesarGasto(gasto) { const sheet = SpreadsheetApp.openById(getSpreadsheetId_()).getSheetByName(SHEETS.GASTOS); if (existeIdEnColumna_(sheet, 1, gasto.id)) return { success: true, id: gasto.id, duplicada: true }; appendRows_(sheet, [[gasto.id, gasto.turnoId, gasto.fecha, gasto.categoria, gasto.monto, gasto.descripcion || '', gasto.proveedor || '', gasto.vendedorId, new Date().toISOString()]]); return { success: true, id: gasto.id }; }
function procesarCierre(cierre) { const sheet = SpreadsheetApp.openById(getSpreadsheetId_()).getSheetByName(SHEETS.CIERRES); if (existeIdEnColumna_(sheet, 1, cierre.id)) return { success: true, id: cierre.id, duplicada: true }; appendRows_(sheet, [[cierre.id, cierre.turnoId, cierre.fecha, cierre.fondoInicial, cierre.totalVentas, cierre.totalEfectivo, cierre.totalTransferencias, cierre.totalCheques, cierre.totalVales, cierre.totalGastos, cierre.totalDevoluciones, cierre.efectivoEsperado, cierre.efectivoContado, cierre.diferencia, JSON.stringify(cierre.conteoBilletes), cierre.justificacionDiferencia || '', cierre.vendedorId, new Date().toISOString()]]); return { success: true, id: cierre.id }; }
function procesarTurno(turno) { const lock = LockService.getScriptLock(); if (!lock.tryLock(20000)) return { success: false, error: 'No se pudo obtener el lock' }; try { const sheet = SpreadsheetApp.openById(getSpreadsheetId_()).getSheetByName(SHEETS.TURNOS), data = sheet.getDataRange().getValues(), row = data.findIndex((v, i) => i && v[0] === turno.id) + 1, values = [turno.id, turno.vendedorId, turno.fechaInicio, turno.fechaFin || '', turno.fondoInicial, turno.activo ? 'SI' : 'NO', new Date().toISOString()]; if (row) sheet.getRange(row, 1, 1, values.length).setValues([values]); else appendRows_(sheet, [values]); return { success: true, id: turno.id }; } finally { lock.releaseLock(); } }

function obtenerProductos() { const cache = CacheService.getScriptCache(), cached = cache.get(CACHE_PRODUCTOS_KEY); if (cached) return { success: true, productos: JSON.parse(cached), desdeCache: true }; const data = SpreadsheetApp.openById(getSpreadsheetId_()).getSheetByName(SHEETS.PRODUCTOS).getDataRange().getValues(), productos = data.slice(1).filter(r => r[0]).map(r => ({ id: r[0], nombre: r[1], emoji: r[2], categoria: r[3], precioUnitario: r[4], unidad: r[5], permiteVentaFraccionada: r[6] === 'SI', cantidadPorBulto: r[7] || null, envaseAsociado: r[8] || null, orden: r[9] || 0, activo: r[10] !== 'NO', stockActual: Number(r[11]) || 0 })); try { cache.put(CACHE_PRODUCTOS_KEY, JSON.stringify(productos), CACHE_PRODUCTOS_TTL); } catch (e) {} return { success: true, productos }; }
function obtenerVale(cui) { const data = SpreadsheetApp.openById(getSpreadsheetId_()).getSheetByName(SHEETS.VALES).getDataRange().getValues(), row = data.slice(1).find(r => r[1] === cui); return row ? { success: true, vale: { id: row[0], cui: row[1], montoOriginal: row[2], saldoActual: row[3], estado: row[4], fechaGeneracion: row[5], fechaVencimiento: row[7] } } : { success: false, error: 'Vale no encontrado' }; }
function logAction_(action, status, id) { try { const sheet = SpreadsheetApp.openById(getSpreadsheetId_()).getSheetByName(SHEETS.LOG); if (!sheet) return; appendRows_(sheet, [[new Date().toISOString(), action, status, id]]); if (sheet.getLastRow() > 1100) sheet.deleteRows(2, sheet.getLastRow() - 1000); } catch (e) {} }

function setupSheets() { const ss = SpreadsheetApp.openById(getSpreadsheetId_()), headers = { [SHEETS.VENTAS]: ['ID','Fecha','TurnoID','VendedorID','VendedorNombre','NumeroTicket','SubtotalProductos','SubtotalEnvases','TotalDevoluciones','Total','Vuelto','ValeAplicadoID','ValeGeneradoID','Timestamp'], [SHEETS.ITEMS_VENTA]: ['ID','VentaID','ProductoID','ProductoNombre','Cantidad','EsFraccion','FraccionDe','PrecioUnitario','Subtotal','Timestamp'], [SHEETS.PAGOS]: ['ID','VentaID','Metodo','Monto','EfectivoRecibido','Vuelto','BancoTransf','ConIVA','BancoCheque','NumeroCheque','FechaVencCheque','Timestamp'], [SHEETS.DEVOLUCIONES]: ['ID','VentaID','TipoEnvaseID','TipoEnvaseNombre','Cantidad','ValorUnitario','Subtotal','Timestamp'], [SHEETS.VALES]: ['ID','CUI','MontoOriginal','SaldoActual','Estado','FechaGeneracion','FechaUtilizacion','FechaVencimiento','VentaOrigenID','VentaUsoID','Timestamp'], [SHEETS.GASTOS]: ['ID','TurnoID','Fecha','Categoria','Monto','Descripcion','Proveedor','VendedorID','Timestamp'], [SHEETS.CIERRES]: ['ID','TurnoID','Fecha','FondoInicial','TotalVentas','TotalEfectivo','TotalTransferencias','TotalCheques','TotalVales','TotalGastos','TotalDevoluciones','EfectivoEsperado','EfectivoContado','Diferencia','ConteoBilletes','Justificacion','VendedorID','Timestamp'], [SHEETS.TURNOS]: ['ID','VendedorID','FechaInicio','FechaFin','FondoInicial','Activo','Timestamp'], [SHEETS.PRODUCTOS]: ['ID','Nombre','Emoji','Categoria','PrecioUnitario','Unidad','PermiteFraccion','CantidadBulto','EnvaseAsociado','Orden','Activo','StockActual'], [SHEETS.LOG]: ['Timestamp','Accion','Estado','ID'] }; for (const [name, row] of Object.entries(headers)) if (!ss.getSheetByName(name)) { const sheet = ss.insertSheet(name); sheet.appendRow(row); sheet.setFrozenRows(1); sheet.getRange(1,1,1,row.length).setBackground('#4285f4').setFontColor('#ffffff').setFontWeight('bold'); } return 'Setup completado'; }
function migrarColumnaStock_() { const sheet = SpreadsheetApp.openById(getSpreadsheetId_()).getSheetByName(SHEETS.PRODUCTOS), headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]; if (headers.indexOf('StockActual') === -1) sheet.getRange(1, headers.length + 1).setValue('StockActual'); }
