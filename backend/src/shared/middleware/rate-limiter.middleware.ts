/**
 * ============================================================================
 * MIDDLEWARE DE RATE LIMITING
 * ----------------------------------------------------------------------------
 * Limita la cantidad de auditorías que un cliente puede iniciar por ventana
 * de tiempo, protegiendo al sistema contra uso abusivo del scanner (RNF-006).
 * Los valores se configuran mediante variables de entorno.
 * ============================================================================
 */

import rateLimit from 'express-rate-limit';
import { env } from '../../config/env';

/**
 * Crea el limitador de peticiones para los endpoints que inician análisis.
 */
export function createScanRateLimiter() {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.rateLimitMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas auditorías iniciadas. Inténtelo más tarde.' }
  });
}

/**
 * Limitador amplio para operaciones de lectura y borrado del historial.
 * Consultar el detalle o la lista es barato y el frontend lo repite en
 * cada recarga de página, por lo que no debe compartir la cuota estricta
 * reservada a los escaneos (RNF-006).
 */
export function createReadRateLimiter() {
  return rateLimit({
    windowMs: env.rateLimitWindowMs,
    limit: env.rateLimitReadMax,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { error: 'Demasiadas consultas. Inténtelo más tarde.' }
  });
}
