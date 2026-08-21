/**
 * ============================================================================
 * CONTROLADOR DE HALLAZGOS
 * ----------------------------------------------------------------------------
 * Manejadores HTTP del módulo de hallazgos. No contiene lógica de negocio:
 * delega en findings.service.ts y da forma a las respuestas HTTP.
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { getFindingsByAudit } from './findings.service';

/**
 * GET /api/findings/audit/:auditId
 * Devuelve los hallazgos de una auditoría ordenados por riesgo.
 */
export async function getAuditFindings(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const findings = await getFindingsByAudit(req.params.auditId, req.user!.id);
    res.json({ count: findings.length, findings });
  } catch (error) {
    next(error);
  }
}
