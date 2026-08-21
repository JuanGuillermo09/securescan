/**
 * ============================================================================
 * SERVICIO DE ESTÁNDARES
 * ----------------------------------------------------------------------------
 * Fachada única sobre los catálogos de estándares (OWASP, CWE, CVE, ISO/IEC).
 * Los analizadores consumen este servicio —no los catálogos directamente—
 * para desacoplar las reglas de detección del contenido de los estándares
 * (RNF-010, RNF-012).
 * ============================================================================
 */

import { OWASP } from './owasp/owasp.catalog';
import { CWE } from './cwe/cwe.catalog';
import { ISO } from './iso/iso.catalog';
import { findKnownVulnerabilities, KNOWN_VULNERABILITIES } from './cve/cve.dataset';
import { KnownVulnerability, StandardReferences } from './standards.types';

/**
 * Servicio de consulta de referencias técnicas.
 */
export const standardsService = {
  /** Catálogo OWASP Top 10 2021. */
  owasp: OWASP,

  /** Catálogo CWE. */
  cwe: CWE,

  /** Catálogo ISO/IEC 27001/27002 (referencia técnica, no certificación). */
  iso: ISO,

  /**
   * Busca vulnerabilidades conocidas (CVE) para una tecnología y versión.
   *
   * @param technology Nombre normalizado de la tecnología.
   * @param version    Versión detectada en el objetivo.
   */
  findKnownVulnerabilities,

  /**
   * Devuelve el dataset completo de vulnerabilidades curadas.
   * Útil para documentación y pruebas.
   */
  listKnownVulnerabilities(): readonly KnownVulnerability[] {
    return KNOWN_VULNERABILITIES;
  },

  /**
   * Construye un objeto de referencias vacío.
   */
  emptyReferences(): StandardReferences {
    return {};
  }
} as const;

/**
 * Aviso legal que debe acompañar a toda referencia ISO/IEC mostrada al
 * usuario (RF-022 / HU-011): la relación es técnica y no constituye
 * certificación ni auditoría formal de cumplimiento.
 */
export const ISO_DISCLAIMER =
  'La relación con ISO/IEC es una referencia técnica y no constituye ' +
  'certificación ni auditoría formal de cumplimiento.';
