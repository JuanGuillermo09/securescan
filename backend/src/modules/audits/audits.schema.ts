/**
 * ============================================================================
 * ESQUEMA DE VALIDACIÓN DE AUDITORÍAS
 * ----------------------------------------------------------------------------
 * Validación y sanitización de entradas con Zod (RF-001, RF-002, RF-003,
 * RNF-005). Toda petición de creación de auditoría pasa por este esquema.
 * ============================================================================
 */

import { z } from 'zod';

/**
 * Esquema de creación de auditoría:
 *   - url: debe ser una URL absoluta válida con esquema http o https.
 *   - authorized: debe llegar exactamente como `true`; es la confirmación
 *     explícita de autorización sobre el objetivo (uso responsable, RNF-025).
 */
export const createAuditSchema = z.object({
  url: z
    .string()
    .trim()
    .min(1)
    .url('La URL no tiene un formato válido')
    .refine((value) => /^https?:\/\//i.test(value), {
      message: 'La URL debe comenzar por http:// o https://'
    }),
  authorized: z.literal(true, {
    errorMap: () => ({
      message: 'Debe confirmar que posee autorización para analizar el objetivo'
    })
  })
});

/** Tipo inferido del cuerpo validado. */
export type CreateAuditInput = z.infer<typeof createAuditSchema>;
