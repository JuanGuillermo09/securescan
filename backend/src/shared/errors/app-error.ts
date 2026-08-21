/**
 * ============================================================================
 * ERRORES DE APLICACIÓN
 * ----------------------------------------------------------------------------
 * Clase base para errores controlados que pueden comunicarse al cliente con
 * un código HTTP y un mensaje seguro. Cualquier error que NO sea AppError se
 * considera interno y el middleware de errores lo oculta al cliente (RNF-007).
 * ============================================================================
 */

/** Error controlado con estado HTTP asociado. */
export class AppError extends Error {
  /** Código de estado HTTP que se devolverá al cliente. */
  public readonly status: number;

  /**
   * @param message Mensaje seguro para mostrar al cliente.
   * @param status  Código HTTP (por defecto 500).
   */
  constructor(message: string, status = 500) {
    super(message);
    this.name = 'AppError';
    this.status = status;
  }
}

/**
 * Error 404 para recursos inexistentes.
 */
export class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

/**
 * Error 409 para conflictos de estado (por ejemplo, informe de una
 * auditoría aún en ejecución).
 */
export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

/**
 * Error 401 para credenciales ausentes o inválidas.
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Credenciales inválidas') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}
