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

/**
 * Secuencia de arranque principal.
 */
async function main(): Promise<void> {
  await prisma.$connect();
  const app = createApp();
  app.listen(env.port, () => {
    logger.info(`SecureScan backend escuchando en http://localhost:${env.port}`);
  });
}

// Registro global de promesas rechazadas sin manejar.
process.on('unhandledRejection', (reason) => {
  logger.error('Promesa rechazada no manejada', reason);
});

main().catch((error) => {
  logger.error('No fue posible iniciar el servidor', error);
  process.exit(1);
});
