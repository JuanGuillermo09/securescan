/**
 * ============================================================================
 * ENTORNO DE DESARROLLO
 * ----------------------------------------------------------------------------
 * Valores usados cuando se sirve la app con `ng serve`.
 * `apiUrl` apunta al backend Express local (puerto 3000).
 * ============================================================================
 */

export const environment = {
  /** Indica si se ejecuta una compilación de producción. */
  production: false,
  /** URL base de la API REST del backend. */
  apiUrl: 'http://localhost:3000/api'
};
