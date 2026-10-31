/**
 * ============================================================================
 * EJECUCIÓN DE ANALIZADORES
 * ----------------------------------------------------------------------------
 * Decide cómo ejecutar los seis analizadores:
 *   - ANALYZER_POOL_SIZE=0: secuencial en el hilo principal (modo V1).
 *   - ANALYZER_POOL_SIZE>0: en paralelo dentro de un pool de hilos.
 *
 * En ambos casos el contrato de salida es idéntico (AnalyzerResult[]).
 * ============================================================================
 */

import { env } from '../../config/env';
import { logger } from '../../shared/utils/logger.util';
import { AnalyzerResult, ScanContext } from './scanner.types';
import { ANALYZER_NAMES } from './analyzer-tasks';
import {
  AnalyzerWorkerPool,
  runAnalyzerInMainThread
} from './worker-pool';

/** Pool perezoso: se crea en la primera auditoría que lo necesita. */
let pool: AnalyzerWorkerPool | null = null;

/**
 * Ejecuta todos los analizadores sobre el contexto recolectado.
 *
 * @param context Datos del objetivo ya descargados.
 */
export async function executeAnalyzers(context: ScanContext): Promise<AnalyzerResult[]> {
  if (env.analyzerPoolSize <= 0) {
    // Camino original: cada analizador en el hilo principal, en orden.
    return ANALYZER_NAMES.map((name) => runAnalyzerInMainThread(name, context));
  }

  if (!pool) {
    pool = new AnalyzerWorkerPool(env.analyzerPoolSize, env.analyzerTimeoutMs);
    logger.info(
      `Pool de analizadores inicializado (hilos=${env.analyzerPoolSize}, timeout=${env.analyzerTimeoutMs}ms)`
    );
  }

  return Promise.all(ANALYZER_NAMES.map((name) => pool!.run(name, context)));
}

/** Cierra el pool (apagado ordenado del proceso). */
export async function shutdownAnalyzerPool(): Promise<void> {
  if (pool) {
    await pool.destroy();
    pool = null;
  }
}
