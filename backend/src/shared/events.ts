/**
 * ============================================================================
 * OBSERVER DE EVENTOS DE AUDITORÍA
 * ----------------------------------------------------------------------------
 * Punto único de publicación de los cambios de estado del motor de scanning
 * (RUNNING, COMPLETED, FAILED). El motor solo emite; un suscriptor registra
 * el evento en el logger centralizado. Así la observabilidad queda
 * desacoplada de la lógica de análisis (RNF-023).
 * ============================================================================
 */

import { EventEmitter } from 'events';
import { env } from '../config/env';
import { logger } from './utils/logger.util';

/** Estados publicados por el motor de scanning. */
export type AuditEventStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

/** Carga útil de un evento de auditoría. */
export interface AuditEvent {
  auditId: string;
  status: AuditEventStatus;
  /** Nodo que ejecuta la auditoría (útil en el modo distribuido). */
  nodeId: string;
  /** Datos adicionales seguros para el log (score, hallazgos, error...). */
  meta?: Record<string, unknown>;
}

/** Emisor compartido por todo el proceso. */
export const auditEvents = new EventEmitter();

// Suscriptor por defecto: deja traza de cada transición de estado.
auditEvents.on('audit', (event: AuditEvent) => {
  const message = `Evento auditoría ${event.auditId}: ${event.status} [nodo ${event.nodeId}]`;
  if (event.status === 'FAILED') {
    logger.warn(message, event.meta);
  } else {
    logger.info(message, event.meta);
  }
});

/**
 * Publica un evento de auditoría.
 *
 * @param auditId Identificador de la auditoría.
 * @param status  Nuevo estado.
 * @param meta    Datos adicionales para el log.
 */
export function emitAuditEvent(
  auditId: string,
  status: AuditEventStatus,
  meta?: Record<string, unknown>
): void {
  auditEvents.emit('audit', {
    auditId,
    status,
    nodeId: env.nodeId,
    meta
  } satisfies AuditEvent);
}
