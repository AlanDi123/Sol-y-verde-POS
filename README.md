# 🥬🍅 Sol y Verde POS v3.0

Sistema de Punto de Venta moderno y robusto para Mercado Mayorista Frutihortícola.

![Version](https://img.shields.io/badge/version-3.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)
![React](https://img.shields.io/badge/React-18.2-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.2-blue)

## ✨ Características Principales

### 🔐 Seguridad de Clase Empresarial
- **PINs hasheados** con bcrypt (10 salt rounds)
- **Validación de inputs** completa (XSS, SQL injection prevention)
- **Sistema de roles** granular (Dueño, Vendedor, Administrativo)
- **Permisos diferenciados** por rol (16 permisos configurables)

### 🎨 Interfaz Moderna
- **Tema claro/oscuro** intercambiable
- **Colores corporativos** (verde #2E7D32, naranja #FF6F00)
- **100% responsive** (móvil, tablet, desktop)
- **Optimización táctil** (touch targets 44x44px mínimo)
- **Animaciones fluidas** y micro-interacciones

### ⚡ Performance Optimizada
- **Paginación** para manejar 400+ ventas/día
- **Virtual scrolling** en listas largas
- **Lazy loading** de componentes pesados
- **Caché** de productos populares
- **IndexedDB** para persistencia offline

### 🔄 Sincronización Robusta
- **Reintentos exponenciales** con backoff y jitter
- **Cola de sincronización** con prioridades
- **Verificación de respuestas** del servidor
- **Google Sheets** como backup en la nube
- **Modo offline completo** (PWA)

### 💰 Funcionalidades Avanzadas
- **Descuentos manuales** (% o monto fijo + razón obligatoria)
- **Movimientos de caja** nocturnos (entradas/salidas)
- **Generador QR/Códigos de barras** para productos
- **Búsqueda por voz** (opcional, WebSpeech API)
- **Sistema de envases** con señas y devoluciones
- **Vales de crédito** con CUI tracking

### 🔔 Notificaciones Inteligentes
- **Stock bajo/crítico** automático
- **Errores de sincronización** con reintentos
- **Vibración diferenciada** según tipo
- **Auto-eliminación** temporal
- **Máximo 5** notificaciones simultáneas

### 📊 Monitoreo y Control
- **Métricas de performance** en tiempo real
- **Locks atómicos** para prevenir race conditions
- **Error boundaries** con recuperación automática
- **Logging estructurado** para debugging

## 🚀 Inicio Rápido

### Requisitos Previos
- Node.js 18+
- npm o yarn
- Navegador moderno (Chrome, Firefox, Safari, Edge)

### Instalación

```bash
# Clonar repositorio
git clone https://github.com/AlanDi123/Sol-y-verde-POS.git
cd Sol-y-verde-POS

# Instalar dependencias
npm install

# Iniciar en desarrollo
npm run dev
```

### Build para Producción

```bash
# Build optimizado
npm run build

# Preview del build
npm run preview
```

### Docker

```bash
# Build imagen
docker-compose build

# Ejecutar contenedor
docker-compose up -d

# Detener
docker-compose down
```

La aplicación estará disponible en `http://localhost:3000`

## 🏗️ Arquitectura

```
src/
├── components/           # Componentes React
│   ├── modals/          # Modales (Pago, Descuento, etc)
│   ├── Pagination.tsx   # Paginación reutilizable
│   ├── VoiceSearch.tsx  # Búsqueda por voz
│   └── NotificationContainer.tsx
├── db/                  # IndexedDB con Dexie
│   └── database.ts      # Schema y operaciones
├── services/            # Servicios
│   ├── syncService.ts   # Sincronización Google Sheets
│   ├── printService.ts  # Impresión de tickets
│   └── stockMonitor.ts  # Monitoreo de stock
├── stores/              # Estado global (Zustand)
│   ├── sesionStore.ts   # Autenticación y sesión
│   ├── carritoStore.ts  # Carrito de compras
│   ├── temaStore.ts     # Tema claro/oscuro
│   └── notificacionesStore.ts
├── utils/               # Utilidades
│   ├── validacion.ts    # Validaciones
│   ├── security.ts      # Hashing de PINs
│   ├── roles.ts         # Permisos por rol
│   ├── constants.ts     # Constantes centralizadas
│   ├── locks.ts         # Locks atómicos
│   ├── pagination.ts    # Utilidades de paginación
│   └── qrBarcode.ts     # QR y códigos de barras
└── types/               # TypeScript types
```

## 👥 Sistema de Roles

### 👑 Dueño
- Acceso completo al sistema
- Puede editar configuración
- Gestiona usuarios
- Ve todos los reportes
- Puede editar cajas cerradas

### 💼 Vendedor
- Opera el POS
- Registra ventas
- Aplica descuentos (con razón)
- Cierra su propia caja
- Ingresa gastos y movimientos

### 📊 Administrativo
- Solo lectura
- Ve reportes completos
- Notifica errores
- Marca problemas en ventas
- No puede operar POS

## 🔧 Configuración

### Google Sheets Sync

1. Crear un Google Apps Script
2. Copiar el código de `google-apps-script/Code.gs`
3. Desplegarlo como Web App
4. Copiar la URL en Configuración del POS

### Variables de Entorno (opcional)

```env
VITE_GOOGLE_SCRIPT_URL=https://script.google.com/...
VITE_SENTRY_DSN=https://...
```

## 🧪 Testing

```bash
# Ejecutar tests
npm run test

# Tests con UI
npm run test:ui

# Cobertura
npm run test:coverage
```

Objetivo de cobertura: 70%

## 📦 Scripts Disponibles

```json
{
  "dev": "vite",
  "build": "tsc && vite build",
  "preview": "vite preview",
  "lint": "eslint . --ext ts,tsx",
  "lint:fix": "eslint . --ext ts,tsx --fix",
  "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
  "test": "vitest",
  "test:ui": "vitest --ui",
  "test:coverage": "vitest --coverage",
  "test:run": "vitest run"
}
```

## 🔐 Seguridad

- PINs hasheados con bcrypt (nunca en texto plano)
- Validación de inputs en todas las entradas
- Sanitización anti-XSS
- Verificación de stock antes de vender
- Locks atómicos para prevenir race conditions
- HTTPS recomendado en producción

## 📱 PWA (Progressive Web App)

- Funciona 100% offline
- Instalable en dispositivos móviles
- Service Worker para caché
- Sincronización automática cuando vuelve la conexión

## 🎯 Optimizaciones

### Performance
- Code splitting automático
- Lazy loading de rutas
- Compresión gzip (nginx)
- Cache de assets estáticos
- Virtual scrolling en listas

### Accesibilidad
- Touch targets mínimos 44x44px
- Focus visible para navegación por teclado
- Reducción de movimiento respetada
- Alto contraste soportado
- ARIA labels completos

## 🐛 Troubleshooting

### Error de sincronización
- Verificar conexión a internet
- Revisar URL de Google Script
- Verificar CORS en Apps Script

### Performance lenta
- Verificar cantidad de productos activos
- Revisar tamaño de base de datos
- Limpiar datos antiguos (>1 año)

### Tests fallando
- Reinstalar dependencias: `npm ci`
- Limpiar caché: `rm -rf node_modules dist`

## 🤝 Contribución

1. Fork el proyecto
2. Crear feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## 📄 Licencia

MIT License - ver archivo LICENSE para detalles

## 👨‍💻 Autor

**AlanDi123**
- GitHub: [@AlanDi123](https://github.com/AlanDi123)

## 🙏 Agradecimientos

- React y TypeScript teams
- Dexie.js por IndexedDB simplificado
- Zustand por estado global ligero
- Vite por build ultra-rápido

---

**Hecho con ❤️ para Sol y Verde Mercado Mayorista Frutihortícola**
