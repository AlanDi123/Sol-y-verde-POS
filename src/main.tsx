// ========================================
// PUNTO DE ENTRADA PRINCIPAL - SOL Y VERDE POS
// ========================================

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { iniciarServicioSync } from './services/syncService';
import { db } from './db/database';

// Inicializar la base de datos y luego la aplicación
async function inicializar() {
  try {
    // Verificar e inicializar base de datos
    await db.open();
    console.log('✅ Base de datos inicializada');
    
    // Iniciar servicio de sincronización
    iniciarServicioSync();
    console.log('✅ Servicio de sincronización iniciado');
    
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
