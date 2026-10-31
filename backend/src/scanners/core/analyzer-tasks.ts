/**
 * ============================================================================
 * REGISTRO DE ANALIZADORES
 * ----------------------------------------------------------------------------
 * Cada analizador se expone como una tarea pura nombre → función. Este
 * registro es el contrato compartido entre:
 *   - el hilo principal (modo simple o fallback), y
 *   - los hilos del pool (worker_threads).
 *
 * Las tareas solo reciben el contexto de la auditoría y devuelven datos
 * serializables; no acceden a la base de datos ni a estado global mutable.
 * ============================================================================
 */

import { env } from '../../config/env';
import { FindingDraft } from '../../modules/findings/findings.types';
import { analyzeCookies } from '../cookies/cookies.scanner';
import { analyzeExposure } from '../exposure/exposure.scanner';
import { analyzeHeaders } from '../headers/headers.scanner';
import { analyzeHttp } from '../http/http.scanner';
import { analyzeTechnology } from '../technology/technology.scanner';
import { analyzeTls } from '../tls/tls.rules';
import { ScanContext } from './scanner.types';

/** Salida normalizada de una tarea de análisis. */
export interface AnalyzerTaskOutput {
  data: unknown;
  findings: FindingDraft[];
}

/** Función pura de análisis sobre el contexto recolectado. */
export type AnalyzerTask = (ctx: ScanContext) => AnalyzerTaskOutput;

/**
 * Nombres canónicos de los analizadores. El orden se conserva para que el
 * resultado sea determinista aunque se ejecuten en paralelo.
 */
export const ANALYZER_NAMES = [
  'tls',
  'headers',
  'cookies',
  'http',
  'technology',
  'exposure'
] as const;

/** Nombre válido de analizador. */
export type AnalyzerName = (typeof ANALYZER_NAMES)[number];

/**
 * Implementación de cada analizador. Es una copia exacta de la lógica que
 * la V1 ejecutaba en línea dentro de scanner.engine.ts.
 */
export const ANALYZER_TASKS: Record<AnalyzerName, AnalyzerTask> = {
  tls: (ctx) => {
    // ¿La variante HTTP redirige automáticamente hacia HTTPS?
    const plainHttpRedirectsToHttps =
      ctx.plainHttp?.redirects.some(
        (r) => r.status >= 300 && r.status < 400 && r.location.startsWith('https://')
      ) ?? false;
    return analyzeTls({
      isHttpsTarget: ctx.isHttpsTarget,
      domain: ctx.domain,
      pageFetchedOk: Boolean(ctx.page?.ok),
      plainHttpRedirectsToHttps,
      tls: ctx.tls
    });
  },

  headers: (ctx) => {
    // Sin respuesta HTTP no hay cabeceras que analizar: reportar
    // "ausente" sería un falso positivo (RF-031).
    if (!ctx.page?.status) throw new Error('objetivo sin respuesta HTTP');
    return analyzeHeaders({ headers: ctx.page.headers, isHttpsTarget: ctx.isHttpsTarget });
  },

  cookies: (ctx) => {
    if (!ctx.page?.status) throw new Error('objetivo sin respuesta HTTP');
    return analyzeCookies({
      setCookies: ctx.page.setCookies,
      isHttpsTarget: ctx.isHttpsTarget
    });
  },

  http: (ctx) => analyzeHttp({ page: ctx.page, isHttpsTarget: ctx.isHttpsTarget }),

  technology: (ctx) => {
    if (!ctx.page?.status) throw new Error('objetivo sin respuesta HTTP');
    return analyzeTechnology({
      headers: ctx.page.headers,
      setCookieNames: ctx.page.setCookies.map((c) => c.name),
      body: ctx.page.body
    });
  },

  exposure: (ctx) => {
    if (!ctx.page?.status) throw new Error('objetivo sin respuesta HTTP');
    return analyzeExposure({
      headers: ctx.page.headers,
      body: ctx.page.body,
      probes: ctx.probes
    });
  }
};

/**
 * Ejecuta una tarea de análisis aplicando el fallo simulado de E7.
 *
 * @param name    Nombre del analizador.
 * @param context Contexto de la auditoría.
 * @throws Error si el analizador no existe o es el configurado para fallar.
 */
export function runAnalyzerTask(name: string, context: ScanContext): AnalyzerTaskOutput {
  const task = ANALYZER_TASKS[name as AnalyzerName];
  if (!task) {
    throw new Error(`Analizador desconocido: ${name}`);
  }
  if (env.failAnalyzer && env.failAnalyzer === name) {
    throw new Error(`Fallo simulado del analizador ${name} (FAIL_ANALYZER)`);
  }
  return task(context);
}
