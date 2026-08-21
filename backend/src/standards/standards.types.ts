/**
 * ============================================================================
 * TIPOS DE LA CAPA DE ESTÁNDARES
 * ----------------------------------------------------------------------------
 * Contratos compartidos entre los catálogos de estándares (OWASP, CWE, CVE,
 * ISO/IEC) y los hallazgos que los referencian (RF-019 a RF-022).
 * ============================================================================
 */

import { Confidence, Severity } from '../shared/types/common.types';

/**
 * Referencias técnicas asociadas a un hallazgo.
 * Cada colección es de solo lectura porque los catálogos son inmutables.
 */
export interface StandardReferences {
  /** Categorías OWASP relacionadas (por ejemplo, OWASP Top 10 2021). */
  owasp?: readonly string[];
  /** Debilidades CWE relacionadas. */
  cwe?: readonly string[];
  /** Vulnerabilidades CVE conocidas cuando exista correspondencia válida. */
  cve?: readonly string[];
  /** Controles/prácticas ISO/IEC 27001 y 27002 técnicamente justificables. */
  iso?: readonly string[];
}

/**
 * Entrada del dataset curado de vulnerabilidades conocidas (CVE).
 * La coincidencia se basa en versiones declaradas públicamente por el
 * objetivo, por lo que los resultados deben validarse manualmente.
 */
export interface KnownVulnerability {
  /** Identificador CVE. */
  cve: string;
  /** Nombre normalizado de la tecnología afectada. */
  technology: string;
  /** Severidad asignada a la vulnerabilidad. */
  severity: Severity;
  /** Descripción técnica breve. */
  description: string;
  /** Referencia oficial para consulta. */
  reference: string;
  /** Predicado: ¿la versión detectada está afectada? */
  affects: (version: string) => boolean;
}

/** Resultado de una búsqueda de vulnerabilidades conocidas para una tecnología. */
export interface KnownVulnerabilityMatch extends Omit<KnownVulnerability, 'affects'> {
  /** Versión detectada que disparó la coincidencia. */
  version?: string;
}

/** Nivel de confianza re-exportado por conveniencia para los catálogos. */
export type { Confidence, Severity };
