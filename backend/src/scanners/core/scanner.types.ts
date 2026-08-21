/**
 * ============================================================================
 * TIPOS DEL NÚCLEO DE SCANNING
 * ----------------------------------------------------------------------------
 * Contratos compartidos por todos los analizadores: el contexto de análisis
 * (datos recolectados del objetivo) y el resultado normalizado de cada
 * analizador (RNF-009, RNF-010).
 * ============================================================================
 */

import { FindingDraft } from '../../modules/findings/findings.types';
import { FetchedPage, HttpProbe } from '../../shared/utils/http-client.util';
import { TlsInfo } from '../tls/tls.types';

/**
 * Contexto inmutable de una auditoría en ejecución.
 * Contiene todos los datos recolectados del objetivo antes de ejecutar los
 * analizadores. Cada analizador lee lo que necesita; ninguno lo modifica.
 */
export interface ScanContext {
  /** URL objetivo tal como la ingresó el usuario. */
  url: string;
  /** Origen del objetivo (esquema + host + puerto). */
  origin: string;
  /** Dominio (hostname) del objetivo. */
  domain: string;
  /** Indica si la URL objetivo usa HTTPS. */
  isHttpsTarget: boolean;
  /** Página principal descargada siguiendo redirecciones. */
  page: FetchedPage | null;
  /** Descarga manual de http://host/ para verificar redirección a HTTPS. */
  plainHttp: FetchedPage | null;
  /** Información TLS/certificado recolectada del puerto 443. */
  tls: TlsInfo | null;
  /** Resultados de sondeos de rutas sensibles. */
  probes: HttpProbe[];
}

/**
 * Resultado normalizado de un analizador.
 *
 * @typeParam T Tipo de datos estructurados que el analizador expone al
 *              dashboard (raw results).
 */
export interface AnalyzerResult<T = unknown> {
  /** Nombre identificador del analizador (tls, headers, cookies...). */
  name: string;
  /** `true` si el analizador terminó sin excepciones. */
  ok: boolean;
  /** Motivo del fallo cuando `ok` es false. */
  error?: string;
  /** Datos estructurados del análisis (null si falló). */
  data: T | null;
  /** Hallazgos generados por las reglas del analizador. */
  findings: FindingDraft[];
}
