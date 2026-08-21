/**
 * ============================================================================
 * REPOSITORIO DE HALLAZGOS
 * ----------------------------------------------------------------------------
 * Única capa que accede a la tabla Finding de la base de datos. Aísla al
 * resto de la aplicación del ORM y del esquema (RNF-012, RNF-016).
 * ============================================================================
 */

import { Finding, Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { ScoredFinding } from '../../risk-engine/risk.types';
import { FindingDto } from './findings.types';

/**
 * Convierte una fila de la base de datos en el DTO expuesto por la API.
 * Los arrays de referencias se almacenan como JSON en columnas separadas.
 *
 * @param row Fila cruda de la tabla Finding.
 */
export function mapRowToDto(row: Finding): FindingDto {
  return {
    refId: row.refId,
    title: row.title,
    category: row.category,
    severity: row.severity,
    confidence: row.confidence,
    description: row.description,
    evidence: row.evidence,
    impact: row.impact,
    recommendation: row.recommendation,
    riskScore: row.riskScore,
    impactLevel: row.impactLevel,
    probabilityLevel: row.probabilityLevel,
    exposureLevel: row.exposureLevel,
    references: {
      owasp: parseArray(row.owaspJson),
      cwe: parseArray(row.cweJson),
      cve: parseArray(row.cveJson),
      iso: parseArray(row.isoJson)
    }
  };
}

/**
 * Parsea un string JSON garantizando que el resultado sea un array.
 *
 * @param json Contenido JSON almacenado en la columna.
 */
function parseArray(json: string): string[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Obtiene todos los hallazgos de una auditoría ordenados por su ID público
 * (que refleja el orden de riesgo asignado durante el análisis).
 *
 * @param auditId Identificador de la auditoría.
 */
export async function findByAudit(auditId: string): Promise<FindingDto[]> {
  const rows = await prisma.finding.findMany({
    where: { auditId },
    orderBy: { refId: 'asc' }
  });
  return rows.map(mapRowToDto);
}

/**
 * Reemplaza los hallazgos de una auditoría dentro de la transacción de
 * guardado de resultados. Se invoca desde audits.repository al persistir
 * una auditoría completada.
 *
 * @param tx       Cliente Prisma transaccional.
 * @param auditId  Identificador de la auditoría.
 * @param findings Hallazgos con ID público ya asignado.
 */
export async function replaceAuditFindings(
  tx: Prisma.TransactionClient,
  auditId: string,
  findings: ScoredFinding[]
): Promise<void> {
  // Elimina hallazgos previos para permitir re-ejecuciones idempotentes.
  await tx.finding.deleteMany({ where: { auditId } });

  // Inserta los nuevos hallazgos serializando las referencias como JSON.
  for (const finding of findings) {
    await tx.finding.create({
      data: {
        auditId,
        refId: finding.refId,
        title: finding.title,
        category: finding.category,
        severity: finding.severity,
        confidence: finding.confidence,
        description: finding.description,
        evidence: finding.evidence,
        impact: finding.impact,
        recommendation: finding.recommendation,
        riskScore: finding.riskScore,
        impactLevel: finding.impactLevel,
        probabilityLevel: finding.probabilityLevel,
        exposureLevel: finding.exposureLevel,
        owaspJson: JSON.stringify(finding.references.owasp ?? []),
        cweJson: JSON.stringify(finding.references.cwe ?? []),
        cveJson: JSON.stringify(finding.references.cve ?? []),
        isoJson: JSON.stringify(finding.references.iso ?? [])
      }
    });
  }
}
