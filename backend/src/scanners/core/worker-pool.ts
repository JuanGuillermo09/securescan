/**
 * ============================================================================
 * POOL DE HILOS PARA ANALIZADORES
 * ----------------------------------------------------------------------------
 * Ejecuta los analizadores en worker_threads para liberar el hilo principal
 * durante el análisis. Características:
 *   - Tamaño fijo y cola interna (nunca se crean más hilos de los pedidos).
 *   - Timeout por tarea: si un analizador se cuelga, se devuelve ok:false.
 *   - Reemplazo de hilos caídos con un límite de reinicios.
 *   - Fallback al hilo principal si el pool no puede arrancar o se agota.
 *
 * El pool es opcional: ANALYZER_POOL_SIZE=0 mantiene la ejecución secuencial
 * original en el hilo principal.
 * ============================================================================
 */

import * as path from 'path';
import { Worker } from 'worker_threads';
import { logger } from '../../shared/utils/logger.util';
import { FindingDraft } from '../../modules/findings/findings.types';
import { AnalyzerResult, ScanContext } from './scanner.types';
import { runAnalyzerTask } from './analyzer-tasks';

/** Máximo de reinicios permitidos por ranura antes de desactivar el pool. */
const MAX_RESTARTS = 3;

/** Ruta del arranque CommonJS que registra tsx antes de cargar el hilo TS. */
const WORKER_BOOTSTRAP = path.join(__dirname, 'analyzer.worker.cjs');

/** Mensaje que el hilo envía de vuelta al hilo principal. */
interface WorkerResponse {
  id: number;
  ok: boolean;
  data?: unknown;
  findings?: FindingDraft[];
  error?: string;
}

/** Trabajo pendiente en la cola interna. */
interface QueueItem {
  id: number;
  name: string;
  context: ScanContext;
  resolve: (result: AnalyzerResult) => void;
  timer?: NodeJS.Timeout;
}

/** Ranura del pool: un hilo y el trabajo que tiene asignado. */
interface WorkerSlot {
  worker: Worker;
  busy: boolean;
  dead: boolean;
  restarts: number;
  current?: QueueItem;
}

/**
 * Ejecuta un analizador en el hilo principal (modo simple o fallback).
 *
 * @param name    Nombre del analizador.
 * @param context Contexto de la auditoría.
 */
export function runAnalyzerInMainThread(
  name: string,
  context: ScanContext
): AnalyzerResult {
  try {
    const { data, findings } = runAnalyzerTask(name, context);
    return { name, ok: true, data, findings };
  } catch (error) {
    return {
      name,
      ok: false,
      error: error instanceof Error ? error.message : 'unknown-analyzer-error',
      data: null,
      findings: []
    };
  }
}

/**
 * Pool de hilos con cola interna.
 */
export class AnalyzerWorkerPool {
  private slots: WorkerSlot[] = [];
  private queue: QueueItem[] = [];
  private nextId = 1;
  private disabled = false;

  /**
   * @param size      Número máximo de hilos.
   * @param timeoutMs Timeout por tarea.
   */
  constructor(private readonly size: number, private readonly timeoutMs: number) {}

  /**
   * Encola un analizador y resuelve con su resultado. Nunca rechaza: ante
   * cualquier problema cae al hilo principal.
   */
  run(name: string, context: ScanContext): Promise<AnalyzerResult> {
    if (this.disabled) {
      return Promise.resolve(runAnalyzerInMainThread(name, context));
    }

    return new Promise<AnalyzerResult>((resolve) => {
      this.queue.push({ id: this.nextId++, name, context, resolve });
      this.dispatch();
    });
  }

  /** Cierra todos los hilos (apagado ordenado). */
  async destroy(): Promise<void> {
    this.disabled = true;
    this.drainToMain();
    const workers = this.slots.map((slot) => slot.worker);
    this.slots = [];
    await Promise.all(workers.map((worker) => worker.terminate().catch(() => undefined)));
  }

  /** Asigna trabajos a ranuras libres, creando hilos hasta el tamaño máximo. */
  private dispatch(): void {
    while (this.queue.length > 0) {
      let slot: WorkerSlot | undefined = this.slots.find(
        (candidate) => !candidate.busy && !candidate.dead
      );

      if (!slot) {
        if (this.disabled || this.slots.length >= this.size) break;
        const spawned = this.spawn();
        if (!spawned) break;
        slot = spawned;
      }

      const item = this.queue.shift();
      if (item) this.assign(slot, item);
    }
  }

  /** Crea una ranura con su hilo. Devuelve null si no puede arrancar. */
  private spawn(): WorkerSlot | null {
    try {
      const worker = new Worker(WORKER_BOOTSTRAP, { env: process.env });
      const slot: WorkerSlot = { worker, busy: false, dead: false, restarts: 0 };

      worker.on('message', (message: WorkerResponse) => this.onMessage(slot, message));
      worker.on('error', (error) => this.onCrash(slot, error));
      worker.on('exit', (code) => {
        if (!slot.dead) {
          this.onCrash(slot, new Error(`el hilo terminó con código ${code}`));
        }
      });

      this.slots.push(slot);
      return slot;
    } catch (error) {
      logger.error('No se pudo crear el pool de hilos; se usará el hilo principal', error);
      this.disabled = true;
      this.drainToMain();
      return null;
    }
  }

  /** Envía un trabajo a una ranura y arma su timeout. */
  private assign(slot: WorkerSlot, item: QueueItem): void {
    slot.busy = true;
    slot.current = item;
    item.timer = setTimeout(() => this.onTimeout(slot), this.timeoutMs);

    try {
      slot.worker.postMessage({ id: item.id, name: item.name, context: item.context });
    } catch (error) {
      this.onCrash(slot, error instanceof Error ? error : new Error('postMessage falló'));
    }
  }

  /** Procesa la respuesta de un hilo. */
  private onMessage(slot: WorkerSlot, message: WorkerResponse): void {
    const item = slot.current;
    if (!item || item.id !== message.id) return;

    if (item.timer) clearTimeout(item.timer);
    slot.current = undefined;
    slot.busy = false;

    item.resolve({
      name: item.name,
      ok: Boolean(message.ok),
      error: message.error,
      data: message.data ?? null,
      findings: Array.isArray(message.findings) ? message.findings : []
    });

    this.dispatch();
  }

  /** Un analizador superó el timeout: se falla la tarea y se reemplaza el hilo. */
  private onTimeout(slot: WorkerSlot): void {
    const item = slot.current;
    if (!item) return;

    slot.current = undefined;
    slot.busy = false;
    item.resolve({
      name: item.name,
      ok: false,
      error: `tiempo de espera agotado (${this.timeoutMs} ms) en el analizador ${item.name}`,
      data: null,
      findings: []
    });

    logger.warn(`Analizador ${item.name} excedió el timeout; se reemplaza el hilo`);
    this.replaceSlot(slot);
    this.dispatch();
  }

  /** Un hilo falló: se resuelve su tarea como error y se intenta reemplazar. */
  private onCrash(slot: WorkerSlot, error: Error): void {
    if (slot.dead) return;
    slot.dead = true;

    const item = slot.current;
    slot.current = undefined;
    slot.busy = false;

    if (item) {
      if (item.timer) clearTimeout(item.timer);
      item.resolve({
        name: item.name,
        ok: false,
        error: `el hilo del analizador falló: ${error.message}`,
        data: null,
        findings: []
      });
    }

    logger.warn(`Hilo del pool caído (${error.message}); reinicios=${slot.restarts}`);
    this.slots = this.slots.filter((candidate) => candidate !== slot);
    slot.worker.removeAllListeners();

    if (slot.restarts < MAX_RESTARTS) {
      const replacement = this.spawn();
      if (replacement) replacement.restarts = slot.restarts + 1;
    } else {
      logger.error('Se agotaron los reinicios del pool; se usará el hilo principal');
      this.disabled = true;
      this.drainToMain();
    }

    this.dispatch();
  }

  /** Termina y reemplaza una ranura (usado tras un timeout). */
  private replaceSlot(slot: WorkerSlot): void {
    if (slot.dead) return;
    slot.dead = true;
    this.slots = this.slots.filter((candidate) => candidate !== slot);
    slot.worker.removeAllListeners();
    void slot.worker.terminate().catch(() => undefined);

    if (slot.restarts < MAX_RESTARTS) {
      const replacement = this.spawn();
      if (replacement) replacement.restarts = slot.restarts + 1;
    } else {
      logger.error('Se agotaron los reinicios del pool; se usará el hilo principal');
      this.disabled = true;
      this.drainToMain();
    }
  }

  /** Resuelve los trabajos pendientes en el hilo principal. */
  private drainToMain(): void {
    while (this.queue.length > 0) {
      const item = this.queue.shift();
      if (item) {
        item.resolve(runAnalyzerInMainThread(item.name, item.context));
      }
    }
  }
}
