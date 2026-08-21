/**
 * ============================================================================
 * REPOSITORIO DE AUDITORÍAS
 * ----------------------------------------------------------------------------
 * Única capa que accede a la tabla Audit. Encapsula Prisma, las
 * transacciones y el mapeo fila↔dominio (RNF-012, RNF-016).
 * ============================================================================
 */

import { Audit } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AuditStatus, Confidence, Severity } from '../../shared/types/common.types';
import { ScoredFinding } from '../../risk-engine/risk.types';
import { calculateFindingRisk } from '../../risk-engine/finding-risk.calculator';

/** Datos mínimos para crear una auditoría (RF-004). */
export interface CreateAuditData {
  url: string;
  domain: string;
  /** Propietario de la auditoría (usuario autenticado). */
  userId: string;
  /// `true` solo para los ejemplos entregados al registrarse.
  isExample?: boolean;
}

/**
 * Payload completo de resultados que persiste el motor de scanning al
 * finalizar una auditoría.
 */
export interface AuditResultsPayload {
  status: 'COMPLETED' | 'FAILED';
  score: number | null;
  grade: string | null;
  /** Conteo de hallazgos por severidad. */
  counts: Record<Severity, number>;
  technologies: unknown[];
  rawResults: Record<string, unknown>;
  analyzerErrors: Array<{ analyzer: string; error: string }>;
  errorMessage: string | null;
  findings: ScoredFinding[];
}

/**
 * Crea una nueva auditoría en estado PENDING.
 *
 * @param data URL y dominio del objetivo ya validados.
 */
export async function createAudit(data: CreateAuditData): Promise<Audit> {
  return prisma.audit.create({
    data: {
      url: data.url,
      domain: data.domain,
      userId: data.userId,
      status: 'PENDING',
      isExample: data.isExample ?? false
    }
  });
}

/**
 * Devuelve únicamente el propietario de una auditoría (consulta ligera
 * para comprobaciones de propiedad sin traer el registro completo).
 *
 * @param id Identificador de la auditoría.
 */
export async function findAuditOwner(
  id: string
): Promise<{ id: string; userId: string | null } | null> {
  return prisma.audit.findUnique({
    where: { id },
    select: { id: true, userId: true }
  });
}

/**
 * Busca la auditoría completada más reciente de un dominio dado.
 * Se usa para localizar la plantilla del ejemplo que se clona a cada
 * usuario nuevo al registrarse.
 *
 * @param domain Dominio objetivo (p. ej. "example.com").
 */
export async function findLatestCompletedByDomain(domain: string): Promise<Audit | null> {
  return prisma.audit.findFirst({
    where: { domain, status: 'COMPLETED' },
    orderBy: { startedAt: 'desc' }
  });
}

/**
 * Clona una auditoría completada (con todos sus hallazgos) y la asigna a un
 * usuario. Las fechas se actualizan a ahora para que el ejemplo aparezca
 * como reciente. Operación atómica dentro de una transacción.
 *
 * @param templateId Identificador de la auditoría plantilla.
 * @param userId     Usuario que recibirá la copia.
 */
export async function cloneAuditForUser(templateId: string, userId: string): Promise<Audit> {
  const template = await prisma.audit.findUnique({
    where: { id: templateId },
    include: { findings: true }
  });
  if (!template) {
    throw new Error(`Plantilla de ejemplo ${templateId} no encontrada`);
  }

  const now = new Date();
  return prisma.$transaction(async (tx) => {
    // Copia del registro principal con nuevo propietario y fechas frescas.
    const copy = await tx.audit.create({
      data: {
        url: template.url,
        domain: template.domain,
        userId,
        status: template.status,
        // La copia queda marcada como ejemplo: no será eliminable.
        isExample: true,
        startedAt: now,
        finishedAt: now,
        score: template.score,
        grade: template.grade,
        criticalCount: template.criticalCount,
        highCount: template.highCount,
        mediumCount: template.mediumCount,
        lowCount: template.lowCount,
        infoCount: template.infoCount,
        technologiesJson: template.technologiesJson,
        rawResultsJson: template.rawResultsJson,
        analyzerErrorsJson: template.analyzerErrorsJson,
        errorMessage: template.errorMessage
      }
    });

    // Copia de los hallazgos asociados (si los hay). El desglose de riesgo
    // se RECALCULA a partir de severidad/confianza/categoría en lugar de
    // copiarlo, de modo que plantillas antiguas o incompletas no arrastren
    // valores a 0 ni desactualizados.
    if (template.findings.length > 0) {
      await tx.finding.createMany({
        data: template.findings.map((f) => {
          const risk = calculateFindingRisk({
            severity: f.severity as Severity,
            confidence: f.confidence as Confidence,
            category: f.category
          });
          return {
            auditId: copy.id,
            refId: f.refId,
            title: f.title,
            category: f.category,
            severity: f.severity,
            confidence: f.confidence,
            description: f.description,
            evidence: f.evidence,
            impact: f.impact,
            recommendation: f.recommendation,
            riskScore: risk.riskScore,
            impactLevel: risk.impactLevel,
            probabilityLevel: risk.probabilityLevel,
            exposureLevel: risk.exposureLevel,
            owaspJson: f.owaspJson,
            cweJson: f.cweJson,
            cveJson: f.cveJson,
            isoJson: f.isoJson
          };
        })
      });
    }

    return copy;
  });
}

/**
 * Busca una auditoría por su identificador.
 *
 * @param id Identificador de la auditoría.
 */
export async function findAuditById(id: string): Promise<Audit | null> {
  return prisma.audit.findUnique({ where: { id } });
}

/**
 * Busca una auditoría incluyendo sus hallazgos (para el detalle).
 *
 * @param id Identificador de la auditoría.
 */
export async function findAuditWithFindings(
  id: string
): Promise<Audit & { findings: unknown[] }> {
  const audit = await prisma.audit.findUnique({
    where: { id },
    include: { findings: true }
  });
  return audit as Audit & { findings: unknown[] };
}

/**
 * Lista las auditorías de un usuario ordenadas por fecha descendente (RF-029).
 * El historial es privado: solo se devuelven auditorías propias.
 *
 * @param userId Propietario de las auditorías.
 * @param limit  Máximo de registros a devolver (1-100).
 */
export async function findAllAudits(userId: string, limit = 50): Promise<Audit[]> {
  return prisma.audit.findMany({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    take: Math.min(Math.max(limit, 1), 100)
  });
}

/**
 * Elimina una auditoría por su identificador. Los hallazgos asociados se
 * borran en cascada (onDelete: Cascade en el esquema).
 *
 * @param id Identificador de la auditoría.
 */
export async function deleteAuditById(id: string): Promise<void> {
  await prisma.audit.delete({ where: { id } });
}

/**
 * Elimina TODAS las auditorías de un usuario excepto los ejemplos
 * (RF-029: la auditoría de ejemplo es permanente). Devuelve cuántas se
 * borraron para informar al cliente.
 *
 * @param userId Propietario de las auditorías.
 */
export async function deleteAllAuditsForUser(userId: string): Promise<number> {
  const result = await prisma.audit.deleteMany({
    where: { userId, isExample: false }
  });
  return result.count;
}

/**
 * Actualiza el estado de la auditoría con mensaje opcional.
 *
 * @param id           Identificador de la auditoría.
 * @param status       Nuevo estado (RF-006).
 * @param errorMessage Mensaje seguro cuando el estado es FAILED.
 */
export async function updateAuditStatus(
  id: string,
  status: AuditStatus,
  errorMessage?: string | null
): Promise<void> {
  await prisma.audit.update({
    where: { id },
    data: { status, ...(errorMessage !== undefined ? { errorMessage } : {}) }
  });
}

/**
 * Persiste atómicamente el resultado completo de una auditoría:
 * score, conteos, tecnologías, resultados crudos, errores por analizador y
 * el reemplazo íntegro de los hallazgos (RF-032, RNF-015).
 *
 * @param auditId Identificador de la auditoría.
 * @param payload Resultados generados por el motor de scanning.
 */
export async function saveAuditResults(
  auditId: string,
  payload: AuditResultsPayload
): Promise<void> {
  await prisma.$transaction([
    // Reemplazo de hallazgos dentro de la misma transacción.
    prisma.finding.deleteMany({ where: { auditId } }),
    prisma.finding.createMany({
      data: payload.findings.map((f) => ({
        auditId,
        refId: f.refId,
        title: f.title,
        category: f.category,
        severity: f.severity,
        confidence: f.confidence,
        description: f.description,
        evidence: f.evidence,
        impact: f.impact,
        recommendation: f.recommendation,
        // Desglose cuantitativo calculado por el motor de riesgos.
        riskScore: f.riskScore,
        impactLevel: f.impactLevel,
        probabilityLevel: f.probabilityLevel,
        exposureLevel: f.exposureLevel,
        owaspJson: JSON.stringify(f.references.owasp ?? []),
        cweJson: JSON.stringify(f.references.cwe ?? []),
        cveJson: JSON.stringify(f.references.cve ?? []),
        isoJson: JSON.stringify(f.references.iso ?? [])
      }))
    }),
    // Actualización del registro principal de la auditoría.
    prisma.audit.update({
      where: { id: auditId },
      data: {
        status: payload.status,
        finishedAt: new Date(),
        score: payload.score,
        grade: payload.grade,
        criticalCount: payload.counts.CRITICAL,
        highCount: payload.counts.HIGH,
        mediumCount: payload.counts.MEDIUM,
        lowCount: payload.counts.LOW,
        infoCount: payload.counts.INFORMATIONAL,
        technologiesJson: JSON.stringify(payload.technologies),
        rawResultsJson: JSON.stringify(payload.rawResults),
        analyzerErrorsJson: JSON.stringify(payload.analyzerErrors),
        errorMessage: payload.errorMessage
      }
    })
  ]);
}
