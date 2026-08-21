/**
 * ============================================================================
 * MIDDLEWARE DE AUTENTICACIÓN JWT
 * ----------------------------------------------------------------------------
 * Verifica el token Bearer de las peticiones protegidas y expone los datos
 * del usuario autenticado en req.user. Si el token falta o es inválido,
 * responde 401 sin revelar detalles internos (RNF-007).
 * ============================================================================
 */

import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { UnauthorizedError } from '../errors/app-error';

/** Datos mínimos del usuario incrustados en el token. */
export interface AuthTokenPayload {
  /** Identificador del usuario (sub del JWT). */
  id: string;
  /** Email del usuario autenticado. */
  email: string;
}

// Aumenta el tipo Request de Express para transportar al usuario autenticado.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

/**
 * Firma un token JWT de sesión para el usuario indicado.
 *
 * @param payload Datos mínimos del usuario.
 */
export function signAuthToken(payload: AuthTokenPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresInSeconds
  });
}

/**
 * Verifica y decodifica un token JWT; lanza UnauthorizedError si es inválido
 * o está expirado.
 *
 * @param token Token recibido en la cabecera Authorization.
 */
export function verifyAuthToken(token: string): AuthTokenPayload {
  try {
    return jwt.verify(token, env.jwtSecret) as AuthTokenPayload;
  } catch {
    throw new UnauthorizedError('Sesión inválida o expirada');
  }
}

/**
 * Middleware que exige una sesión válida: extrae el token Bearer, lo
 * verifica y publica req.user para el resto de la cadena.
 */
export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  try {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedError('Debes iniciar sesión para continuar');
    }

    req.user = verifyAuthToken(token);
    next();
  } catch (error) {
    next(error);
  }
}
