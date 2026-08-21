/**
 * ============================================================================
 * REGLAS DE SEVERIDAD
 * ----------------------------------------------------------------------------
 * Umbrales de conversión entre score numérico y nota cualitativa, y rangos
 * de ordenamiento por riesgo (RF-015, RF-017).
 * ============================================================================
 */

import { Confidence, Severity } from '../../shared/types/common.types';
import { CONFIDENCE_ORDER, SEVERITY_ORDER } from '../../shared/constants/app.constants';

/** Nota cualitativa del Security Score. */
export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

/** Umbrales mínimos (inclusive) para obtener cada nota. */
export const GRADE_THRESHOLDS: Array<{ min: number; grade: Grade }> = [
  { min: 90, grade: 'A' },
  { min: 75, grade: 'B' },
  { min: 60, grade: 'C' },
  { min: 40, grade: 'D' },
  { min: 0, grade: 'F' }
];

/**
 * Convierte un score numérico (0-100) en su nota cualitativa.
 *
 * @param score Puntaje calculado del objetivo.
 */
export function gradeFor(score: number): Grade {
  for (const threshold of GRADE_THRESHOLDS) {
    if (score >= threshold.min) {
      return threshold.grade;
    }
  }
  return 'F';
}

/**
 * Compara dos severidades según su orden canónico de riesgo.
 *
 * @returns Negativo si `a` es más grave que `b`; positivo si es menos grave;
 *          cero si son equivalentes.
 */
export function compareSeverity(a: Severity, b: Severity): number {
  return SEVERITY_ORDER[a] - SEVERITY_ORDER[b];
}

/**
 * Compara dos niveles de confianza (mayor confianza primero).
 */
export function compareConfidence(a: Confidence, b: Confidence): number {
  return CONFIDENCE_ORDER[a] - CONFIDENCE_ORDER[b];
}
