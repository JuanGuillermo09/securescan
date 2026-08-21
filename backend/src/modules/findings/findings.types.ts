/**
 * ============================================================================
 * TIPOS DEL MÓDULO DE HALLAZGOS
 * ----------------------------------------------------------------------------
 * Define el hallazgo en borrador (producido por los analizadores) y el DTO
 * expuesto por la API (RF-014 a RF-016).
 * ============================================================================
 */

import { Confidence, Severity } from '../../shared/types/common.types';
import { StandardReferences } from '../../standards/standards.types';

/**
 * Hallazgo en borrador generado por una regla de un analizador.
 * Aún no tiene ID público ni posición en el ranking de riesgos.
 */
export interface FindingDraft {
  /** Identificador estable de la regla (clave de deduplicación). */
  key: string;
  title: string;
  category: string;
  severity: Severity;
  confidence: Confidence;
  description: string;
  evidence: string;
  impact: string;
  recommendation: string;
  references: StandardReferences;
}

/** Hallazgo tal como se expone en la API y el informe PDF. */
export interface FindingDto {
  /** Identificador público asignado tras ordenar por riesgo (SEC-001...). */
  refId: string;
  title: string;
  category: string;
  severity: string;
  confidence: string;
  description: string;
  evidence: string;
  impact: string;
  recommendation: string;
  /** Riesgo cuantificado: Impacto × Probabilidad × Exposición (1-125). */
  riskScore: number;
  /** Componente de impacto potencial (1-5). */
  impactLevel: number;
  /** Componente de verosimilitud según confianza (1-5). */
  probabilityLevel: number;
  /** Componente de exposición del vector (1-5). */
  exposureLevel: number;
  references: {
    owasp: string[];
    cwe: string[];
    cve: string[];
    iso: string[];
  };
}
