/**
 * ============================================================================
 * ANALIZADOR DE EXPOSICIÓN DE INFORMACIÓN
 * ----------------------------------------------------------------------------
 * Detecta información técnica expuesta públicamente (RF-012, HU-006):
 *   - Versiones de software en cabeceras (Server, X-Powered-By).
 *   - Metadatos en el HTML (meta generator).
 *   - Archivos y recursos sensibles accesibles (.env, .git, phpinfo).
 *
 * Las reglas de validación de sondeos viven en exposure.rules.ts.
 * ============================================================================
 */

import { FindingDraft } from '../../modules/findings/findings.types';
import { standardsService } from '../../standards/standards.service';
import { createFinding } from '../core/scanner.utils';
import { HttpProbe } from '../../shared/utils/http-client.util';
import { evaluateProbeHit, truncateEvidence } from './exposure.rules';

/** Datos estructurados que el analizador expone al dashboard. */
export interface ExposureData {
  /** Divulgaciones detectadas con su fuente. */
  disclosures: Array<{ source: string; detail: string }>;
  /** Resultado de cada sondeo realizado. */
  probes: Array<{ path: string; status: number | null; hit: boolean; error?: string }>;
}

/** Entrada que el analizador necesita para evaluar la exposición. */
export interface ExposureAnalysisInput {
  headers: Record<string, string>;
  body: string;
  probes: HttpProbe[];
}

/**
 * Ejecuta el análisis de exposición sobre los datos del objetivo.
 *
 * @param input Cabeceras, HTML y sondeos del objetivo.
 * @returns Divulgaciones + resultados de sondeos + hallazgos.
 */
export function analyzeExposure(input: ExposureAnalysisInput): {
  data: ExposureData;
  findings: FindingDraft[];
} {
  const findings: FindingDraft[] = [];
  const disclosures: ExposureData['disclosures'] = [];

  // ---- Regla: versión del servidor web en la cabecera Server ------------
  const server = input.headers['server'];
  if (server && /\d+\.\d+/.test(server)) {
    disclosures.push({ source: 'header Server', detail: server });
    findings.push(
      createFinding({
        key: 'EXP-SERVER-VERSION',
        title: 'Versión del servidor web divulgada',
        severity: 'LOW',
        confidence: 'HIGH',
        description: 'La cabecera Server expone la versión exacta del servidor web.',
        evidence: `Server: ${server}`,
        impact: 'Un atacante puede buscar vulnerabilidades conocidas específicas para esa versión.',
        recommendation:
          'Suprimir la versión en la cabecera Server (por ejemplo, server_tokens off en Nginx o ServerTokens Prod en Apache).',
        references: {
          owasp: [standardsService.owasp.A05_2021],
          cwe: [standardsService.cwe.CWE_200],
          iso: standardsService.iso.INFO_DISCLOSURE
        }
      })
    );
  }

  // ---- Regla: tecnología del backend en X-Powered-By ---------------------
  const poweredBy = input.headers['x-powered-by'];
  if (poweredBy) {
    disclosures.push({ source: 'header X-Powered-By', detail: poweredBy });
    findings.push(
      createFinding({
        key: 'EXP-POWERED-BY',
        title: 'Tecnología del servidor divulgada mediante X-Powered-By',
        severity: 'LOW',
        confidence: 'HIGH',
        description: 'La cabecera X-Powered-By revela tecnologías del backend.',
        evidence: `X-Powered-By: ${poweredBy}`,
        impact: 'Facilita el reconocimiento previo a un ataque al confirmar la pila tecnológica.',
        recommendation: 'Eliminar la cabecera X-Powered-By de las respuestas.',
        references: {
          owasp: [standardsService.owasp.A05_2021],
          cwe: [standardsService.cwe.CWE_200],
          iso: standardsService.iso.INFO_DISCLOSURE
        }
      })
    );
  }

  // ---- Regla: metadato generator en el HTML ------------------------------
  const generator = input.body.match(/<meta[^>]+name=["']generator["'][^>]+content=["']([^"']+)/i);
  if (generator) {
    disclosures.push({ source: 'meta generator', detail: generator[1] });
    findings.push(
      createFinding({
        key: 'EXP-META-GENERATOR',
        title: 'Metadato generator con información técnica',
        severity: 'INFORMATIONAL',
        confidence: 'HIGH',
        description: 'El HTML incluye una etiqueta meta generator que revela la tecnología utilizada.',
        evidence: `<meta name="generator" content="${generator[1]}">`,
        impact: 'Aporta información útil para la fase de reconocimiento de un atacante.',
        recommendation: 'Eliminar la etiqueta meta generator si no es necesaria.',
        references: {
          owasp: [standardsService.owasp.A05_2021],
          cwe: [standardsService.cwe.CWE_200],
          iso: standardsService.iso.INFO_DISCLOSURE
        }
      })
    );
  }

  // ---- Reglas: sondeos de rutas sensibles ---------------------------------
  const probesData: ExposureData['probes'] = [];

  for (const probe of input.probes) {
    // Un "hit" requiere código 200 Y contenido coherente con el recurso.
    const isHit = probe.status === 200 && !probe.error && evaluateProbeHit(probe.path, probe.bodySnippet);

    probesData.push({
      path: probe.path,
      status: probe.status,
      hit: Boolean(isHit),
      ...(probe.error ? { error: probe.error } : {})
    });

    if (!isHit) continue;

    switch (probe.path) {
      case '/.env':
        disclosures.push({ source: 'archivo expuesto', detail: probe.path });
        findings.push(
          createFinding({
            key: 'EXP-DOTENV-EXPOSED',
            title: 'Archivo .env accesible públicamente',
            severity: 'CRITICAL',
            confidence: 'HIGH',
            description:
              'Se pudo acceder al archivo /.env y su contenido parece incluir configuración sensible.',
            evidence: `GET ${probe.path} respondió 200. Fragmento: ${truncateEvidence(probe.bodySnippet)}`,
            impact:
              'Los archivos .env suelen contener credenciales de base de datos y claves secretas que comprometen todo el sistema.',
            recommendation:
              'Bloquear el acceso web a archivos de configuración y rotar inmediatamente todas las credenciales expuestas.',
            references: {
              owasp: [standardsService.owasp.A01_2021],
              cwe: [standardsService.cwe.CWE_200],
              iso: standardsService.iso.INFO_DISCLOSURE
            }
          })
        );
        break;

      case '/.git/HEAD':
        disclosures.push({ source: 'repositorio expuesto', detail: probe.path });
        findings.push(
          createFinding({
            key: 'EXP-GIT-EXPOSED',
            title: 'Repositorio Git expuesto públicamente',
            severity: 'HIGH',
            confidence: 'HIGH',
            description:
              'Se pudo acceder a /.git/HEAD indicando que el directorio del repositorio está publicado.',
            evidence: `GET ${probe.path} respondió 200. Contenido: ${truncateEvidence(probe.bodySnippet)}`,
            impact:
              'Un atacante puede reconstruir el código fuente completo incluyendo historial y posibles secretos.',
            recommendation:
              'Bloquear el acceso al directorio .git desde el servidor web y eliminarlo del despliegue público.',
            references: {
              owasp: [standardsService.owasp.A01_2021],
              cwe: [standardsService.cwe.CWE_200],
              iso: standardsService.iso.INFO_DISCLOSURE
            }
          })
        );
        break;

      case '/phpinfo.php':
        disclosures.push({ source: 'archivo expuesto', detail: probe.path });
        findings.push(
          createFinding({
            key: 'EXP-PHPINFO-EXPOSED',
            title: 'Página phpinfo() accesible públicamente',
            severity: 'HIGH',
            confidence: 'MEDIUM',
            description:
              'Se detectó un archivo phpinfo.php accesible que muestra información detallada del entorno PHP.',
            evidence: `GET ${probe.path} respondió 200.`,
            impact: 'phpinfo() expone rutas, versiones, variables de entorno y configuración interna del servidor.',
            recommendation: 'Eliminar phpinfo.php de producción y restringir cualquier diagnóstico similar.',
            references: {
              owasp: [standardsService.owasp.A05_2021],
              cwe: [standardsService.cwe.CWE_200],
              iso: standardsService.iso.INFO_DISCLOSURE
            }
          })
        );
        break;
    }
  }

  return { data: { disclosures, probes: probesData }, findings };
}
