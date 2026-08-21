/**
 * ============================================================================
 * REGLAS DE PONDERACIÓN DE RIESGO
 * ----------------------------------------------------------------------------
 * Define cuántos puntos del Security Score descuenta cada hallazgo según su
 * severidad (RF-018, HU-012). Centralizar estos pesos permite ajustar la
 * política de riesgo sin tocar la lógica de cálculo.
 * ============================================================================
 */

import { Severity } from '../../shared/types/common.types';

/**
 * Descuento aplicado al score base (100) por cada hallazgo.
 * INFORMATIONAL no descuenta: es información relevante sin impacto directo.
 */
export const SEVERITY_DEDUCTIONS: Record<Severity, number> = {
  CRITICAL: 30,
  HIGH: 18,
  MEDIUM: 8,
  LOW: 3,
  INFORMATIONAL: 0
};
