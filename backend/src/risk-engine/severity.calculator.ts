/**
 * ============================================================================
 * CALCULADORA DE SEVERIDADES
 * ----------------------------------------------------------------------------
 * Contabiliza los hallazgos por nivel de severidad para el dashboard y el
 * informe PDF (RF-023).
 * ============================================================================
 */

import { FindingDraft } from '../modules/findings/findings.types';
import { Severity } from '../shared/types/common.types';

/**
 * Cuenta cuántos hallazgos hay en cada nivel de severidad.
 *
 * @param findings Hallazgos estructurados de la auditoría.
 */
export function countBySeverity(findings: FindingDraft[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    CRITICAL: 0,
    HIGH: 0,
    MEDIUM: 0,
    LOW: 0,
    INFORMATIONAL: 0
  };

  for (const finding of findings) {
    counts[finding.severity] += 1;
  }

  return counts;
}
