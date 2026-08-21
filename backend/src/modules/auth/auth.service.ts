/**
 * ============================================================================
 * SERVICIO DE AUTENTICACIÓN
 * ----------------------------------------------------------------------------
 * Lógica de negocio del módulo: registro con hash de contraseña (bcrypt),
 * verificación de credenciales y emisión de tokens de sesión (JWT).
 * ============================================================================
 */

import bcrypt from 'bcryptjs';
import { User } from '@prisma/client';
import { ConflictError, UnauthorizedError } from '../../shared/errors/app-error';
import { signAuthToken } from '../../shared/middleware/jwt-auth.middleware';
import { logger } from '../../shared/utils/logger.util';
import { createExampleAuditForUser } from '../audits/audits.service';
import {
  createUser,
  findUserByEmail
} from './auth.repository';
import { AuthResponse, UserDto } from './auth.types';
import { LoginInput, RegisterInput } from './auth.schema';

/** Rondas de coste del hash bcrypt (equilibrio seguridad/latencia). */
const BCRYPT_ROUNDS = 10;

/**
 * Convierte una fila de usuario en su DTO público (sin hash).
 *
 * @param user Fila cruda de la tabla User.
 */
export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName
  };
}

/**
 * Registra un nuevo usuario. El correo debe ser único; la contraseña se
 * almacena únicamente como hash bcrypt (nunca en claro).
 *
 * @param input Credenciales validadas por el esquema.
 */
export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new ConflictError('Ya existe una cuenta con este correo');
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  const user = await createUser({
    email: input.email,
    passwordHash,
    displayName: input.displayName
  });

  // Regala una auditoría de ejemplo ya completada para que la cuenta nueva
  // compruebe el funcionamiento sin lanzar nada. Es best-effort: un fallo
  // aquí no debe impedir el registro.
  try {
    await createExampleAuditForUser(user.id);
  } catch (error) {
    logger.warn(
      `No se pudo crear la auditoría de ejemplo para ${user.email}: ${
        error instanceof Error ? error.message : 'error desconocido'
      }`
    );
  }

  return {
    token: signAuthToken({ id: user.id, email: user.email }),
    user: toUserDto(user)
  };
}

/**
 * Verifica las credenciales y abre una sesión (token JWT).
 * El mensaje de error es deliberadamente genérico para no revelar si el
 * correo existe o no (RNF-007).
 *
 * @param input Credenciales validadas por el esquema.
 */
export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  const user = await findUserByEmail(input.email);
  if (!user) {
    throw new UnauthorizedError('Correo o contraseña incorrectos');
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new UnauthorizedError('Correo o contraseña incorrectos');
  }

  return {
    token: signAuthToken({ id: user.id, email: user.email }),
    user: toUserDto(user)
  };
}
