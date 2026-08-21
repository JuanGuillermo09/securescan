/**
 * ============================================================================
 * COMPONENTE: LOGIN
 * ----------------------------------------------------------------------------
 * Formulario de inicio de sesión. Al autenticar redirige a la URL solicitada
 * originalmente (query param returnUrl) o a la pantalla de nueva auditoría.
 * ============================================================================
 */

import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AlertService } from '../../../core/alerts/alert.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
  /** Servicio de sesión. */
  private readonly auth = inject(AuthService);
  /** Enrutador para la redirección posterior. */
  private readonly router = inject(Router);
  /** Acceso a los query params de la ruta actual. */
  private readonly route = inject(ActivatedRoute);
  /** Avisos globales (toast de bienvenida). */
  private readonly alerts = inject(AlertService);

  /** Credenciales ingresadas (ngModel). */
  protected email = '';
  protected password = '';
  /** `true` mientras la petición está en vuelo. */
  protected submitting = false;
  /** Mensaje de error a mostrar bajo el formulario. */
  protected error: string | null = null;

  /**
   * Envía las credenciales al backend y navega a la URL de retorno.
   */
  protected submit(): void {
    if (!this.email || !this.password || this.submitting) return;
    this.submitting = true;
    this.error = null;

    this.auth.login(this.email.trim(), this.password).subscribe({
      next: () => {
        // Saludo personalizado con el nombre (o el correo si no hay nombre).
        const nombre = this.auth.currentUser()?.displayName || this.email.trim();
        this.alerts.toast(`¡Bienvenido de nuevo, ${nombre}!`, 'success');

        const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
        // Solo se aceptan rutas internas (evita open redirects).
        this.router.navigateByUrl(returnUrl?.startsWith('/') ? returnUrl : '/nueva-auditoria');
      },
      error: (err) => {
        this.error =
          err?.error?.error ??
          'No fue posible iniciar sesión. Verifique que el backend esté en ejecución.';
        this.submitting = false;
      }
    });
  }
}
