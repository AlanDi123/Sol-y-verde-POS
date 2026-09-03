// ========================================
// PUNTO DE ENTRADA PRINCIPAL - SOL Y VERDE POS
// ========================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { iniciarServicioSync } from './services/syncService';
import { iniciarLiveSync } from './services/liveSync';
import { asegurarVendedorAdminExiste, db, repararHashesDePinCorruptos } from './db/database';

// Rescate de emergencia — abrir consola del navegador (F12) en la app y usar:
//   solYVerdeRepararAdmin()   -> crea el admin (PIN 1234) SOLO si no hay ninguno
//   solYVerdeRepararPines()   -> re-hashea cualquier PIN que haya quedado en
//                                texto plano (por ejemplo por edición manual
//                                en DevTools), sin tocar los que ya estén bien
(window as any).solYVerdeRepararAdmin = asegurarVendedorAdminExiste;
(window as any).solYVerdeRepararPines = repararHashesDePinCorruptos;

// Inicializar la base de datos y luego la aplicación
async function inicializar() {
  try {
    // Verificar e inicializar base de datos
    await db.open();
    console.log('✅ Base de datos inicializada');
    
    // Iniciar servicio de sincronización (sube ventas/gastos/etc. propios)
    iniciarServicioSync();
    console.log('✅ Servicio de sincronización iniciado');

    // Iniciar servicio de estado en vivo (baja stock/catálogo de otras tablets)
    iniciarLiveSync();
    console.log('✅ Servicio de estado en vivo iniciado');

    // Auto-reparación silenciosa de PINs corruptos (no molesta si todo está bien)
    await repararHashesDePinCorruptos();
    
  } catch (error) {
    console.error('❌ Error inicializando:', error);
  }
}

inicializar();

// Renderizar la aplicación
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Manejar eventos de conexión
window.addEventListener('online', () => {
  console.log('🌐 Conexión restaurada');
  document.dispatchEvent(new CustomEvent('app:online'));
});

window.addEventListener('offline', () => {
  console.log('📴 Sin conexión');
  document.dispatchEvent(new CustomEvent('app:offline'));
});

// Prevenir zoom en iOS
document.addEventListener('gesturestart', (e) => {
  e.preventDefault();
});

// Prevenir doble tap zoom
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, false);

// Log de inicialización
console.log('🥬 Sol y Verde POS v2.0 iniciado');
