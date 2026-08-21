/**
 * ============================================================================
 * MIDDLEWARE DE MANEJO DE ERRORES
 * ----------------------------------------------------------------------------
 * Último eslabón de la cadena de middleware de Express. Registra el error
 * completo en el log interno y responde al cliente con un mensaje genérico,
 * evitando exponer stack traces, credenciales o configuración (RNF-007).
 * ============================================================================
 */

import { NextFunction, Request, Response } from 'express';
import { AppError } from '../errors/app-error';
import { logger } from '../utils/logger.util';

/**
 * Manejador global de errores no controlados.
 *
 * @param error Error capturado por Express.
 * @param _req  Petición (no utilizada).
 * @param res   Respuesta HTTP.
 * @param _next Siguiente middleware (no utilizado).
 */
export function errorHandlerMiddleware(
  error: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  logger.error('Error no controlado en la API', error);

  // Los AppError son intencionales y su mensaje es seguro para el cliente.
  if (error instanceof AppError) {
    res.status(error.status).json({ error: error.message });
    return;
  }

  // Cualquier otro error se reporta de forma genérica.
  res.status(500).json({ error: 'Error interno del servidor' });
}
