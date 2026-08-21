/**
 * ============================================================================
 * COMPONENTE: HISTORY — HISTORIAL DE AUDITORÍAS
 * ----------------------------------------------------------------------------
 * Lista las auditorías registradas (HU-003, RF-028/RF-029) con estado,
 * score y conteo de hallazgos. Cada fila enlaza a su dashboard.
 * ============================================================================
 */

import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import { AuditSummary, STATUS_LABELS } from '../../shared/models/audit.model';
import { AlertService } from '../../core/alerts/alert.service';

@Component({
  selector: 'app-history',
  imports: [CommonModule, RouterLink],
  templateUrl: './history.html',
  styleUrl: './history.css'
})
export class History implements OnInit {
  /** Acceso a la API REST del backend. */
  private readonly api = inject(ApiService);
  /** Alertas globales: modal de confirmación y toasts. */
  private readonly alerts = inject(AlertService);

  /** Auditorías cargadas desde el backend (más recientes primero). */
  protected audits: AuditSummary[] = [];
  /** `true` durante la carga inicial del listado. */
  protected loading = true;
  /** `true` si la petición de historial falló. */
  protected loadError = false;
  /** Identificadores con borrado en curso (deshabilita su botón). */
  protected deletingIds = new Set<string>();
  /** `true` mientras se ejecuta el borrado total. */
  protected deletingAll = false;
  /** Etiquetas legibles de estado para las insignias. */
  protected readonly statusLabels = STATUS_LABELS;

  /**
   * Carga el historial al entrar a la ruta.
   * No reintenta automáticamente: el usuario puede recargar la página.
   */
  ngOnInit(): void {
    this.loadAudits();
  }

  /**
   * Consulta el historial al backend y actualiza el estado del componente.
   * Se reutiliza tras cada operación de borrado para refrescar la lista.
   */
  private loadAudits(): void {
    this.api.getAudits().subscribe({
      next: (audits) => {
        this.audits = audits;
        this.loading = false;
      },
      error: () => {
        this.loadError = true;
        this.loading = false;
      }
    });
  }

  /**
   * Indica si quedan auditorías eliminables (todas menos los ejemplos).
   * Controla la visibilidad del botón "Borrar todo".
   */
  protected get hasDeletable(): boolean {
    return this.audits.some((a) => !a.isExample);
  }

  /**
   * Elimina una auditoría concreta tras confirmación en el modal Sí/No.
   * Si se intenta sobre el ejemplo, solo se informa (no hay modal).
   *
   * @param audit Auditoría a eliminar.
   */
  protected async deleteOne(audit: AuditSummary): Promise<void> {
    // El ejemplo es permanente: se avisa y no se ofrece confirmación.
    if (audit.isExample) {
      this.alerts.toast(
        'La auditoría de ejemplo no se puede eliminar: siempre estará en tu historial.',
        'info'
      );
      return;
    }

    // Modal de confirmación: el usuario debe elegir explícitamente.
    const aceptado = await this.alerts.confirm({
      title: 'Eliminar auditoría',
      message:
        `¿Estás seguro de que quieres eliminar la auditoría de ` +
        `${audit.domain}? Esta acción no se puede deshacer.`,
      confirmText: 'Sí, eliminar',
      cancelText: 'No, cancelar',
      danger: true
    });
    if (!aceptado) return;

    this.deletingIds.add(audit.id);
    this.api.deleteAudit(audit.id).subscribe({
      next: () => {
        this.deletingIds.delete(audit.id);
        this.alerts.toast(`Auditoría de ${audit.domain} eliminada.`, 'success');
        this.loadAudits();
      },
      error: () => {
        this.deletingIds.delete(audit.id);
        this.alerts.toast('No se pudo eliminar la auditoría.', 'error');
      }
    });
  }

  /**
   * Elimina todas las auditorías del usuario excepto los ejemplos,
   * previa confirmación en el modal.
   */
  protected async deleteAll(): Promise<void> {
    const aceptado = await this.alerts.confirm({
      title: 'Borrar todo el historial',
      message:
        '¿Estás seguro de que quieres eliminar TODAS tus auditorías? ' +
        'Las auditorías de ejemplo se conservan y esta acción no se puede deshacer.',
      confirmText: 'Sí, borrar todo',
      cancelText: 'No, cancelar',
      danger: true
    });
    if (!aceptado) return;

    this.deletingAll = true;
    this.api.deleteAllAudits().subscribe({
      next: ({ deleted }) => {
        this.deletingAll = false;
        this.alerts.toast(
          deleted > 0
            ? `${deleted} auditoría(s) eliminada(s). Los ejemplos se conservan.`
            : 'No hay auditorías que eliminar.',
          'success'
        );
        this.loadAudits();
      },
      error: () => {
        this.deletingAll = false;
        this.alerts.toast('No se pudo completar el borrado masivo.', 'error');
      }
    });
  }

  /**
   * Suma los hallazgos de una auditoría en todas sus severidades.
   *
   * @param audit Resumen de auditoría del listado.
   */
  protected totalFindings(audit: AuditSummary): number {
    const c = audit.counts;
    return c.critical + c.high + c.medium + c.low + c.informational;
  }
}
