/**
 * ============================================================================
 * REPOSITORIO DE TECNOLOGÍAS
 * ----------------------------------------------------------------------------
 * Acceso a los datos de tecnologías detectadas. En la V1 las tecnologías se
 * persisten como JSON dentro del registro de la auditoría; este repositorio
 * encapsula ese detalle para que el resto del módulo no dependa del esquema
 * físico (RNF-012).
 * ============================================================================
 */

import { prisma } from '../../database/prisma';

/**
 * Lee el JSON de tecnologías detectadas de una auditoría.
 *
 * @param auditId Identificador de la auditoría.
 * @returns Array crudo de tecnologías o array vacío si no hay datos.
 */
export async function findTechnologiesJson(auditId: string): Promise<unknown[]> {
  const audit = await prisma.audit.findUnique({
    where: { id: auditId },
    select: { technologiesJson: true }
  });

  if (!audit) {
    return [];
  }

  try {
    const parsed = JSON.parse(audit.technologiesJson);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
