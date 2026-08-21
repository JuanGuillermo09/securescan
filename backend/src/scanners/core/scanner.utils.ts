/**
 * ============================================================================
 * UTILIDADES DEL NÚCLEO DE SCANNING
 * ----------------------------------------------------------------------------
 * Helpers reutilizados por todos los analizadores para construir hallazgos
 * de forma uniforme y ejecutar analizadores con tolerancia a fallos.
 * ============================================================================
 */

import { FindingDraft } from '../../modules/findings/findings.types';
import { Confidence, Severity } from '../../shared/types/common.types';
import { StandardReferences } from '../../standards/standards.types';
import { AnalyzerResult, ScanContext } from './scanner.types';

/** Entrada para la fábrica de hallazgos. */
export interface FindingInput {
  /** Identificador estable de la regla (clave de deduplicación). */
  key: string;
  title: string;
  /** Categoría funcional; se deriva del prefijo de `key` si se omite. */
  category?: string;
  severity: Severity;
  confidence: Confidence;
  description: string;
  evidence: string;
  impact: string;
  recommendation: string;
  references: StandardReferences;
}

/**
 * Categorías por defecto según el prefijo identificador de la regla.
 * Permite que las reglas omitan `category` sin perder trazabilidad.
 */
const CATEGORY_BY_PREFIX: Record<string, string> = {
  TLS: 'TLS / Cifrado',
  HDR: 'Cabeceras de seguridad',
  CK: 'Cookies',
  HTTP: 'Protocolo HTTP',
  TECH: 'Tecnologías',
  EXP: 'Exposición de información'
};

/**
 * Deriva la categoría de un hallazgo a partir del prefijo de su clave.
 *
 * @param key Clave estable de la regla (p. ej. "HDR-CSP-MISSING").
 */
function categoryFromKey(key: string): string {
  const prefix = key.split('-')[0];
  return CATEGORY_BY_PREFIX[prefix] ?? 'General';
}

/**
 * Crea un hallazgo estructurado (RF-014) garantizando que todos los
 * analizadores produzcan objetos con exactamente la misma forma.
 *
 * @param input Datos del hallazgo detectado por una regla.
 */
export function createFinding(input: FindingInput): FindingDraft {
  return {
    key: input.key,
    title: input.title,
    category: input.category ?? categoryFromKey(input.key),
    severity: input.severity,
    confidence: input.confidence,
    description: input.description,
    evidence: input.evidence,
    impact: input.impact,
    recommendation: input.recommendation,
    references: input.references
  };
}

/**
 * Ejecuta un analizador aislando sus fallos.
 * Si el analizador lanza una excepción, se devuelve un resultado con
 * `ok:false` y el resto de analizadores continúan normalmente (RF-032,
 * RNF-008).
 *
 * @param name      Nombre identificador del analizador.
 * @param analyzer  Función de análisis pura sobre el contexto.
 * @param ctx       Contexto de la auditoría en ejecución.
 */
export function runAnalyzer<T>(
  name: string,
  analyzer: (ctx: ScanContext) => { data: T; findings: FindingDraft[] },
  ctx: ScanContext
): AnalyzerResult<T> {
  try {
    const { data, findings } = analyzer(ctx);
    return { name, ok: true, data, findings };
  } catch (error) {
    return {
      name,
      ok: false,
      error: error instanceof Error ? error.message : 'unknown-analyzer-error',
      data: null,
      findings: []
    };
  }
}
