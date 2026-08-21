/**
 * ============================================================================
 * CALCULADORA DE RIESGO POR HALLAZGO
 * ----------------------------------------------------------------------------
 * Convierte cada hallazgo en una puntuación cuantitativa transparente:
 *
 *   Risk Score = Impacto × Probabilidad × Exposición   (máx. 5·5·5 = 125)
 *
 * Los tres componentes se derivan de atributos que el hallazgo ya posee:
 *   - Impacto      ← severidad   (¿cuánto daño causaría?)
 *   - Probabilidad ← confianza   (¿qué tan verosímil es la explotación?)
 *   - Exposición   ← categoría   (¿qué tan expuesto está el vector?)
 *
 * Mostrar el desglose evita que el motor de riesgos sea una "caja negra"
 * para el lector del informe.
 * ============================================================================
 */

import { FindingDraft } from '../modules/findings/findings.types';
import { Confidence, Severity } from '../shared/types/common.types';

/** Nivel de impacto (1-5) asignado según la severidad del hallazgo. */
export const IMPACT_BY_SEVERITY: Record<Severity, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  INFORMATIONAL: 1
};

/** Nivel de probabilidad (1-5) asignado según la confianza de la detección. */
export const PROBABILITY_BY_CONFIDENCE: Record<Confidence, number> = {
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2
};

/**
 * Nivel de exposición (1-5) según la categoría del vector:
 * vectores directamente accesibles desde Internet puntúan más alto.
 * La comparación es por prefijo para tolerar variantes de la categoría.
 */
const EXPOSURE_BY_CATEGORY: Array<{ prefix: string; level: number }> = [
  { prefix: 'TLS', level: 5 },
  { prefix: 'Cabeceras', level: 4 },
  { prefix: 'Cookies', level: 4 },
  { prefix: 'Exposición', level: 4 },
  { prefix: 'Protocolo HTTP', level: 3 },
  { prefix: 'Tecnologías', level: 3 }
];

/** Valor intermedio por defecto cuando un atributo no está catalogado. */
const DEFAULT_LEVEL = 3;

/** Exposición por defecto cuando la categoría no está catalogada. */
const DEFAULT_EXPOSURE = DEFAULT_LEVEL;

/** Desglose cuantitativo de riesgo de un hallazgo. */
export interface FindingRisk {
  /** Impacto potencial del problema (1-5). */
  impactLevel: number;
  /** Verosimilitud de explotación según la confianza (1-5). */
  probabilityLevel: number;
  /** Nivel de exposición del vector afectado (1-5). */
  exposureLevel: number;  /** Puntuación final: producto de los tres componentes (1-125). */
  riskScore: number;
}

/**
 * Resuelve el nivel de exposición a partir de la categoría del hallazgo.
 *
 * @param category Categoría funcional (p. ej. "Cabeceras de seguridad").
 */
function exposureFor(category: string): number {
  const match = EXPOSURE_BY_CATEGORY.find((entry) =>
    category.startsWith(entry.prefix)
  );
  return match?.level ?? DEFAULT_EXPOSURE;
}

/**
 * Calcula el desglose de riesgo completo de un hallazgo.
 *
 * Solo necesita los tres atributos de los que se deriva el riesgo, por lo
 * que acepta cualquier objeto que los exponga (borradores completos del
 * motor o filas leídas de la base de datos).
 *
 * @param finding Hallazgo con severidad, confianza y categoría.
 */
export function calculateFindingRisk(
  finding: Pick<FindingDraft, 'severity' | 'confidence' | 'category'>
): FindingRisk {
  const impactLevel = IMPACT_BY_SEVERITY[finding.severity] ?? DEFAULT_LEVEL;
  const probabilityLevel =
    PROBABILITY_BY_CONFIDENCE[finding.confidence] ?? DEFAULT_LEVEL;
  const exposureLevel = exposureFor(finding.category);

  // El producto nunca excede 125 ni baja de 1 por construcción de las tablas.
  const riskScore = Math.min(impactLevel * probabilityLevel * exposureLevel, 125);

  return { impactLevel, probabilityLevel, exposureLevel, riskScore };
}
