/**
 * ============================================================================
 * RUTAS DEL MÓDULO DE HALLAZGOS
 * ----------------------------------------------------------------------------
 * Define los endpoints HTTP expuestos bajo /api/findings.
 * ============================================================================
 */

import { Router } from 'express';
import { getAuditFindings } from './findings.controller';
import { requireAuth } from '../../shared/middleware/jwt-auth.middleware';

/** Enrutador montado por app.ts bajo el prefijo /api/findings. */
export const findingsRouter = Router();

/** Consulta los hallazgos de una auditoría propia. */
findingsRouter.get('/audit/:auditId', requireAuth, getAuditFindings);
