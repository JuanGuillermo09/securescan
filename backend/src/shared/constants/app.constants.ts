/**
 * ============================================================================
 * CONSTANTES GLOBALES DE LA APLICACIÓN
 * ----------------------------------------------------------------------------
 * Valores compartidos por múltiples módulos: orden canónico de severidades,
 * orden de confianza y rutas sensibles que el analizador de exposición
 * sondea durante una auditoría.
 * ============================================================================
 */

import { Confidence, Severity } from '../types/common.types';

/**
 * Orden canónico de severidad (menor número = mayor riesgo).
 * Se utiliza para ordenar hallazgos de mayor a menor riesgo (RF-017).
 */
export const SEVERITY_ORDER: Record<Severity, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
  INFORMATIONAL: 4
};

/**
 * Orden de confianza (mayor confianza primero).
 * Se usa como criterio secundario al ordenar hallazgos.
 */
export const CONFIDENCE_ORDER: Record<Confidence, number> = {
  HIGH: 0,
  MEDIUM: 1,
  LOW: 2
};

/**
 * Rutas comunes que se sondean de forma pasiva (GET simple) buscando archivos
 * o recursos expuestos públicamente. Mantener la lista corta para no
 * convertir el análisis en un escaneo intrusivo (RNF-025).
 */
export const PROBE_PATHS = ['/.env', '/.git/HEAD', '/phpinfo.php'] as const;
