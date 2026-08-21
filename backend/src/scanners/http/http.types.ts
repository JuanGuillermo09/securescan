/**
 * ============================================================================
 * TIPOS DEL ANALIZADOR HTTP
 * ----------------------------------------------------------------------------
 * Estructuras de datos propias del análisis de configuración HTTP (RF-010).
 * ============================================================================
 */

import { FetchedPage } from '../../shared/utils/http-client.util';

/** Datos estructurados que el analizador expone al dashboard. */
export interface HttpData {
  /** Código de estado de la respuesta final. */
  statusCode: number;
  /** URL final tras seguir redirecciones. */
  finalUrl: string;
  /** Cadena de redirecciones observada. */
  redirectChain: Array<{ status: number; location: string }>;
  /** Métodos HTTP anunciados por la cabecera Allow (mayúsculas). */
  allowMethods: string[];
  /** Cabecera Server cruda si estaba presente. */
  serverHeader?: string;
}

/** Entrada que el analizador necesita para evaluar la respuesta. */
export interface HttpAnalysisInput {
  /** Página principal descargada (null si la red falló). */
  page: FetchedPage | null;
  isHttpsTarget: boolean;
}
