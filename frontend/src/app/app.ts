/**
 * ============================================================================
 * COMPONENTE RAÍZ DE LA APLICACIÓN
 * ----------------------------------------------------------------------------
 * Estructura general: barra superior con navegación adaptada al estado de
 * sesión, área de contenido enrutado (router-outlet) y pie con aviso de uso
 * responsable.
 * ============================================================================
 */

import { Component, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from './core/auth/auth.service';
import { AlertsComponent } from './shared/components/alerts/alerts.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, AlertsComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  host: {
    // Escape también colapsa el menú móvil.
    '(document:keydown.escape)': 'closeMenu()',
    // Vigila la posición de scroll para el botón "volver arriba".
    '(window:scroll)': 'onWindowScroll()'
  }
})
export class App {
  /** Estado de sesión expuesto a la plantilla de la barra de navegación. */
  protected readonly auth = inject(AuthService);
  /** Enrutador para redirigir al cerrar sesión. */
  private readonly router = inject(Router);

  /** Controla el menú tipo hamburguesa en pantallas estrechas. */
  protected readonly menuOpen = signal(false);

  /** Indica si ya se descendió lo suficiente para mostrar el botón "subir". */
  protected readonly showScrollTop = signal(false);

  /** Alterna la visibilidad del menú móvil. */
  protected toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  /** Colapsa el menú móvil (al navegar, salir o pulsar Escape). */
  protected closeMenu(): void {
    this.menuOpen.set(false);
  }

  /** Registra la posición de scroll para mostrar u ocultar el botón. */
  protected onWindowScroll(): void {
    this.showScrollTop.set(window.scrollY > 300);
  }

  /** Vuelve a la parte superior con desplazamiento animado. */
  protected scrollToTop(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  /**
   * Cierra la sesión y envía al usuario a la página de acceso.
   */
  protected logout(): void {
    this.closeMenu();
    this.auth.logout();
    this.router.navigate(['/login']);
  }
}
