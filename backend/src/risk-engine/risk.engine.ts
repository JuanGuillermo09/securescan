/**
 * ============================================================================
 * MOTOR DE RIESGOS (FACHADA PÚBLICA)
 * ----------------------------------------------------------------------------
 * API principal del risk-engine. El resto de la aplicación solo consume
 * este archivo, nunca las calculadoras internas (RNF-012: separación de
 * responsabilidades).
 *
 * Responsabilidades:
 *   - calculateRisk: evaluación completa (score + nota + conteos).
 *   - sortByRisk: ordenamiento de hallazgos de mayor a menor riesgo.
 * ============================================================================
 */

import { FindingDraft } from '../modules/findings/findings.types';
import { assessRisk } from './risk.calculator';
import { calculateFindingRisk } from './finding-risk.calculator';
import { compareConfidence, compareSeverity } from './rules/severity.rules';
import { RiskAssessment } from './risk.types';

// Re-exportaciones públicas del motor: el resto de la aplicación consume
// los pesos y desgloses sin acceder a los archivos internos (RNF-012).
export { SEVERITY_DEDUCTIONS } from './rules/risk.rules';
export { calculateFindingRisk } from './finding-risk.calculator';
export type { FindingRisk } from './finding-risk.calculator';

/**
 * Calcula la evaluación de riesgo completa para un conjunto de hallazgos.
 *
 * @param findings Hallazgos estructurados de la auditoría.
 */
export function calculateRisk(findings: FindingDraft[]): RiskAssessment {
  return assessRisk(findings);
}

/**
 * Ordena los hallazgos desde el mayor riesgo al menor (RF-017).
 * Criterio primario: severidad. Criterio secundario: confianza.
 *
 * @param findings Hallazgos sin orden específico.
 * @returns Nueva lista ordenada (no muta la original).
 */
export function sortByRisk(findings: FindingDraft[]): FindingDraft[] {
  return [...findings].sort((a, b) => {
    const severityDiff = compareSeverity(a.severity, b.severity);
    if (severityDiff !== 0) return severityDiff;
    return compareConfidence(a.confidence, b.confidence);
  });
}
