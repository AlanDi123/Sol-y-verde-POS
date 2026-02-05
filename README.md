# 🥬 Sol y Verde POS v2.0

Sistema de Punto de Venta (POS) para verdulería mayorista, diseñado como Progressive Web App (PWA) con capacidades offline completas.

## 🚀 Características

### ⚡ Performance "Muscle Memory"
- Tiempo de respuesta < 50ms
- Botones de productos 120x120px con emojis
- Haptic feedback en cada interacción
- Sin animaciones que interrumpan el flujo

### 🏔️ Persistencia "Bunker-Level"
- IndexedDB con Dexie.js
- Estado completo offline
- Sincronización automática con Google Sheets
- Backup exportable en JSON

### 📦 Gestión de Envases (Señas)
- Sistema de depósitos: Cajón, Jaula, Plástico Premium
- Devolución automática de envases
- Generación de vales cuando devoluciones > compras

### 💰 Pagos Híbridos
- Efectivo con calculadora de vuelto
- Transferencia bancaria (+10% IVA opcional)
- Cheques con registro completo
- Aplicación de vales CUI

### 🧾 Impresión ESC/POS
- Tickets de venta
- Cierre de caja con conteo de billetes
- Vales impresos

## 📋 Requisitos

- Node.js 18+
- npm o yarn
- Navegador moderno con soporte IndexedDB
- (Opcional) Impresora térmica ESC/POS

## 🛠️ Instalación

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/sol-y-verde-pos.git
cd sol-y-verde-pos

# Instalar dependencias
npm install

# Iniciar en modo desarrollo
npm run dev

# Construir para producción
npm run build

# Previsualizar build de producción
npm run preview
```

## 📱 Instalación como PWA

1. Abrir la URL en Chrome/Edge
2. Menú → "Instalar aplicación"
3. La app funcionará completamente offline

## ⚙️ Configuración

### Google Sheets (Opcional)

1. Crear una nueva hoja de cálculo en Google Sheets
2. Ir a Extensiones → Apps Script
3. Copiar el contenido de `google-apps-script/Code.gs`
4. Ejecutar `setupSheets()` para crear la estructura
5. Desplegar como Web App
6. Copiar la URL y configurarla en el sistema

### Impresora ESC/POS

1. Conectar la impresora a la red
2. Configurar la URL de la impresora (ej: `http://192.168.1.100:9100`)
3. Probar conexión desde Configuración

## 🔐 Acceso

- **PIN por defecto**: `1234`
- **Usuario**: Administrador

## 📦 Estructura del Proyecto

```
src/
├── components/          # Componentes React
│   ├── modals/         # Modales del sistema
│   ├── pos/            # Componentes de venta
│   └── ui/             # Componentes UI base
├── db/                 # Capa de datos (Dexie.js)
├── services/           # Servicios (sync, print)
├── stores/             # Estado global (Zustand)
└── types/              # Definiciones TypeScript
```

## 🎯 Uso

### Flujo de Venta Típico

1. Iniciar turno con fondo de caja
2. Agregar productos tocando los botones
3. Para fracciones: tocar y mantener el producto
4. Agregar devolución de envases si aplica
5. Cobrar con el método deseado
6. Imprimir ticket (opcional)

### Cierre de Caja

1. Ir a menú → Cierre de Caja
2. Contar billetes por denominación
3. Justificar diferencias si las hay
4. Confirmar cierre

## 📄 Licencia

MIT License - Ver [LICENSE](LICENSE) para más detalles.

## 👥 Contribuir

Las contribuciones son bienvenidas. Por favor, abre un issue primero para discutir los cambios propuestos.

---

Desarrollado con ❤️ para Sol y Verde