/**
 * ============================================================================
 * ANALIZADOR HTTP
 * ----------------------------------------------------------------------------
 * Analiza la configuración observable del protocolo HTTP (RF-010):
 *   - Códigos de estado y errores en la página principal.
 *   - Cadenas de redirección excesivas.
 *   - Métodos peligrosos anunciados por la cabecera Allow.
 *   - Disponibilidad general del objetivo (hallazgo crítico si no responde).
 *
 * Este analizador mantiene sus reglas inline por ser un análisis lineal;
 * los tipos están separados en http.types.ts.
 * ============================================================================
 */

import { FindingDraft } from '../../modules/findings/findings.types';
import { standardsService } from '../../standards/standards.service';
import { createFinding } from '../core/scanner.utils';
import { FetchedPage } from '../../shared/utils/http-client.util';
import { HttpData } from './http.types';

/**
 * Ejecuta el análisis HTTP sobre la respuesta principal del objetivo.
 *
 * @param input Página descargada y contexto HTTPS del objetivo.
 * @returns Datos estructurados + hallazgos detectados.
 */
export function analyzeHttp(input: {
  page: FetchedPage | null;
  isHttpsTarget: boolean;
}): { data: HttpData | null; findings: FindingDraft[] } {
  const page = input.page;

  // Sin respuesta alguna: hallazgo crítico de conectividad.
  if (!page || (!page.ok && !page.status)) {
    return {
      data: null,
      findings: [
        createFinding({
          key: 'HTTP-UNREACHABLE',
          title: 'El objetivo no respondió al análisis HTTP',
          severity: 'HIGH',
          confidence: 'HIGH',
          description:
            'No fue posible obtener respuesta HTTP del objetivo; la auditoría se marca como fallida conservando los resultados parciales.',
          evidence: page?.error ? `Error de red: ${page.error}` : 'Sin respuesta HTTP del servidor.',
          impact:
            'No es posible evaluar la seguridad observable de la aplicación sin conectividad hacia el objetivo.',
          recommendation:
            'Verificar que la URL sea correcta y que el sitio esté accesible desde donde se ejecuta SecureScan.',
          references: {
            owasp: [standardsService.owasp.A05_2021],
            cwe: [standardsService.cwe.CWE_16],
            iso: standardsService.iso.SECURE_CONFIG
          }
        })
      ]
    };
  }

  const findings: FindingDraft[] = [];

  // Métodos anunciados por la cabecera Allow (normalizados a mayúsculas).
  const allowMethods = (page.headers['allow'] ?? '')
    .split(',')
    .map((m) => m.trim().toUpperCase())
    .filter(Boolean);

  const data: HttpData = {
    statusCode: page.status,
    finalUrl: page.finalUrl,
    redirectChain: page.redirects,
    allowMethods,
    serverHeader: page.headers['server']
  };

  // Regla: métodos peligrosos anunciados (TRACE/PUT/DELETE/CONNECT).
  const dangerousMethods = allowMethods.filter((m) =>
    ['TRACE', 'TRACK', 'PUT', 'DELETE', 'CONNECT'].includes(m)
  );
  if (dangerousMethods.length > 0) {
    findings.push(
      createFinding({
        key: 'HTTP-DANGEROUS-METHODS',
        title: 'Métodos HTTP potencialmente peligrosos anunciados',
        severity: 'MEDIUM',
        confidence: 'LOW',
        description:
          'La cabecera Allow anuncia métodos HTTP que deberían estar deshabilitados en producción.',
        evidence: `Allow: ${allowMethods.join(', ')}`,
        impact:
          'Métodos como TRACE facilitan ataques (XST) y PUT/DELETE podrían permitir modificaciones si no están protegidos.',
        recommendation: 'Deshabilitar los métodos innecesarios en el servidor web y validar la configuración.',
        references: {
          owasp: [standardsService.owasp.A05_2021],
          cwe: [standardsService.cwe.CWE_16],
          iso: standardsService.iso.SECURE_CONFIG
        }
      })
    );
  }

  // Regla: error interno del servidor en la página principal.
  if (page.status >= 500) {
    findings.push(
      createFinding({
        key: 'HTTP-5XX-MAINPAGE',
        title: 'Error interno del servidor en la página principal',
        severity: 'MEDIUM',
        confidence: 'MEDIUM',
        description: 'La página principal devolvió un código de error 5xx.',
        evidence: `Código de estado: ${page.status}`,
        impact:
          'Los errores 5xx pueden indicar fallos internos y a veces exponen información sensible en su salida.',
        recommendation: 'Investigar y corregir el error del servidor; configurar páginas de error genéricas.',
        references: {
          owasp: [standardsService.owasp.A05_2021],
          cwe: [standardsService.cwe.CWE_200],
          iso: standardsService.iso.INFO_DISCLOSURE
        }
      })
    );
  } else if (page.status >= 400) {
    // Regla informativa: código 4xx sugiere URL incorrecta o recurso no público.
    findings.push(
      createFinding({
        key: 'HTTP-4XX-MAINPAGE',
        title: 'Código de estado 4xx en la página principal',
        severity: 'INFORMATIONAL',
        confidence: 'MEDIUM',
        description: 'La URL analizada devolvió un código de cliente 4xx.',
        evidence: `Código de estado: ${page.status}`,
        impact: 'Puede indicar que la URL evaluada no corresponde a una página pública activa.',
        recommendation: 'Confirmar que la URL analizada es la correcta para la evaluación.',
        references: {
          owasp: [standardsService.owasp.A05_2021],
          cwe: [standardsService.cwe.CWE_16],
          iso: standardsService.iso.SECURE_CONFIG
        }
      })
    );
  }

  // Regla informativa: cadenas de redirección largas (>3 saltos).
  if (page.redirects.length > 3) {
    findings.push(
      createFinding({
        key: 'HTTP-LONG-REDIRECTS',
        title: 'Cadena de redirecciones extensa',
        severity: 'INFORMATIONAL',
        confidence: 'HIGH',
        description:
          'La solicitud siguió más de tres redirecciones antes de llegar al contenido final.',
        evidence: `Redirecciones: ${page.redirects.map((r) => `${r.status} -> ${r.location}`).join(' | ')}`,
        impact: 'Las cadenas largas de redirección afectan el rendimiento y dificultan el mantenimiento.',
        recommendation: 'Reducir la cadena de redirecciones apuntando directamente a la URL final.',
        references: {
          owasp: [standardsService.owasp.A05_2021],
          cwe: [standardsService.cwe.CWE_16],
          iso: standardsService.iso.SECURE_CONFIG
        }
      })
    );
  }

  return { data, findings };
}
