/**
 * ============================================================================
 * RUTAS DEL MÓDULO DE AUDITORÍAS
 * ----------------------------------------------------------------------------
 * Define los endpoints HTTP expuestos bajo /api/audits.
 * El rate limiting es selectivo (RNF-006): la cuota estricta se reserva a
 * los escaneos (operación costosa); las lecturas usan una cuota amplia para
 * no bloquear la navegación normal del frontend.
 * ============================================================================
 */

import { Router } from 'express';
import {
  createAuditHandler,
  deleteAllAuditsHandler,
  deleteAuditHandler,
  getAuditHandler,
  listAuditsHandler
} from './audits.controller';
import {
  createReadRateLimiter,
  createScanRateLimiter
} from '../../shared/middleware/rate-limiter.middleware';
import { requireAuth } from '../../shared/middleware/jwt-auth.middleware';

/** Enrutador montado por app.ts bajo el prefijo /api/audits. */
export const auditsRouter = Router();

// Todas las operaciones de auditoría exigen una sesión válida: el historial
// es privado y cada auditoría pertenece a su creador.
auditsRouter.use(requireAuth);

// Cuota estricta: solo para iniciar escaneos (20 por ventana).
const scanLimiter = createScanRateLimiter();
// Cuota amplia: navegación y borrados puntuales (300 por ventana).
const readLimiter = createReadRateLimiter();

/** Inicia una nueva auditoría sobre un objetivo autorizado. */
auditsRouter.post('/', scanLimiter, createAuditHandler);

/** Lista el historial de auditorías. */
auditsRouter.get('/', readLimiter, listAuditsHandler);

/** Consulta el detalle completo de una auditoría. */
auditsRouter.get('/:id', readLimiter, getAuditHandler);

/** Elimina todas las auditorías del usuario (los ejemplos se conservan). */
auditsRouter.delete('/', readLimiter, deleteAllAuditsHandler);

/** Elimina una auditoría propia (el ejemplo responde 409). */
auditsRouter.delete('/:id', readLimiter, deleteAuditHandler);
