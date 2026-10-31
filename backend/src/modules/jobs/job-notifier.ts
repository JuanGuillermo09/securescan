/**
 * ============================================================================
 * AVISO DE TRABAJO DISPONIBLE
 * ----------------------------------------------------------------------------
 * Permite que el nodo que encola una auditoría despierte a su consumidor de
 * inmediato, sin esperar al siguiente sondeo. Es un EventEmitter local: cada
 * réplica avisa a su propio worker. El sondeo periódico sigue activo como
 * respaldo para los trabajos encolados por otras réplicas.
 * ============================================================================
 */

import { EventEmitter } from 'events';

/** Emisor local de avisos de cola. */
export const jobEvents = new EventEmitter();

/** Notifica que hay al menos un trabajo PENDING nuevo. */
export function notifyJobAvailable(): void {
  jobEvents.emit('available');
}
