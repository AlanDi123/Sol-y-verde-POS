// ========================================
// BLOQUEO PROGRESIVO DE INTENTOS DE PIN
// ========================================
// El sistema original no tenía ningún límite de intentos: un PIN de
// 4 dígitos son solo 10.000 combinaciones, así que sin límite es
// cuestión de minutos probarlas todas a mano. Esto agrega un bloqueo
// progresivo simple, persistido en localStorage (sobrevive a recargas
// de la tablet), sin necesidad de tocar el backend.

const STORAGE_KEY = 'sv_pin_lockout';
const UMBRAL_INTENTOS = 5;             // a partir de este intento, empieza el bloqueo
const BASE_BLOQUEO_MS = 15000;         // 15s de bloqueo en el primer exceso
const MAX_BLOQUEO_MS = 5 * 60 * 1000;  // techo de 5 minutos

interface EstadoLockout {
  intentos: number;
  bloqueadoHasta: number | null;
}

function leerEstado(): EstadoLockout {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { intentos: 0, bloqueadoHasta: null };
    return JSON.parse(raw);
  } catch {
    return { intentos: 0, bloqueadoHasta: null };
  }
}

function guardarEstado(estado: EstadoLockout): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
}

/** Llamar ANTES de intentar verificar el PIN. */
export function verificarBloqueoActivo(): { bloqueado: boolean; segundosRestantes: number } {
  const estado = leerEstado();
  if (estado.bloqueadoHasta && estado.bloqueadoHasta > Date.now()) {
    return {
      bloqueado: true,
      segundosRestantes: Math.ceil((estado.bloqueadoHasta - Date.now()) / 1000)
    };
  }
  return { bloqueado: false, segundosRestantes: 0 };
}

/** Llamar cuando el PIN ingresado fue incorrecto. */
export function registrarIntentoFallido(): void {
  const estado = leerEstado();
  const intentos = estado.intentos + 1;

  let bloqueadoHasta: number | null = estado.bloqueadoHasta;
  if (intentos >= UMBRAL_INTENTOS) {
    const exceso = intentos - UMBRAL_INTENTOS;
    const delay = Math.min(BASE_BLOQUEO_MS * Math.pow(2, exceso), MAX_BLOQUEO_MS);
    bloqueadoHasta = Date.now() + delay;
  }

  guardarEstado({ intentos, bloqueadoHasta });
}

/** Llamar cuando el PIN ingresado fue correcto: resetea todo. */
export function registrarLoginExitoso(): void {
  guardarEstado({ intentos: 0, bloqueadoHasta: null });
}
