/**
 * ============================================================================
 * REPOSITORIO DE AUTENTICACIÓN
 * ----------------------------------------------------------------------------
 * Única capa que accede a la tabla User. Aísla al resto de la aplicación
 * del ORM y del esquema (RNF-012, RNF-016).
 * ============================================================================
 */

import { User } from '@prisma/client';
import { prisma } from '../../database/prisma';

/** Datos mínimos para crear un usuario. */
export interface CreateUserData {
  email: string;
  passwordHash: string;
  displayName?: string;
}

/**
 * Crea un usuario nuevo.
 *
 * @param data Email, hash de contraseña y nombre opcional.
 */
export async function createUser(data: CreateUserData): Promise<User> {
  return prisma.user.create({
    data: {
      email: data.email,
      passwordHash: data.passwordHash,
      ...(data.displayName ? { displayName: data.displayName } : {})
    }
  });
}

/**
 * Busca un usuario por su correo electrónico.
 *
 * @param email Correo ya normalizado (minúsculas).
 */
export async function findUserByEmail(email: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { email } });
}

/**
 * Busca un usuario por su identificador.
 *
 * @param id Identificador del usuario.
 */
export async function findUserById(id: string): Promise<User | null> {
  return prisma.user.findUnique({ where: { id } });
}
