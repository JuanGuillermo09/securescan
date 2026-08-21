/**
 * ============================================================================
 * ANALIZADOR DE SECURITY HEADERS
 * ----------------------------------------------------------------------------
 * Punto de entrada del análisis de cabeceras de seguridad (RF-008).
 * Construye los datos estructurados (presentes/ausentes/débiles) y delega la
 * evaluación de reglas a headers.rules.ts.
 * ============================================================================
 */

import { FindingDraft } from '../../modules/findings/findings.types';
import { evaluateHeaderRules } from './headers.rules';
import { HeadersAnalysisInput, HeadersData } from './headers.types';

/**
 * Cabeceras de seguridad que el analizador verifica siempre.
 * El orden define también el orden de reporte en el dashboard.
 */
const SECURITY_HEADERS = [
  'content-security-policy',
  'strict-transport-security',
  'x-content-type-options',
  'x-frame-options',
  'referrer-policy',
  'permissions-policy'
] as const;

/**
 * Ejecuta el análisis de security headers sobre la respuesta del objetivo.
 *
 * @param input Cabeceras HTTP normalizadas y contexto del objetivo.
 * @returns Datos estructurados + hallazgos generados por las reglas.
 */
export function analyzeHeaders(input: HeadersAnalysisInput): {
  data: HeadersData;
  findings: FindingDraft[];
} {
  const present: Record<string, string> = {};

  // Registra las cabeceras de seguridad presentes en la respuesta.
  for (const name of SECURITY_HEADERS) {
    if (input.headers[name] !== undefined) {
      present[name] = input.headers[name];
    }
  }

  // Las ausentes son la diferencia entre la lista canónica y las presentes.
  const missing = SECURITY_HEADERS.filter((h) => present[h] === undefined);

  // Las reglas llenan la lista de configuraciones débiles como efecto
  // secundario documentado: cada hallazgo "WEAK" añade su evidencia.
  const weak: string[] = [];
  const findings = evaluateHeaderRules(input);
  for (const finding of findings) {
    if (finding.key.endsWith('-WEAK')) {
      weak.push(`${finding.title}: ${finding.evidence}`);
    }
  }

  return { data: { present, missing, weak }, findings };
}
