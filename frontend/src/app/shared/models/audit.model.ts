/**
 * ============================================================================
 * MODELO DE DOMINIO: AUDITORÍAS Y HALLAZGOS
 * ----------------------------------------------------------------------------
 * Espejo en TypeScript de los DTOs que expone la API del backend
 * (modules/audits/audits.types.ts y modules/findings/findings.types.ts).
 * Consumido por los componentes y por api.service.ts.
 * ============================================================================
 */

/** Niveles de severidad de un hallazgo (de mayor a menor gravedad). */
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFORMATIONAL';

/** Nivel de confianza del analizador sobre el hallazgo detectado. */
export type Confidence = 'HIGH' | 'MEDIUM' | 'LOW';

/** Ciclo de vida de una auditoría (RF-006). */
export type AuditStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

/**
 * Conteo de hallazgos por severidad.
 * El backend lo persiste junto a la auditoría para dashboards rápidos.
 */
export interface AuditCounts {
  critical: number;
  high: number;
  medium: number;
  low: number;
  informational: number;
}

/**
 * Resumen de auditoría: versión ligera usada en el historial y como
 * respuesta inmediata al crear una auditoría (RF-004, RF-029).
 */
export interface AuditSummary {
  id: string;
  url: string;
  domain: string;
  status: AuditStatus;
  startedAt: string;
  finishedAt: string | null;
  score: number | null;
  grade: string | null;
  counts: AuditCounts;
  /// `true` si es la auditoría de ejemplo entregada al registrarse:
  /// no se puede borrar ni individual ni masivamente.
  isExample: boolean;
}

/**
 * Hallazgo individual con referencias a estándares (OWASP, CWE, CVE, ISO)
 * (RF-014 a RF-016, RF-019 a RF-022).
 */
export interface Finding {
  /** Identificador público asignado tras ordenar por riesgo (SEC-001...). */
  refId: string;
  title: string;
  category: string;
  severity: Severity;
  confidence: Confidence;
  description: string;
  evidence: string;
  impact: string;
  recommendation: string;
  references: {
    owasp: string[];
    cwe: string[];
    cve: string[];
    iso: string[];
  };
}

/**
 * Tecnología detectada durante el análisis (RF-011, HU-006).
 */
export interface DetectedTechnology {
  name: string;
  version?: string;
  category: string;
  confidence: Confidence;
  source: string;
}

/**
 * Detalle completo de una auditoría: resumen + tecnologías + resultados
 * crudos + errores parciales + hallazgos ordenados por riesgo (RF-023).
 */
export interface AuditDetail extends AuditSummary {
  technologies: DetectedTechnology[];
  /** Errores parciales por analizador; la auditoría continúa (RF-032). */
  analyzerErrors: Array<{ analyzer: string; error: string }>;
  rawResults: Record<string, unknown>;
  /** Mensaje seguro cuando la auditoría falló (RF-031). */
  errorMessage: string | null;
  findings: Finding[];
}

/** Etiquetas legibles de severidad mostradas en badges y listas. */
export const SEVERITY_LABELS: Record<Severity, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  INFORMATIONAL: 'Informational'
};

/** Etiquetas legibles de estado mostradas en las insignias. */
export const STATUS_LABELS: Record<AuditStatus, string> = {
  PENDING: 'En espera',
  RUNNING: 'Analizando',
  COMPLETED: 'Completada',
  FAILED: 'Fallida'
};
