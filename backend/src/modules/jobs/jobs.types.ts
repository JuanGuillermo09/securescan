/**
 * ============================================================================
 * TIPOS DE LA COLA DE TRABAJOS
 * ----------------------------------------------------------------------------
 * Contratos del modelo ScanJob usado por el modo distribuido. La cola vive
 * en PostgreSQL y se manipula con SQL en bruto para poder usar
 * FOR UPDATE SKIP LOCKED de forma atómica entre réplicas.
 * ============================================================================
 */

/** Estados posibles de un trabajo. */
export type JobStatus = 'PENDING' | 'RUNNING' | 'DONE' | 'DEAD';

/** Fila cruda de la tabla ScanJob. */
export interface ScanJobRow {
  id: string;
  auditId: string;
  status: JobStatus;
  workerId: string | null;
  attempts: number;
  heartbeatAt: Date | null;
  createdAt: Date;
}
