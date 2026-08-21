/**
 * ============================================================================
 * ANALIZADOR DE COOKIES
 * ----------------------------------------------------------------------------
 * Punto de entrada del análisis de cookies (RF-009). Construye el resumen
 * estructurado de cookies y delega la evaluación de reglas a cookies.rules.ts.
 * ============================================================================
 */

import { FindingDraft } from '../../modules/findings/findings.types';
import { evaluateCookieRules } from './cookies.rules';
import { CookiesAnalysisInput, CookiesData } from './cookies.types';

/**
 * Ejecuta el análisis de cookies sobre la respuesta del objetivo.
 *
 * @param input Cookies parseadas y contexto HTTPS del objetivo.
 * @returns Resumen estructurado + hallazgos generados por las reglas.
 */
export function analyzeCookies(input: CookiesAnalysisInput): {
  data: CookiesData;
  findings: FindingDraft[];
} {
  // Resumen ligero de cada cookie para el dashboard (sin valores sensibles).
  const data: CookiesData = {
    total: input.setCookies.length,
    cookies: input.setCookies.map((c) => ({
      name: c.name,
      domain: c.domain,
      path: c.path,
      secure: c.secure,
      httpOnly: c.httpOnly,
      sameSite: c.sameSite
    }))
  };

  return { data, findings: evaluateCookieRules(input) };
}
