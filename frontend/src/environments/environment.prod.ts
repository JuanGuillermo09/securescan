/**
 * ============================================================================
 * ENTORNO DE PRODUCCIÓN
 * ----------------------------------------------------------------------------
 * Angular sustituye este archivo por environment.ts al compilar con la
 * configuración de producción. En la V1 el backend sirve también el frontend,
 * por lo que la API sigue publicándose en el puerto 3000.
 * ============================================================================
 */

export const environment = {
  /** Indica si se ejecuta una compilación de producción. */
  production: true,
  /**
   * URL base de la API REST del backend.
   * Ruta relativa: en producción el propio Express sirve el frontend, así que
   * la API vive en el mismo origen y funciona en cualquier dominio sin cambios.
   */
  apiUrl: '/api'
};
