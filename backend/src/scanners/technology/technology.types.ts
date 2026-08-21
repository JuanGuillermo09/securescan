/**
 * ============================================================================
 * TIPOS DEL ANALIZADOR DE TECNOLOGÍAS
 * ----------------------------------------------------------------------------
 * Estructuras de datos propias de la detección de tecnologías (RF-011,
 * HU-006) y su relación con vulnerabilidades conocidas (RF-013).
 * ============================================================================
 */

import { Confidence } from '../../shared/types/common.types';
import { KnownVulnerabilityMatch } from '../../standards/standards.types';

/** Tecnología identificada en el objetivo. */
export interface DetectedTechnology {
  /** Nombre normalizado (Nginx, WordPress, jQuery...). */
  name: string;
  /** Versión detectada cuando fue posible identificarla. */
  version?: string;
  /** Categoría: Servidor web, CMS, Framework, Librería, etc. */
  category: string;
  /** Confianza de la detección según la fuente. */
  confidence: Confidence;
  /** Fuente(s) de la detección: header, cookie o html. */
  source: string;
}

/** Datos estructurados que el analizador expone al dashboard. */
export interface TechnologyData {
  technologies: DetectedTechnology[];
  /** Vulnerabilidades conocidas asociadas a las tecnologías detectadas. */
  knownVulnerabilities: KnownVulnerabilityMatch[];
}

/** Entrada que el analizador necesita para detectar tecnologías. */
export interface TechnologyAnalysisInput {
  /** Cabeceras HTTP normalizadas (Server, X-Powered-By...). */
  headers: Record<string, string>;
  /** Nombres de cookies recibidas. */
  setCookieNames: string[];
  /** Cuerpo HTML de la página principal. */
  body: string;
}
