/**
 * ============================================================================
 * TIPOS DEL ANALIZADOR DE COOKIES
 * ----------------------------------------------------------------------------
 * Estructuras de datos propias del análisis de cookies (RF-009, HU-005).
 * ============================================================================
 */

import { ParsedCookie } from '../../shared/utils/http-client.util';

/** Datos estructurados que el analizador expone al dashboard. */
export interface CookiesData {
  /** Cantidad total de cookies recibidas. */
  total: number;
  /** Resumen de cada cookie con sus atributos de seguridad. */
  cookies: Array<{
    name: string;
    domain: string;
    path: string;
    secure: boolean;
    httpOnly: boolean;
    sameSite: string;
  }>;
}

/** Entrada que las reglas necesitan para evaluar las cookies. */
export interface CookiesAnalysisInput {
  setCookies: ParsedCookie[];
  isHttpsTarget: boolean;
}
