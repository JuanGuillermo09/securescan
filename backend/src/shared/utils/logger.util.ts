/**
 * ============================================================================
 * LOGGER
 * ----------------------------------------------------------------------------
 * Registro mínimo de eventos por consola con marca de tiempo y nivel.
 * Cubre el requerimiento de observabilidad (RNF-023) sin dependencias
 * externas. Los errores nunca incluyen secretos ni configuración interna.
 * ============================================================================
 */

/** Niveles de registro soportados. */
type Level = 'INFO' | 'WARN' | 'ERROR';

/**
 * Escribe una línea de log con formato uniforme.
 *
 * @param level  Nivel del evento (INFO, WARN, ERROR).
 * @param message Mensaje descriptivo del evento.
 * @param meta   Objeto opcional serializado como JSON al final de la línea.
 */
function log(level: Level, message: string, meta?: unknown): void {
  const timestamp = new Date().toISOString();
  const suffix = meta !== undefined ? ` ${JSON.stringify(meta)}` : '';
  // eslint-disable-next-line no-console
  console.log(`[${timestamp}] [${level}] ${message}${suffix}`);
}

/**
 * API pública del logger.
 */
export const logger = {
  /** Registra un evento informativo. */
  info: (message: string, meta?: unknown) => log('INFO', message, meta),
  /** Registra una advertencia no fatal. */
  warn: (message: string, meta?: unknown) => log('WARN', message, meta),
  /** Registra un error que requiere atención. */
  error: (message: string, meta?: unknown) => log('ERROR', message, meta)
};
