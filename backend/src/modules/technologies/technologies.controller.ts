/**
 * ============================================================================
 * CONTROLADOR DE TECNOLOGÍAS
 * ----------------------------------------------------------------------------
 * Manejadores HTTP del módulo de tecnologías. Delega en technologies.service.
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { getTechnologiesByAudit } from './technologies.service';

/**
 * GET /api/technologies/audit/:auditId
 * Devuelve las tecnologías detectadas durante la auditoría indicada (RF-011).
 */
export async function getAuditTechnologies(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const technologies = await getTechnologiesByAudit(req.params.auditId, req.user!.id);
    res.json({ count: technologies.length, technologies });
  } catch (error) {
    next(error);
  }
}
