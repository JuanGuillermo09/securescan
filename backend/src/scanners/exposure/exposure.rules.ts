/**
 * ============================================================================
 * REGLAS DEL ANALIZADOR DE EXPOSICIÓN
 * ----------------------------------------------------------------------------
 * Reglas para evaluar información técnica expuesta públicamente (RF-012):
 *
 *   - Evaluación de sondeos de rutas sensibles (.env, .git, phpinfo).
 *   - Cada regla de sondeo decide si una respuesta constituye exposición
 *     real (evitando falsos positivos por páginas 200 genéricas).
 * ============================================================================
 */

import { HttpProbe } from '../../shared/utils/http-client.util';

/**
 * Determina si la respuesta de un sondeo corresponde realmente al recurso
 * buscado. Se valida el contenido, no solo el código 200, para minimizar
 * falsos positivos (RNF-027).
 *
 * @param path        Ruta sondeada.
 * @param bodySnippet Fragmento inicial del cuerpo de la respuesta.
 */
export function evaluateProbeHit(path: string, bodySnippet: string): boolean {
  if (path === '/.env') {
    // Un .env real contiene asignaciones de claves/credenciales.
    return /(DB_|APP_KEY|API_KEY|SECRET|PASSWORD)\s*=/i.test(bodySnippet);
  }
  if (path === '/.git/HEAD') {
    // El HEAD de un repositorio Git comienza con "ref: refs/".
    return /^ref:\s*refs\//i.test(bodySnippet.trim());
  }
  if (path === '/phpinfo.php') {
    // Salida típica de phpinfo().
    return /phpinfo\(\)|PHP Version/i.test(bodySnippet);
  }
  return false;
}

/**
 * Trunca y limpia un fragmento de texto para usarlo como evidencia.
 *
 * @param value Texto crudo.
 * @param max   Longitud máxima permitida.
 */
export function truncateEvidence(value: string, max = 120): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}...` : clean;
}
