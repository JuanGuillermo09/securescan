/**
 * ============================================================================
 * UTILIDADES DE VERSIONES SEMÁNTICAS
 * ----------------------------------------------------------------------------
 * Funciones para comparar números de versión (x.y.z) utilizadas por el
 * dataset de CVEs y las reglas de detección de tecnologías.
 * ============================================================================
 */

/** Representación numérica simple de una versión. */
export interface ParsedVersion {
  major: number;
  minor: number;
  patch: number;
}

/**
 * Convierte un string de versión en sus componentes numéricos.
 *
 * @param raw  Versión en texto, por ejemplo "2.4.49" o "3.4".
 * @returns Componentes parseados, o `null` si no se reconoce el formato.
 */
export function parseVersion(raw: string): ParsedVersion | null {
  const match = raw.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!match) {
    return null;
  }
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3] ?? 0)
  };
}

/**
 * Indica si la versión `raw` es estrictamente anterior a `reference`.
 * Si alguna versión no puede parsearse se devuelve `false` (decisión
 * conservadora: no se reporta vulnerabilidad sin certeza de versión).
 *
 * @param raw        Versión detectada en el objetivo.
 * @param reference  Versión de referencia (primera versión corregida).
 */
export function isVersionLowerThan(raw: string, reference: string): boolean {
  const a = parseVersion(raw);
  const b = parseVersion(reference);
  if (!a || !b) {
    return false;
  }
  // Comparación por componentes: mayor → menor → parche.
  if (a.major !== b.major) return a.major < b.major;
  if (a.minor !== b.minor) return a.minor < b.minor;
  return a.patch < b.patch;
}
