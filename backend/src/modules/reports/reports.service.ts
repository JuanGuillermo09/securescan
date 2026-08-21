/**
 * ============================================================================
 * SERVICIO DE INFORMES
 * ----------------------------------------------------------------------------
 * Genera el informe PDF de una auditoría (RF-030) a partir del DTO de detalle.
 * Utiliza pdfkit y devuelve un stream listo para ser enviado por HTTP.
 *
 * Diseño del documento:
 *   - Banda superior oscura con marca y fecha de generación.
 *   - Secciones numeradas con chip azul y línea divisoria.
 *   - Tarjetas redondeadas para objetivo, score y hallazgos.
 *   - Barras proporcionales en la distribución de riesgos.
 *   - Chips para tecnologías y etiquetas de colores para referencias.
 * ============================================================================
 */

import PDFDocument from 'pdfkit';
import { env } from '../../config/env';
import { ConflictError, NotFoundError } from '../../shared/errors/app-error';
import { SEVERITY_DEDUCTIONS } from '../../risk-engine/risk.engine';
import { getAuditDetail, requireAudit } from '../audits/audits.service';
import { AuditDetailDto } from '../audits/audits.types';

/** Paleta de colores corporativa del informe. */
const COLORS = {
  /** Color principal para títulos. */
  ink: '#0f172a',
  /** Color de texto de párrafos. */
  body: '#334155',
  /** Color de texto secundario/etiquetas. */
  muted: '#64748b',
  /** Fondo suave para tarjetas y bloques. */
  softBg: '#f8fafc',
  /** Fondo alterno para filas. */
  rowAlt: '#f1f5f9',
  /** Borde de tarjetas y divisores. */
  border: '#e2e8f0',
  /** Azul de acento institucional. */
  accent: '#2563eb'
} as const;

/** Etiquetas legibles de severidad para el informe. */
const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low',
  INFORMATIONAL: 'Informational'
};

/** Colores asociados a cada severidad en el PDF. */
const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#b91c1c',
  HIGH: '#ea580c',
  MEDIUM: '#ca8a04',
  LOW: '#2563eb',
  INFORMATIONAL: '#64748b'
};

/** Etiquetas legibles de confianza (el backend las emite en mayúsculas). */
const CONFIDENCE_LABELS: Record<string, string> = {
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

/** Colores de las etiquetas de referencias por estándar. */
const REFERENCE_TAG_COLORS: Record<string, string> = {
  OWASP: '#2563eb',
  CWE: '#7c3aed',
  CVE: '#dc2626',
  // Etiqueta explícita: la correlación con ISO no implica certificación.
  'Referencia ISO/IEC': '#059669'
};

/** Resultado de la generación de un informe: documento + nombre sugerido. */
export interface ReportDocument {
  /** Documento PDF listo para transmitir (ya finalizado con doc.end()). */
  doc: PDFKit.PDFDocument;
  /** Nombre de archivo sugerido, incluye el dominio escaneado. */
  fileName: string;
}

/**
 * Devuelve el informe PDF de una auditoría propia junto al nombre de archivo
 * recomendado (basado en el dominio del objetivo).
 * Valida que la auditoría exista, pertenezca al usuario y haya finalizado
 * antes de generar el documento (RF-030).
 *
 * @param auditId Identificador de la auditoría.
 * @param userId  Propietario esperado de la auditoría.
 * @throws NotFoundError si no existe o no pertenece al usuario.
 * @throws ConflictError si la auditoría aún está en curso.
 */
export async function getReport(auditId: string, userId: string): Promise<ReportDocument> {
  const audit = await requireAudit(auditId);

  // Comprueba propiedad: los informes solo son accesibles por su dueño.
  if (audit.userId !== userId) {
    throw new NotFoundError('Auditoría no encontrada');
  }

  if (audit.status !== 'COMPLETED' && audit.status !== 'FAILED') {
    throw new ConflictError(
      'El informe estará disponible cuando la auditoría finalice'
    );
  }

  const detail = await getAuditDetail(auditId, userId);
  const domain = sanitizeFileName(detail.domain) || 'auditoria';

  return {
    doc: buildAuditReportStream(detail),
    fileName: `securescan-${domain}.pdf`
  };
}

/**
 * Construye el documento PDF con todas las secciones del informe.
 *
 * @param audit DTO de detalle de la auditoría.
 */
export function buildAuditReportStream(audit: AuditDetailDto): PDFKit.PDFDocument {
  const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true });

  // Ancho útil del contenido (página A4 menos márgenes de 50 pt por lado).
  const W = doc.page.width - 100;

  doc.lineWidth(1);

  // ---------- 0. Banda de portada ----------
  drawHeaderBand(doc, audit);

  // ---------- 1. Información del objetivo ----------
  sectionTitle(doc, '1', 'Información del objetivo');
  drawObjectiveCard(doc, audit, W);

  // ---------- 2. Security Score ----------
  sectionTitle(doc, '2', 'Security Score');
  drawScoreCard(doc, audit, W);

  // ---------- 3. Distribución de riesgos ----------
  sectionTitle(doc, '3', 'Distribución de riesgos');
  drawSeverityBars(doc, audit, W);

  // ---------- 4. Tecnologías detectadas (si aplica) ----------
  const technologies = audit.technologies as Array<Record<string, unknown>>;
  let sectionNumber = 3;
  if (technologies.length > 0) {
    sectionNumber += 1;
    sectionTitle(doc, String(sectionNumber), 'Tecnologías detectadas');
    drawTechnologyChips(doc, technologies, W);
  }

  // ---------- 5. Hallazgos ----------
  sectionNumber += 1;
  sectionTitle(doc, String(sectionNumber), `Hallazgos (${audit.findings.length})`);
  doc
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text('Ordenados de mayor a menor riesgo.', 50, doc.y, { width: W });
  doc.moveDown(0.8);

  if (audit.findings.length === 0) {
    drawEmptyState(doc, W);
  }

  for (const finding of audit.findings) {
    drawFindingCard(doc, finding, W);
  }

  // ---------- N. Notas y limitaciones ----------
  sectionNumber += 1;
  sectionTitle(doc, String(sectionNumber), 'Notas y limitaciones');
  drawNotesList(doc, W);

  // ---------- Pie de página en todas las hojas ----------
  drawFooters(doc, audit, W);

  doc.end();
  return doc;
}

/* ==========================================================================
 * SECCIONES DEL INFORME
 * ======================================================================== */

/**
 * Dibuja la banda oscura de cabecera con la marca, subtítulo, fecha de
 * generación y una franja de acento inferior.
 */
function drawHeaderBand(doc: PDFKit.PDFDocument, audit: AuditDetailDto): void {
  const bandH = 96;

  // Fondo oscuro a sangre completa.
  doc.rect(0, 0, doc.page.width, bandH).fill(COLORS.ink);
  doc.rect(0, bandH, doc.page.width, 4).fill(COLORS.accent);

  // Marca y subtítulo.
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(21)
    .text('SecureScan Web', 50, 24);
  doc.font('Helvetica').fontSize(11).fillColor('#cbd5e1')
    .text('Informe de Auditoría de Seguridad', 50, 52);

  // Metadatos alineados a la derecha.
  doc.fontSize(8).fillColor('#94a3b8')
    .text(`Generado: ${formatDate(new Date())}`, 50, 26, {
      width: doc.page.width - 100,
      align: 'right'
    });
  doc.text(`Auditoría ${audit.id}`, 50, 38, {
    width: doc.page.width - 100,
    align: 'right'
  });
  doc.text(`Objetivo: ${audit.domain}`, 50, 50, {
    width: doc.page.width - 100,
    align: 'right'
  });

  // Aviso de uso responsable dentro de la banda.
  doc.fontSize(7.5).fillColor('#94a3b8')
    .text('Plataforma sin autenticación · Uso responsable: analice únicamente objetivos autorizados', 50, 74, {
      width: doc.page.width - 100
    });

  doc.y = bandH + 30;
}

/**
 * Tarjeta con los datos del objetivo: URL, dominio, fechas y estado.
 */
function drawObjectiveCard(doc: PDFKit.PDFDocument, audit: AuditDetailDto, W: number): void {
  const rows: Array<[string, string]> = [
    ['URL OBJETIVO', audit.url],
    ['DOMINIO', audit.domain],
    ['INICIO', formatDate(audit.startedAt)],
    ['FIN', formatDate(audit.finishedAt)],
    ['ESTADO', audit.status]
  ];
  if (audit.errorMessage) {
    rows.push(['OBSERVACIÓN', audit.errorMessage]);
  }

  const rowH = 19;
  const padY = 10;
  const cardH = rows.length * rowH + padY * 2;

  roundedCard(doc, 50, doc.y, W, cardH);

  let y = doc.y + padY;
  rows.forEach(([label, value], index) => {
    // Fila alterna ligeramente sombreada para legibilidad.
    if (index % 2 === 1) {
      doc.rect(51, y - 2, W - 2, rowH).fill(COLORS.rowAlt);
    }
    doc.font('Helvetica-Bold').fontSize(7.5).fillColor(COLORS.muted)
      .text(label, 62, y + 2, { width: 105, characterSpacing: 0.4 });
    doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.ink)
      .text(truncate(value, 88), 172, y, { width: W - 132 });
    y += rowH;
  });

  doc.y += cardH + 18;
}

/**
 * Tarjeta destacada del Security Score en tres columnas:
 *   - Izquierda: número grande, barra de progreso y píldora con la nota.
 *   - Centro: distribución de hallazgos por severidad.
 *   - Derecha: desglose del cálculo (score inicial menos descuentos).
 * Cierra con una nota que aclara el carácter estimado del indicador.
 */
function drawScoreCard(doc: PDFKit.PDFDocument, audit: AuditDetailDto, W: number): void {
  const score = audit.score ?? 0;
  const grade = audit.grade ?? '-';
  const color = scoreColor(score);
  const top = doc.y;

  /* ---------- Medición de las tres columnas ---------- */

  // Columna izquierda: número + barra + píldora.
  const leftH = 88;

  // Columna central: distribución por severidad (5 filas fijas).
  const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] as const;
  const counts: Record<string, number> = {
    CRITICAL: audit.counts.critical,
    HIGH: audit.counts.high,
    MEDIUM: audit.counts.medium,
    LOW: audit.counts.low,
    INFORMATIONAL: audit.counts.informational
  };
  const distH = 14 + severities.length * 14;

  // Columna derecha: filas del cálculo (inicial + descuentos + final).
  const calcEntries = severities
    .map((sev) => ({ sev, count: counts[sev], ded: SEVERITY_DEDUCTIONS[sev] }))
    .filter((entry) => entry.count > 0 && entry.ded > 0);
  const calcRows = 1 + calcEntries.length + 1 + 1; // inicial + N + separador + final
  const calcH = 14 + calcRows * 13;

  // Nota al pie de la tarjeta.
  doc.font('Helvetica-Oblique').fontSize(7.5);
  const noteText =
    'El score representa una estimación relativa basada en los hallazgos detectados.';
  const noteH = doc.heightOfString(noteText, { width: W - 44, lineGap: 1 });

  const contentH = Math.max(leftH, distH, calcH);
  const cardH = 16 + contentH + 10 + noteH + 12;

  ensureSpace(doc, cardH + 10);

  roundedCard(doc, 50, top, W, cardH);

  /* ---------- Columna izquierda: score + barra + nota ---------- */

  doc.font('Helvetica-Bold').fontSize(38).fillColor(color)
    .text(String(score), 72, top + 16);
  const numW = doc.widthOfString(String(score));
  doc.font('Helvetica').fontSize(11).fillColor(COLORS.muted)
    .text('/ 100', 72 + numW + 6, top + 40);

  const barW = 150;
  const barY = top + 62;
  doc.roundedRect(72, barY, barW, 8, 4).fill(COLORS.border);
  doc.roundedRect(72, barY, Math.max((barW * score) / 100, 8), 8, 4).fill(color);

  // Píldora con la nota cualitativa bajo la barra.
  const pillLabel = `Nota ${grade}`;
  doc.font('Helvetica-Bold').fontSize(10);
  const pillW = doc.widthOfString(pillLabel) + 22;
  doc.roundedRect(72, barY + 16, pillW, 20, 10).fill(color);
  doc.fillColor('#ffffff').fontSize(10)
    .text(pillLabel, 72, barY + 21, { width: pillW, align: 'center' });

  /* ---------- Columna central: distribución ---------- */

  const distX = 250;
  let y = top + 16;
  doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted)
    .text('DISTRIBUCIÓN', distX, y, { characterSpacing: 0.6 });
  y += 14;

  for (const severity of severities) {
    doc.circle(distX + 3, y + 5, 2.6).fill(SEVERITY_COLORS[severity]);
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.body)
      .text(SEVERITY_LABELS[severity], distX + 12, y, { width: 80 });
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLORS.ink)
      .text(String(counts[severity]), distX, y, { width: 110, align: 'right' });
    y += 14;
  }

  /* ---------- Columna derecha: cálculo del score ---------- */

  const calcX = 392;
  const calcRight = 50 + W - 16;
  y = top + 16;
  doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted)
    .text('CÁLCULO DEL SCORE', calcX, y, { characterSpacing: 0.6 });
  y += 14;

  const calcRow = (label: string, value: string, bold = false): void => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8)
      .fillColor(bold ? COLORS.ink : COLORS.body);
    doc.text(label, calcX, y, { width: 90 });
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(8)
      .fillColor(bold ? COLORS.ink : COLORS.body);
    doc.text(value, calcX, y, { width: calcRight - calcX, align: 'right' });
    y += 13;
  };

  calcRow('Score inicial', '100');
  for (const entry of calcEntries) {
    calcRow(
      `${entry.count} × ${SEVERITY_LABELS[entry.sev]}`,
      `-${entry.count * entry.ded}`
    );
  }
  // Separador antes del resultado final.
  doc.moveTo(calcX, y + 4).lineTo(calcRight, y + 4).lineWidth(0.6)
    .stroke(COLORS.border);
  y += 13;
  calcRow('Security Score', String(score), true);

  /* ---------- Nota inferior ---------- */

  doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(COLORS.muted)
    .text(noteText, 72, top + 16 + contentH + 10, { width: W - 44, lineGap: 1 });

  doc.y = top + cardH + 18;
}

/**
 * Distribución de riesgos con puntos de color, barras proporcionales y
 * conteos alineados a la derecha.
 */
function drawSeverityBars(doc: PDFKit.PDFDocument, audit: AuditDetailDto, W: number): void {
  const severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFORMATIONAL'] as const;
  const counts: Record<string, number> = {
    CRITICAL: audit.counts.critical,
    HIGH: audit.counts.high,
    MEDIUM: audit.counts.medium,
    LOW: audit.counts.low,
    INFORMATIONAL: audit.counts.informational
  };

  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const maxCount = Math.max(...Object.values(counts), 1);

  // Total de hallazgos como subtítulo.
  doc.font('Helvetica-Bold').fontSize(10).fillColor(COLORS.ink)
    .text(`${total} hallazgo${total === 1 ? '' : 's'}`, 50, doc.y, { width: W });
  doc.moveDown(0.6);

  const barX = 190;
  const barMaxW = W - (barX - 50) - 55;
  const rowH = 21;

  for (const severity of severities) {
    const count = counts[severity];
    const y = doc.y;
    const color = SEVERITY_COLORS[severity];

    // Punto de color de la severidad.
    doc.circle(58, y + 6, 4).fill(color);

    // Etiqueta de la severidad.
    doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.body)
      .text(SEVERITY_LABELS[severity], 70, y, { width: 110 });

    // Pista y relleno de la barra proporcional.
    doc.roundedRect(barX, y, barMaxW, 10, 5).fill(COLORS.rowAlt);
    if (count > 0) {
      const fillW = Math.max((barMaxW * count) / maxCount, 10);
      doc.roundedRect(barX, y, fillW, 10, 5).fill(color);
    }

    // Conteo alineado a la derecha.
    doc.font('Helvetica-Bold').fontSize(9.5).fillColor(COLORS.ink)
      .text(String(count), 50, y, { width: W, align: 'right' });

    doc.y = y + rowH;
  }

  doc.moveDown(0.8);
}

/**
 * Tecnologías detectadas representadas como chips que fluyen y saltan de
 * línea cuando no caben en el ancho disponible.
 */
function drawTechnologyChips(
  doc: PDFKit.PDFDocument,
  technologies: Array<Record<string, unknown>>,
  W: number
): void {
  let x = 50;
  let y = doc.y;
  const chipH = 22;
  const gap = 8;

  for (const tech of technologies) {
    const version = tech.version ? ` ${String(tech.version)}` : '';
    const label = `${String(tech.name ?? '-')}${version}`;
    const category = String(tech.category ?? '-');

    doc.font('Helvetica-Bold').fontSize(8.5);
    const nameW = doc.widthOfString(label);
    doc.font('Helvetica').fontSize(8);
    const catW = doc.widthOfString(`  ${category}`);
    const chipW = nameW + catW + 20;

    // Salto de línea si el chip no cabe.
    if (x + chipW > 50 + W) {
      x = 50;
      y += chipH + gap;
    }

    doc.roundedRect(x, y, chipW, chipH, 11)
      .fillAndStroke(COLORS.softBg, COLORS.border);
    doc.fillColor(COLORS.ink).font('Helvetica-Bold').fontSize(8.5)
      .text(label, x + 10, y + 6, { lineBreak: false });
    doc.fillColor(COLORS.muted).font('Helvetica').fontSize(8)
      .text(category, x + 10 + nameW, y + 6.5, { lineBreak: false });

    x += chipW + gap;
  }

  doc.y = y + chipH + 18;
}

/**
 * Estado vacío cuando la auditoría no produjo hallazgos.
 */
function drawEmptyState(doc: PDFKit.PDFDocument, W: number): void {
  const top = doc.y;
  roundedCard(doc, 50, top, W, 44);
  doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.muted)
    .text(
      'No se detectaron problemas en esta auditoría. Recuerda que esto no garantiza que el sitio sea seguro.',
      66,
      top + 16,
      { width: W - 32 }
    );
  doc.y = top + 60;
}

/**
 * Tarjeta completa de un hallazgo: franja de color por severidad, chip con
 * el identificador, insignia de severidad, descripción, bloque de evidencia,
 * impacto, recomendación y referencias etiquetadas.
 *
 * Estrategia anti-desborde: cada bloque se MIDELA con las mismas opciones
 * (fuente, tamaño, ancho e interlineado) con las que luego se dibuja, y la
 * altura de la tarjeta es la suma exacta de esos bloques. Así el texto nunca
 * sobresale del borde inferior.
 */
function drawFindingCard(
  doc: PDFKit.PDFDocument,
  finding: AuditDetailDto['findings'][number],
  W: number
): void {
  const innerX = 66;
  const innerW = W - 36;
  const sevColor = SEVERITY_COLORS[finding.severity] ?? COLORS.muted;

  /* ---------- PASO 1: medición exacta de cada bloque ---------- */

  // Topes de altura por bloque: garantizan que una tarjeta quepa siempre en
  // una página (evita hojas en blanco por desbordes). Si el texto es más
  // largo, se recorta con elipsis.
  const DESC_MAX = 90;
  const EV_MAX = 100;
  const IMPACT_MAX = 80;
  const REC_MAX = 80;
  const REFS_MAX_ROWS = 6;

  // Título (Helvetica-Bold 10.5, interlineado 0).
  doc.font('Helvetica-Bold').fontSize(10.5);
  const titleH = doc.heightOfString(finding.title, { width: innerW, lineGap: 0 });

  // Línea de Risk Score (Helvetica-Bold 9): cuantificación del hallazgo.
  const riskText = `Risk Score: ${finding.riskScore} / 125`;
  doc.font('Helvetica-Bold').fontSize(9);
  const riskH = Math.max(doc.heightOfString(riskText, { width: innerW, lineGap: 0 }), 12);

  // Desglose de los componentes del riesgo (Helvetica 8).
  const compText = `Impacto: ${finding.impactLevel}/5   ·   Probabilidad: ${finding.probabilityLevel}/5   ·   Exposición: ${finding.exposureLevel}/5`;
  doc.font('Helvetica').fontSize(8);
  const compH = Math.max(doc.heightOfString(compText, { width: innerW, lineGap: 0 }), 11);

  // Línea de metadatos (Helvetica 8, interlineado 0).
  const metaText = `Confianza: ${CONFIDENCE_LABELS[finding.confidence] ?? finding.confidence}   ·   Categoría: ${finding.category}`;
  doc.font('Helvetica').fontSize(8);
  const metaH = Math.max(doc.heightOfString(metaText, { width: innerW, lineGap: 0 }), 11);

  // Párrafos de cuerpo acotados a su tope de altura.
  const fitBody = (text: string, maxH: number): { text: string; height: number } => {
    const fitted = fitTextToHeight(doc, text, 'Helvetica', 9.5, innerW, 1, maxH);
    doc.font('Helvetica').fontSize(9.5);
    return { text: fitted, height: doc.heightOfString(fitted, { width: innerW, lineGap: 1 }) };
  };
  const desc = fitBody(finding.description, DESC_MAX);
  const impact = fitBody(finding.impact, IMPACT_MAX);
  const rec = fitBody(finding.recommendation, REC_MAX);

  // Evidencia (Courier 8, interlineado 0.5, ancho reducido por el padding).
  const evidence = fitTextToHeight(
    doc,
    finding.evidence,
    'Courier',
    8,
    innerW - 20,
    0.5,
    EV_MAX
  );
  doc.font('Courier').fontSize(8);
  const evTextH = doc.heightOfString(evidence, { width: innerW - 20, lineGap: 0.5 });

  // Referencias: filas con altura medida individualmente (tope de filas).
  const refs = collectReferences(finding.references).slice(0, REFS_MAX_ROWS);
  const refRows = refs.map(([tag, value]) => {
    doc.font('Helvetica-Bold').fontSize(6.5);
    const tagW = doc.widthOfString(tag) + 10;
    doc.font('Helvetica').fontSize(8.5);
    const rowH = Math.max(
      doc.heightOfString(truncate(value, 95), { width: innerW - tagW - 7, lineGap: 0 }),
      11
    );
    return { tag, value, tagW, rowH };
  });
  const refsH =
    refRows.length > 0 ? 13 + refRows.reduce((sum, r) => sum + r.rowH + 3, 0) : 0;

  /* ---------- PASO 2: altura total de la tarjeta ---------- */

  // Suma de avances verticales idénticos a los del renderizado.
  const cardH =
    14 +                    // padding superior
    22 +                    // fila de chips (pill 14 + separación 8)
    titleH + 4 +            // título
    riskH + 2 +             // risk score
    compH + 3 +             // componentes del riesgo
    metaH + 6 +             // metadatos
    12 + desc.height + 8 +  // descripción (etiqueta 12 + texto + aire 8)
    12 + evTextH + 24 +     // evidencia (etiqueta 12 + caja texto+14 + aire 10)
    12 + impact.height + 8 + // impacto
    12 + rec.height + 8 +   // recomendación
    refsH +                 // referencias completas
    10;                     // padding inferior

  ensureSpace(doc, cardH + 10);

  /* ---------- PASO 3: dibujo ---------- */

  const top = doc.y;
  doc.roundedRect(50, top, W, cardH, 8).fillAndStroke('#ffffff', COLORS.border);
  // Franja izquierda con el color de severidad.
  doc.rect(50, top + 8, 4, cardH - 16).fill(sevColor);

  let y = top + 14;

  // ---- Fila 1: chip SEC-xxx + insignia de severidad ----
  doc.font('Helvetica-Bold').fontSize(7.5);
  const refW = doc.widthOfString(finding.refId) + 14;
  doc.roundedRect(innerX, y, refW, 14, 3).fill(COLORS.ink);
  doc.fillColor('#ffffff').fontSize(7.5)
    .text(finding.refId, innerX, y + 4, { width: refW, align: 'center', lineBreak: false });

  const sevLabel = (SEVERITY_LABELS[finding.severity] ?? finding.severity).toUpperCase();
  doc.font('Helvetica-Bold').fontSize(7);
  const sevW = doc.widthOfString(sevLabel) + 14;
  doc.roundedRect(50 + W - 16 - sevW, y, sevW, 14, 3).fill(sevColor);
  doc.fillColor('#ffffff').fontSize(7)
    .text(sevLabel, 50 + W - 16 - sevW, y + 4, {
      width: sevW,
      align: 'center',
      lineBreak: false
    });

  y += 22;

  // ---- Fila 2: título ----
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLORS.ink)
    .text(finding.title, innerX, y, { width: innerW, lineGap: 0 });
  y += titleH + 4;

  // ---- Fila 3: Risk Score + componentes + confianza/categoría ----
  doc.font('Helvetica-Bold').fontSize(9).fillColor(COLORS.ink)
    .text(riskText, innerX, y, { width: innerW, lineGap: 0 });
  y += riskH + 2;

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
    .text(compText, innerX, y, { width: innerW, lineGap: 0 });
  y += compH + 3;

  doc.font('Helvetica').fontSize(8).fillColor(COLORS.muted)
    .text(metaText, innerX, y, { width: innerW, lineGap: 0 });
  y += metaH + 6;

  // ---- Descripción ----
  doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted)
    .text('DESCRIPCIÓN', innerX, y, { characterSpacing: 0.6 });
  y += 12;
  doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.body)
    .text(desc.text, innerX, y, { width: innerW, lineGap: 1 });
  y += desc.height + 8;

  // ---- Bloque de evidencia (fondo suave + fuente mono) ----
  doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted)
    .text('EVIDENCIA', innerX, y, { characterSpacing: 0.6 });
  y += 12;
  doc.roundedRect(innerX, y, innerW, evTextH + 14, 5)
    .fillAndStroke(COLORS.softBg, COLORS.border);
  doc.font('Courier').fontSize(8).fillColor(COLORS.body)
    .text(evidence, innerX + 10, y + 7, { width: innerW - 20, lineGap: 0.5 });
  y += evTextH + 24;

  // ---- Impacto ----
  doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted)
    .text('IMPACTO', innerX, y, { characterSpacing: 0.6 });
  y += 12;
  doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.body)
    .text(impact.text, innerX, y, { width: innerW, lineGap: 1 });
  y += impact.height + 8;

  // ---- Recomendación ----
  doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted)
    .text('RECOMENDACIÓN', innerX, y, { characterSpacing: 0.6 });
  y += 12;
  doc.font('Helvetica').fontSize(9.5).fillColor(COLORS.body)
    .text(rec.text, innerX, y, { width: innerW, lineGap: 1 });
  y += rec.height + 8;

  // ---- Referencias con etiquetas de color ----
  if (refRows.length > 0) {
    doc.font('Helvetica-Bold').fontSize(7).fillColor(COLORS.muted)
      .text('REFERENCIAS', innerX, y, { characterSpacing: 0.6 });
    y += 13;
    for (const row of refRows) {
      const tagColor = REFERENCE_TAG_COLORS[row.tag] ?? COLORS.muted;
      doc.roundedRect(innerX, y + 1, row.tagW, 11, 2.5).fill(tagColor);
      doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(6.5)
        .text(row.tag, innerX, y + 3.5, { width: row.tagW, align: 'center', lineBreak: false });
      doc.fillColor(COLORS.body).font('Helvetica').fontSize(8.5)
        .text(row.value, innerX + row.tagW + 7, y + 2, {
          width: innerW - row.tagW - 7,
          lineGap: 0
        });
      y += row.rowH + 3;
    }
  }

  doc.y = top + cardH + 14;
}

/**
 * Lista de notas y limitaciones con viñetas.
 */
function drawNotesList(doc: PDFKit.PDFDocument, W: number): void {
  const notes = [
    'Este informe corresponde a una evaluación automatizada inicial, principalmente pasiva, realizada en la fecha indicada.',
    'La ausencia de hallazgos no garantiza que el objetivo sea seguro; algunos problemas requieren validación manual.',
    `Los análisis se ejecutaron con un tiempo máximo de espera de ${env.scanTimeoutMs / 1000} segundos por solicitud.`,
    'El Risk Score de cada hallazgo (máximo 125) es el producto de tres componentes en escala 1-5: Impacto (según la severidad) × Probabilidad (según la confianza) × Exposición (según la categoría del vector).',
    'La relación con ISO/IEC 27001/27002 constituye una referencia técnica y NO representa una certificación ni una auditoría formal de cumplimiento.',
    'SecureScan Web debe utilizarse únicamente sobre aplicaciones para las cuales se posea autorización explícita.'
  ];

  ensureSpace(doc, 120);

  for (const note of notes) {
    const h = textHeight(doc, note, W - 18, 8.5);
    ensureSpace(doc, h + 8);
    const y = doc.y;
    // Viñeta circular pequeña.
    doc.circle(54, y + 4, 1.8).fill(COLORS.accent);
    doc.font('Helvetica').fontSize(8.5).fillColor(COLORS.muted)
      .text(note, 64, y, { width: W - 14, lineGap: 1.5 });
    doc.y = y + h + 6;
  }
}

/**
 * Numeración y marca en el pie de todas las páginas del documento.
 * Anula temporalmente el margen inferior de cada página: sin ello, PDFKit
 * considera el texto del pie fuera del área de contenido y genera páginas
 * nuevas automáticas (hojas en blanco).
 */
function drawFooters(doc: PDFKit.PDFDocument, audit: AuditDetailDto, W: number): void {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i += 1) {
    doc.switchToPage(i);
    // Permite dibujar en la franja inferior sin disparar saltos automáticos.
    doc.page.margins.bottom = 0;
    const y = doc.page.height - 38;

    // Línea separadora sutil.
    doc.moveTo(50, y - 6).lineTo(50 + W, y - 6).lineWidth(0.5)
      .stroke(COLORS.border);

    doc.font('Helvetica').fontSize(7.5).fillColor('#94a3b8');
    doc.text(`SecureScan Web · Informe de auditoría ${audit.id}`, 50, y, {
      width: W / 2,
      lineBreak: false
    });
    doc.text(`Página ${i + 1} de ${range.count}`, 50 + W / 2, y, {
      width: W / 2,
      align: 'right',
      lineBreak: false
    });
  }
}

/* ==========================================================================
 * UTILIDADES DE DIBUJO
 * ======================================================================== */

/**
 * Título de sección numerado: chip azul con el número, título en negrita y
 * línea divisoria. Avanza doc.y dejando el espaciado listo para contenido.
 */
function sectionTitle(doc: PDFKit.PDFDocument, num: string, title: string): void {
  ensureSpace(doc, 70);

  const y = doc.y;

  // Chip cuadrado redondeado con el número de sección.
  doc.roundedRect(50, y, 22, 22, 5).fill(COLORS.accent);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(11)
    .text(num, 50, y + 5.5, { width: 22, align: 'center', lineBreak: false });

  // Título de la sección.
  doc.fillColor(COLORS.ink).fontSize(13)
    .text(title, 82, y + 4.5, { lineBreak: false });

  // Línea divisoria bajo el título.
  doc.moveTo(50, y + 31).lineTo(50 + (doc.page.width - 100), y + 31)
    .lineWidth(1).stroke(COLORS.border);

  doc.y = y + 42;
}

/**
 * Dibuja una tarjeta redondeada blanca con borde suave.
 */
function roundedCard(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  doc.roundedRect(x, y, w, h, 8).fillAndStroke('#ffffff', COLORS.border);
}

/**
 * Mide la altura que ocupará un texto al renderizarse con el tamaño y
 * fuente indicados.
 *
 * @param doc     Documento PDF (solo se usa para medir).
 * @param text    Texto a medir.
 * @param width   Ancho disponible.
 * @param size    Tamaño de fuente en puntos.
 * @param font    Fuente a simular en la medición (por defecto Helvetica).
 */
function textHeight(
  doc: PDFKit.PDFDocument,
  text: string,
  width: number,
  size: number,
  font = 'Helvetica'
): number {
  doc.font(font).fontSize(size);
  return doc.heightOfString(text, { width, lineGap: 1 });
}

/**
 * Elige el color del score según la nota obtenida.
 */
function scoreColor(score: number): string {
  if (score >= 90) return '#16a34a';
  if (score >= 75) return '#65a30d';
  if (score >= 60) return '#ca8a04';
  if (score >= 40) return '#ea580c';
  return '#b91c1c';
}

/**
 * Formatea una fecha en español o devuelve '-' si es nula.
 */
function formatDate(date: Date | string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleString('es-ES', { dateStyle: 'long', timeStyle: 'medium' });
}

/**
 * Trunca un texto agregando puntos suspensivos cuando supera el máximo.
 */
function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

/**
 * Reúne las referencias estándar de un hallazgo como pares
 * [etiqueta, texto] en orden OWASP → CWE → CVE → ISO.
 */
function collectReferences(
  references: AuditDetailDto['findings'][number]['references']
): Array<[string, string]> {
  const refs: Array<[string, string]> = [];
  for (const ref of references.owasp) refs.push(['OWASP', ref]);
  for (const ref of references.cwe) refs.push(['CWE', ref]);
  for (const ref of references.cve) refs.push(['CVE', ref]);
  for (const ref of references.iso) refs.push(['Referencia ISO/IEC', ref]);
  return refs;
}

/**
 * Añade una página nueva si el contenido no cabe en la actual.
 * Guarda anti-hojas-en-blanco: si ya estamos al inicio de una página
 * recién creada, no se crea otra.
 */
function ensureSpace(doc: PDFKit.PDFDocument, needed: number): void {
  const bottomLimit = doc.page.height - 70;
  if (doc.y + needed <= bottomLimit) return;
  // Ya en una página fresca: el contenido deberá acotarse, no saltar más.
  if (doc.y <= 51) return;
  doc.addPage();
}

/**
 * Recorta un texto para que su altura renderizada no supere el máximo.
 * Usa búsqueda binaria sobre la longitud del texto midiendo con las mismas
 * opciones de dibujo. Garantiza que ninguna tarjeta desborde la página.
 *
 * @param doc     Documento PDF (solo se usa para medir).
 * @param text    Texto original.
 * @param font    Fuente de renderizado.
 * @param size    Tamaño en puntos.
 * @param width   Ancho disponible.
 * @param lineGap Interlineado de renderizado.
 * @param maxH    Altura máxima permitida en puntos.
 */
function fitTextToHeight(
  doc: PDFKit.PDFDocument,
  text: string,
  font: string,
  size: number,
  width: number,
  lineGap: number,
  maxH: number
): string {
  const measure = (value: string): number => {
    doc.font(font).fontSize(size);
    return doc.heightOfString(value, { width, lineGap });
  };

  if (measure(text) <= maxH) return text;

  let lo = 0;
  let hi = text.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (measure(`${text.slice(0, mid).trimEnd()}…`) <= maxH) {
      lo = mid;
    } else {
      hi = mid - 1;
    }
  }
  return `${text.slice(0, lo).trimEnd()}…`;
}

/**
 * Sanitiza un texto para usarlo como nombre de archivo seguro:
 * minúsculas, sin caracteres especiales ni espacios.
 */
function sanitizeFileName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
