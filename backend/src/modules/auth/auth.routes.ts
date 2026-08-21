/**
 * ============================================================================
 * RUTAS DEL MÓDULO DE AUTENTICACIÓN
 * ----------------------------------------------------------------------------
 * Define los endpoints HTTP expuestos bajo /api/auth. Registro y login son
 * públicos; la consulta del usuario actual exige un token válido.
 * ============================================================================
 */

import { Router } from 'express';
import { loginHandler, meHandler, registerHandler } from './auth.controller';
import { requireAuth } from '../../shared/middleware/jwt-auth.middleware';

/** Enrutador montado por app.ts bajo el prefijo /api/auth. */
export const authRouter = Router();

/** Registra una cuenta nueva. */
authRouter.post('/register', registerHandler);

/** Inicia sesión y entrega el token JWT. */
authRouter.post('/login', loginHandler);

/** Devuelve el usuario autenticado (requiere token). */
authRouter.get('/me', requireAuth, meHandler);
