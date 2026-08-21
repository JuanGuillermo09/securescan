/**
 * ============================================================================
 * CATÁLOGO OWASP
 * ----------------------------------------------------------------------------
 * Categorías de OWASP Top 10 (2021) utilizadas para contextualizar hallazgos
 * (RF-019). Solo se referencian categorías; nunca se afirma incumplimiento
 * formal de ningún estándar.
 * ============================================================================
 */

export const OWASP = {
  /** Control de acceso roto. */
  A01_2021: 'OWASP Top 10 2021 - A01: Broken Access Control',
  /** Fallos criptográficos. */
  A02_2021: 'OWASP Top 10 2021 - A02: Cryptographic Failures',
  /** Configuración de seguridad incorrecta. */
  A05_2021: 'OWASP Top 10 2021 - A05: Security Misconfiguration',
  /** Componentes vulnerables y desactualizados. */
  A06_2021: 'OWASP Top 10 2021 - A06: Vulnerable and Outdated Components',
  /** Fallos de identificación y autenticación. */
  A07_2021: 'OWASP Top 10 2021 - A07: Identification and Authentication Failures'
} as const;
