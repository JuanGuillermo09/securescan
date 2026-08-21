/**
 * ============================================================================
 * TIPOS DEL MÓDULO DE TECNOLOGÍAS
 * ----------------------------------------------------------------------------
 * DTO expuesto por /api/technologies para las tecnologías detectadas (RF-011).
 * ============================================================================
 */

/** Nivel de confianza de una detección de tecnología. */
export type TechnologyConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Tecnología detectada durante el análisis de una auditoría.
 */
export interface DetectedTechnologyDto {
  /** Nombre comercial de la tecnología (p. ej. "Cloudflare"). */
  name: string;
  /** Versión detectada si fue posible determinarla. */
  version?: string;
  /** Categoría funcional (CDN, servidor web, framework...). */
  category: string;
  /** Confianza de la detección. */
  confidence: TechnologyConfidence;
  /** Analizador o evidencia que originó la detección. */
  source: string;
}
