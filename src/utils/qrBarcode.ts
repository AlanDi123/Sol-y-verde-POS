// ========================================
// UTILIDADES DE QR Y CÓDIGOS DE BARRAS
// ========================================

import QRCode from 'qrcode';
import JsBarcode from 'jsbarcode';

/**
 * Genera un código QR como Data URL
 */
export async function generarQR(texto: string, options?: {
  width?: number;
  margin?: number;
  color?: { dark?: string; light?: string };
}): Promise<string> {
  try {
    const defaultOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#2E7D32',
        light: '#FFFFFF',
      },
      ...options,
    };
    
    const dataUrl = await QRCode.toDataURL(texto, defaultOptions);
    return dataUrl;
  } catch (error) {
    console.error('Error generando QR:', error);
    throw new Error('No se pudo generar el código QR');
  }
}

/**
 * Genera un código QR como SVG
 */
export async function generarQRSVG(texto: string, options?: {
  width?: number;
  margin?: number;
  color?: { dark?: string; light?: string };
}): Promise<string> {
  try {
    const defaultOptions = {
      width: 300,
      margin: 2,
      color: {
        dark: '#2E7D32',
        light: '#FFFFFF',
      },
      ...options,
    };
    
    const svg = await QRCode.toString(texto, {
      type: 'svg',
      ...defaultOptions,
    });
    return svg;
  } catch (error) {
    console.error('Error generando QR SVG:', error);
    throw new Error('No se pudo generar el código QR');
  }
}

/**
 * Genera un código de barras
 */
export function generarCodigoBarras(
  codigo: string,
  options?: {
    format?: 'CODE128' | 'EAN13' | 'UPC' | 'CODE39';
    width?: number;
    height?: number;
    displayValue?: boolean;
  }
): string {
  try {
    const canvas = document.createElement('canvas');
    
    const defaultOptions = {
      format: 'CODE128' as const,
      width: 2,
      height: 100,
      displayValue: true,
      fontSize: 14,
      textMargin: 5,
      ...options,
    };
    
    JsBarcode(canvas, codigo, defaultOptions);
    
    return canvas.toDataURL('image/png');
  } catch (error) {
    console.error('Error generando código de barras:', error);
    throw new Error('No se pudo generar el código de barras');
  }
}

/**
 * Genera un código único para productos
 * Formato: SVP-YYYYMMDD-XXXXXX (Sol y Verde Producto)
 */
export function generarCodigoProducto(): string {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  
  return `SVP-${año}${mes}${dia}-${random}`;
}

/**
 * Descarga una imagen (QR o barcode)
 */
export function descargarImagen(dataUrl: string, nombreArchivo: string = 'codigo') {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = `${nombreArchivo}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Imprime una imagen (QR o barcode)
 */
export function imprimirImagen(dataUrl: string) {
  const ventana = window.open('', '_blank');
  if (ventana) {
    ventana.document.write(`
      <html>
        <head>
          <title>Imprimir Código</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              display: flex;
              justify-content: center;
              align-items: center;
              min-height: 100vh;
            }
            img {
              max-width: 100%;
              height: auto;
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" onload="window.print(); window.close();" />
        </body>
      </html>
    `);
    ventana.document.close();
  }
}

/**
 * Genera QR para un producto con toda su información
 */
export async function generarQRProducto(producto: {
  id: string;
  nombre: string;
  codigo?: string;
  precio: number;
}): Promise<string> {
  const datos = JSON.stringify({
    id: producto.id,
    nombre: producto.nombre,
    codigo: producto.codigo || generarCodigoProducto(),
    precio: producto.precio,
    timestamp: Date.now(),
  });
  
  return generarQR(datos);
}

/**
 * Genera código de barras para un producto
 */
export function generarCodigoBarrasProducto(codigo: string): string {
  // Asegurar que el código sea válido para CODE128
  const codigoLimpio = codigo.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  
  return generarCodigoBarras(codigoLimpio, {
    format: 'CODE128',
    width: 2,
    height: 80,
    displayValue: true,
  });
}
