# 📱 Guía de Uso - Sol y Verde POS v2.0

Sistema de Punto de Venta para Mercado Mayorista Frutihortícola

---

## 🚀 Inicio Rápido

### 1️⃣ Acceso al Sistema

1. **Abrir la aplicación** en el navegador o PWA instalada
2. **Pantalla de login**: Ingresar PIN de 4 dígitos
3. El sistema carga automáticamente si hay un turno activo

> **Nota**: Los vendedores tienen PIN de 4 dígitos. Los administradores tienen acceso completo a configuración.

---

## 💼 Inicio de Turno

Al iniciar sesión por primera vez en el día:

1. **Pantalla de Inicio de Turno** aparece automáticamente
2. **Ingresar el fondo inicial** en efectivo con el que se abre la caja
3. Usar el teclado numérico para ingresar el monto
4. Presionar **"Iniciar Turno"**

✅ El turno queda registrado con:
- Número de turno consecutivo
- Fecha y hora de inicio
- Vendedor responsable
- Fondo inicial

---

## 🛒 Realizar una Venta

### Pantalla Principal de Ventas

La interfaz está dividida en 3 secciones:

#### 📦 Panel Izquierdo - Productos
- **Barra de búsqueda**: Buscar por código o nombre
- **Filtros por categoría**: Verduras 🥬, Frutas 🍎, Frutas secas 🥜
- **Grid de productos**: Botones grandes con:
  - Emoji del producto
  - Nombre
  - Precio unitario
  - Stock disponible

#### 🛍️ Panel Central - Carrito
Muestra los productos agregados:
- Cantidad
- Nombre del producto
- Precio unitario
- Subtotal
- Envases asociados
- **Botones de acción**:
  - `🗑️` Eliminar producto
  - `+` / `-` Ajustar cantidad

#### 💰 Panel Derecho - Totales
- **Subtotal productos**
- **Total envases** (si hay señas cobradas)
- **Descuento** (si aplica)
- **Devolución envases** (si hay devoluciones)
- **TOTAL** en grande
- **Botón "COBRAR"** (verde, grande)

### Agregar Productos

**Opción 1: Click simple**
1. Click en el producto → Agrega 1 unidad

**Opción 2: Click largo (para cantidades)**
1. Mantener presionado el botón del producto
2. Aparece selector de cantidad
3. Usar `+` / `-` o ingresar cantidad manual
4. Seleccionar tipo de envase si corresponde:
   - Cajón de madera 🪵
   - Caja de cartón 📦
   - Bulto 🎒
   - Bolsa 🛍️
5. Confirmar

**Opción 3: Búsqueda rápida**
1. Escribir código o nombre en la barra de búsqueda
2. Click en el producto encontrado

### Venta Fraccionada

Para productos que se venden por fracción (Ej: bultos de 10kg):

1. Seleccionar el producto
2. En el modal, marcar **"Vender fraccionado"**
3. Ingresar cantidad (Ej: 3 de un bulto de 10)
4. El precio se calcula proporcionalmente
5. Confirmar

---

## 📦 Manejo de Envases (Señas)

### Cobrar Señas de Envases

Cuando se venden productos en envases retornables:

1. Al agregar el producto, **seleccionar tipo de envase**
2. La seña del envase **se suma automáticamente** al total
3. En el carrito se muestra:
   - Producto: Tomate × 10 unidades
   - + Envase: Cajón de madera ($15,000)

### Devolución de Envases

Cuando el cliente **devuelve envases vacíos**:

1. Presionar botón **"Devolución Envases"** 🔄 (barra superior)
2. Seleccionar tipo de envase a devolver
3. Ingresar cantidad usando `+` / `-`
4. El monto **se descuenta del total**
5. Confirmar

> **Ejemplo**: Cliente devuelve 5 cajones → Se descuentan $75,000 del total a pagar

---

## 💳 Proceso de Cobro

Presionar el botón **"COBRAR"** para iniciar el proceso de pago.

### Métodos de Pago Disponibles

#### 1. 💵 Efectivo

1. Seleccionar **"Efectivo"**
2. Ingresar monto recibido
3. El sistema calcula el **vuelto automáticamente**
4. Confirmar

**Caso especial**: Si el vuelto es mayor a $100,000 → El sistema sugiere generar un **vale** por el excedente

#### 2. 🏦 Transferencia

1. Seleccionar **"Transferencia"**
2. Elegir banco de la lista configurada
3. Opción: **"Incluir IVA +10%"** si el cliente paga con tarjeta
   - El monto base se mantiene
   - El cliente paga 10% adicional (no se refleja en el total de venta)
4. Se muestra el alias/CBU del banco
5. Confirmar cuando el pago esté acreditado

#### 3. 🧾 Cheque

1. Seleccionar **"Cheque"**
2. Ingresar datos del cheque:
   - Banco emisor
   - Número de cheque
   - Fecha de vencimiento
   - Monto
3. Confirmar

> **Nota**: Los cheques quedan registrados en el cierre de caja como "cheques en mano"

#### 4. 🎫 Vale (Crédito del negocio)

1. Seleccionar **"Vale"**
2. Buscar vale por código CUI (Ej: `SYV-1234-5678`)
3. El sistema verifica:
   - ✅ Vale activo
   - ✅ Saldo disponible
   - ✅ No vencido
4. El saldo del vale se aplica al total
5. Si el vale cubre todo: Venta completada
6. Si es parcial: Seleccionar método adicional para el resto

### Pagos Híbridos

Se pueden **combinar múltiples métodos** de pago:

**Ejemplo:**
- Total: $500,000
- Efectivo: $200,000
- Transferencia: $300,000

El sistema permite agregar pagos hasta cubrir el total.

### Finalizar Venta

1. Cuando el **total pagado = total de venta**
2. Se muestra resumen de la venta
3. Opciones:
   - **Imprimir ticket** 🖨️ (si hay impresora configurada)
   - **Finalizar** ✅

La venta queda registrada en:
- Base de datos local (IndexedDB)
- Cola de sincronización con Google Sheets

---

## 🎫 Sistema de Vales

### ¿Qué es un Vale?

Un vale es **crédito del negocio** que se genera cuando:
- El vuelto es muy grande (>$100,000)
- El cliente devuelve muchos envases pero no compra
- El negocio otorga crédito como cortesía

Cada vale tiene:
- **Código CUI único**: `SYV-XXXX-XXXX`
- **Monto disponible**
- **Fecha de emisión**
- **Fecha de vencimiento** (opcional, configurable)
- **Estado**: Activo, Parcial, Consumido, Vencido

### Generar un Vale

**Opción 1: Durante una venta (vuelto grande)**
1. Al cobrar, si el vuelto > $100,000
2. El sistema pregunta: *"¿Generar vale por el vuelto?"*
3. Aceptar → Se imprime ticket con código CUI del vale

**Opción 2: Por devolución de envases sin compra**
1. Click en **"Devolución Envases"** 🔄
2. Ingresar envases devueltos
3. Si no hay productos en el carrito → Opción de generar vale
4. Se crea vale por el monto de las señas

**Opción 3: Generar vale manual**
1. Click en **"Vale"** 🎫 (barra superior)
2. Opción: **"Generar nuevo vale"**
3. Ingresar:
   - Monto
   - Nombre del cliente (opcional)
   - Teléfono (opcional)
4. El sistema genera código CUI automático
5. Imprimir vale

### Usar un Vale

1. Durante el cobro, seleccionar método **"Vale"**
2. Ingresar código CUI (con auto-formato `SYV-XXXX-XXXX`)
3. El sistema muestra:
   - ✅ Saldo disponible
   - 📅 Fecha de generación
   - ⏰ Fecha de vencimiento (si tiene)
4. Aplicar vale → Se descuenta del total

**Uso parcial de vales:**
- Si el vale tiene $300,000 y la compra es $200,000
- Se usan $200,000 del vale
- Quedan $100,000 disponibles para próxima compra
- El estado cambia a **"Parcial"**

---

## 💸 Registro de Gastos

Para registrar gastos del turno (Ej: almuerzo, flete, compras):

1. Click en **"Gastos"** 💸 (barra superior)
2. Seleccionar categoría:
   - 🍽️ Almuerzo/Comida
   - 🚛 Flete
   - 📦 Compra de Mercadería
   - 🧹 Limpieza
   - 📎 Insumos
   - 🔧 Reparaciones
   - 📝 Otros
3. Ingresar:
   - **Monto** (obligatorio)
   - Descripción (opcional)
   - Proveedor (opcional)
4. Confirmar

El gasto queda registrado y se **descuenta del efectivo esperado** en el cierre de caja.

---

## 🔒 Cierre de Caja

Al finalizar el turno, realizar el cierre:

1. Click en **"Cerrar Caja"** 🔒 (menú superior derecho)
2. El sistema muestra **resumen del turno**:
   - 💰 Total ventas
   - 💵 Desglose por método de pago
   - 📦 Envases entregados/devueltos
   - 🎫 Vales emitidos
   - 💸 Gastos realizados
   - ✅ Efectivo esperado

### Conteo de Billetes (Argentino)

**Paso 1: Contar billetes**

Interface con denominaciones argentinas:
- $20,000
- $10,000
- $2,000
- $1,000
- $500
- $200
- $100
- $50
- Monedas

Para cada denominación:
1. Usar botones `+` / `-` para contar cantidad
2. El sistema calcula el subtotal automáticamente
3. Se muestra el **total contado** en grande

**Paso 2: Comparación**

El sistema compara:
- 🟢 **Efectivo esperado**: (Fondo inicial + Ventas en efectivo - Gastos - Vueltos)
- 🔵 **Efectivo contado**: (Suma del conteo de billetes)
- ⚠️ **Diferencia**: Esperado - Contado

**Colores del indicador:**
- ✅ **Verde**: Diferencia = $0 (cuadra perfecto)
- ⚠️ **Amarillo**: Diferencia < $5,000 (tolerable)
- 🔴 **Rojo**: Diferencia > $5,000 (requiere justificación)

### Justificar Diferencias

Si hay diferencia > $500:
1. El sistema **requiere justificación** (campo obligatorio)
2. Ingresar explicación (Ej: "Cliente devolvió cambio erróneo", "Error en vuelto")
3. No se puede cerrar sin justificar diferencias significativas

### Cheques en Mano

Si hubo pagos con cheque, se listan:
- Banco emisor
- Número de cheque
- Monto
- Fecha de vencimiento

### Confirmar Cierre

1. Revisar toda la información
2. Presionar **"Confirmar Cierre"**
3. El sistema:
   - ✅ Registra el cierre en la base de datos
   - 📤 Encola para sincronización
   - 🔒 Cierra el turno
   - 📊 Genera reporte (si hay impresora)

> **Importante**: Una vez cerrado el turno, no se pueden hacer más ventas hasta iniciar un nuevo turno.

---

## ⚙️ Configuración

Acceso: Menú superior derecho → **"Configuración"** ⚙️

> **Nota**: Algunas funciones requieren rol de **Administrador**

### Pestaña: GENERAL (Admin)

**Información del Negocio:**
- Nombre del negocio
- Dirección
- Teléfono
- CUIT (opcional)

**Configuración de Vales:**
- Días de expiración de vales (0 = sin vencimiento)
- Permitir venta con stock en cero

**Preferencias de UI:**
- 🔊 Sonidos activos
- 📳 Vibración activa
- 🌙 Modo oscuro (por defecto)

**Sincronización:**
- URL de Google Apps Script
- ID de Google Sheet
- Sincronización automática (cada X minutos)
- Modo offline forzado

### Pestaña: BANCOS (Admin)

Configurar cuentas para transferencias:

1. Presionar **"+ Agregar Banco"**
2. Ingresar:
   - Nombre del banco (Ej: "Mercado Pago")
   - Alias o CBU
   - CUIT/CUIL del titular (opcional)
3. Ordenar bancos (arrastrar)
4. Activar/Desactivar bancos

Los bancos aparecen en el modal de pago por transferencia.

### Pestaña: ENVASES (Admin)

Gestionar tipos de envases retornables:

**Agregar nuevo tipo:**
1. **"+ Agregar Envase"**
2. Datos:
   - Nombre (Ej: "Cajón de madera chico")
   - Emoji (para identificar visualmente)
   - Valor de la seña
   - Descripción
3. Guardar

**Editar envases:**
- Click en ✏️ para editar
- Click en ✓/○ para activar/desactivar
- El orden afecta cómo aparecen en las listas

### Pestaña: IMPRESIÓN

**Configurar impresora térmica ESC/POS:**
- URL de la impresora (IP o localhost)
- Ancho del ticket (58mm o 80mm)
- Impresión automática al finalizar venta

**Probar impresora:**
- Botón **"Probar Impresora"** envía ticket de prueba

### Pestaña: BACKUP

**Estadísticas del sistema:**
- 📊 Cantidad de ventas
- 📦 Productos en catálogo
- 🎫 Vales emitidos
- 💸 Gastos registrados
- 🔄 Última sincronización

**Exportar backup:**
1. Click en **"Exportar Backup"**
2. Se descarga archivo JSON con toda la base de datos
3. Formato: `solyverdepos-backup-YYYY-MM-DD.json`

> **Recomendación**: Exportar backup diariamente como medida de seguridad

---

## 🔄 Sincronización con Google Sheets

El sistema sincroniza automáticamente con Google Sheets para:
- 📊 Reportes centralizados
- 💾 Backup en la nube
- 📈 Análisis de datos

### Estados de Sincronización

**🟢 Sincronizado**: Datos enviados correctamente
**🟡 Pendiente**: En cola de sincronización
**🔴 Error**: Falló el envío (se reintenta automáticamente)

### Configurar Sincronización

1. **Crear Google Sheet** siguiendo la estructura del archivo `Code.gs`
2. **Desplegar como Web App** el script de Google Apps
3. Copiar la **URL del Web App**
4. En Configuración → General → Pegar URL
5. Activar **"Sincronización automática"**
6. Configurar intervalo (recomendado: 5 minutos)

### Sincronización Manual

Si hay problemas de conexión:
1. Los datos se guardan **localmente (offline-first)**
2. Se acumulan en la **cola de sincronización**
3. Cuando se recupera conexión → Se sincronizan automáticamente
4. O forzar sync manual: Configuración → **"Sincronizar Ahora"**

---

## 🛡️ Persistencia "Bunker-Level"

### Características de Seguridad

✅ **Datos 100% offline**: Todo funciona sin internet
✅ **IndexedDB**: Base de datos persistente en el navegador
✅ **Auto-guardado**: El carrito se guarda automáticamente
✅ **Recuperación ante fallos**: Si la app se cierra, los datos permanecen
✅ **PWA Instalable**: Funciona como app nativa

### Recuperación de Datos

**Si se cierra el navegador accidentalmente:**
1. Reabrir la aplicación
2. El sistema **restaura automáticamente**:
   - ✅ Carrito con productos
   - ✅ Sesión activa
   - ✅ Turno en curso
   - ✅ Ventas pendientes de sincronización

**Si hay error en el navegador:**
1. El ErrorBoundary captura el fallo
2. Opción de **"Descargar Backup de Emergencia"**
3. Los datos se exportan antes de reiniciar

---

## ⌨️ Atajos de Teclado

### Generales
- `Esc` - Cerrar modal activo
- `F1` - Abrir configuración
- `/` - Enfocar barra de búsqueda

### Durante Venta
- `Enter` - Proceder a cobrar (si hay productos)
- `Delete` - Limpiar carrito (con confirmación)
- `+` / `-` - Ajustar cantidad del último producto

### En Modales
- `Enter` - Confirmar acción
- `Esc` - Cancelar/Cerrar

---

## 📱 Uso en Tablet/Móvil

### Instalación como PWA

**Android/iOS:**
1. Abrir en Chrome/Safari
2. Menú → **"Agregar a pantalla de inicio"**
3. La app se instala como aplicación nativa
4. Icon en el escritorio

**Características PWA:**
- 🚀 Inicio rápido
- 📶 Funciona offline
- 🔔 Sin distracciones (modo fullscreen)
- 🔄 Actualización automática en segundo plano

### Orientación Recomendada

- **Tablet**: Horizontal (landscape) para mejor UX
- **Teléfono**: Vertical funciona, pero es preferible tablet

---

## 🆘 Solución de Problemas

### "No puedo iniciar sesión"
- ✅ Verificar que el PIN sea de 4 dígitos
- ✅ Consultar con administrador si olvidó el PIN
- ✅ Revisar que el usuario esté activo en la base de datos

### "El carrito se vació solo"
- ⚠️ Revisar si se presionó **"Limpiar Carrito"** accidentalmente
- ✅ El carrito se guarda automáticamente, no se pierde al cerrar navegador

### "No sincroniza con Google Sheets"
1. Verificar conexión a internet
2. Revisar URL del script en Configuración
3. Verificar que el Web App esté públicamente accesible
4. Ver cola de sincronización en Configuración
5. Los datos quedan guardados localmente y se sincronizan luego

### "La impresora no funciona"
1. Verificar que esté encendida y conectada
2. Probar URL de la impresora (ping)
3. Revisar configuración en Pestaña Impresión
4. Usar botón **"Probar Impresora"**
5. Los tickets se pueden imprimir manualmente después

### "Diferencia en el cierre de caja"
1. Revisar conteo de billetes cuidadosamente
2. Verificar si todos los gastos fueron registrados
3. Revisar lista de ventas del turno
4. Justificar la diferencia en el campo correspondiente
5. Consultar con supervisor si la diferencia es muy grande

### "El sistema se puso lento"
1. Cerrar tabs del navegador innecesarias
2. Limpiar caché del navegador
3. Exportar backup y vaciar datos antiguos (solo admin)
4. Reiniciar el navegador

---

## 📞 Soporte

Para consultas técnicas:
- Revisar esta guía primero
- Consultar con el administrador del sistema
- Exportar backup antes de reportar problemas graves

---

## 🔐 Buenas Prácticas

✅ **Hacer cierre de caja diario** - No acumular turnos
✅ **Exportar backup semanal** - Medida de seguridad
✅ **Verificar sincronización** - Especialmente después de ventas grandes
✅ **Contar billetes con cuidado** - Evita diferencias en cierre
✅ **Registrar gastos inmediatamente** - No olvidar ninguno
✅ **Imprimir tickets** - Para cliente y para archivo
✅ **No compartir PINs** - Cada vendedor con su propio acceso
✅ **Cerrar sesión al terminar** - Seguridad del sistema

---

## 📊 Flujo de Trabajo Típico

```
1. 🔓 Login con PIN
   ↓
2. 💼 Iniciar Turno (fondo inicial)
   ↓
3. 🛒 Realizar Ventas
   ├── Agregar productos
   ├── Manejar envases
   ├── Aplicar vales
   ├── Cobrar (múltiples métodos)
   └── Imprimir ticket
   ↓
4. 📝 Registrar Gastos (durante el día)
   ↓
5. 🔒 Cierre de Caja (fin del turno)
   ├── Conteo de billetes
   ├── Verificar diferencias
   ├── Justificar si es necesario
   └── Confirmar cierre
   ↓
6. 🔄 Sincronización automática
   ↓
7. 🚪 Cerrar Sesión
```

---

## 🎯 Casos de Uso Especiales

### Venta con Múltiples Envases
```
Cliente compra:
- 10kg Tomate → Cajón madera ($15,000 seña)
- 5kg Papa → Bolsa ($2,000 seña)
- Devuelve 3 cajones vacíos → -$45,000

Total = Productos + Envases nuevos - Devoluciones
```

### Pago Híbrido con Vale
```
Total: $800,000
1. Vale SYV-1234-5678 → $300,000
2. Transferencia → $300,000
3. Efectivo → $200,000
= $800,000 ✅
```

### Cliente sin Cambio (Generar Vale)
```
Total: $120,000
Cliente paga: $1,000,000
Vuelto: $880,000

Opción 1: Dar todo en efectivo
Opción 2: Dar $100,000 efectivo + Vale por $780,000
```

---

## 📚 Glosario

- **CUI**: Código Único de Identificación del vale
- **Seña**: Depósito por envase retornable
- **PWA**: Progressive Web App (aplicación web progresiva)
- **Bunker-Level**: Máxima persistencia de datos
- **IndexedDB**: Base de datos del navegador
- **ESC/POS**: Protocolo de impresoras térmicas
- **Turno**: Jornada de trabajo con apertura y cierre
- **Vale**: Crédito del negocio para compras futuras

---

**¡Sistema listo para usar! 🚀**

*Sol y Verde POS v2.0 - Sistema de punto de venta profesional offline-first*
