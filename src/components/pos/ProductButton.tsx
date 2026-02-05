// ========================================
// BOTÓN DE PRODUCTO INDIVIDUAL
// ========================================

import { useState, useCallback } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/database';
import { useCarritoStore } from '../../stores/carritoStore';
import { useUIStore } from '../../stores/uiStore';
import type { Producto } from '../../types';
import { formatearMoneda } from '../../types';

interface ProductButtonProps {
  producto: Producto;
}

export function ProductButton({ producto }: ProductButtonProps) {
  const [pulsado, setPulsado] = useState(false);
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  
  const agregarProducto = useCarritoStore(state => state.agregarProducto);
  const abrirNumpad = useUIStore(state => state.abrirNumpad);
  const agregarNotificacion = useUIStore(state => state.agregarNotificacion);
  
  // Obtener tipos de envase para el selector
  const tiposEnvase = useLiveQuery(
    () => db.tiposEnvase.filter(e => e.activo).sortBy('orden'),
    []
  );
  
  // Determinar el estado del stock
  const stockBajo = producto.stockActual <= producto.stockMinimo && producto.stockActual > 0;
  const agotado = producto.stockActual === 0;
  
  // Manejar clic simple
  const handleClick = useCallback(() => {
    // Feedback visual y háptico
    setPulsado(true);
    setTimeout(() => setPulsado(false), 150);
    
    // Si el producto es fraccionable, mostrar opciones
    if (producto.esFraccionable) {
      setMostrarOpciones(true);
      return;
    }
    
    // Agregar directamente con cantidad 1 y precio sugerido
    agregarProducto(
      producto,
      1,
      false,
      producto.ultimoPrecioVenta || producto.precioSugerido,
      tiposEnvase?.[0], // Primer tipo de envase como default
      true
    );
    
    // Notificación si está agotado
    if (agotado) {
      agregarNotificacion(
        'warning',
        'Stock agotado',
        `${producto.nombreCorto} sin existencias`
      );
    }
  }, [producto, agregarProducto, tiposEnvase, agotado, agregarNotificacion]);
  
  // Manejar clic largo (para editar cantidad/precio)
  const handleLongPress = useCallback(() => {
    abrirNumpad({
      titulo: `Cantidad de ${producto.nombreCorto}`,
      valorInicial: 1,
      tipo: 'cantidad',
      onConfirm: (cantidad) => {
        if (cantidad > 0) {
          // Mostrar selector de precio
          abrirNumpad({
            titulo: `Precio de ${producto.nombreCorto}`,
            valorInicial: producto.ultimoPrecioVenta || producto.precioSugerido,
            tipo: 'precio',
            onConfirm: (precio) => {
              agregarProducto(
                producto,
                cantidad,
                false,
                precio,
                tiposEnvase?.[0],
                true
              );
            }
          });
        }
      }
    });
  }, [producto, abrirNumpad, agregarProducto, tiposEnvase]);
  
  // Agregar como fracción
  const handleAgregarFraccion = (cantidad: number, precio: number) => {
    agregarProducto(
      producto,
      cantidad,
      true,
      precio / producto.factorDivisor, // Precio por subunidad
      undefined,
      false
    );
    setMostrarOpciones(false);
  };
  
  // Agregar como bulto completo
  const handleAgregarBulto = (cantidad: number, precio: number) => {
    agregarProducto(
      producto,
      cantidad,
      false,
      precio,
      tiposEnvase?.[0],
      true
    );
    setMostrarOpciones(false);
  };
  
  return (
    <>
      <button
        onClick={handleClick}
        onContextMenu={(e) => {
          e.preventDefault();
          handleLongPress();
        }}
        className={`
          btn-product
          ${pulsado ? 'animate-pulse-glow scale-95' : ''}
          ${agotado ? 'agotado' : ''}
        `}
      >
        {/* Badge de stock */}
        <div className={`
          badge-stock
          ${stockBajo ? 'low' : ''}
          ${agotado ? 'out' : ''}
        `}>
          {producto.stockActual}
        </div>
        
        {/* Emoji del producto */}
        <span className="text-4xl mb-1">{producto.emoji}</span>
        
        {/* Nombre corto */}
        <span className="text-sm font-bold text-white text-center leading-tight px-1">
          {producto.nombreCorto}
        </span>
        
        {/* Precio */}
        <span className="text-xs text-primary font-mono font-bold mt-1">
          {formatearMoneda(producto.ultimoPrecioVenta || producto.precioSugerido)}
        </span>
        
        {/* Indicador de fraccionable */}
        {producto.esFraccionable && (
          <span className="absolute bottom-1 left-1 text-xs bg-dark-400 px-1.5 py-0.5 rounded text-zinc-400">
            ÷{producto.factorDivisor}
          </span>
        )}
        
        {/* Banner de agotado */}
        {agotado && (
          <div className="banner-agotado">
            <span>AGOTADO</span>
          </div>
        )}
      </button>
      
      {/* Modal de opciones para productos fraccionables */}
      {mostrarOpciones && (
        <ModalOpcionesFraccion
          producto={producto}
          onAgregarFraccion={handleAgregarFraccion}
          onAgregarBulto={handleAgregarBulto}
          onClose={() => setMostrarOpciones(false)}
        />
      )}
    </>
  );
}

// Modal de opciones para productos fraccionables
interface ModalOpcionesFraccionProps {
  producto: Producto;
  onAgregarFraccion: (cantidad: number, precio: number) => void;
  onAgregarBulto: (cantidad: number, precio: number) => void;
  onClose: () => void;
}

function ModalOpcionesFraccion({ 
  producto, 
  onAgregarFraccion, 
  onAgregarBulto, 
  onClose 
}: ModalOpcionesFraccionProps) {
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState(producto.ultimoPrecioVenta || producto.precioSugerido);
  const [modo, setModo] = useState<'fraccion' | 'bulto'>('fraccion');
  
  const abrirNumpad = useUIStore(state => state.abrirNumpad);
  
  const precioPorFraccion = precio / producto.factorDivisor;
  const subtotalFraccion = cantidad * precioPorFraccion;
  const subtotalBulto = cantidad * precio;
  
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content p-6 w-full max-w-md mx-4"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-5xl">{producto.emoji}</span>
          <h3 className="text-xl font-bold text-white mt-2">{producto.nombre}</h3>
          <p className="text-zinc-400 text-sm">
            1 {producto.unidadBase} = {producto.factorDivisor} {producto.nombreSubunidad}s
          </p>
        </div>
        
        {/* Selector de modo */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => setModo('fraccion')}
            className={`p-3 rounded-xl font-semibold transition-all ${
              modo === 'fraccion'
                ? 'bg-primary text-white'
                : 'bg-dark-400 text-zinc-400 hover:bg-dark-200'
            }`}
          >
            Por {producto.nombreSubunidad}
          </button>
          <button
            onClick={() => setModo('bulto')}
            className={`p-3 rounded-xl font-semibold transition-all ${
              modo === 'bulto'
                ? 'bg-primary text-white'
                : 'bg-dark-400 text-zinc-400 hover:bg-dark-200'
            }`}
          >
            Por {producto.unidadBase}
          </button>
        </div>
        
        {/* Cantidad y precio */}
        <div className="space-y-3 mb-6">
          {/* Cantidad */}
          <div 
            className="bg-dark-400 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-dark-200"
            onClick={() => {
              abrirNumpad({
                titulo: `Cantidad (${modo === 'fraccion' ? producto.nombreSubunidad : producto.unidadBase}s)`,
                valorInicial: cantidad,
                tipo: 'cantidad',
                min: 1,
                onConfirm: setCantidad
              });
            }}
          >
            <span className="text-zinc-400">Cantidad</span>
            <span className="text-2xl font-bold text-white">
              {cantidad} {modo === 'fraccion' ? producto.nombreSubunidad : producto.unidadBase}(s)
            </span>
          </div>
          
          {/* Precio del bulto */}
          <div 
            className="bg-dark-400 rounded-xl p-4 flex items-center justify-between cursor-pointer hover:bg-dark-200"
            onClick={() => {
              abrirNumpad({
                titulo: `Precio por ${producto.unidadBase}`,
                valorInicial: precio,
                tipo: 'precio',
                onConfirm: setPrecio
              });
            }}
          >
            <span className="text-zinc-400">Precio / {producto.unidadBase}</span>
            <span className="text-2xl font-bold text-primary font-mono">
              {formatearMoneda(precio)}
            </span>
          </div>
          
          {/* Precio calculado por fracción */}
          {modo === 'fraccion' && (
            <div className="bg-dark-400 rounded-xl p-4 flex items-center justify-between">
              <span className="text-zinc-400">Precio / {producto.nombreSubunidad}</span>
              <span className="text-xl font-bold text-zinc-300 font-mono">
                {formatearMoneda(precioPorFraccion)}
              </span>
            </div>
          )}
        </div>
        
        {/* Subtotal */}
        <div className="bg-primary/10 rounded-xl p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400">Subtotal</span>
            <span className="text-3xl font-bold text-primary font-mono">
              {formatearMoneda(modo === 'fraccion' ? subtotalFraccion : subtotalBulto)}
            </span>
          </div>
          {modo === 'fraccion' && (
            <p className="text-xs text-zinc-500 mt-1">
              = {(cantidad / producto.factorDivisor).toFixed(2)} {producto.unidadBase}(s) del stock
            </p>
          )}
        </div>
        
        {/* Botones de acción */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={onClose}
            className="btn-action-secondary"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (modo === 'fraccion') {
                onAgregarFraccion(cantidad, precio);
              } else {
                onAgregarBulto(cantidad, precio);
              }
            }}
            className="btn-action-primary"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
