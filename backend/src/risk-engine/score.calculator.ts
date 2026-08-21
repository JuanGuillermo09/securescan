/**
 * ============================================================================
 * CALCULADORA DE SCORE
 * ----------------------------------------------------------------------------
 * Convierte los descuentos por severidad en un Security Score final entre
 * 0 y 100 (RF-018). Los pesos de cada severidad viven en rules/risk.rules.ts.
 * ============================================================================
 */

import { FindingDraft } from '../modules/findings/findings.types';
import { Severity } from '../shared/types/common.types';
import { SEVERITY_DEDUCTIONS } from './rules/risk.rules';

/**
 * Calcula el score restando del valor base (100) la suma de descuentos de
 * todos los hallazgos. El resultado se acota al rango [0, 100].
 *
 * @param findings Hallazgos estructurados de la auditoría.
 */
export function calculateScore(findings: FindingDraft[]): number {
  let deduction = 0;

  for (const finding of findings) {
    deduction += SEVERITY_DEDUCTIONS[finding.severity];
  }

  // Nunca menor que 0 ni mayor que 100.
  return Math.max(0, Math.min(100, 100 - deduction));
}
