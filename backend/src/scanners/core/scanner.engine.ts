/**
 * ============================================================================
 * MOTOR DE SCANNING
 * ----------------------------------------------------------------------------
 * Orquestador central de una auditoría (RF-005, RF-006):
 *
 *   1. Marca la auditoría como RUNNING.
 *   2. Recolecta datos del objetivo en paralelo (página principal, variante
 *      HTTP, información TLS y sondeos de rutas sensibles).
 *   3. Ejecuta cada analizador de forma aislada: si uno falla se conserva el
 *      resto de resultados (RF-032 / RNF-008).
 *   4. Convierte los problemas detectados en hallazgos estructurados.
 *   5. Calcula el Security Score con el motor de riesgos.
 *   6. Persiste todo el resultado en la base de datos.
 *
 * El análisis es asíncrono: la API responde inmediatamente tras crear la
 * auditoría y esta función corre en segundo plano (RNF-013).
 * ============================================================================
 */

import { prisma } from '../../database/prisma';
import { logger } from '../../shared/utils/logger.util';
import { fetchPage, probePath } from '../../shared/utils/http-client.util';
import { PROBE_PATHS } from '../../shared/constants/app.constants';
import { ScanContext } from './scanner.types';
import { collectTlsInfo } from '../tls/tls.scanner';
import { analyzeTls } from '../tls/tls.rules';
import { analyzeHeaders } from '../headers/headers.scanner';
import { analyzeCookies } from '../cookies/cookies.scanner';
import { analyzeHttp } from '../http/http.scanner';
import { analyzeTechnology } from '../technology/technology.scanner';
import { analyzeExposure } from '../exposure/exposure.scanner';
import { runAnalyzer } from './scanner.utils';
import { buildFindings } from '../../modules/findings/findings.service';
import { calculateRisk } from '../../risk-engine/risk.engine';
import { saveAuditResults } from '../../modules/audits/audits.repository';

/**
 * Ejecuta una auditoría completa sobre el objetivo registrado en la base de
 * datos. Nunca lanza excepciones hacia el llamador: cualquier error crítico
 * se traduce en estado FAILED con un mensaje seguro (RF-031).
 *
 * @param auditId Identificador de la auditoría a ejecutar.
 */
export async function runAudit(auditId: string): Promise<void> {
  const audit = await prisma.audit.findUnique({ where: { id: auditId } });
  if (!audit) return;

  // Estado inicial del análisis visible para el usuario.
  await prisma.audit.update({ where: { id: auditId }, data: { status: 'RUNNING' } });

  try {
    const targetUrl = new URL(audit.url);
    const origin = targetUrl.origin;
    const isHttpsTarget = targetUrl.protocol === 'https:';

    // ---- Fase 1: recolección paralela e independiente -------------------
    // Cada tarea tolera su propio fallo sin afectar a las demás.
    const [page, plainHttp, tlsInfo, ...probes] = await Promise.all([
      fetchPage(audit.url),
      isHttpsTarget ? fetchPage(`http://${targetUrl.host}/`, { followRedirects: false }) : null,
      collectTlsInfo(targetUrl.hostname),
      ...PROBE_PATHS.map((path) => probePath(origin, path))
    ]);

    const context: ScanContext = {
      url: audit.url,
      origin,
      domain: audit.domain,
      isHttpsTarget,
      page,
      plainHttp,
      tls: tlsInfo,
      probes
    };

    // ---- Fase 2: ejecución aislada de cada analizador --------------------
    const results = [
      runAnalyzer('tls', (ctx) => {
        // ¿La variante HTTP redirige automáticamente hacia HTTPS?
        const plainHttpRedirectsToHttps =
          ctx.plainHttp?.redirects.some(
            (r) => r.status >= 300 && r.status < 400 && r.location.startsWith('https://')
          ) ?? false;
        return analyzeTls({
          isHttpsTarget: ctx.isHttpsTarget,
          domain: ctx.domain,
          pageFetchedOk: Boolean(ctx.page?.ok),
          plainHttpRedirectsToHttps,
          tls: ctx.tls
        });
      }, context),

      runAnalyzer('headers', (ctx) => {
        // Sin respuesta HTTP no hay cabeceras que analizar: reportar
        // "ausente" sería un falso positivo (RF-031).
        if (!ctx.page?.status) throw new Error('objetivo sin respuesta HTTP');
        return analyzeHeaders({ headers: ctx.page.headers, isHttpsTarget: ctx.isHttpsTarget });
      }, context),

      runAnalyzer('cookies', (ctx) => {
        if (!ctx.page?.status) throw new Error('objetivo sin respuesta HTTP');
        return analyzeCookies({
          setCookies: ctx.page.setCookies,
          isHttpsTarget: ctx.isHttpsTarget
        });
      }, context),

      runAnalyzer('http', (ctx) => analyzeHttp({ page: ctx.page, isHttpsTarget: ctx.isHttpsTarget }), context),

      runAnalyzer('technology', (ctx) => {
        if (!ctx.page?.status) throw new Error('objetivo sin respuesta HTTP');
        return analyzeTechnology({
          headers: ctx.page.headers,
          setCookieNames: ctx.page.setCookies.map((c) => c.name),
          body: ctx.page.body
        });
      }, context),

      runAnalyzer('exposure', (ctx) => {
        if (!ctx.page?.status) throw new Error('objetivo sin respuesta HTTP');
        return analyzeExposure({
          headers: ctx.page.headers,
          body: ctx.page.body,
          probes: ctx.probes
        });
      }, context)
    ];

    // ---- Fase 3: hallazgos estructurados y evaluación de riesgo ----------
    const drafts = results.flatMap((r) => r.findings);
    const findings = buildFindings(drafts);
    const risk = calculateRisk(findings);

    // Errores por analizador para trazabilidad y aviso al usuario.
    const analyzerErrors = results
      .filter((r) => !r.ok && r.error)
      .map((r) => ({ analyzer: r.name, error: r.error as string }));

    // Resultados crudos por analizador para el dashboard.
    const rawResults: Record<string, unknown> = {};
    for (const result of results) {
      if (result.ok) {
        rawResults[result.name] = result.data;
      }
    }

    // Si ni siquiera hubo respuesta HTTP el análisis se marca como fallido,
    // conservando igualmente los resultados parciales obtenidos (RF-031).
    const totalFailure = !page || (!page.ok && !page.status);
    const status = totalFailure ? 'FAILED' : 'COMPLETED';
    const errorMessage = totalFailure
      ? 'El objetivo no respondió al análisis. Verifique la URL y la disponibilidad del sitio.'
      : null;

    // ---- Fase 4: persistencia atómica del resultado -----------------------
    await saveAuditResults(auditId, {
      status,
      score: risk.score,
      grade: risk.grade,
      counts: risk.counts,
      technologies: extractTechnologies(rawResults),
      rawResults,
      analyzerErrors,
      errorMessage,
      findings
    });

    logger.info(`Auditoría ${auditId} finalizada`, {
      status,
      score: risk.score,
      findings: findings.length
    });
  } catch (error) {
    // Fallo inesperado del motor: se registra y la auditoría queda FAILED.
    logger.error(`Auditoría ${auditId} falló inesperadamente`, error);
    await prisma.audit
      .update({
        where: { id: auditId },
        data: {
          status: 'FAILED',
          finishedAt: new Date(),
          errorMessage: 'La auditoría no pudo completarse debido a un error interno del análisis.'
        }
      })
      .catch(() => undefined);
  }
}

/**
 * Extrae la lista de tecnologías detectadas desde los resultados crudos del
 * analizador de tecnologías.
 *
 * @param rawResults Mapa nombre→datos de cada analizador exitoso.
 */
function extractTechnologies(rawResults: Record<string, unknown>): unknown[] {
  const technology = rawResults.technology as
    | { technologies?: unknown[] }
    | undefined;
  return technology?.technologies ?? [];
}
