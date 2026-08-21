/**
 * ============================================================================
 * TIPOS DEL MÓDULO DE AUDITORÍAS
 * ----------------------------------------------------------------------------
 * DTOs expuestos por la API de auditorías (RF-004, RF-023, RF-028).
 * ============================================================================
 */

import { AuditStatus } from '../../shared/types/common.types';

/** Conteo de hallazgos por severidad para resúmenes y dashboards. */
export interface AuditCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
}

/** Resumen de auditoría: versión ligera usada en listados y respuestas de creación. */
export interface AuditSummaryDto {
  id: string;
  url: string;
  domain: string;
  status: AuditStatus;
  startedAt: Date;
  finishedAt: Date | null;
  score: number | null;
  grade: string | null;
  counts: AuditCounts;
  /// `true` si es la auditoría de ejemplo entregada al registrarse
  /// (no eliminable, RF-029).
  isExample: boolean;
}

/** Detalle completo de una auditoría incluyendo hallazgos y datos crudos. */
export interface AuditDetailDto extends AuditSummaryDto {
  /** Tecnologías detectadas (JSON persistido por el analizador). */
  technologies: unknown[];
  /** Errores parciales por analizador (RF-032). */
  analyzerErrors: Array<{ analyzer: string; error: string }>;
  /** Resultados crudos por analizador para trazabilidad. */
  rawResults: Record<string, unknown>;
  /** Mensaje seguro cuando la auditoría falló (RF-031). */
  errorMessage: string | null;
  findings: import('../findings/findings.types').FindingDto[];
}
