/**
 * ============================================================================
 * CONTROLADOR DE AUDITORÍAS
 * ----------------------------------------------------------------------------
 * Manejadores HTTP del módulo. Validan la entrada con el esquema Zod,
 * delegan en audits.service.ts y devuelven respuestas HTTP seguras.
 * Los errores se propagan al middleware global mediante next(error).
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { createAuditSchema } from './audits.schema';
import {
  deleteAllAudits,
  deleteAudit,
  getAuditDetail,
  listAudits,
  startAudit
} from './audits.service';

/**
 * POST /api/audits
 * Crea una auditoría y lanza el análisis asíncrono (RF-001 a RF-005).
 */
export async function createAuditHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Validación y sanitización de la entrada (RNF-005).
    const parsed = createAuditSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({
        error: 'Datos inválidos',
        details: parsed.error.issues.map((issue) => ({
          field: issue.path.join('.'),
          message: issue.message
        }))
      });
      return;
    }

    const audit = await startAudit(parsed.data.url, req.user!.id);
    res.status(201).json(audit);
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/audits
 * Devuelve el historial de auditorías del usuario autenticado (RF-028, RF-029).
 */
export async function listAuditsHandler(
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.json(await listAudits(_req.user!.id));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/audits/:id
 * Devuelve el detalle completo de una auditoría propia (RF-023, RF-024).
 */
export async function getAuditHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    res.json(await getAuditDetail(req.params.id, req.user!.id));
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/audits/:id
 * Elimina una auditoría propia. El ejemplo responde 409 (RF-029).
 */
export async function deleteAuditHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await deleteAudit(req.params.id, req.user!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
}

/**
 * DELETE /api/audits
 * Elimina todas las auditorías del usuario excepto los ejemplos (RF-029).
 */
export async function deleteAllAuditsHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const deleted = await deleteAllAudits(req.user!.id);
    res.json({ deleted });
  } catch (error) {
    next(error);
  }
}
