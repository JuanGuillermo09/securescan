/**
 * ============================================================================
 * ANALIZADOR DE TECNOLOGÍAS
 * ----------------------------------------------------------------------------
 * Punto de entrada del análisis de tecnologías (RF-011) y de la
 * identificación de vulnerabilidades conocidas asociadas (RF-013).
 * La lógica de firmas vive en technology.rules.ts; el dataset de CVEs en
 * standards/cve/.
 * ============================================================================
 */

import { FindingDraft } from '../../modules/findings/findings.types';
import { standardsService } from '../../standards/standards.service';
import { detectTechnologies, ruleKnownVulnerabilities } from './technology.rules';
import { TechnologyAnalysisInput, TechnologyData } from './technology.types';

/**
 * Ejecuta la detección de tecnologías sobre los datos del objetivo.
 *
 * @param input Cabeceras, cookies y HTML del objetivo.
 * @returns Tecnologías + CVEs conocidos + hallazgos generados.
 */
export function analyzeTechnology(input: TechnologyAnalysisInput): {
  data: TechnologyData;
  findings: FindingDraft[];
} {
  // Detección de tecnologías mediante firmas.
  const technologies = detectTechnologies(input);

  const findings: FindingDraft[] = [];
  const knownVulnerabilities: TechnologyData['knownVulnerabilities'] = [];

  // Regla: relacionar cada tecnología con vulnerabilidades conocidas.
  for (const tech of technologies) {
    for (const finding of ruleKnownVulnerabilities(tech)) {
      findings.push(finding);
    }

    // Registra las coincidencias también como datos estructurados para
    // el dashboard y el informe PDF.
    const vulns = standardsService.findKnownVulnerabilities(tech.name, tech.version);
    for (const vuln of vulns) {
      knownVulnerabilities.push({
        cve: vuln.cve,
        technology: vuln.technology,
        severity: vuln.severity,
        description: vuln.description,
        reference: vuln.reference,
        ...(tech.version ? { version: tech.version } : {})
      });
    }
  }

  return { data: { technologies, knownVulnerabilities }, findings };
}
