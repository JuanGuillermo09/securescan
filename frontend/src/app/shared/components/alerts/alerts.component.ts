/**
 * ============================================================================
 * COMPONENTE: ALERTS — MODAL DE CONFIRMACIÓN Y TOASTS GLOBALES
 * ----------------------------------------------------------------------------
 * Se monta una única vez en App (fuera del router-outlet) y pinta lo que
 * AlertService expone: el modal Sí/No abierto, si lo hay, y la pila de
 * avisos breves. Cualquier componente puede usarlo vía AlertService.
 * ============================================================================
 */

import { Component, HostListener, inject } from '@angular/core';
import { AlertService } from '../../../core/alerts/alert.service';

@Component({
  selector: 'app-alerts',
  templateUrl: './alerts.component.html',
  styleUrl: './alerts.component.css'
})
export class AlertsComponent {
  /** Estado global de alertas (modal + toasts). */
  protected readonly alerts: AlertService = inject(AlertService);

  /**
   * Cierra el modal con "cancelar" al pulsar Escape.
   *
   * @param event Evento de teclado del documento.
   */
  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.alerts.answer(false);
  }
}
