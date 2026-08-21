/**
 * ============================================================================
 * SERVICIO DE AUTENTICACIÓN
 * ----------------------------------------------------------------------------
 * Gestiona el estado de la sesión: token JWT y usuario actual persistidos en
 * localStorage (la sesión sobrevive recargas). Expone señales de lectura
 * reactiva para las plantillas y los guards de ruta.
 * ============================================================================
 */

import { Injectable, computed, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthResponse, User } from '../../shared/models/user.model';

/** Claves usadas en localStorage. */
const TOKEN_KEY = 'securescan.token';
const USER_KEY = 'securescan.user';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** URL base de la API tomada del entorno activo. */
  private readonly baseUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    // Restaura la sesión previa si existe una guardada.
    this.restore();
  }

  /** Señal con el usuario autenticado (null si no hay sesión). */
  private readonly currentUserSignal = signal<User | null>(null);

  /** Señal derivada: hay sesión activa. */
  readonly isAuthenticated = computed(() => this.currentUserSignal() !== null);

  /** Usuario autenticado actual (solo lectura). */
  readonly currentUser = computed(() => this.currentUserSignal());

  /**
   * Registra una cuenta nueva y abre sesión con el token recibido.
   *
   * @param email       Correo del usuario.
   * @param password    Contraseña en claro (viaja por HTTPS al backend).
   * @param displayName Nombre visible opcional.
   */
  register(email: string, password: string, displayName?: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/register`, { email, password, displayName })
      .pipe(tap((res) => this.storeSession(res)));
  }

  /**
   * Inicia sesión con correo y contraseña.
   *
   * @param email    Correo del usuario.
   * @param password Contraseña en claro.
   */
  login(email: string, password: string): Observable<AuthResponse> {
    return this.http
      .post<AuthResponse>(`${this.baseUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this.storeSession(res)));
  }

  /** Cierra la sesión: elimina token y usuario del almacenamiento local. */
  logout(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.currentUserSignal.set(null);
  }

  /** Token vigente o null; lo consume el interceptor HTTP. */
  get token(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  /**
   * Persiste la sesión en localStorage y actualiza la señal.
   *
   * @param res Respuesta de registro/login.
   */
  private storeSession(res: AuthResponse): void {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this.currentUserSignal.set(res.user);
  }

  /** Restaura la sesión guardada al arrancar la aplicación. */
  private restore(): void {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw || !localStorage.getItem(TOKEN_KEY)) return;
    try {
      this.currentUserSignal.set(JSON.parse(raw) as User);
    } catch {
      // Datos corruptos: se descarta la sesión.
      this.logout();
    }
  }
}
