/**
 * ============================================================================
 * TIPOS DEL MOTOR DE RIESGOS
 * ----------------------------------------------------------------------------
 * Contratos de salida del motor: evaluación global de una auditoría
 * (RF-018) y hallazgos con identificador asignado (RF-014).
 * ============================================================================
 */

import { FindingDraft } from '../modules/findings/findings.types';
import { Severity } from '../shared/types/common.types';
import { Grade } from './rules/severity.rules';
import { FindingRisk } from './finding-risk.calculator';

/** Evaluación de riesgo completa de una auditoría. */
export interface RiskAssessment {
  /** Security Score final entre 0 y 100. */
  score: number;
  /** Nota cualitativa derivada del score. */
  grade: Grade;
  /** Cantidad de hallazgos por severidad. */
  counts: Record<Severity, number>;
}

/** Hallazgo estructurado con ID público SEC-xxx y riesgo cuantificado. */
export interface ScoredFinding extends FindingDraft, FindingRisk {
  refId: string;
}
