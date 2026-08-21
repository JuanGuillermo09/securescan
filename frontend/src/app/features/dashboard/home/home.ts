/**
 * ============================================================================
 * COMPONENTE: HOME — FORMULARIO DE NUEVA AUDITORÍA
 * ----------------------------------------------------------------------------
 * Pantalla inicial (HU-001): recoge la URL del objetivo, exige la
 * confirmación de autorización y navega al dashboard de la auditoría creada.
 * ============================================================================
 */

import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../../core/api/api.service';

@Component({
  selector: 'app-home',
  imports: [FormsModule],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {
  /** Acceso a la API REST del backend. */
  private readonly api = inject(ApiService);
  /** Enrutador para navegar al dashboard tras crear la auditoría. */
  private readonly router = inject(Router);

  /** URL ingresada por el usuario (ngModel). */
  protected url = '';
  /** Confirmación de autorización sobre el objetivo (obligatoria). */
  protected authorized = false;
  /** `true` mientras la petición de creación está en vuelo. */
  protected submitting = false;
  /** Mensaje de error a mostrar bajo el formulario. */
  protected error: string | null = null;

  /**
   * La URL es válida si parsea como URL absoluta con esquema http/https.
   * Validación en vivo para habilitar el botón de envío.
   */
  protected get urlValid(): boolean {
    try {
      const parsed = new URL(this.url.trim());
      return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch {
      return false;
    }
  }

  /**
   * El formulario solo se envía con URL válida, autorización confirmada
   * y sin una petición ya en curso.
   */
  protected get formValid(): boolean {
    return this.urlValid && this.authorized && !this.submitting;
  }

  /**
   * Crea la auditoría y redirige a su dashboard. Si el backend responde
   * con error de validación, muestra el primer mensaje de detalle.
   */
  protected submit(): void {
    if (!this.formValid) return;
    this.submitting = true;
    this.error = null;

    this.api.createAudit(this.url.trim(), true).subscribe({
      next: (audit) => this.router.navigate(['/auditoria', audit.id]),
      error: (err) => {
        this.error =
          err?.error?.details?.[0]?.message ??
          err?.error?.error ??
          'No fue posible iniciar la auditoría. Verifique que el backend esté en ejecución.';
        this.submitting = false;
      }
    });
  }
}
