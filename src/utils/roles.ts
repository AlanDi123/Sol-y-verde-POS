// ========================================
// UTILIDADES DE ROLES Y PERMISOS
// ========================================

import type { RolVendedor, PermisosVendedor } from '../types';

/**
 * Define los permisos por defecto para cada rol
 */
export function obtenerPermisosPorRol(rol: RolVendedor): PermisosVendedor {
  switch (rol) {
    case 'dueno':
      // El dueño tiene acceso completo a todo
      return {
        // Ventas
        puedeRegistrarVentas: true,
        puedeEditarVentas: true,
        puedeAnularVentas: true,
        puedeModificarPrecios: true,
        puedeAplicarDescuentos: true,
        
        // Caja
        puedeHacerCierres: true,
        puedeEditarCierresCerrados: true,
        puedeIngresarGastos: true,
        puedeIngresarMovimientos: true,
        
        // Administración
        puedeVerReportes: true,
        puedeEditarProductos: true,
        puedeEditarConfig: true,
        puedeGestionarUsuarios: true,
        
        // Notificaciones
        puedeNotificarErrores: true,
        puedeMarcarProblemasVentas: true,
      };
      
    case 'vendedor':
      // El vendedor puede operar el POS y cerrar su propia caja
      return {
        // Ventas
        puedeRegistrarVentas: true,
        puedeEditarVentas: true, // Puede editar/borrar sus ventas
        puedeAnularVentas: true,
        puedeModificarPrecios: true,
        puedeAplicarDescuentos: true,
        
        // Caja
        puedeHacerCierres: true, // Solo SU caja
        puedeEditarCierresCerrados: false,
        puedeIngresarGastos: true,
        puedeIngresarMovimientos: true, // Movimientos nocturnos
        
        // Administración
        puedeVerReportes: false,
        puedeEditarProductos: false,
        puedeEditarConfig: false,
        puedeGestionarUsuarios: false,
        
        // Notificaciones
        puedeNotificarErrores: false,
        puedeMarcarProblemasVentas: false,
      };
      
    case 'administrativo':
      // El administrativo solo ve y reporta, no opera el POS
      return {
        // Ventas
        puedeRegistrarVentas: false,
        puedeEditarVentas: false,
        puedeAnularVentas: false,
        puedeModificarPrecios: false,
        puedeAplicarDescuentos: false,
        
        // Caja
        puedeHacerCierres: false,
        puedeEditarCierresCerrados: false,
        puedeIngresarGastos: false,
        puedeIngresarMovimientos: false,
        
        // Administración
        puedeVerReportes: true, // Puede ver todo
        puedeEditarProductos: false,
        puedeEditarConfig: false,
        puedeGestionarUsuarios: false,
        
        // Notificaciones
        puedeNotificarErrores: true, // Puede notificar errores
        puedeMarcarProblemasVentas: true, // Puede marcar problemas
      };
      
    default:
      // Sin permisos por defecto
      return {
        puedeRegistrarVentas: false,
        puedeEditarVentas: false,
        puedeAnularVentas: false,
        puedeModificarPrecios: false,
        puedeAplicarDescuentos: false,
        puedeHacerCierres: false,
        puedeEditarCierresCerrados: false,
        puedeIngresarGastos: false,
        puedeIngresarMovimientos: false,
        puedeVerReportes: false,
        puedeEditarProductos: false,
        puedeEditarConfig: false,
        puedeGestionarUsuarios: false,
        puedeNotificarErrores: false,
        puedeMarcarProblemasVentas: false,
      };
  }
}

/**
 * Obtiene el nombre legible de un rol
 */
export function obtenerNombreRol(rol: RolVendedor): string {
  const nombres: Record<RolVendedor, string> = {
    dueno: 'Dueño',
    vendedor: 'Vendedor',
    administrativo: 'Administrativo',
  };
  return nombres[rol] || 'Sin rol';
}

/**
 * Obtiene la descripción de un rol
 */
export function obtenerDescripcionRol(rol: RolVendedor): string {
  const descripciones: Record<RolVendedor, string> = {
    dueno: 'Acceso completo a todas las funciones del sistema',
    vendedor: 'Opera el POS, registra ventas y cierra su propia caja',
    administrativo: 'Solo lectura: ve reportes y puede notificar errores',
  };
  return descripciones[rol] || '';
}

/**
 * Verifica si un vendedor tiene un permiso específico
 */
export function tienePermiso(
  permisos: PermisosVendedor,
  nombrePermiso: keyof PermisosVendedor
): boolean {
  return permisos[nombrePermiso] === true;
}

/**
 * Verifica si es un rol de administrador (dueño)
 */
export function esAdministrador(rol: RolVendedor): boolean {
  return rol === 'dueno';
}

/**
 * Verifica si puede operar el POS
 */
export function puedeOperarPOS(rol: RolVendedor): boolean {
  return rol === 'dueno' || rol === 'vendedor';
}

/**
 * Verifica si solo tiene acceso de lectura
 */
export function esSoloLectura(rol: RolVendedor): boolean {
  return rol === 'administrativo';
}

/**
 * Obtiene el color asociado a un rol (para UI)
 */
export function obtenerColorRol(rol: RolVendedor): string {
  const colores: Record<RolVendedor, string> = {
    dueno: '#2E7D32', // Verde oscuro
    vendedor: '#00ACC1', // Cyan
    administrativo: '#FF6F00', // Naranja
  };
  return colores[rol] || '#666666';
}
