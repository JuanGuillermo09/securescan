/**
 * ============================================================================
 * CONTROLADOR DE AUTENTICACIÓN
 * ----------------------------------------------------------------------------
 * Manejadores HTTP del módulo. Validan la entrada con los esquemas Zod,
 * delegan en auth.service.ts y propagan errores al middleware global.
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { loginSchema, registerSchema } from './auth.schema';
import { loginUser, registerUser } from './auth.service';
import { findUserById } from './auth.repository';
import { toUserDto } from './auth.service';
import { NotFoundError } from '../../shared/errors/app-error';

/**
 * POST /api/auth/register
 * Crea una cuenta nueva y devuelve el token de sesión.
 */
export async function registerHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = registerSchema.safeParse(req.body);
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

    res.status(201).json(await registerUser(parsed.data));
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 * Verifica credenciales y devuelve el token de sesión.
 */
export async function loginHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const parsed = loginSchema.safeParse(req.body);
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

    res.json(await loginUser(parsed.data));
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/me
 * Devuelve el usuario autenticado según el token recibido.
 */
export async function meHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      throw new NotFoundError('Usuario no encontrado');
    }
    const user = await findUserById(req.user.id);
    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }
    res.json(toUserDto(user));
  } catch (error) {
    next(error);
  }
}
