/**
 * ============================================================================
 * TIPOS COMUNES DEL DOMINIO
 * ----------------------------------------------------------------------------
 * Tipos base compartidos por todos los módulos del sistema: analizadores,
 * motor de riesgos, hallazgos y API.
 * ============================================================================
 */

/**
 * Niveles de severidad de un hallazgo (RF-015).
 */
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';

/**
 * Niveles de confianza de una detección (RF-016).
 * Diferencian la gravedad del hallazgo de la certeza de su detección (RNF-026).
 */
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Estados posibles del ciclo de vida de una auditoría (RF-006).
 */
export type AuditStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
