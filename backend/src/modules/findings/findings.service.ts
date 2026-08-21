/**
 * ============================================================================
 * SERVICIO DE HALLAZGOS
 * ----------------------------------------------------------------------------
 * Lógica de negocio del módulo:
 *   - buildFindings: convierte los borradores de los analizadores en
 *     hallazgos estructurados con ID público (RF-014, RF-017).
 *   - getFindingsByAudit: consulta los hallazgos persistidos de una
 *     auditoría para la API (RF-024).
 * ============================================================================
 */

import { NotFoundError } from '../../shared/errors/app-error';
import { CONFIDENCE_ORDER, SEVERITY_ORDER } from '../../shared/constants/app.constants';
import { calculateFindingRisk } from '../../risk-engine/risk.engine';
import { ScoredFinding } from '../../risk-engine/risk.types';
// Se importa el repositorio de auditorías (capa hoja, sin riesgo de
// dependencia circular con el motor de scanning).
import { findAuditOwner } from '../audits/audits.repository';
import { findByAudit } from './findings.repository';
import { FindingDraft, FindingDto } from './findings.types';

/**
 * Convierte borradores en hallazgos finales:
 *   1. Deduplica por clave de regla (la primera aparición gana).
 *   2. Ordena por severidad y luego por confianza.
 *   3. Cuantifica el riesgo (Impacto × Probabilidad × Exposición).
 *   4. Asigna IDs públicos secuenciales SEC-001, SEC-002...
 *
 * @param drafts Borradores producidos por todos los analizadores.
 */
export function buildFindings(drafts: FindingDraft[]): ScoredFinding[] {
  // Deduplicación: varias reglas pueden emitir el mismo key.
  const unique = new Map<string, FindingDraft>();
  for (const draft of drafts) {
    if (!unique.has(draft.key)) {
      unique.set(draft.key, draft);
    }
  }

  // Ordenamiento por riesgo: severidad primero, confianza después.
  const sorted = Array.from(unique.values()).sort((a, b) => {
    const severityDiff = SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity];
    if (severityDiff !== 0) return severityDiff;
    return CONFIDENCE_ORDER[a.confidence] - CONFIDENCE_ORDER[b.confidence];
  });

  // Cuantificación + asignación de identificadores públicos SEC-xxx
  // (trazabilidad, RNF-015).
  return sorted.map((draft, index) => ({
    ...draft,
    ...calculateFindingRisk(draft),
    refId: `SEC-${String(index + 1).padStart(3, '0')}`
  }));
}

/**
 * Consulta los hallazgos de una auditoría propia.
 *
 * @param auditId Identificador de la auditoría.
 * @param userId  Propietario esperado de la auditoría.
 * @throws NotFoundError si la auditoría no existe o es de otro usuario.
 */
export async function getFindingsByAudit(
  auditId: string,
  userId: string
): Promise<FindingDto[]> {
  // Comprueba propiedad: distingue "auditoría inexistente" de "sin
  // hallazgos" sin revelar recursos ajenos (RNF-007).
  const owner = await findAuditOwner(auditId);
  if (!owner || owner.userId !== userId) {
    throw new NotFoundError('Auditoría no encontrada');
  }

  return findByAudit(auditId);
}
