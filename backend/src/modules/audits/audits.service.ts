/**
 * ============================================================================
 * SERVICIO DE AUDITORÍAS
 * ----------------------------------------------------------------------------
 * Lógica de negocio del módulo: mapeo entre filas de base de datos y DTOs,
 * listado, consulta de detalle y coordinación de la creación + lanzamiento
 * asíncrono del análisis (RF-004 a RF-006, RF-029).
 * ============================================================================
 */

import { Audit } from '@prisma/client';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error';
import { logger } from '../../shared/utils/logger.util';
import {
  cloneAuditForUser,
  createAudit as persistAudit,
  deleteAllAuditsForUser,
  deleteAuditById,
  findAuditById,
  findAuditOwner,
  findAuditWithFindings,
  findAllAudits,
  findLatestCompletedByDomain
} from './audits.repository';
import { runAudit } from '../../scanners/core/scanner.engine';
import { AuditDetailDto, AuditSummaryDto } from './audits.types';

/**
 * Convierte una fila de auditoría en el DTO resumido.
 *
 * @param audit Fila cruda de la tabla Audit.
 */
export function toSummaryDto(audit: Audit): AuditSummaryDto {
  return {
    id: audit.id,
    url: audit.url,
    domain: audit.domain,
    status: audit.status as AuditSummaryDto['status'],
    startedAt: audit.startedAt,
    finishedAt: audit.finishedAt,
    score: audit.score,
    grade: audit.grade,
    counts: {
      critical: audit.criticalCount,
      high: audit.highCount,
      medium: audit.mediumCount,
      low: audit.lowCount,
      informational: audit.infoCount
    },
    isExample: audit.isExample
  };
}

/**
 * Convierte una fila con hallazgos en el DTO de detalle completo.
 *
 * @param audit Fila de Audit con `findings` incluidos.
 */
export function toDetailDto(
  audit: Audit & { findings: Array<Record<string, unknown>> }
): AuditDetailDto {
  const summary = toSummaryDto(audit as Audit);

  return {
    ...summary,
    technologies: parseJsonArray(String(audit.technologiesJson ?? '[]')),
    analyzerErrors: parseJsonArray(String(audit.analyzerErrorsJson ?? '[]')) as Array<{
      analyzer: string;
      error: string;
    }>,
    rawResults: safeParseObject(String(audit.rawResultsJson ?? '{}')),
    errorMessage: audit.errorMessage ?? null,
    findings: (audit.findings as Array<Record<string, unknown>>).map((f) => ({
      refId: String(f.refId),
      title: String(f.title),
      category: String(f.category),
      severity: String(f.severity),
      confidence: String(f.confidence),
      description: String(f.description),
      evidence: String(f.evidence),
      impact: String(f.impact),
      recommendation: String(f.recommendation),
      riskScore: Number(f.riskScore ?? 0),
      impactLevel: Number(f.impactLevel ?? 0),
      probabilityLevel: Number(f.probabilityLevel ?? 0),
      exposureLevel: Number(f.exposureLevel ?? 0),
      references: {
        owasp: parseStringArray(String(f.owaspJson ?? '[]')),
        cwe: parseStringArray(String(f.cweJson ?? '[]')),
        cve: parseStringArray(String(f.cveJson ?? '[]')),
        iso: parseStringArray(String(f.isoJson ?? '[]'))
      }
    }))
  };
}

/**
 * Crea la auditoría del usuario autenticado y lanza el análisis en segundo
 * plano. La respuesta HTTP no espera al escaneo (RNF-013); el usuario
 * consulta el estado mediante el endpoint de detalle.
 *
 * @param url       URL objetivo ya validada por el esquema.
 * @param userId    Propietario de la auditoría.
 * @param isExample `true` solo cuando el escaneo es el ejemplo de respaldo.
 */
export async function startAudit(
  url: string,
  userId: string,
  isExample = false
): Promise<AuditSummaryDto> {
  const targetUrl = new URL(url);
  const audit = await persistAudit({
    url: targetUrl.toString(),
    domain: targetUrl.hostname,
    userId,
    isExample
  });

  // Ejecución asíncrona sin bloquear la respuesta HTTP.
  void runAudit(audit.id);
  logger.info(`Auditoría ${audit.id} creada para ${audit.domain}`);

  return toSummaryDto(audit);
}

/**
 * Lista el historial de auditorías del usuario autenticado.
 *
 * @param userId Propietario de las auditorías.
 * @param limit  Máximo de registros.
 */
export async function listAudits(userId: string, limit = 50): Promise<AuditSummaryDto[]> {
  const audits = await findAllAudits(userId, limit);
  return audits.map(toSummaryDto);
}

/**
 * Dominio objetivo del ejemplo estándar que se muestra a los usuarios nuevos.
 * Es el sitio de pruebas público de la IANA, seguro para analizar.
 */
export const EXAMPLE_AUDIT_DOMAIN = 'example.com';

/**
 * Crea la auditoría de ejemplo de un usuario recién registrado:
 *   1. Si existe una auditoría completada de example.com (plantilla), se
 *      clona instantáneamente con todos sus hallazgos.
 *   2. Si no hay plantilla, se lanza un escaneo real contra example.com.
 *
 * Así cualquier cuenta nueva ve desde el primer momento que la herramienta
 * funciona, sin esperar ni generar tráfico innecesario.
 *
 * @param userId Propietario del ejemplo.
 */
export async function createExampleAuditForUser(userId: string): Promise<void> {
  const template = await findLatestCompletedByDomain(EXAMPLE_AUDIT_DOMAIN);

  if (template) {
    await cloneAuditForUser(template.id, userId);
    logger.info(`Auditoría de ejemplo clonada para el usuario ${userId}`);
    return;
  }

  // Sin plantilla disponible: se lanza un escaneo real de respaldo,
  // marcado también como ejemplo para que quede protegido.
  logger.info('Sin plantilla de ejemplo; lanzando escaneo real a example.com');
  await startAudit(`https://${EXAMPLE_AUDIT_DOMAIN}`, userId, true);
}

/**
 * Comprueba que la auditoría exista y pertenezca al usuario indicado.
 * Devuelve 404 tanto si no existe como si es de otro usuario: no se revela
 * la existencia de recursos ajenos (RNF-007).
 *
 * @param id     Identificador de la auditoría.
 * @param userId Propietario esperado.
 */
export async function requireOwnedAudit(
  id: string,
  userId: string
): Promise<void> {
  const owner = await findAuditOwner(id);
  if (!owner || owner.userId !== userId) {
    throw new NotFoundError('Auditoría no encontrada');
  }
}

/**
 * Obtiene el detalle completo de una auditoría propia.
 *
 * @param id     Identificador de la auditoría.
 * @param userId Propietario esperado.
 * @throws NotFoundError si no existe o no pertenece al usuario.
 */
export async function getAuditDetail(id: string, userId: string): Promise<AuditDetailDto> {
  await requireOwnedAudit(id, userId);

  const withFindings = await findAuditWithFindings(id);
  return toDetailDto(withFindings as Audit & { findings: Array<Record<string, unknown>> });
}

/**
 * Elimina una auditoría propia (RF-029). La auditoría de ejemplo está
 * protegida: cualquier intento de borrarla responde 409.
 *
 * @param id     Identificador de la auditoría.
 * @param userId Propietario esperado.
 * @throws NotFoundError si no existe o pertenece a otro usuario.
 * @throws ConflictError si se intenta borrar el ejemplo.
 */
export async function deleteAudit(id: string, userId: string): Promise<void> {
  await requireOwnedAudit(id, userId);

  const audit = await findAuditById(id);
  if (audit?.isExample) {
    throw new ConflictError('La auditoría de ejemplo no se puede eliminar');
  }

  await deleteAuditById(id);
  logger.info(`Auditoría ${id} eliminada por el usuario ${userId}`);
}

/**
 * Elimina todas las auditorías del usuario EXCEPTO los ejemplos (RF-029).
 *
 * @param userId Propietario de las auditorías.
 * @returns Cantidad de auditorías eliminadas.
 */
export async function deleteAllAudits(userId: string): Promise<number> {
  const deleted = await deleteAllAuditsForUser(userId);
  logger.info(`El usuario ${userId} eliminó ${deleted} auditorías en lote`);
  return deleted;
}

/**
 * Obtiene la fila cruda de una auditoría o lanza 404.
 * Usado por otros módulos (por ejemplo, reports).
 *
 * @param id Identificador de la auditoría.
 */
export async function requireAudit(id: string): Promise<Audit> {
  const audit = await findAuditById(id);
  if (!audit) {
    throw new NotFoundError('Auditoría no encontrada');
  }
  return audit;
}

/**
 * Parsea un JSON garantizando que el resultado sea un array.
 */
function parseJsonArray(json: string): unknown[] {
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Parsea un JSON garantizando un array de cadenas (referencias estándar).
 */
function parseStringArray(json: string): string[] {
  return parseJsonArray(json).map((item) => String(item));
}

/**
 * Parsea un JSON garantizando que el resultado sea un objeto.
 */
function safeParseObject(json: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(json);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}
