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
import { executeAnalyzers } from './analyzer-runner';
import { emitAuditEvent } from '../../shared/events';
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
  emitAuditEvent(auditId, 'RUNNING');

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
    // El runner decide entre hilo principal (secuencial) o pool de hilos.
    // En ambos caminos cada analizador falla de forma aislada (RF-032).
    const results = await executeAnalyzers(context);

    // ---- Fase 3: hallazgos estructurados y evaluación de riesgo ----------
    // Si ni siquiera hubo respuesta HTTP no se generan hallazgos: reportar
    // cabeceras/TLS "ausentes" sobre un objetivo caído sería un falso
    // positivo (RF-031). Sí se conservan los errores por analizador.
    const totalFailure = !page || (!page.ok && !page.status);
    const drafts = totalFailure ? [] : results.flatMap((r) => r.findings);
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
    // conservando los resultados crudos parciales pero sin hallazgos.
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
    emitAuditEvent(auditId, status, {
      score: risk.score,
      findings: findings.length,
      analyzerErrors: analyzerErrors.length
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
    emitAuditEvent(auditId, 'FAILED', {
      reason: error instanceof Error ? error.message : 'error interno'
    });
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
