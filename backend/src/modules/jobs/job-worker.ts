/**
 * ============================================================================
 * CONSUMIDOR DE LA COLA DE TRABAJOS
 * ----------------------------------------------------------------------------
 * Sondea la cola de PostgreSQL, reclama trabajos y ejecuta el motor de
 * scanning con una concurrencia configurable por nodo. Mientras una
 * auditoría corre envía latidos para que otro nodo solo la reasigne si este
 * proceso desaparece de verdad.
 *
 * Se activa con QUEUE_MODE=true. Con QUEUE_MODE=false este módulo no hace
 * nada y la V1 sigue ejecutando en el mismo proceso.
 * ============================================================================
 */

import { env } from '../../config/env';
import { prisma } from '../../database/prisma';
import { logger } from '../../shared/utils/logger.util';
import { emitAuditEvent } from '../../shared/events';
import { runAudit } from '../../scanners/core/scanner.engine';
import { jobEvents } from './job-notifier';
import {
  claimNextJob,
  completeJob,
  countJobs,
  heartbeatJob,
  releaseJobsForNode,
  requeueStaleJobs
} from './jobs.repository';
import { ScanJobRow } from './jobs.types';

/** Temporizador del sondeo periódico. */
let pollTimer: NodeJS.Timeout | null = null;
/** Evita solapar dos ciclos de sondeo. */
let ticking = false;
/** Indica que el proceso está apagándose. */
let stopping = false;
/** Auditorías ejecutándose en este nodo ahora mismo. */
let inFlight = 0;

/**
 * Arranca el consumidor. No hace nada si QUEUE_MODE no está activo.
 */
export function startJobWorker(): void {
  if (!env.queueMode) {
    logger.info('QUEUE_MODE desactivado: las auditorías se ejecutan en el proceso');
    return;
  }

  stopping = false;
  logger.info('Consumidor de cola iniciado', {
    nodeId: env.nodeId,
    concurrency: env.jobConcurrency,
    pollMs: env.jobPollMs,
    staleSeconds: env.jobStaleSeconds
  });

  // Aviso inmediato cuando este mismo nodo encola una auditoría.
  jobEvents.on('available', () => void tick());

  void tick();
  pollTimer = setInterval(() => void tick(), env.jobPollMs);
}

/**
 * Detiene el consumidor de forma ordenada:
 *   1. deja de reclamar trabajos,
 *   2. espera hasta 5 s a los que están en vuelo,
 *   3. devuelve a PENDING los que sigan asignados a este nodo.
 */
export async function stopJobWorker(): Promise<void> {
  stopping = true;
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  const deadline = Date.now() + 5000;
  while (inFlight > 0 && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  try {
    const released = await releaseJobsForNode(env.nodeId);
    if (released.length > 0) {
      logger.warn(`Nodo ${env.nodeId} liberó ${released.length} trabajos al apagarse`, {
        auditIds: released.map((job) => job.auditId)
      });
    }
  } catch (error) {
    logger.error('No se pudieron liberar los trabajos del nodo al apagarse', error);
  }
}

/** Un ciclo de sondeo: recupera huérfanos y reclama hasta llenar la concurrencia. */
async function tick(): Promise<void> {
  if (stopping || ticking) return;
  ticking = true;

  try {
    await reclaimStaleJobs();

    while (!stopping && inFlight < env.jobConcurrency) {
      const job = await claimNextJob(env.nodeId);
      if (!job) break;

      inFlight += 1;
      logger.info(`Trabajo ${job.id} reclamado por ${env.nodeId}`, {
        auditId: job.auditId,
        attempt: job.attempts
      });

      void executeJob(job).finally(() => {
        inFlight -= 1;
      });
    }
  } catch (error) {
    logger.error('Error en el ciclo de sondeo de la cola', error);
  } finally {
    ticking = false;
  }
}

/**
 * Recupera trabajos RUNNING sin latido. Los que agotan intentos se marcan
 * DEAD y su auditoría pasa a FAILED para que nunca quede en RUNNING eterno.
 */
async function reclaimStaleJobs(): Promise<void> {
  const jobs = await requeueStaleJobs(env.jobStaleSeconds);

  for (const job of jobs) {
    if (job.status === 'DEAD') {
      logger.error(
        `Trabajo ${job.id} marcado DEAD tras ${job.attempts} intentos; auditoría ${job.auditId} pasa a FAILED`
      );
      await markAuditFailed(
        job.auditId,
        'La auditoría no pudo completarse: el nodo que la ejecutaba dejó de responder tras varios intentos.'
      );
      emitAuditEvent(job.auditId, 'FAILED', { reason: 'job-dead', attempts: job.attempts });
    } else {
      logger.warn(
        `Trabajo huérfano ${job.id} reasignado a PENDING (auditoría ${job.auditId}, intento ${job.attempts})`
      );
    }
  }
}

/** Ejecuta una auditoría manteniendo su latido mientras corre. */
async function executeJob(job: ScanJobRow): Promise<void> {
  const heartbeat = setInterval(() => {
    void heartbeatJob(job.id, env.nodeId).catch((error) =>
      logger.warn(`No se pudo renovar el latido del trabajo ${job.id}`, error)
    );
  }, env.jobHeartbeatMs);

  try {
    await runAudit(job.auditId);
    await completeJob(job.id, 'DONE');
    logger.info(`Trabajo ${job.id} completado por ${env.nodeId}`, { auditId: job.auditId });
  } catch (error) {
    // runAudit ya captura sus errores; esto cubre fallos de infraestructura.
    logger.error(`Trabajo ${job.id} falló en ${env.nodeId}`, error);
    await completeJob(job.id, 'DEAD').catch(() => undefined);
    await markAuditFailed(
      job.auditId,
      'La auditoría no pudo completarse debido a un error interno del análisis.'
    );
    emitAuditEvent(job.auditId, 'FAILED', {
      reason: error instanceof Error ? error.message : 'job-error'
    });
  } finally {
    clearInterval(heartbeat);
  }
}

/**
 * Marca como FAILED una auditoría que quedó sin ejecutor.
 *
 * @param auditId Identificador de la auditoría.
 * @param message Mensaje seguro para el usuario.
 */
async function markAuditFailed(auditId: string, message: string): Promise<void> {
  await prisma.audit
    .updateMany({
      where: { id: auditId, status: { in: ['PENDING', 'RUNNING'] } },
      data: { status: 'FAILED', finishedAt: new Date(), errorMessage: message }
    })
    .catch((error) => logger.error(`No se pudo marcar FAILED la auditoría ${auditId}`, error));
}

/**
 * Devuelve un resumen de la cola para logs de arranque/diagnóstico.
 */
export async function jobQueueSummary(): Promise<Record<string, number>> {
  const [pending, running, done, dead] = await Promise.all([
    countJobs('PENDING'),
    countJobs('RUNNING'),
    countJobs('DONE'),
    countJobs('DEAD')
  ]);
  return { pending, running, done, dead };
}
