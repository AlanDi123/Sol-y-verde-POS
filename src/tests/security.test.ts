import { describe, it, expect } from 'vitest';
import { hashearPIN, verificarPIN, generarPINAleatorio } from '../utils/security';

describe('Utilidades de Seguridad', () => {
  describe('hashearPIN', () => {
    it('debe hashear un PIN válido', async () => {
      const hash = await hashearPIN('1234');
      expect(hash).toBeDefined();
      expect(hash.length).toBeGreaterThan(20);
      expect(hash).not.toBe('1234');
    });

    it('debe generar hashes diferentes para el mismo PIN', async () => {
      const hash1 = await hashearPIN('1234');
      const hash2 = await hashearPIN('1234');
      // Los hashes son diferentes por el salt
      expect(hash1).not.toBe(hash2);
    });

    it('debe rechazar PINs inválidos', async () => {
      await expect(hashearPIN('123')).rejects.toThrow('debe ser de 4 dígitos');
      await expect(hashearPIN('12345')).rejects.toThrow('debe ser de 4 dígitos');
      await expect(hashearPIN('abcd')).rejects.toThrow('debe ser de 4 dígitos');
    });
  });

  describe('verificarPIN', () => {
    it('debe verificar un PIN correcto', async () => {
      const hash = await hashearPIN('1234');
      const esValido = await verificarPIN('1234', hash);
      expect(esValido).toBe(true);
    });

    it('debe rechazar un PIN incorrecto', async () => {
      const hash = await hashearPIN('1234');
      const esValido = await verificarPIN('5678', hash);
      expect(esValido).toBe(false);
    });

    it('debe manejar hashes inválidos', async () => {
      const esValido = await verificarPIN('1234', 'hash-invalido');
      expect(esValido).toBe(false);
    });
  });

  describe('generarPINAleatorio', () => {
    it('debe generar un PIN de 4 dígitos', () => {
      const pin = generarPINAleatorio();
      expect(pin).toMatch(/^\d{4}$/);
    });

    it('debe generar PINs diferentes', () => {
      const pins = new Set();
      for (let i = 0; i < 10; i++) {
        pins.add(generarPINAleatorio());
      }
      // Debería haber varios PINs diferentes
      expect(pins.size).toBeGreaterThan(1);
    });

    it('debe generar PINs en el rango 1000-9999', () => {
      const pin = parseInt(generarPINAleatorio());
      expect(pin).toBeGreaterThanOrEqual(1000);
      expect(pin).toBeLessThanOrEqual(9999);
    });
  });
});
