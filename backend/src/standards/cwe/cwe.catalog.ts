/**
 * ============================================================================
 * CATÁLOGO CWE
 * ----------------------------------------------------------------------------
 * Identificadores CWE (Common Weakness Enumeration) usados para clasificar
 * las debilidades de software asociadas a cada hallazgo (RF-020).
 * ============================================================================
 */

export const CWE = {
  /** Configuración incorrecta genérica. */
  CWE_16: 'CWE-16: Configuration',
  /** Exposición de información sensible. */
  CWE_200: 'CWE-200: Exposure of Sensitive Information',
  /** Transmisión de información sensible en texto claro. */
  CWE_319: 'CWE-319: Cleartext Transmission of Sensitive Information',
  /** Fortaleza criptográfica insuficiente. */
  CWE_326: 'CWE-326: Inadequate Encryption Strength',
  /** Uso de caché que contiene información sensible. */
  CWE_524: 'CWE-524: Use of Cache Containing Sensitive Information',
  /** Cookie sensible en sesión HTTPS sin atributo Secure. */
  CWE_614: "CWE-614: Sensitive Cookie in HTTPS Session Without 'Secure' Attribute",
  /** Fallo del mecanismo de protección. */
  CWE_693: 'CWE-693: Protection Mechanism Failure',
  /** Cookie sensible sin atributo HttpOnly. */
  CWE_1004: "CWE-1004: Sensitive Cookie Without 'HttpOnly' Flag",
  /** Restricción incorrecta de capas de UI renderizadas (clickjacking). */
  CWE_1021: 'CWE-1021: Improper Restriction of Rendered UI Layers or Frames',
  /** Uso de componentes de terceros sin mantenimiento. */
  CWE_1104: 'CWE-1104: Use of Unmaintained Third Party Components'
} as const;
