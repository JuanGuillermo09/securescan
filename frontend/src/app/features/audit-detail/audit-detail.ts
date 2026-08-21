/**
 * ============================================================================
 * COMPONENTE: AUDIT-DETAIL — DASHBOARD DE RESULTADOS
 * ----------------------------------------------------------------------------
 * Muestra el detalle de una auditoría (HU-002, RF-023/RF-024):
 *   - Estado en vivo con sondeo cada 2 s mientras está en ejecución.
 *   - Security Score con anillo SVG y nota cualitativa (RF-018).
 *   - Distribución de riesgos por severidad.
 *   - Tecnologías detectadas y errores parciales de analizadores (RF-032).
 *   - Hallazgos ordenados por riesgo, expandibles uno a uno (RF-017).
 *   - Descarga del informe PDF (RF-030).
 * ============================================================================
 */

import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../core/api/api.service';
import {
  AuditDetail as AuditDetailModel,
  SEVERITY_LABELS,
  STATUS_LABELS,
  Severity
} from '../../shared/models/audit.model';

/** Intervalo de sondeo del estado mientras la auditoría no finaliza. */
const POLL_INTERVAL_MS = 2000;

@Component({
  selector: 'app-audit-detail',
  imports: [CommonModule],
  templateUrl: './audit-detail.html',
  styleUrl: './audit-detail.css'
})
export class AuditDetail implements OnInit, OnDestroy {
  /** Parámetros de ruta para obtener el :id de la auditoría. */
  private readonly route = inject(ActivatedRoute);
  /** Acceso a la API REST del backend. */
  private readonly api = inject(ApiService);

  /** Referencia al ancla de la sección de hallazgos (scroll suave). */
  @ViewChild('findingsSection') findingsSection?: ElementRef<HTMLElement>;

  /** Detalle de la auditoría; `null` mientras carga. */
  protected audit: AuditDetailModel | null = null;
  /** Error de carga (p. ej. backend apagado o id inexistente). */
  protected loadError: string | null = null;
  /** refId del hallazgo expandido en el acordeón; `null` = ninguno. */
  protected expandedRefId: string | null = null;
  /** Etiquetas legibles de severidad y estado para las plantillas. */
  protected readonly severityLabels = SEVERITY_LABELS;
  protected readonly statusLabels = STATUS_LABELS;

  /** Identificador del temporizador de sondeo activo. */
  private pollTimer: ReturnType<typeof setInterval> | null = null;

  /** Orden canónico de severidades para la lista de distribución. */
  protected readonly severityOrder: Severity[] = [
    'CRITICAL',
    'HIGH',
    'MEDIUM',
    'LOW',
    'INFORMATIONAL'
  ];

  /**
   * Al inicializar: lee el :id de la ruta y carga la auditoría.
   */
  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) {
      this.loadError = 'Auditoría no encontrada.';
      return;
    }
    this.load(id);
  }

  /**
   * Al destruir el componente: detiene el sondeo para evitar fugas.
   */
  ngOnDestroy(): void {
    this.stopPolling();
  }

  /** Score actual; 0 mientras no haya datos (anillo vacío). */
  protected get score(): number {
    return this.audit?.score ?? 0;
  }

  /**
   * Desplazamiento del arco SVG según el score.
   * Circunferencia del anillo r=54 → 2π·54 ≈ 339.3 unidades.
   */
  protected get ringOffset(): number {
    const circumference = 2 * Math.PI * 54;
    return circumference * (1 - this.score / 100);
  }

  /** Clase CSS que colorea el anillo según tramos de score. */
  protected get scoreColorClass(): string {
    if (this.score >= 90) return 'excellent';
    if (this.score >= 75) return 'good';
    if (this.score >= 60) return 'fair';
    if (this.score >= 40) return 'poor';
    return 'critical';
  }

  /** `true` mientras la auditoría está pendiente o en ejecución. */
  protected get isRunning(): boolean {
    return this.audit?.status === 'PENDING' || this.audit?.status === 'RUNNING';
  }

  /** Total de hallazgos sumando todas las severidades. */
  protected get totalFindings(): number {
    if (!this.audit) return 0;
    const c = this.audit.counts;
    return c.critical + c.high + c.medium + c.low + c.informational;
  }

  /**
   * Conteo de hallazgos para una severidad concreta.
   *
   * @param severity Severidad consultada por la plantilla.
   */
  protected countOf(severity: Severity): number {
    if (!this.audit) return 0;
    switch (severity) {
      case 'CRITICAL': return this.audit.counts.critical;
      case 'HIGH': return this.audit.counts.high;
      case 'MEDIUM': return this.audit.counts.medium;
      case 'LOW': return this.audit.counts.low;
      default: return this.audit.counts.informational;
    }
  }

  /**
   * Expande/colapsa un hallazgo del acordeón (comportamiento exclusivo).
   *
   * @param refId Identificador público del hallazgo (SEC-xxx).
   */
  protected toggleFinding(refId: string): void {
    this.expandedRefId = this.expandedRefId === refId ? null : refId;
  }

  /** URL de descarga del informe PDF; '#' si aún no hay auditoría. */
  protected downloading = false;
  /** Mensaje de error si la descarga del PDF falla. */
  protected downloadError: string | null = null;

  /**
   * Descarga el informe PDF autenticándose mediante el interceptor HTTP
   * (blob) y lo guarda con un nombre basado en el dominio escaneado.
   */
  protected downloadReport(): void {
    if (!this.audit || this.downloading) return;
    this.downloading = true;
    this.downloadError = null;

    this.api.downloadReport(this.audit.id).subscribe({
      next: (res) => {
        const blob = res.body;
        if (!blob) {
          this.downloadError = 'El informe llegó vacío.';
          this.downloading = false;
          return;
        }
        // Crea un enlace temporal hacia el blob y dispara la descarga.
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = `securescan-${this.audit!.domain}.pdf`;
        anchor.click();
        URL.revokeObjectURL(url);
        this.downloading = false;
      },
      error: () => {
        this.downloadError = 'No fue posible descargar el informe.';
        this.downloading = false;
      }
    });
  }

  /** Nombres de analizadores que terminaron con error, separados por coma. */
  protected analyzerErrorNames(): string {
    return this.audit?.analyzerErrors.map((e) => e.analyzer).join(', ') ?? '';
  }

  /** Desplaza la vista hasta la sección de hallazgos. */
  protected scrollToFindings(): void {
    this.findingsSection?.nativeElement.scrollIntoView({ behavior: 'smooth' });
  }

  /**
   * Carga la auditoría y gestiona el sondeo: lo inicia si sigue en
   * ejecución y lo detiene cuando ya hay resultado final.
   *
   * @param id Identificador de la auditoría.
   */
  private load(id: string): void {
    this.api.getAudit(id).subscribe({
      next: (audit) => {
        this.audit = audit;
        if (this.isRunning) {
          this.startPolling(id);
        } else {
          this.stopPolling();
        }
      },
      error: () => {
        this.loadError = 'No fue posible cargar la auditoría. ¿Está el backend en ejecución?';
      }
    });
  }

  /**
   * Inicia el sondeo periódico del estado (si no estaba ya activo).
   *
   * @param id Identificador de la auditoría a sondear.
   */
  private startPolling(id: string): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(() => this.load(id), POLL_INTERVAL_MS);
  }

  /** Detiene y limpia el temporizador de sondeo. */
  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }
}
