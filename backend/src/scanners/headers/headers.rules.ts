/**
 * ============================================================================
 * REGLAS DEL ANALIZADOR DE SECURITY HEADERS
 * ----------------------------------------------------------------------------
 * Una regla por cabecera de seguridad (RF-008). Cada regla evalúa:
 *   - Presencia de la cabecera.
 *   - Configuraciones débiles cuando la cabecera existe.
 *
 * Reglas incluidas:
 *   CSP · HSTS · X-Content-Type-Options · Protección anti-clickjacking ·
 *   Referrer-Policy · Permissions-Policy
 * ============================================================================
 */

import { FindingDraft } from '../../modules/findings/findings.types';
import { standardsService } from '../../standards/standards.service';
import { createFinding } from '../core/scanner.utils';
import { HeadersAnalysisInput } from './headers.types';

/** Umbral recomendado para HSTS: 15552000 s = 6 meses. */
const HSTS_MIN_MAX_AGE = 15_552_000;

/**
 * Regla: Content-Security-Policy ausente o con directivas débiles.
 */
function ruleCsp(input: HeadersAnalysisInput): FindingDraft[] {
  const findings: FindingDraft[] = [];
  const csp = input.headers['content-security-policy'];

  // CSP completamente ausente.
  if (csp === undefined) {
    findings.push(
      createFinding({
        key: 'HDR-CSP-MISSING',
        title: 'Content-Security-Policy ausente',
        severity: 'MEDIUM',
        confidence: 'HIGH',
        description: 'La respuesta no incluye la cabecera Content-Security-Policy (CSP).',
        evidence: 'Cabecera Content-Security-Policy no encontrada en la respuesta HTTP.',
        impact: 'Sin CSP se reduce la capacidad de mitigar ataques de inyección de contenido como XSS.',
        recommendation:
          'Implementar una política CSP adecuada, comenzando en modo reporte y restringiendo las fuentes de scripts y estilos.',
        references: {
          owasp: [standardsService.owasp.A05_2021],
          cwe: [standardsService.cwe.CWE_693],
          iso: standardsService.iso.WEB_SECURITY
        }
      })
    );
    return findings;
  }

  // CSP presente pero con directivas que anulan su protección.
  if (/unsafe-inline/.test(csp) || /unsafe-eval/.test(csp)) {
    findings.push(
      createFinding({
        key: 'HDR-CSP-WEAK',
        title: 'Content-Security-Policy con directivas débiles',
        severity: 'MEDIUM',
        confidence: 'MEDIUM',
        description:
          'La política CSP incluye unsafe-inline o unsafe-eval, lo que reduce significativamente su protección.',
        evidence: `content-security-policy: ${csp}`,
        impact:
          'Un atacante que logre inyectar contenido podría ejecutar scripts a pesar de la presencia de CSP.',
        recommendation: 'Eliminar unsafe-inline/unsafe-eval usando nonces o hashes para los scripts legítimos.',
        references: {
          owasp: [standardsService.owasp.A05_2021],
          cwe: [standardsService.cwe.CWE_693],
          iso: standardsService.iso.WEB_SECURITY
        }
      })
    );
  }

  return findings;
}

/**
 * Regla: Strict-Transport-Security ausente o con max-age insuficiente.
 * Solo aplica a objetivos servidos por HTTPS.
 */
function ruleHsts(input: HeadersAnalysisInput): FindingDraft[] {
  if (!input.isHttpsTarget) return [];

  const hsts = input.headers['strict-transport-security'];
  if (hsts === undefined) {
    return [
      createFinding({
        key: 'HDR-HSTS-MISSING',
        title: 'Strict-Transport-Security ausente',
        severity: 'MEDIUM',
        confidence: 'HIGH',
        description: 'El sitio HTTPS no envía la cabecera HSTS.',
        evidence: 'Cabecera Strict-Transport-Security no encontrada.',
        impact:
          'Un atacante podría forzar la primera conexión por HTTP (ataque de degradación / SSL stripping).',
        recommendation:
          'Enviar Strict-Transport-Security con max-age >= 15552000 y considerar incluir preload.',
        references: {
          owasp: [standardsService.owasp.A02_2021],
          cwe: [standardsService.cwe.CWE_319],
          iso: standardsService.iso.CRYPTO
        }
      })
    ];
  }

  // HSTS presente: verificar duración declarada.
  const maxAgeMatch = hsts.match(/max-age=(\d+)/i);
  const maxAge = maxAgeMatch ? Number(maxAgeMatch[1]) : 0;
  if (maxAge < HSTS_MIN_MAX_AGE) {
    return [
      createFinding({
        key: 'HDR-HSTS-WEAK',
        title: 'HSTS con max-age reducido',
        severity: 'LOW',
        confidence: 'HIGH',
        description:
          'La cabecera HSTS está presente pero su max-age es inferior al recomendado (15552000 segundos / 6 meses).',
        evidence: `strict-transport-security: ${hsts}`,
        impact: 'La protección contra degradación se aplica durante un periodo insuficiente.',
        recommendation:
          'Aumentar max-age a 31536000 (un año) una vez validada la estabilidad del sitio por HTTPS.',
        references: {
          owasp: [standardsService.owasp.A02_2021],
          cwe: [standardsService.cwe.CWE_319],
          iso: standardsService.iso.CRYPTO
        }
      })
    ];
  }

  return [];
}

/**
 * Regla: X-Content-Type-Options ausente o con valor distinto de nosniff.
 */
function ruleNosniff(input: HeadersAnalysisInput): FindingDraft[] {
  const value = input.headers['x-content-type-options'];
  const refs = {
    owasp: [standardsService.owasp.A05_2021],
    cwe: [standardsService.cwe.CWE_16],
    iso: standardsService.iso.SECURE_CONFIG
  };

  if (value === undefined) {
    return [
      createFinding({
        key: 'HDR-NOSNIFF-MISSING',
        title: 'X-Content-Type-Options ausente',
        severity: 'LOW',
        confidence: 'HIGH',
        description: 'La respuesta no incluye la cabecera X-Content-Type-Options.',
        evidence: 'Cabecera X-Content-Type-Options no encontrada.',
        impact: 'El navegador podría interpretar archivos con un tipo MIME distinto al declarado (MIME sniffing).',
        recommendation: 'Enviar X-Content-Type-Options: nosniff en todas las respuestas.',
        references: refs
      })
    ];
  }

  if (!/^nosniff$/i.test(value)) {
    return [
      createFinding({
        key: 'HDR-NOSNIFF-WEAK',
        title: 'X-Content-Type-Options con valor incorrecto',
        severity: 'LOW',
        confidence: 'HIGH',
        description: 'La cabecera X-Content-Type-Options existe pero no tiene el valor nosniff.',
        evidence: `x-content-type-options: ${value}`,
        impact: 'El valor incorrecto anula el efecto esperado de la cabecera.',
        recommendation: 'Configurar exactamente X-Content-Type-Options: nosniff.',
        references: refs
      })
    ];
  }

  return [];
}

/**
 * Regla: protección contra clickjacking ausente (ni X-Frame-Options ni
 * frame-ancestors en la CSP).
 */
function ruleClickjacking(input: HeadersAnalysisInput): FindingDraft | null {
  const xfo = input.headers['x-frame-options'];
  const hasFrameAncestors = /frame-ancestors/i.test(input.headers['content-security-policy'] ?? '');

  if (xfo !== undefined || hasFrameAncestors) return null;

  return createFinding({
    key: 'HDR-FRAME-MISSING',
    title: 'Protección contra clickjacking ausente',
    severity: 'LOW',
    confidence: 'MEDIUM',
    description: 'No se detectó X-Frame-Options ni la directiva CSP frame-ancestors.',
    evidence: 'Ni X-Frame-Options ni frame-ancestors presentes en la respuesta.',
    impact: 'La página podría ser embebida en un iframe malicioso para engañar al usuario (clickjacking).',
    recommendation: 'Enviar X-Frame-Options: DENY o SAMEORIGIN, o definir frame-ancestors en la CSP.',
    references: {
      owasp: [standardsService.owasp.A05_2021],
      cwe: [standardsService.cwe.CWE_1021],
      iso: standardsService.iso.WEB_SECURITY
    }
  });
}

/**
 * Regla: Referrer-Policy ausente o con política insegura (unsafe-url).
 */
function ruleReferrer(input: HeadersAnalysisInput): FindingDraft[] {
  const value = input.headers['referrer-policy'];
  if (value === undefined) {
    return [
      createFinding({
        key: 'HDR-REFERRER-MISSING',
        title: 'Referrer-Policy ausente',
        severity: 'LOW',
        confidence: 'HIGH',
        description: 'La respuesta no incluye la cabecera Referrer-Policy.',
        evidence: 'Cabecera Referrer-Policy no encontrada.',
        impact: 'Las URLs completas (incluyendo posibles parámetros sensibles) podrían filtrarse hacia sitios externos.',
        recommendation: 'Enviar Referrer-Policy: strict-origin-when-cross-origin o no-referrer.',
        references: {
          owasp: [standardsService.owasp.A05_2021],
          cwe: [standardsService.cwe.CWE_200],
          iso: standardsService.iso.INFO_DISCLOSURE
        }
      })
    ];
  }

  if (/unsafe-url/i.test(value)) {
    return [
      createFinding({
        key: 'HDR-REFERRER-UNSAFE',
        title: 'Referrer-Policy inseguro',
        severity: 'MEDIUM',
        confidence: 'HIGH',
        description: 'La política de referrer configurada permite enviar la URL completa a otros sitios.',
        evidence: `referrer-policy: ${value}`,
        impact: 'Posible fuga de información sensible contenida en URLs hacia terceros.',
        recommendation: 'Cambiar la política a strict-origin-when-cross-origin o más restrictiva.',
        references: {
          owasp: [standardsService.owasp.A05_2021],
          cwe: [standardsService.cwe.CWE_200],
          iso: standardsService.iso.INFO_DISCLOSURE
        }
      })
    ];
  }

  return [];
}

/**
 * Regla informativa: Permissions-Policy ausente.
 */
function rulePermissions(input: HeadersAnalysisInput): FindingDraft | null {
  if (input.headers['permissions-policy'] !== undefined) return null;

  return createFinding({
    key: 'HDR-PERMISSIONS-MISSING',
    title: 'Permissions-Policy ausente',
    severity: 'INFORMATIONAL',
    confidence: 'HIGH',
    description: 'La respuesta no incluye la cabecera Permissions-Policy.',
    evidence: 'Cabecera Permissions-Policy no encontrada.',
    impact: 'Funciones del navegador como cámara o geolocalización no quedan restringidas explícitamente.',
    recommendation:
      'Definir una Permissions-Policy que deshabilite las funciones no utilizadas por la aplicación.',
    references: {
      owasp: [standardsService.owasp.A05_2021],
      cwe: [standardsService.cwe.CWE_16],
      iso: standardsService.iso.SECURE_CONFIG
    }
  });
}

/**
 * Ejecuta todas las reglas de cabeceras y devuelve los hallazgos.
 *
 * @param input Cabeceras de la respuesta y contexto del objetivo.
 */
export function evaluateHeaderRules(input: HeadersAnalysisInput): FindingDraft[] {
  return [
    ...ruleCsp(input),
    ...ruleHsts(input),
    ...ruleNosniff(input),
    ruleClickjacking(input),
    ...ruleReferrer(input),
    rulePermissions(input)
  ].filter((finding): finding is FindingDraft => finding !== null);
}
