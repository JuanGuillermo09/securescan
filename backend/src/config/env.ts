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

/**
 * Convierte un valor de entorno en número no negativo.
 * Se usa para opciones donde 0 es un valor válido y significativo
 * (por ejemplo, desactivar el pool de hilos o el trust proxy).
 *
 * @param value    Valor crudo de process.env (puede ser undefined).
 * @param fallback Valor por defecto cuando falta o es inválido.
 */
function numOrZero(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/**
 * Interpreta un booleano de entorno de forma tolerante.
 * Acepta "1", "true" y "yes" como verdadero; cualquier otro valor es falso.
 *
 * @param value Valor crudo de process.env.
 */
function bool(value: string | undefined): boolean {
  return ['1', 'true', 'yes'].includes(String(value ?? '').toLowerCase());
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
  jwtExpiresInSeconds: num(process.env.JWT_EXPIRES_SECONDS, 7 * 24 * 60 * 60),

  // -------------------------------------------------------------------------
  // Modo distribuido (opcional). Todos los valores tienen un valor por
  // defecto que mantiene intacto el modo simple de un solo proceso.
  // -------------------------------------------------------------------------

  /** Identificador lógico del nodo; se expone en X-Node-Id. */
  nodeId: process.env.NODE_ID ?? 'local',

  /**
   * Activa la cola de trabajos persistida en PostgreSQL.
   * Con false (por defecto) la auditoría se ejecuta en el mismo proceso,
   * exactamente como en la V1.
   */
  queueMode: bool(process.env.QUEUE_MODE),

  /** Auditorías simultáneas que puede procesar este nodo. */
  jobConcurrency: num(process.env.JOB_CONCURRENCY, 2),

  /** Intervalo de sondeo de la cola, en milisegundos. */
  jobPollMs: num(process.env.JOB_POLL_MS, 1000),

  /** Intervalo de latido de un trabajo en ejecución, en milisegundos. */
  jobHeartbeatMs: num(process.env.JOB_HEARTBEAT_MS, 5000),

  /** Segundos sin latido tras los que un trabajo RUNNING se considera huérfano. */
  jobStaleSeconds: num(process.env.JOB_STALE_SECONDS, 30),

  /** Número de proxies de confianza para X-Forwarded-For (0 = desactivado). */
  trustProxy: numOrZero(process.env.TRUST_PROXY, 0),

  /**
   * Tamaño del pool de hilos para analizadores.
   * 0 (por defecto) desactiva el pool y ejecuta en el hilo principal.
   */
  analyzerPoolSize: numOrZero(process.env.ANALYZER_POOL_SIZE, 0),

  /** Timeout máximo por analizador ejecutado en un hilo, en milisegundos. */
  analyzerTimeoutMs: num(process.env.ANALYZER_TIMEOUT_MS, 5000),

  /**
   * Nombre de un analizador que debe fallar a propósito.
   * Solo se usa en pruebas de robustez (E7); vacío = desactivado.
   */
  failAnalyzer: process.env.FAIL_ANALYZER ?? '',

  /**
   * Permite desactivar la auditoría de ejemplo de example.com.
   * En las pruebas distribuidas se desactiva para no generar tráfico
   * externo ni auditorías ajenas al objetivo simulado.
   */
  exampleAuditEnabled: !['0', 'false', 'no'].includes(
    String(process.env.EXAMPLE_AUDIT_ENABLED ?? 'true').toLowerCase()
  )
};
