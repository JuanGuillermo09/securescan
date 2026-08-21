/**
 * ============================================================================
 * CALCULADORA DE RIESGO
 * ----------------------------------------------------------------------------
 * Orquesta las calculadoras individuales (severidades + score) y agrega la
 * nota cualitativa para producir la evaluación completa de una auditoría.
 * ============================================================================
 */

import { FindingDraft } from '../modules/findings/findings.types';
import { countBySeverity } from './severity.calculator';
import { calculateScore } from './score.calculator';
import { gradeFor } from './rules/severity.rules';
import { RiskAssessment } from './risk.types';

/**
 * Evalúa el riesgo global a partir de los hallazgos de una auditoría.
 *
 * @param findings Hallazgos estructurados ya ordenados o sin ordenar.
 */
export function assessRisk(findings: FindingDraft[]): RiskAssessment {
  const counts = countBySeverity(findings);
  const score = calculateScore(findings);

  return { score, grade: gradeFor(score), counts };
}
