/**
 * ============================================================================
 * ARRANQUE DEL SERVIDOR
 * ----------------------------------------------------------------------------
 * Punto de entrada del backend: conecta la base de datos, levanta la
 * aplicación Express en el puerto configurado y registra manejadores globales
 * de promesas rechazadas.
 * ============================================================================
 */

import { createApp } from './app';
import { prisma } from './database/prisma';
import { env } from './config/env';
import { logger } from './shared/utils/logger.util';
import { startJobWorker, stopJobWorker } from './modules/jobs/job-worker';
import { shutdownAnalyzerPool } from './scanners/core/analyzer-runner';

/** Evita ejecutar dos veces la secuencia de apagado. */
let shuttingDown = false;

/**
 * Secuencia de arranque principal.
 */
async function main(): Promise<void> {
  await prisma.$connect();
  const app = createApp();
  app.listen(env.port, () => {
    logger.info(
      `SecureScan backend escuchando en http://localhost:${env.port} (nodo ${env.nodeId})`
    );
    // En modo distribuido, este proceso también consume la cola.
    startJobWorker();
  });
}

/**
 * Apagado ordenado: deja de consumir la cola, libera los trabajos en vuelo,
 * cierra los hilos del pool y desconecta Prisma.
 *
 * @param signal Señal recibida (SIGTERM/SIGINT).
 */
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`Recibida señal ${signal}; iniciando apagado ordenado`);
  await stopJobWorker();
  await shutdownAnalyzerPool();
  await prisma.$disconnect().catch(() => undefined);
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));

// Registro global de promesas rechazadas sin manejar.
process.on('unhandledRejection', (reason) => {
  logger.error('Promesa rechazada no manejada', reason);
});

main().catch((error) => {
  logger.error('No fue posible iniciar el servidor', error);
  process.exit(1);
});
