/**
 * ============================================================================
 * TIPOS DEL MÓDULO DE AUTENTICACIÓN
 * ----------------------------------------------------------------------------
 * Contratos de entrada y salida de registro, inicio de sesión y consulta
 * del usuario autenticado.
 * ============================================================================
 */

/** Usuario expuesto por la API (nunca incluye el hash de contraseña). */
export interface UserDto {
  id: string;
  email: string;
  displayName: string | null;
}

/** Respuesta de registro/login: token de sesión + usuario. */
export interface AuthResponse {
  /** Token JWT para autorizar peticiones posteriores. */
  token: string;
  /** Usuario autenticado. */
  user: UserDto;
}
