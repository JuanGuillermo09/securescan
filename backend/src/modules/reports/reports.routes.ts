/**
 * ============================================================================
 * RUTAS DEL MÓDULO DE INFORMES
 * ----------------------------------------------------------------------------
 * Define los endpoints HTTP expuestos bajo /api/reports.
 * ============================================================================
 */

import { Router } from 'express';
import { downloadReportHandler } from './reports.controller';
import { requireAuth } from '../../shared/middleware/jwt-auth.middleware';

/** Enrutador montado por app.ts bajo el prefijo /api/reports. */
export const reportsRouter = Router();

/** Descarga el informe PDF de una auditoría propia finalizada. */
reportsRouter.get('/:auditId/report.pdf', requireAuth, downloadReportHandler);
