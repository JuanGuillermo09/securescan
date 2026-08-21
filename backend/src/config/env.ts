/**
 * ============================================================================
 * CONFIGURACIÓN DE ENTORNO
 * ----------------------------------------------------------------------------
 * Centraliza la lectura de variables de entorno con valores por defecto
 * seguros. Ningún módulo debe leer process.env directamente: todo pasa por
 * este archivo (mantenibilidad, RNF-011).
 * ============================================================================
 */

/**
 * Convierte un valor de entorno en número positivo.
 *
 * @param value    Valor crudo de process.env (puede ser undefined).
 * @param fallback Valor por defecto cuando falta o es inválido.
 */
function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Configuración global inmutable de la aplicación. */
export const env = {
  /** Puerto HTTP donde escucha el backend. */
  port: num(process.env.PORT, 3000),

  /** URL de conexión a la base de datos (SQLite por defecto). */
  databaseUrl: process.env.DATABASE_URL ?? 'file:./dev.db',

  /** Ventana del rate limiter en milisegundos (RNF-006). */
  rateLimitWindowMs: num(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),

  /** Máximo de auditorías iniciadas por ventana de tiempo (RNF-006). */
  rateLimitMax: num(process.env.RATE_LIMIT_MAX, 20),

  /**
   * Máximo de consultas de lectura por ventana de tiempo. Es mucho más
   * amplio que rateLimitMax porque listar el historial o ver un detalle
   * son operaciones baratas y el frontend las repite en cada recarga.
   */
  rateLimitReadMax: num(process.env.RATE_LIMIT_READ_MAX, 300),

  /** Timeout de cada solicitud HTTP/TLS contra el objetivo, en ms. */
  scanTimeoutMs: num(process.env.SCAN_TIMEOUT_MS, 10000),

  /** User-Agent identificable enviado en todas las solicitudes (RNF-025). */
  userAgent: 'SecureScanWeb/1.0 (+security assessment; authorized use only)',

  /**
   * Secreto de firma de los tokens JWT. En producción DEBE definirse vía
   * variable de entorno; el valor por defecto existe solo para desarrollo.
   */
  jwtSecret: process.env.JWT_SECRET ?? 'securescan-dev-secret-change-me',

  /** Vigencia del token de sesión, en segundos (por defecto 7 días). */
  jwtExpiresInSeconds: num(process.env.JWT_EXPIRES_SECONDS, 7 * 24 * 60 * 60)
};
