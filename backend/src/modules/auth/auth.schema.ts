/**
 * ============================================================================
 * ESQUEMA DE VALIDACIÓN DE AUTENTICACIÓN
 * ----------------------------------------------------------------------------
 * Validación de credenciales con Zod (RNF-005): formato de email y política
 * mínima de contraseña.
 * ============================================================================
 */

import { z } from 'zod';

/**
 * Esquema de registro:
 *   - email: formato válido, en minúsculas para evitar duplicados por caso.
 *   - password: mínimo 8 caracteres (política básica de la V1).
 *   - displayName: opcional, nombre visible en la interfaz.
 */
export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('El correo no tiene un formato válido')
    .max(120),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(72),
  displayName: z.string().trim().max(60).optional()
});

/** Esquema de inicio de sesión. */
export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('El correo no tiene un formato válido'),
  password: z.string().min(1, 'La contraseña es obligatoria')
});

/** Tipos inferidos de los esquemas. */
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
