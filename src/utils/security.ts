// ========================================
// UTILIDADES DE SEGURIDAD - HASHING DE PINS
// ========================================

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hashea un PIN de 4 dígitos usando bcrypt
 */
export async function hashearPIN(pin: string): Promise<string> {
  // Validar que sea un PIN de 4 dígitos
  if (!/^\d{4}$/.test(pin)) {
    throw new Error('El PIN debe ser de 4 dígitos numéricos');
  }
  
  const hash = await bcrypt.hash(pin, SALT_ROUNDS);
  return hash;
}

/**
 * Verifica un PIN contra su hash
 */
export async function verificarPIN(pin: string, hash: string): Promise<boolean> {
  try {
    const esValido = await bcrypt.compare(pin, hash);
    return esValido;
  } catch (error) {
    console.error('Error al verificar PIN:', error);
    return false;
  }
}

/**
 * Genera un PIN aleatorio de 4 dígitos
 */
export function generarPINAleatorio(): string {
  return Math.floor(1000 + Math.random() * 9000).toString();
}
