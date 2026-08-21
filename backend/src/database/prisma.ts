/**
 * ============================================================================
 * CLIENTE PRISMA (INSTANCIA ÚNICA)
 * ----------------------------------------------------------------------------
 * Punto único de acceso a la base de datos. Toda la aplicación comparte esta
 * instancia para reutilizar el pool de conexiones. Los repositorios de cada
 * módulo consumen este cliente; nunca lo usan directamente los controladores
 * (separación de responsabilidades, RNF-012).
 * ============================================================================
 */

import { PrismaClient } from '@prisma/client';
import { databaseConfig } from '../config/database';
import { logger } from '../shared/utils/logger.util';

/**
 * Instancia compartida del cliente Prisma.
 * Se fuerza la URL de conexión desde la configuración centralizada.
 */
export const prisma = new PrismaClient({
  datasourceUrl: databaseConfig.url,
  log: [
    { emit: 'event', level: 'warn' },
    { emit: 'event', level: 'error' }
  ]
});

// Los avisos y errores de la base de datos se envían al logger centralizado.
prisma.$on('warn' as never, (e) => logger.warn('Prisma warn', e));
prisma.$on('error' as never, (e) => logger.error('Prisma error', e));
