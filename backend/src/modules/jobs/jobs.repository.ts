/**
 * ============================================================================
 * REPOSITORIO DE LA COLA DE TRABAJOS
 * ----------------------------------------------------------------------------
 * Única capa que accede a la tabla ScanJob. Usa SQL en bruto con Prisma
 * porque la toma atómica de trabajos necesita FOR UPDATE SKIP LOCKED, una
 * primitiva de PostgreSQL que el ORM no expone de forma directa.
 *
 * Garantías:
 *   - Varias réplicas pueden reclamar trabajos a la vez sin duplicados.
 *   - Un trabajo RUNNING sin latido vuelve a PENDING.
 *   - Tras 3 intentos fallidos pasa a DEAD (no se reintenta para siempre).
 * ============================================================================
 */

import { randomUUID } from 'crypto';
import { prisma } from '../../database/prisma';
import { JobStatus, ScanJobRow } from './jobs.types';

/** Número máximo de intentos antes de declarar un trabajo muerto. */
export const MAX_JOB_ATTEMPTS = 3;

/**
 * Encola una auditoría. Es idempotente: si ya existe un trabajo para esa
 * auditoría no se crea otro (auditId es único).
 *
 * @param auditId Identificador de la auditoría a ejecutar.
 */
export async function enqueueJob(auditId: string): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "ScanJob" ("id", "auditId", "status", "attempts", "createdAt")
    VALUES (${randomUUID()}, ${auditId}, 'PENDING', 0, NOW())
    ON CONFLICT ("auditId") DO NOTHING
  `;
}

/**
 * Reclama atómicamente el trabajo PENDING más antiguo.
 *
 * El subconsulta bloquea la fila con FOR UPDATE SKIP LOCKED, de modo que dos
 * nodos concurrentes nunca obtienen el mismo trabajo.
 *
 * @param workerId Identificador del nodo que reclama.
 * @returns El trabajo reclamado o null si la cola está vacía.
 */
export async function claimNextJob(workerId: string): Promise<ScanJobRow | null> {
  const rows = await prisma.$queryRaw<ScanJobRow[]>`
    UPDATE "ScanJob"
    SET "status" = 'RUNNING',
        "workerId" = ${workerId},
        "attempts" = "attempts" + 1,
        "heartbeatAt" = NOW()
    WHERE "id" = (
      SELECT "id" FROM "ScanJob"
      WHERE "status" = 'PENDING'
      ORDER BY "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING "id", "auditId", "status", "workerId", "attempts", "heartbeatAt", "createdAt"
  `;
  return rows[0] ?? null;
}

/**
 * Renueva el latido de un trabajo en ejecución.
 *
 * @param jobId    Identificador del trabajo.
 * @param workerId Nodo propietario del trabajo.
 */
export async function heartbeatJob(jobId: string, workerId: string): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "ScanJob"
    SET "heartbeatAt" = NOW()
    WHERE "id" = ${jobId} AND "workerId" = ${workerId} AND "status" = 'RUNNING'
  `;
}

/**
 * Marca un trabajo como terminado (DONE) o muerto (DEAD).
 *
 * @param jobId  Identificador del trabajo.
 * @param status Estado final.
 */
export async function completeJob(jobId: string, status: 'DONE' | 'DEAD'): Promise<void> {
  await prisma.$executeRaw`
    UPDATE "ScanJob"
    SET "status" = ${status}, "heartbeatAt" = NOW()
    WHERE "id" = ${jobId}
  `;
}

/**
 * Recupera trabajos huérfanos: los que están RUNNING sin latido reciente.
 *
 * - Si aún les quedan intentos, vuelven a PENDING para que otro nodo los tome.
 * - Si ya agotaron MAX_JOB_ATTEMPTS, pasan a DEAD.
 *
 * @param staleSeconds Segundos sin latido para considerar huérfano un trabajo.
 * @returns Filas actualizadas (para registrar la reasignación).
 */
export async function requeueStaleJobs(staleSeconds: number): Promise<ScanJobRow[]> {
  return prisma.$queryRaw<ScanJobRow[]>`
    UPDATE "ScanJob"
    SET "status" = CASE
          WHEN "attempts" >= ${MAX_JOB_ATTEMPTS} THEN 'DEAD'
          ELSE 'PENDING'
        END,
        "workerId" = NULL,
        "heartbeatAt" = NULL
    WHERE "status" = 'RUNNING'
      AND ("heartbeatAt" IS NULL
           OR "heartbeatAt" < NOW() - (${staleSeconds}::int * INTERVAL '1 second'))
    RETURNING "id", "auditId", "status", "workerId", "attempts", "heartbeatAt", "createdAt"
  `;
}

/**
 * Devuelve a PENDING los trabajos que un nodo tenía en ejecución.
 * Se usa en el apagado ordenado para no esperar al timeout de latido.
 *
 * @param workerId Nodo que se está apagando.
 */
export async function releaseJobsForNode(workerId: string): Promise<ScanJobRow[]> {
  return prisma.$queryRaw<ScanJobRow[]>`
    UPDATE "ScanJob"
    SET "status" = 'PENDING', "workerId" = NULL, "heartbeatAt" = NULL
    WHERE "status" = 'RUNNING' AND "workerId" = ${workerId}
    RETURNING "id", "auditId", "status", "workerId", "attempts", "heartbeatAt", "createdAt"
  `;
}

/**
 * Cuenta trabajos por estado (diagnóstico y pruebas).
 *
 * @param status Estado a contar.
 */
export async function countJobs(status: JobStatus): Promise<number> {
  const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
    SELECT COUNT(*)::bigint AS count FROM "ScanJob" WHERE "status" = ${status}
  `;
  return Number(rows[0]?.count ?? 0);
}
