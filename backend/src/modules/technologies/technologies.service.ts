/**
 * ============================================================================
 * SERVICIO DE TECNOLOGÍAS
 * ----------------------------------------------------------------------------
 * Lógica de consulta de tecnologías detectadas por auditoría (RF-011,
 * HU-006). Normaliza el JSON persistido al DTO del módulo.
 * ============================================================================
 */

import { NotFoundError } from '../../shared/errors/app-error';
// Repositorio de auditorías (capa hoja) para comprobar la propiedad.
import { findAuditOwner } from '../audits/audits.repository';
import { findTechnologiesJson } from './technologies.repository';
import { DetectedTechnologyDto } from './technologies.types';

/**
 * Devuelve las tecnologías detectadas en una auditoría propia.
 *
 * @param auditId Identificador de la auditoría.
 * @param userId  Propietario esperado de la auditoría.
 * @throws NotFoundError si la auditoría no existe o es de otro usuario.
 */
export async function getTechnologiesByAudit(
  auditId: string,
  userId: string
): Promise<DetectedTechnologyDto[]> {
  // Comprueba propiedad: distingue "auditoría inexistente" de "sin
  // tecnologías" sin revelar recursos ajenos (RNF-007).
  const owner = await findAuditOwner(auditId);
  if (!owner || owner.userId !== userId) {
    throw new NotFoundError('Auditoría no encontrada');
  }

  const raw = await findTechnologiesJson(auditId);

  // Normaliza cada entrada cruda al DTO garantizando tipos seguros.
  return raw.map((item) => normalizeTechnology(item as Record<string, unknown>));
}

/**
 * Convierte un objeto crudo en el DTO de tecnología con valores por defecto.
 *
 * @param value Objeto crudo proveniente del JSON persistido.
 */
function normalizeTechnology(value: Record<string, unknown>): DetectedTechnologyDto {
  return {
    name: String(value.name ?? 'Desconocida'),
    ...(value.version ? { version: String(value.version) } : {}),
    category: String(value.category ?? '-'),
    confidence: (value.confidence as DetectedTechnologyDto['confidence']) ?? 'LOW',
    source: String(value.source ?? '-')
  };
}
