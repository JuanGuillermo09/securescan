/**
 * ============================================================================
 * CONTROLADOR DE INFORMES
 * ----------------------------------------------------------------------------
 * Manejador HTTP que transmite el informe PDF de una auditoría (RF-030).
 * ============================================================================
 */

import { Request, Response, NextFunction } from 'express';
import { getReport } from './reports.service';

/**
 * GET /api/reports/:auditId/report.pdf
 * Devuelve el informe PDF de la auditoría indicada como descarga.
 * El nombre del archivo incluye el dominio escaneado.
 */
export async function downloadReportHandler(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { doc, fileName } = await getReport(req.params.auditId, req.user!.id);

    // Cabeceras para forzar la descarga con nombre descriptivo.
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);
  } catch (error) {
    next(error);
  }
}
