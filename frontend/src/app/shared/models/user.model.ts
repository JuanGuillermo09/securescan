/**
 * ============================================================================
 * MODELO DE USUARIO
 * ----------------------------------------------------------------------------
 * Contratos de autenticación compartidos por los componentes y el
 * AuthService. Reflejan los DTOs del módulo /api/auth del backend.
 * ============================================================================
 */

/** Usuario autenticado tal como lo expone la API (sin datos sensibles). */
export interface User {
  id: string;
  email: string;
  displayName: string | null;
}

/** Respuesta de registro e inicio de sesión. */
export interface AuthResponse {
  /** Token JWT para autorizar las peticiones posteriores. */
  token: string;
  /** Usuario autenticado. */
  user: User;
}
