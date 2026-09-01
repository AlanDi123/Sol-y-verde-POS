// ========================================
// GOOGLE APPS SCRIPT - SOL Y VERDE POS
// ========================================
// Este archivo se debe copiar a Google Apps Script
// y desplegar como Web App
// ========================================

// ID de la hoja de cálculo
const SPREADSHEET_ID = 'TU_SPREADSHEET_ID_AQUI';

// Nombres de las hojas
const SHEETS = {
  VENTAS: 'Ventas',
  ITEMS_VENTA: 'ItemsVenta',
  PAGOS: 'Pagos',
  DEVOLUCIONES: 'Devoluciones',
  VALES: 'Vales',
  GASTOS: 'Gastos',
  CIERRES: 'CierresCaja',
  TURNOS: 'Turnos',
  PRODUCTOS: 'Productos',
  LOG: 'Log'
};

// ========================================
// MANEJADOR HTTP POST
// ========================================

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    const payload = data.data;
    
    logAction(action, 'INICIANDO', payload.id || 'N/A');
    const result = ejecutarAccion(action, payload);
    
    logAction(action, result.success ? 'OK' : 'ERROR', payload.id || 'N/A');
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    logAction('ERROR', error.toString(), '');
    
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function ejecutarAccion(action, payload) {
  switch (action) {
    case 'venta':
      return procesarVenta(payload);
    case 'vale':
      return procesarVale(payload);
    case 'gasto':
      return procesarGasto(payload);
    case 'cierre':
      return procesarCierre(payload);
    case 'turno':
      return procesarTurno(payload);
    default:
      return { success: false, error: 'Acción desconocida: ' + action };
  }
}

// ========================================
// MANEJADOR HTTP GET (para consultas)
// ========================================

function doGet(e) {
  try {
    const action = e.parameter.action;
    
    let result;
    
    switch (action) {
      case 'getProductos':
        result = obtenerProductos();
        break;
      case 'getVale':
        result = obtenerVale(e.parameter.cui);
        break;
      case 'ping':
        result = { success: true, message: 'pong', timestamp: new Date().toISOString() };
        break;
      default:
        result = { success: false, error: 'Acción desconocida' };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      success: false,
      error: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

// ========================================
// PROCESAR VENTA
// ========================================

function procesarVenta(venta) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Venta principal
  const sheetVentas = ss.getSheetByName(SHEETS.VENTAS);
  sheetVentas.appendRow([
    venta.id,
    venta.fecha,
    venta.turnoId,
    venta.vendedorId,
    venta.vendedorNombre,
    venta.numeroTicket,
    venta.subtotalProductos,
    venta.subtotalEnvases,
    venta.totalDevoluciones,
    venta.total,
    venta.vuelto,
    venta.valeAplicadoId || '',
    venta.valeGeneradoId || '',
    new Date().toISOString()
  ]);
  
  // Items de la venta
  const sheetItems = ss.getSheetByName(SHEETS.ITEMS_VENTA);
  for (const item of venta.items) {
    sheetItems.appendRow([
      item.id,
      venta.id,
      item.productoId,
      item.productoNombre,
      item.cantidad,
      item.esFraccion ? 'SI' : 'NO',
      item.fraccionDe || '',
      item.precioUnitario,
      item.subtotal,
      new Date().toISOString()
    ]);
    
    // Envases del item
    if (item.envases && item.envases.length > 0) {
      for (const env of item.envases) {
        sheetItems.appendRow([
          env.id,
          venta.id,
          'ENVASE:' + env.tipoEnvaseId,
          env.tipoEnvaseNombre,
          env.cantidad,
          'NO',
          '',
          env.valorUnitario,
          env.subtotal,
          new Date().toISOString()
        ]);
      }
    }
  }
  
  // Pagos
  const sheetPagos = ss.getSheetByName(SHEETS.PAGOS);
  for (const pago of venta.pagos) {
    sheetPagos.appendRow([
      pago.id,
      venta.id,
      pago.metodo,
      pago.monto,
      pago.detalleEfectivo ? pago.detalleEfectivo.montoRecibido : '',
      pago.detalleEfectivo ? pago.detalleEfectivo.vuelto : '',
      pago.detalleTransferencia ? pago.detalleTransferencia.banco : '',
      pago.detalleTransferencia ? (pago.detalleTransferencia.conIva ? 'SI' : 'NO') : '',
      pago.detalleCheque ? pago.detalleCheque.banco : '',
      pago.detalleCheque ? pago.detalleCheque.numeroCheque : '',
      pago.detalleCheque ? pago.detalleCheque.fechaVencimiento : '',
      new Date().toISOString()
    ]);
  }
  
  // Devoluciones
  if (venta.devoluciones && venta.devoluciones.length > 0) {
    const sheetDev = ss.getSheetByName(SHEETS.DEVOLUCIONES);
    for (const dev of venta.devoluciones) {
      sheetDev.appendRow([
        dev.id,
        venta.id,
        dev.tipoEnvaseId,
        dev.tipoEnvaseNombre,
        dev.cantidad,
        dev.valorUnitario,
        dev.subtotal,
        new Date().toISOString()
      ]);
    }
  }
  
  return { success: true, id: venta.id };
}

// ========================================
// PROCESAR VALE
// ========================================

function procesarVale(vale) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.VALES);
  
  // Verificar si ya existe (actualización)
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === vale.id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  const rowData = [
    vale.id,
    vale.cui,
    vale.montoOriginal,
    vale.saldoActual,
    vale.estado,
    vale.fechaGeneracion,
    vale.fechaUtilizacion || '',
    vale.fechaVencimiento || '',
    vale.ventaOrigenId || '',
    vale.ventaUsoId || '',
    new Date().toISOString()
  ];
  
  if (rowIndex > 0) {
    // Actualizar
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    // Insertar nuevo
    sheet.appendRow(rowData);
  }
  
  return { success: true, id: vale.id };
}

// ========================================
// PROCESAR GASTO
// ========================================

function procesarGasto(gasto) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.GASTOS);
  
  sheet.appendRow([
    gasto.id,
    gasto.turnoId,
    gasto.fecha,
    gasto.categoria,
    gasto.monto,
    gasto.descripcion || '',
    gasto.proveedor || '',
    gasto.vendedorId,
    new Date().toISOString()
  ]);
  
  return { success: true, id: gasto.id };
}

// ========================================
// PROCESAR CIERRE DE CAJA
// ========================================

function procesarCierre(cierre) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.CIERRES);
  
  sheet.appendRow([
    cierre.id,
    cierre.turnoId,
    cierre.fecha,
    cierre.fondoInicial,
    cierre.totalVentas,
    cierre.totalEfectivo,
    cierre.totalTransferencias,
    cierre.totalCheques,
    cierre.totalVales,
    cierre.totalGastos,
    cierre.totalDevoluciones,
    cierre.efectivoEsperado,
    cierre.efectivoContado,
    cierre.diferencia,
    JSON.stringify(cierre.conteoBilletes),
    cierre.justificacionDiferencia || '',
    cierre.vendedorId,
    new Date().toISOString()
  ]);
  
  return { success: true, id: cierre.id };
}

// ========================================
// PROCESAR TURNO
// ========================================

function procesarTurno(turno) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.TURNOS);
  
  // Buscar si ya existe
  const data = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === turno.id) {
      rowIndex = i + 1;
      break;
    }
  }
  
  const rowData = [
    turno.id,
    turno.vendedorId,
    turno.fechaInicio,
    turno.fechaFin || '',
    turno.fondoInicial,
    turno.activo ? 'SI' : 'NO',
    new Date().toISOString()
  ];
  
  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
  
  return { success: true, id: turno.id };
}

// ========================================
// OBTENER PRODUCTOS
// ========================================

function obtenerProductos() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.PRODUCTOS);
  const data = sheet.getDataRange().getValues();
  
  const headers = data[0];
  const productos = [];
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    if (!row[0]) continue; // Saltar filas vacías
    
    productos.push({
      id: row[0],
      nombre: row[1],
      emoji: row[2],
      categoria: row[3],
      precioUnitario: row[4],
      unidad: row[5],
      permiteVentaFraccionada: row[6] === 'SI',
      cantidadPorBulto: row[7] || null,
      envaseAsociado: row[8] || null,
      orden: row[9] || 0,
      activo: row[10] !== 'NO'
    });
  }
  
  return { success: true, productos: productos };
}

// ========================================
// OBTENER VALE
// ========================================

function obtenerVale(cui) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEETS.VALES);
  const data = sheet.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === cui) {
      return {
        success: true,
        vale: {
          id: data[i][0],
          cui: data[i][1],
          montoOriginal: data[i][2],
          saldoActual: data[i][3],
          estado: data[i][4],
          fechaGeneracion: data[i][5],
          fechaVencimiento: data[i][7]
        }
      };
    }
  }
  
  return { success: false, error: 'Vale no encontrado' };
}

// ========================================
// LOG DE ACCIONES
// ========================================

function logAction(action, status, id) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = ss.getSheetByName(SHEETS.LOG);
    
    if (!sheet) return;
    
    sheet.appendRow([
      new Date().toISOString(),
      action,
      status,
      id
    ]);
    
    // Mantener solo últimas 1000 líneas
    const lastRow = sheet.getLastRow();
    if (lastRow > 1000) {
      sheet.deleteRows(2, lastRow - 1000);
    }
  } catch (e) {
    // Ignorar errores de log
  }
}

// ========================================
// CREAR HOJAS SI NO EXISTEN
// ========================================

function setupSheets() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  
  // Headers para cada hoja
  const headersConfig = {
    [SHEETS.VENTAS]: ['ID', 'Fecha', 'TurnoID', 'VendedorID', 'VendedorNombre', 'NumeroTicket', 'SubtotalProductos', 'SubtotalEnvases', 'TotalDevoluciones', 'Total', 'Vuelto', 'ValeAplicadoID', 'ValeGeneradoID', 'Sincronizado'],
    [SHEETS.ITEMS_VENTA]: ['ID', 'VentaID', 'ProductoID', 'ProductoNombre', 'Cantidad', 'EsFraccion', 'FraccionDe', 'PrecioUnitario', 'Subtotal', 'Sincronizado'],
    [SHEETS.PAGOS]: ['ID', 'VentaID', 'Metodo', 'Monto', 'EfectivoRecibido', 'Vuelto', 'BancoTransf', 'ConIVA', 'BancoCheque', 'NumeroCheque', 'FechaVencCheque', 'Sincronizado'],
    [SHEETS.DEVOLUCIONES]: ['ID', 'VentaID', 'TipoEnvaseID', 'TipoEnvaseNombre', 'Cantidad', 'ValorUnitario', 'Subtotal', 'Sincronizado'],
    [SHEETS.VALES]: ['ID', 'CUI', 'MontoOriginal', 'SaldoActual', 'Estado', 'FechaGeneracion', 'FechaUtilizacion', 'FechaVencimiento', 'VentaOrigenID', 'VentaUsoID', 'Sincronizado'],
    [SHEETS.GASTOS]: ['ID', 'TurnoID', 'Fecha', 'Categoria', 'Monto', 'Descripcion', 'Proveedor', 'VendedorID', 'Sincronizado'],
    [SHEETS.CIERRES]: ['ID', 'TurnoID', 'Fecha', 'FondoInicial', 'TotalVentas', 'TotalEfectivo', 'TotalTransferencias', 'TotalCheques', 'TotalVales', 'TotalGastos', 'TotalDevoluciones', 'EfectivoEsperado', 'EfectivoContado', 'Diferencia', 'ConteoBilletes', 'Justificacion', 'VendedorID', 'Sincronizado'],
    [SHEETS.TURNOS]: ['ID', 'VendedorID', 'FechaInicio', 'FechaFin', 'FondoInicial', 'Activo', 'Sincronizado'],
    [SHEETS.PRODUCTOS]: ['ID', 'Nombre', 'Emoji', 'Categoria', 'PrecioUnitario', 'Unidad', 'PermiteFraccion', 'CantidadBulto', 'EnvaseAsociado', 'Orden', 'Activo'],
    [SHEETS.LOG]: ['Timestamp', 'Accion', 'Estado', 'ID']
  };
  
  for (const [sheetName, headers] of Object.entries(headersConfig)) {
    let sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow(headers);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, headers.length)
        .setBackground('#4285f4')
        .setFontColor('#ffffff')
        .setFontWeight('bold');
    }
  }
  
  return 'Setup completado';
}
