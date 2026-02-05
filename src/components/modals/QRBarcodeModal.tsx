// ========================================
// MODAL GENERADOR DE QR Y CÓDIGOS DE BARRAS
// ========================================

import { useState, useEffect } from 'react';
import { generarQR, generarCodigoBarras, descargarImagen, imprimirImagen, generarCodigoProducto } from '../../utils/qrBarcode';
import { notificar } from '../../stores/notificacionesStore';
import type { Producto } from '../../types';

interface QRBarcodeModalProps {
  producto?: Producto;
  onCerrar: () => void;
}

export function QRBarcodeModal({ producto, onCerrar }: QRBarcodeModalProps) {
  const [tipo, setTipo] = useState<'qr' | 'barcode'>('qr');
  const [codigo, setCodigo] = useState(producto?.codigo || '');
  const [imagenGenerada, setImagenGenerada] = useState<string | null>(null);
  const [generando, setGenerando] = useState(false);
  
  useEffect(() => {
    if (producto) {
      generarCodigo();
    }
  }, [producto, tipo]);
  
  const generarCodigo = async () => {
    if (!codigo.trim()) {
      notificar.error('Error', 'Ingresa un código');
      return;
    }
    
    setGenerando(true);
    
    try {
      let imagen: string;
      
      if (tipo === 'qr') {
        // Generar QR con información del producto
        const datos = producto
          ? JSON.stringify({
              id: producto.id,
              nombre: producto.nombre,
              codigo: codigo,
              precio: producto.precioSugerido,
            })
          : codigo;
        
        imagen = await generarQR(datos);
      } else {
        // Generar código de barras
        imagen = generarCodigoBarras(codigo);
      }
      
      setImagenGenerada(imagen);
      notificar.exito('Código Generado', `${tipo === 'qr' ? 'Código QR' : 'Código de barras'} generado exitosamente`);
    } catch (error) {
      console.error('Error generando código:', error);
      notificar.error('Error', 'No se pudo generar el código');
    } finally {
      setGenerando(false);
    }
  };
  
  const handleDescargar = () => {
    if (!imagenGenerada) return;
    
    const nombre = producto
      ? `${tipo}-${producto.nombre.replace(/\s+/g, '-')}`
      : `${tipo}-${codigo}`;
    
    descargarImagen(imagenGenerada, nombre);
    notificar.exito('Descargado', 'Código descargado exitosamente');
  };
  
  const handleImprimir = () => {
    if (!imagenGenerada) return;
    imprimirImagen(imagenGenerada);
  };
  
  const handleGenerarCodigoAleatorio = () => {
    const nuevoCodigo = generarCodigoProducto();
    setCodigo(nuevoCodigo);
  };
  
  return (
    <div className="modal-overlay" onClick={onCerrar}>
      <div className="modal-content w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--sv-texto)' }}>
          📱 Generador de Códigos
        </h2>
        
        {/* Información del producto */}
        {producto && (
          <div className="card mb-6 p-4">
            <h3 className="font-semibold mb-2" style={{ color: 'var(--sv-texto)' }}>
              {producto.emoji} {producto.nombre}
            </h3>
            <p className="text-sm" style={{ color: 'var(--sv-texto-secundario)' }}>
              Precio: ${producto.precioSugerido.toLocaleString()}
            </p>
          </div>
        )}
        
        {/* Tipo de código */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--sv-texto-secundario)' }}>
            Tipo de código
          </label>
          <div className="flex gap-3">
            <button
              onClick={() => setTipo('qr')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                tipo === 'qr' ? 'btn-action-primary' : 'btn-action-secondary'
              }`}
            >
              📱 Código QR
            </button>
            <button
              onClick={() => setTipo('barcode')}
              className={`flex-1 py-3 rounded-lg font-semibold transition-all ${
                tipo === 'barcode' ? 'btn-action-primary' : 'btn-action-secondary'
              }`}
            >
              📊 Código de Barras
            </button>
          </div>
        </div>
        
        {/* Código */}
        <div className="mb-6">
          <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--sv-texto-secundario)' }}>
            Código del producto
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={codigo}
              onChange={(e) => setCodigo(e.target.value)}
              placeholder="Ej: SVP-20240101-123456"
              className="input-base flex-1"
              maxLength={50}
            />
            <button
              onClick={handleGenerarCodigoAleatorio}
              className="btn-action-secondary whitespace-nowrap"
              title="Generar código aleatorio"
            >
              🎲 Generar
            </button>
          </div>
        </div>
        
        {/* Botón generar */}
        <button
          onClick={generarCodigo}
          className="w-full btn-action-primary mb-6"
          disabled={!codigo.trim() || generando}
        >
          {generando ? 'Generando...' : `Generar ${tipo === 'qr' ? 'QR' : 'Código de Barras'}`}
        </button>
        
        {/* Imagen generada */}
        {imagenGenerada && (
          <div className="mb-6">
            <div className="card p-6 flex flex-col items-center">
              <img
                src={imagenGenerada}
                alt={`Código ${tipo}`}
                className="max-w-full h-auto mb-4"
                style={{ maxHeight: '400px' }}
              />
              
              {/* Botones de acción */}
              <div className="flex gap-3 w-full">
                <button
                  onClick={handleDescargar}
                  className="flex-1 btn-action-primary"
                >
                  💾 Descargar
                </button>
                <button
                  onClick={handleImprimir}
                  className="flex-1 btn-action-secondary"
                >
                  🖨️ Imprimir
                </button>
              </div>
            </div>
          </div>
        )}
        
        {/* Info adicional */}
        <div className="card mb-6 p-4" style={{ backgroundColor: 'var(--sv-superficie-elevada)' }}>
          <h4 className="font-semibold mb-2" style={{ color: 'var(--sv-texto)' }}>
            ℹ️ Información
          </h4>
          <ul className="text-sm space-y-1" style={{ color: 'var(--sv-texto-secundario)' }}>
            {tipo === 'qr' ? (
              <>
                <li>• Los códigos QR pueden almacenar más información</li>
                <li>• Pueden ser escaneados desde cualquier ángulo</li>
                <li>• Ideales para compartir datos completos del producto</li>
              </>
            ) : (
              <>
                <li>• Los códigos de barras son estándar en comercios</li>
                <li>• Compatible con lectores de barras tradicionales</li>
                <li>• Formato CODE128 (alfanumérico)</li>
              </>
            )}
          </ul>
        </div>
        
        {/* Botón cerrar */}
        <button
          onClick={onCerrar}
          className="w-full btn-action-secondary"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
