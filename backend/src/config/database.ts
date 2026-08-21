/**
 * ============================================================================
 * CONFIGURACIÓN DE BASE DE DATOS
 * ----------------------------------------------------------------------------
 * Separa la configuración de conexión (este archivo) de la instancia del
 * cliente Prisma (database/prisma.ts). Permite cambiar el motor —SQLite por
 * defecto, PostgreSQL opcional— sin tocar el resto del código (RNF-017,
 * RNF-028).
 * ============================================================================
 */

import { env } from './env';

/** Configuración de conexión utilizada por el cliente Prisma. */
export const databaseConfig = {
  /** URL de conexión leída del entorno con fallback local. */
  url: env.databaseUrl,

  /**
   * Proveedor lógico declarado en prisma/schema.prisma.
   * Solo informativo para logs y documentación.
   */
  provider: 'sqlite' as const
};

/**
 * Abre la conexión a la base de datos.
 * Debe invocarse una única vez durante el arranque del servidor.
 */
export async function connectDatabase(): Promise<void> {
  const { prisma } = await import('../database/prisma');
  await prisma.$connect();
}

/**
 * Cierra la conexión a la base de datos de forma ordenada.
 * Útil en pruebas y apagado controlado del proceso.
 */
export async function disconnectDatabase(): Promise<void> {
  const { prisma } = await import('../database/prisma');
  await prisma.$disconnect();
}
