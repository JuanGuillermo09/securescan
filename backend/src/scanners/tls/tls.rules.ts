/**
 * ============================================================================
 * REGLAS DEL ANALIZADOR TLS
 * ----------------------------------------------------------------------------
 * Cada regla evalúa un aspecto de seguridad observable del canal HTTPS/TLS
 * y devuelve un hallazgo cuando detecta un problema (RF-007, HU-003):
 *
 *   - Disponibilidad del servicio TLS.
 *   - Validez del certificado (autofirmado, expirado, por expirar).
 *   - Versiones de protocolo obsoletas.
 *   - Uso de HTTP plano y ausencia de redirección a HTTPS.
 * ============================================================================
 */

import { FindingDraft } from '../../modules/findings/findings.types';
import { Confidence, Severity } from '../../shared/types/common.types';
import { standardsService } from '../../standards/standards.service';
import { createFinding } from '../core/scanner.utils';
import { TlsAnalysisInput } from './tls.types';

/** Referencias estándar comunes para hallazgos criptográficos. */
const CRYPTO_REFS = {
  owasp: [standardsService.owasp.A02_2021],
  cwe: [standardsService.cwe.CWE_319],
  iso: standardsService.iso.CRYPTO
};

/**
 * Regla: el servicio TLS no fue alcanzable en el puerto 443.
 */
function ruleTlsUnreachable(input: TlsAnalysisInput): FindingDraft | null {
  if (!input.isHttpsTarget || (input.tls && input.tls.available)) return null;

  return createFinding({
    key: 'TLS-UNREACHABLE',
    title: 'No fue posible establecer conexión TLS',
    severity: 'MEDIUM' as Severity,
    confidence: 'MEDIUM' as Confidence,
    description:
      'El analizador no pudo completar el handshake TLS con el puerto 443 del objetivo.',
    evidence: input.tls?.error
      ? `Error de conexión TLS: ${input.tls.error}`
      : 'Conexión al puerto 443 fallida.',
    impact:
      'Sin verificación TLS no es posible confirmar la calidad de la configuración criptográfica.',
    recommendation:
      'Verificar que el servicio HTTPS esté disponible y accesible desde la red donde se ejecuta SecureScan.',
    references: CRYPTO_REFS
  });
}

/**
 * Regla: el certificado no supera la validación estándar
 * (autofirmado, hostname incorrecto, CA desconocida...).
 */
function ruleCertificateInvalid(input: TlsAnalysisInput): FindingDraft | null {
  if (!input.tls?.available || input.tls.authorized !== false) return null;

  return createFinding({
    key: 'TLS-CERT-INVALID',
    title: 'Certificado TLS inválido o no confiable',
    severity: 'HIGH',
    confidence: 'HIGH',
    description:
      'La validación del certificado TLS falló: puede estar autofirmado, expirado o no corresponder al dominio.',
    evidence: `authorizationError: ${input.tls.authorizationError ?? 'unknown'}`,
    impact:
      'Los navegadores mostrarán advertencias y los usuarios podrían quedar expuestos a ataques de intermediario (MITM).',
    recommendation:
      "Instalar un certificado válido emitido por una autoridad certificadora confiable (por ejemplo, mediante Let's Encrypt) que corresponda al dominio.",
    references: CRYPTO_REFS
  });
}

/**
 * Regla: certificado expirado o próximo a expirar según días restantes.
 */
function ruleCertificateExpiry(input: TlsAnalysisInput): FindingDraft | null {
  const days = input.tls?.certificate?.daysRemaining;
  if (!input.tls?.available || typeof days !== 'number') return null;

  // Certificado ya vencido: riesgo crítico.
  if (days < 0) {
    return createFinding({
      key: 'TLS-CERT-EXPIRED',
      title: 'Certificado TLS expirado',
      severity: 'CRITICAL',
      confidence: 'HIGH',
      description: 'El certificado TLS del sitio se encuentra vencido.',
      evidence: `validTo: ${input.tls.certificate?.validTo ?? 'desconocido'} (${Math.abs(days)} días vencido)`,
      impact:
        'Los navegadores bloquean el acceso y los datos en tránsito dejan de protegerse adecuadamente.',
      recommendation: 'Renovar el certificado TLS inmediatamente y automatizar su renovación.',
      references: CRYPTO_REFS
    });
  }

  // Vence en menos de 15 días: advertencia de renovación.
  if (days <= 15) {
    return createFinding({
      key: 'TLS-CERT-EXPIRING',
      title: 'Certificado TLS próximo a expirar',
      severity: 'MEDIUM',
      confidence: 'HIGH',
      description: 'El certificado TLS vencerá en los próximos días.',
      evidence: `validTo: ${input.tls.certificate?.validTo ?? 'desconocido'} (${days} días restantes)`,
      impact:
        'Si no se renueva, el sitio quedará inaccesible para los usuarios y generará advertencias de seguridad.',
      recommendation: 'Renovar el certificado y configurar renovación automática.',
      references: CRYPTO_REFS
    });
  }

  return null;
}

/**
 * Regla: se negoció una versión de protocolo obsoleta (SSLv3/TLS 1.0/1.1).
 */
function ruleObsoleteProtocol(input: TlsAnalysisInput): FindingDraft | null {
  const protocol = input.tls?.protocol;
  if (!input.tls?.available || !protocol || !/^(SSLv|TLSv1(\.[01])?$)/.test(protocol)) {
    return null;
  }

  return createFinding({
    key: 'TLS-PROTOCOL-OBSOLETE',
    title: 'Protocolo TLS obsoleto negociado',
    severity: 'HIGH',
    confidence: 'HIGH',
    description:
      'El servidor negocia versiones antiguas del protocolo (SSLv3/TLS 1.0/1.1), consideradas inseguras.',
    evidence: `Protocolo negociado: ${protocol}`,
    impact:
      'Estas versiones presentan debilidades conocidas (POODLE, BEAST) y no cumplen las guías modernas de configuración TLS.',
    recommendation: 'Deshabilitar SSLv3, TLS 1.0 y TLS 1.1; habilitar únicamente TLS 1.2 y TLS 1.3.',
    references: {
      owasp: [standardsService.owasp.A02_2021],
      cwe: [standardsService.cwe.CWE_326],
      iso: standardsService.iso.CRYPTO
    }
  });
}

/**
 * Regla: el objetivo usa HTTP plano sin cifrar.
 */
function rulePlainHttpTarget(input: TlsAnalysisInput): FindingDraft | null {
  if (input.isHttpsTarget || !input.pageFetchedOk) return null;

  return createFinding({
    key: 'TLS-TARGET-IS-HTTP',
    title: 'El objetivo se sirve sobre HTTP sin cifrar',
    severity: 'HIGH',
    confidence: 'HIGH',
    description: 'La URL analizada utiliza el esquema http:// en lugar de https://.',
    evidence: `URL objetivo: ${input.domain} (esquema HTTP)`,
    impact:
      'Toda la información intercambiada viaja en texto plano y puede ser interceptada o modificada.',
    recommendation: 'Obtener e instalar un certificado TLS y servir la aplicación exclusivamente por HTTPS.',
    references: CRYPTO_REFS
  });
}

/**
 * Regla: sitio HTTPS que no redirige automáticamente las peticiones HTTP.
 */
function ruleMissingHttpRedirect(input: TlsAnalysisInput): FindingDraft | null {
  if (!input.isHttpsTarget || input.plainHttpRedirectsToHttps || !input.pageFetchedOk) return null;

  return createFinding({
    key: 'TLS-NO-HTTP-REDIRECT',
    title: 'Sin redirección automática de HTTP hacia HTTPS',
    severity: 'MEDIUM',
    confidence: 'MEDIUM',
    description:
      'El sitio responde por HTTP sin redirigir automáticamente al usuario hacia HTTPS.',
    evidence: 'Solicitud a http://host respondida sin Location hacia https://',
    impact:
      'Un usuario que escriba la dirección sin https:// podría navegar sin cifrado, exponiendo datos en tránsito.',
    recommendation: 'Configurar una redirección 301 permanente de HTTP hacia HTTPS en todo el sitio.',
    references: CRYPTO_REFS
  });
}

/**
 * Ejecuta todas las reglas TLS sobre la entrada dada y devuelve los
 * hallazgos detectados.
 *
 * @param input Datos recolectados del canal TLS y HTTP del objetivo.
 */
export function evaluateTlsRules(input: TlsAnalysisInput): FindingDraft[] {
  return [
    ruleTlsUnreachable(input),
    ruleCertificateInvalid(input),
    ruleCertificateExpiry(input),
    ruleObsoleteProtocol(input),
    rulePlainHttpTarget(input),
    ruleMissingHttpRedirect(input)
  ].filter((finding): finding is FindingDraft => finding !== null);
}

/** Fachada usada por el motor de scanning (mantiene nombre estable). */
export function analyzeTls(input: TlsAnalysisInput): {
  data: { tls: TlsAnalysisInput['tls'] };
  findings: FindingDraft[];
} {
  return { data: { tls: input.tls }, findings: evaluateTlsRules(input) };
}
