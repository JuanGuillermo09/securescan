/**
 * ============================================================================
 * TIPOS DEL ANALIZADOR DE SECURITY HEADERS
 * ----------------------------------------------------------------------------
 * Estructuras de datos propias del análisis de cabeceras de seguridad
 * (RF-008, HU-004).
 * ============================================================================
 */

/** Datos estructurados que el analizador expone al dashboard. */
export interface HeadersData {
  /** Cabeceras de seguridad presentes y su valor. */
  present: Record<string, string>;
  /** Lista de cabeceras de seguridad ausentes. */
  missing: string[];
  /** Configuraciones débiles detectadas en cabeceras presentes. */
  weak: string[];
}

/** Entrada que las reglas necesitan para evaluar las cabeceras. */
export interface HeadersAnalysisInput {
  /** Cabeceras HTTP de la respuesta en minúsculas. */
  headers: Record<string, string>;
  isHttpsTarget: boolean;
}
