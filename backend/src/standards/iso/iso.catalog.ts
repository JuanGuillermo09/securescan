/**
 * ============================================================================
 * CATÁLOGO ISO/IEC
 * ----------------------------------------------------------------------------
 * Relación entre hallazgos técnicos y controles/prácticas de ISO/IEC 27001
 * y 27002 cuando existe una relación técnicamente justificable (RF-022).

 * IMPORTANTE: la referencia es puramente técnica. NO constituye una
 * certificación, auditoría formal de cumplimiento ni declaración de
 * incumplimiento de una organización.
 * ============================================================================
 */

export const ISO = {
  /** Uso de criptografía para proteger la información. */
  CRYPTO: [
    'ISO/IEC 27001:2022 A.8.24',
    'ISO/IEC 27002:2022 8.24 (Uso de criptografía)'
  ],
  /** Gestión segura de la configuración. */
  SECURE_CONFIG: [
    'ISO/IEC 27001:2022 A.8.9',
    'ISO/IEC 27002:2022 8.9 (Gestión de la configuración)'
  ],
  /** Gestión de vulnerabilidades técnicas. */
  VULN_MGMT: [
    'ISO/IEC 27001:2022 A.8.8',
    'ISO/IEC 27002:2022 8.8 (Gestión de vulnerabilidades técnicas)'
  ],
  /** Protección de la información frente a divulgación no autorizada. */
  INFO_DISCLOSURE: [
    'ISO/IEC 27001:2022 A.5.34',
    'ISO/IEC 27002:2022 5.34 (Privacidad y protección de la información personal)'
  ],
  /** Requisitos de seguridad en el desarrollo de aplicaciones. */
  WEB_SECURITY: [
    'ISO/IEC 27001:2022 A.8.26',
    'ISO/IEC 27002:2022 8.26 (Requisitos de seguridad de las aplicaciones)'
  ]
} as const;
