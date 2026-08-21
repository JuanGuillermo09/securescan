/**
 * ============================================================================
 * COMPONENTE: REGISTRO
 * ----------------------------------------------------------------------------
 * Formulario de creación de cuenta. Valida localmente que las contraseñas
 * coincidan y delega el resto de validaciones al backend (Zod).
 * ============================================================================
 */

import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { AlertService } from '../../../core/alerts/alert.service';

@Component({
  selector: 'app-register',
  imports: [FormsModule],
  templateUrl: './register.html',
  styleUrl: '../login/login.css'
})
export class Register {
  /** Servicio de sesión. */
  private readonly auth = inject(AuthService);
  /** Enrutador para navegar tras el registro. */
  private readonly router = inject(Router);
  /** Avisos globales (toast de cuenta creada). */
  private readonly alerts = inject(AlertService);

  /** Datos del formulario (ngModel). */
  protected displayName = '';
  protected email = '';
  protected password = '';
  protected password2 = '';
  /** `true` mientras la petición está en vuelo. */
  protected submitting = false;
  /** Mensaje de error a mostrar bajo el formulario. */
  protected error: string | null = null;

  /**
   * El formulario es válido si todos los campos mínimos están presentes,
   * la contraseña cumple la política (8+) y ambas coinciden.
   */
  protected get formValid(): boolean {
    return (
      this.email.trim().length > 0 &&
      this.password.length >= 8 &&
      this.password === this.password2 &&
      !this.submitting
    );
  }

  /**
   * Crea la cuenta; el backend responde con sesión abierta, por lo que se
   * navega directamente a la pantalla de nueva auditoría.
   */
  protected submit(): void {
    if (!this.formValid) return;
    this.submitting = true;
    this.error = null;

    const name = this.displayName.trim();
    this.auth.register(this.email.trim(), this.password, name || undefined).subscribe({
      next: () => {
        // Aviso de bienvenida: se menciona el ejemplo que recibe de regalo.
        const saludo = name ? `¡Cuenta creada, ${name}!` : '¡Cuenta creada!';
        this.alerts.toast(
          `${saludo} Te regalamos una auditoría de ejemplo en tu historial.`,
          'success'
        );
        this.router.navigate(['/nueva-auditoria']);
      },
      error: (err) => {
        this.error =
          err?.error?.details?.[0]?.message ??
          err?.error?.error ??
          'No fue posible crear la cuenta.';
        this.submitting = false;
      }
    });
  }
}
