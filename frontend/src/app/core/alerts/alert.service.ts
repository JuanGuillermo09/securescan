/**
 * ============================================================================
 * SERVICIO DE ALERTAS
 * ----------------------------------------------------------------------------
 * Centraliza los avisos de la aplicación:
 *   - confirm(): modal de confirmación reutilizable (Sí/No) que sustituye al
 *     `window.confirm` nativo para mantener la estética del producto.
 *   - toast(): notificaciones breves no bloqueantes (éxito/error/info).
 *
 * El componente AlertsComponent se monta una sola vez en App y pinta lo que
 * este servicio expone mediante signals.
 * ============================================================================
 */

import { Injectable, signal } from '@angular/core';

/** Opciones del modal de confirmación. */
export interface ConfirmOptions {
  /** Título corto de la ventana. */
  title: string;
  /** Mensaje explicativo (puede saltar de línea). */
  message: string;
  /** Texto del botón de aceptación (por defecto "Sí, continuar"). */
  confirmText?: string;
  /** Texto del botón de cancelación (por defecto "No, cancelar"). */
  cancelText?: string;
  /// `true` resalta el botón de aceptación en rojo (acciones destructivas).
  danger?: boolean;
}

/** Aviso breve apilado en la esquina superior derecha. */
export interface Toast {
  /** Identificador único para poder cerrarlo individualmente. */
  id: number;
  /** Tipo visual: éxito, error o informativo. */
  type: 'success' | 'error' | 'info';
  /** Contenido del mensaje. */
  message: string;
}

/** Duración por defecto de un toast en pantalla (ms). */
const TOAST_DURATION_MS = 4500;

@Injectable({ providedIn: 'root' })
export class AlertService {
  /** Modal de confirmación actualmente visible (null si hay ninguno). */
  readonly confirmState = signal<ConfirmOptions | null>(null);
  /** Pila de toasts visibles (las más recientes primero). */
  readonly toasts = signal<Toast[]>([]);

  /** Resolver pendiente del modal abierto. */
  private resolver: ((value: boolean) => void) | null = null;
  /** Contador para identificar cada toast. */
  private nextId = 1;

  /**
   * Muestra el modal de confirmación y devuelve una promesa con la elección:
   * `true` si el usuario acepta, `false` si cancela o cierra.
   *
   * @param options Textos y estilo del modal.
   */
  confirm(options: ConfirmOptions): Promise<boolean> {
    // Si ya había un modal abierto, se cierra como cancelado.
    this.answer(false);
    this.confirmState.set(options);
    return new Promise<boolean>((resolve) => {
      this.resolver = resolve;
    });
  }

  /**
   * Resuelve el modal abierto con la elección del usuario.
   * Invocado por los botones, el fondo o la tecla Escape.
   *
   * @param accepted `true` solo si el usuario pulsó el botón de aceptar.
   */
  answer(accepted: boolean): void {
    if (!this.confirmState()) return;
    this.confirmState.set(null);
    this.resolver?.(accepted);
    this.resolver = null;
  }

  /**
   * Muestra un aviso breve que desaparece solo.
   *
   * @param message Contenido del aviso.
   * @param type    Variante visual (por defecto success).
   */
  toast(message: string, type: Toast['type'] = 'success'): void {
    const toast: Toast = { id: this.nextId++, type, message };
    this.toasts.update((list) => [toast, ...list].slice(0, 4));
    setTimeout(() => this.dismissToast(toast.id), TOAST_DURATION_MS);
  }

  /**
   * Cierra un toast concreto (botón × o expiración automática).
   *
   * @param id Identificador del toast a quitar.
   */
  dismissToast(id: number): void {
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
