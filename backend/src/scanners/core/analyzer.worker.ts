/**
 * ============================================================================
 * HILO DE ANÁLISIS
 * ----------------------------------------------------------------------------
 * Recibe un analizador y el contexto de la auditoría desde el pool, ejecuta
 * la tarea pura y devuelve el resultado serializable. Cualquier excepción se
 * traduce en ok:false para que los demás analizadores continúen (RF-032).
 * ============================================================================
 */

import { parentPort } from 'worker_threads';
import { ScanContext } from './scanner.types';
import { runAnalyzerTask } from './analyzer-tasks';

/** Mensaje recibido del hilo principal. */
interface WorkerRequest {
  id: number;
  name: string;
  context: ScanContext;
}

if (!parentPort) {
  throw new Error('analyzer.worker debe ejecutarse dentro de un worker_thread');
}

parentPort.on('message', (request: WorkerRequest) => {
  try {
    const { data, findings } = runAnalyzerTask(request.name, request.context);
    parentPort?.postMessage({ id: request.id, ok: true, data, findings });
  } catch (error) {
    parentPort?.postMessage({
      id: request.id,
      ok: false,
      error: error instanceof Error ? error.message : 'unknown-analyzer-error'
    });
  }
});
