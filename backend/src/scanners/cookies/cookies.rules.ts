/**
 * ============================================================================
 * REGLAS DEL ANALIZADOR DE COOKIES
 * ----------------------------------------------------------------------------
 * Evalúa los atributos de seguridad de cada cookie recibida (RF-009):
 *
 *   - Secure: obligatorio en sitios HTTPS.
 *   - HttpOnly: esperable en cookies de sesión.
 *   - SameSite: ausente o None reduce la protección CSRF.
 * ============================================================================
 */

import { FindingDraft } from '../../modules/findings/findings.types';
import { standardsService } from '../../standards/standards.service';
import { createFinding } from '../core/scanner.utils';
import { CookiesAnalysisInput } from './cookies.types';
import { ParsedCookie } from '../../shared/utils/http-client.util';

/**
 * Patrón para identificar nombres de cookie que parecen de sesión
 * (afecta la severidad asignada a los hallazgos).
 */
const SESSION_COOKIE_PATTERN = /sess|sid|token|auth|jwt|login/i;

/**
 * Regla: cookie sin atributo Secure servida por un sitio HTTPS.
 */
function ruleSecure(cookie: ParsedCookie, input: CookiesAnalysisInput): FindingDraft | null {
  if (!input.isHttpsTarget || cookie.secure) return null;

  const isSessionLike = SESSION_COOKIE_PATTERN.test(cookie.name);
  return createFinding({
    key: `CK-NO-SECURE-${cookie.name}`,
    title: `Cookie "${cookie.name}" sin atributo Secure`,
    severity: isSessionLike ? 'MEDIUM' : 'LOW',
    confidence: 'HIGH',
    description:
      'La cookie se envía sin el atributo Secure pudiendo transmitirse por conexiones no cifradas.',
    evidence: `Set-Cookie: ${cookie.raw}`,
    impact: 'Si la cookie viaja por HTTP podría ser interceptada por un atacante en la red.',
    recommendation: 'Añadir el atributo Secure a todas las cookies servidas por HTTPS.',
    references: {
      owasp: [standardsService.owasp.A02_2021],
      cwe: [standardsService.cwe.CWE_614],
      iso: standardsService.iso.CRYPTO
    }
  });
}

/**
 * Regla: cookie de sesión sin atributo HttpOnly (accesible desde JS).
 */
function ruleHttpOnly(cookie: ParsedCookie): FindingDraft | null {
  // Solo aplica a cookies que parecen de sesión y no tienen HttpOnly.
  if (!SESSION_COOKIE_PATTERN.test(cookie.name) || cookie.httpOnly) return null;

  return createFinding({
    key: `CK-NO-HTTPONLY-${cookie.name}`,
    title: `Cookie de sesión "${cookie.name}" sin HttpOnly`,
    severity: 'MEDIUM',
    confidence: 'MEDIUM',
    description: 'Una cookie aparentemente de sesión no incluye el atributo HttpOnly.',
    evidence: `Set-Cookie: ${cookie.raw}`,
    impact: 'La cookie podría ser leída mediante JavaScript en caso de un ataque XSS.',
    recommendation: 'Añadir el atributo HttpOnly a las cookies de sesión.',
    references: {
      owasp: [standardsService.owasp.A07_2021],
      cwe: [standardsService.cwe.CWE_1004],
      iso: standardsService.iso.WEB_SECURITY
    }
  });
}

/**
 * Regla: cookie sin atributo SameSite o con SameSite=None explícito.
 */
function ruleSameSite(cookie: ParsedCookie): FindingDraft | null {
  const refs = {
    owasp: [standardsService.owasp.A05_2021],
    cwe: [standardsService.cwe.CWE_16],
    iso: standardsService.iso.SECURE_CONFIG
  };

  // Sin SameSite declarado.
  if (!cookie.sameSite) {
    return createFinding({
      key: `CK-NO-SAMESITE-${cookie.name}`,
      title: `Cookie "${cookie.name}" sin atributo SameSite`,
      severity: 'LOW',
      confidence: 'HIGH',
      description: 'La cookie no define el atributo SameSite.',
      evidence: `Set-Cookie: ${cookie.raw}`,
      impact: 'Sin SameSite, la cookie puede enviarse en solicitudes entre sitios facilitando ataques CSRF.',
      recommendation: 'Definir SameSite=Lax o Strict según el comportamiento requerido.',
      references: refs
    });
  }

  // SameSite=None permite envío cross-site deliberadamente.
  if (/none/i.test(cookie.sameSite)) {
    return createFinding({
      key: `CK-SAMESITE-NONE-${cookie.name}`,
      title: `Cookie "${cookie.name}" con SameSite=None`,
      severity: 'LOW',
      confidence: 'HIGH',
      description:
        'La cookie se configura explícitamente con SameSite=None permitiendo su envío en contextos entre sitios.',
      evidence: `Set-Cookie: ${cookie.raw}`,
      impact: 'Aumenta la superficie de ataques CSRF si la cookie participa en acciones sensibles.',
      recommendation: 'Evaluar si se requiere SameSite=None; en caso contrario usar Lax o Strict.',
      references: refs
    });
  }

  return null;
}

/**
 * Ejecuta todas las reglas sobre cada cookie y devuelve los hallazgos.
 *
 * @param input Cookies recibidas del objetivo y contexto HTTPS.
 */
export function evaluateCookieRules(input: CookiesAnalysisInput): FindingDraft[] {
  const findings: FindingDraft[] = [];

  for (const cookie of input.setCookies) {
    for (const finding of [
      ruleSecure(cookie, input),
      ruleHttpOnly(cookie),
      ruleSameSite(cookie)
    ]) {
      if (finding) findings.push(finding);
    }
  }

  return findings;
}
