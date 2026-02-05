import { describe, it, expect } from 'vitest';
import {
  validarNumeroPositivo,
  validarCantidad,
  validarPrecio,
  sanitizarTexto,
  validarFecha,
  validarFechaNoFutura,
  validarPIN,
  generarCodigoSeguro,
  formatearMonedaSegura,
  redondearPrecio,
  validarStockDisponible,
} from '../utils/validacion';

describe('Utilidades de Validación', () => {
  describe('validarNumeroPositivo', () => {
    it('debe aceptar números positivos', () => {
      expect(validarNumeroPositivo(10)).toBe(true);
      expect(validarNumeroPositivo(0)).toBe(true);
      expect(validarNumeroPositivo(0.5)).toBe(true);
    });

    it('debe rechazar números negativos', () => {
      expect(() => validarNumeroPositivo(-1)).toThrow('no puede ser negativo');
      expect(() => validarNumeroPositivo(-0.1)).toThrow('no puede ser negativo');
    });

    it('debe rechazar valores infinitos', () => {
      expect(() => validarNumeroPositivo(Infinity)).toThrow('debe ser un número válido');
      expect(() => validarNumeroPositivo(-Infinity)).toThrow('debe ser un número válido');
    });
  });

  describe('validarCantidad', () => {
    it('debe aceptar cantidades válidas', () => {
      expect(validarCantidad(1)).toBe(true);
      expect(validarCantidad(100)).toBe(true);
      expect(validarCantidad(9999)).toBe(true);
    });

    it('debe rechazar cantidad cero', () => {
      expect(() => validarCantidad(0)).toThrow('debe ser mayor a cero');
    });

    it('debe rechazar cantidades negativas', () => {
      expect(() => validarCantidad(-1)).toThrow('no puede ser negativo');
    });

    it('debe rechazar cantidades muy grandes', () => {
      expect(() => validarCantidad(10000)).toThrow('excede el límite permitido');
    });
  });

  describe('validarPrecio', () => {
    it('debe aceptar precios válidos', () => {
      expect(validarPrecio(100)).toBe(true);
      expect(validarPrecio(999999)).toBe(true);
    });

    it('debe rechazar precio cero', () => {
      expect(() => validarPrecio(0)).toThrow('debe ser mayor a cero');
    });

    it('debe rechazar precios negativos', () => {
      expect(() => validarPrecio(-100)).toThrow('no puede ser negativo');
    });

    it('debe rechazar precios excesivamente altos', () => {
      expect(() => validarPrecio(1000000000)).toThrow('excede el límite permitido');
    });
  });

  describe('sanitizarTexto', () => {
    it('debe sanitizar caracteres peligrosos', () => {
      expect(sanitizarTexto('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;&#x2F;script&gt;'
      );
    });

    it('debe sanitizar comillas simples y dobles', () => {
      expect(sanitizarTexto("test'test")).toBe('test&#x27;test');
      expect(sanitizarTexto('test"test')).toBe('test&quot;test');
    });

    it('debe limitar la longitud del texto', () => {
      const textoLargo = 'a'.repeat(600);
      expect(sanitizarTexto(textoLargo).length).toBe(500);
    });

    it('debe manejar strings vacíos', () => {
      expect(sanitizarTexto('')).toBe('');
      expect(sanitizarTexto('   ')).toBe('');
    });
  });

  describe('validarFecha', () => {
    it('debe aceptar fechas válidas', () => {
      expect(validarFecha(new Date())).toBe(true);
      expect(validarFecha('2024-01-01')).toBe(true);
    });

    it('debe rechazar fechas inválidas', () => {
      expect(() => validarFecha('fecha-invalida')).toThrow('Fecha inválida');
      expect(() => validarFecha('2024-13-45')).toThrow('Fecha inválida');
    });
  });

  describe('validarFechaNoFutura', () => {
    it('debe aceptar fechas pasadas', () => {
      expect(validarFechaNoFutura('2020-01-01')).toBe(true);
    });

    it('debe aceptar fecha de hoy', () => {
      expect(validarFechaNoFutura(new Date())).toBe(true);
    });

    it('debe rechazar fechas futuras', () => {
      const fechaFutura = new Date();
      fechaFutura.setFullYear(fechaFutura.getFullYear() + 1);
      expect(() => validarFechaNoFutura(fechaFutura)).toThrow('no puede ser futura');
    });
  });

  describe('validarPIN', () => {
    it('debe aceptar PINs válidos de 4 dígitos', () => {
      expect(validarPIN('1234')).toBe(true);
      expect(validarPIN('0000')).toBe(true);
      expect(validarPIN('9999')).toBe(true);
    });

    it('debe rechazar PINs con menos de 4 dígitos', () => {
      expect(() => validarPIN('123')).toThrow('debe ser de 4 dígitos');
    });

    it('debe rechazar PINs con más de 4 dígitos', () => {
      expect(() => validarPIN('12345')).toThrow('debe ser de 4 dígitos');
    });

    it('debe rechazar PINs con letras', () => {
      expect(() => validarPIN('12AB')).toThrow('debe ser de 4 dígitos');
    });
  });

  describe('generarCodigoSeguro', () => {
    it('debe generar códigos únicos', () => {
      const codigo1 = generarCodigoSeguro();
      const codigo2 = generarCodigoSeguro();
      expect(codigo1).not.toBe(codigo2);
    });

    it('debe incluir prefijo si se proporciona', () => {
      const codigo = generarCodigoSeguro('TEST');
      expect(codigo.startsWith('TEST')).toBe(true);
    });
  });

  describe('formatearMonedaSegura', () => {
    it('debe formatear montos positivos correctamente', () => {
      expect(formatearMonedaSegura(1000)).toContain('1');
    });

    it('debe manejar montos negativos devolviendo $0', () => {
      expect(formatearMonedaSegura(-100)).toBe('$0');
    });

    it('debe manejar valores inválidos', () => {
      expect(formatearMonedaSegura(Infinity)).toBe('$0');
    });
  });

  describe('redondearPrecio', () => {
    it('debe redondear a 2 decimales', () => {
      expect(redondearPrecio(10.125)).toBe(10.13);
      expect(redondearPrecio(10.124)).toBe(10.12);
    });

    it('debe mantener números enteros', () => {
      expect(redondearPrecio(100)).toBe(100);
    });
  });

  describe('validarStockDisponible', () => {
    it('debe aceptar cuando hay stock suficiente', () => {
      expect(validarStockDisponible(10, 5)).toBe(true);
      expect(validarStockDisponible(10, 10)).toBe(true);
    });

    it('debe rechazar cuando no hay stock suficiente', () => {
      expect(() => validarStockDisponible(5, 10)).toThrow('Stock insuficiente');
    });

    it('debe permitir stock insuficiente si permitirStockCero es true', () => {
      expect(validarStockDisponible(5, 10, true)).toBe(true);
    });

    it('debe rechazar valores negativos', () => {
      expect(() => validarStockDisponible(-1, 5)).toThrow('no puede ser negativo');
      expect(() => validarStockDisponible(10, -1)).toThrow('no puede ser negativo');
    });
  });
});
