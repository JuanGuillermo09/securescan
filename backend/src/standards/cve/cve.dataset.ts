/**
 * ============================================================================
 * DATASET CURADO DE VULNERABILIDADES CONOCIDAS (CVE)
 * ----------------------------------------------------------------------------
 * Conjunto reducido de vulnerabilidades conocidas para la V1 (RF-013).
 * Cada entrada declara la tecnología, las versiones afectadas y su
 * severidad. La coincidencia se realiza sobre versiones declaradas
 * públicamente por el objetivo (cabeceras, metadatos), por lo que:
 *   - Los hallazgos se marcan con confianza MEDIUM.
 *   - Deben validarse manualmente antes de considerarse confirmados.
 *
 * Futuras versiones podrán consultar fuentes externas (NVD, OSV) sin
 * cambiar la interfaz de este módulo.
 * ============================================================================
 */

import { isVersionLowerThan } from '../../shared/utils/version.util';
import { KnownVulnerability } from '../standards.types';

/**
 * Catálogo de vulnerabilidades conocidas.
 * `affects` recibe la versión detectada y decide si está afectada.
 */
export const KNOWN_VULNERABILITIES: KnownVulnerability[] = [
  {
    cve: 'CVE-2021-41773',
    technology: 'Apache httpd',
    severity: 'CRITICAL',
    description:
      'Recorrido de rutas y divulgación de archivos en Apache HTTP Server 2.4.49, con posible ejecución remota de código cuando CGI está habilitado.',
    reference: 'https://httpd.apache.org/security/vulnerabilities_24.html',
    affects: (v) => v === '2.4.49'
  },
  {
    cve: 'CVE-2021-42013',
    technology: 'Apache httpd',
    severity: 'CRITICAL',
    description:
      'Recorrido de rutas y ejecución remota de código en Apache HTTP Server 2.4.49 y 2.4.50 (variante del CVE-2021-41773).',
    reference: 'https://httpd.apache.org/security/vulnerabilities_24.html',
    affects: (v) => v === '2.4.49' || v === '2.4.50'
  },
  {
    cve: 'CVE-2024-4439',
    technology: 'WordPress',
    severity: 'MEDIUM',
    description:
      'XSS almacenado a través de bloques de comentario en versiones de WordPress anteriores a 6.4.3.',
    reference: 'https://wordpress.org/news/',
    affects: (v) => isVersionLowerThan(v, '6.4.3')
  },
  {
    cve: 'CVE-2020-11023',
    technology: 'jQuery',
    severity: 'MEDIUM',
    description:
      'XSS mediante la manipulación de elementos <option> en jQuery anterior a 3.5.0.',
    reference: 'https://blog.jquery.com/2020/04/10/jquery-3-5-0-released/',
    affects: (v) => isVersionLowerThan(v, '3.5.0')
  },
  {
    cve: 'CVE-2019-11358',
    technology: 'jQuery',
    severity: 'MEDIUM',
    description:
      'Modificación involuntaria del prototipo Object.prototype (prototype pollution) en jQuery anterior a 3.4.0.',
    reference: 'https://blog.jquery.com/2019/04/10/jquery-3-4-0-released/',
    affects: (v) => isVersionLowerThan(v, '3.4.0')
  }
];

/**
 * Busca vulnerabilidades conocidas para una tecnología y versión concretas.
 *
 * @param technology Nombre normalizado de la tecnología detectada.
 * @param version    Versión detectada (si no hay versión no se busca nada).
 * @returns Lista de vulnerabilidades cuya versión afectada coincide.
 */
export function findKnownVulnerabilities(
  technology: string,
  version?: string
): KnownVulnerability[] {
  if (!version) {
    return [];
  }
  return KNOWN_VULNERABILITIES.filter(
    (entry) => entry.technology.toLowerCase() === technology.toLowerCase() && entry.affects(version)
  );
}
