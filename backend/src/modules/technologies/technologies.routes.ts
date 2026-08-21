/**
 * ============================================================================
 * RUTAS DEL MÓDULO DE TECNOLOGÍAS
 * ----------------------------------------------------------------------------
 * Define los endpoints HTTP expuestos bajo /api/technologies.
 * ============================================================================
 */

import { Router } from 'express';
import { getAuditTechnologies } from './technologies.controller';
import { requireAuth } from '../../shared/middleware/jwt-auth.middleware';

/** Enrutador montado por app.ts bajo el prefijo /api/technologies. */
export const technologiesRouter = Router();

/** Consulta las tecnologías detectadas en una auditoría propia. */
technologiesRouter.get('/audit/:auditId', requireAuth, getAuditTechnologies);
