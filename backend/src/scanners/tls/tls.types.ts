/**
 * ============================================================================
 * TIPOS DEL ANALIZADOR TLS
 * ----------------------------------------------------------------------------
 * Estructuras de datos propias del análisis HTTPS/TLS (RF-007).
 * ============================================================================
 */

/** Información extraída del certificado del servidor. */
export interface TlsCertificate {
  /** Common Name del sujeto del certificado. */
  subject?: string;
  /** Organización emisora. */
  issuer?: string;
  /** Fecha de inicio de validez. */
  validFrom?: string;
  /** Fecha de expiración. */
  validTo?: string;
  /** Días restantes hasta la expiración (negativo si ya venció). */
  daysRemaining?: number;
}

/** Resultado de la conexión TLS con el objetivo. */
export interface TlsInfo {
  /** `true` si se pudo completar el handshake en el puerto 443. */
  available: boolean;
  /** Versión del protocolo negociada (TLSv1.3, TLSv1.2...). */
  protocol?: string;
  /** Nombre del cifrado negociado. */
  cipher?: string;
  /** ¿El certificado pasó la validación estándar de Node? */
  authorized?: boolean;
  /** Motivo del fallo de validación cuando `authorized` es false. */
  authorizationError?: string;
  certificate?: TlsCertificate;
  /** Error de conexión cuando `available` es false. */
  error?: string;
}

/** Entrada que las reglas TLS necesitan para evaluar hallazgos. */
export interface TlsAnalysisInput {
  isHttpsTarget: boolean;
  domain: string;
  /** ¿La página principal respondió correctamente? */
  pageFetchedOk: boolean;
  /** ¿http://host redirige automáticamente a https://? */
  plainHttpRedirectsToHttps: boolean;
  tls: TlsInfo | null;
}

/** Datos estructurados que este analizador expone al dashboard. */
export interface TlsScannerData {
  tls: TlsInfo | null;
}
