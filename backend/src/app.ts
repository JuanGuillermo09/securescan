/**
 * ============================================================================
 * APLICACIÓN EXPRESS
 * ----------------------------------------------------------------------------
 * Fábrica de la aplicación: registra middlewares globales, monta los routers
 * de cada módulo bajo /api y sirve el frontend compilado cuando está
 * disponible (despliegue en un solo puerto).
 * ============================================================================
 */

import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import * as path from 'path';
import * as fs from 'fs';
import { auditsRouter } from './modules/audits/audits.routes';
import { authRouter } from './modules/auth/auth.routes';
import { findingsRouter } from './modules/findings/findings.routes';
import { technologiesRouter } from './modules/technologies/technologies.routes';
import { reportsRouter } from './modules/reports/reports.routes';
import { errorHandlerMiddleware } from './shared/middleware/error-handler.middleware';

/**
 * Crea y configura la aplicación Express.
 */
export function createApp(): Express {
  const app = express();

  // Oculta la tecnología del servidor (cabecera X-Powered-By).
  app.disable('x-powered-by');
  app.use(cors({ origin: true }));
  app.use(express.json({ limit: '100kb' }));

  /** Comprobación rápida de salud del servicio. */
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, service: 'securescan-backend' });
  });

  // Módulos de dominio. El rate limiting del scanner se aplica dentro del
  // router de auditorías (RNF-006). Registro y login son públicos; el resto
  // de módulos exigen sesión (requireAuth) y filtran por propietario.
  app.use('/api/auth', authRouter);
  app.use('/api/audits', auditsRouter);
  app.use('/api/findings', findingsRouter);
  app.use('/api/technologies', technologiesRouter);
  app.use('/api/reports', reportsRouter);

  // Servir el frontend si fue compilado (ng build) — permite ejecutar todo
  // desde un solo puerto.
  const frontendDist = resolveFrontendDist();
  if (frontendDist) {
    app.use(express.static(frontendDist));
    // Cualquier ruta que no empiece por /api devuelve el index.html (SPA).
    app.get(/^\/(?!api\/).*/, (_req: Request, res: Response) => {
      res.sendFile(path.join(frontendDist, 'index.html'));
    });
  }

  // RNF-007: manejo seguro de errores sin exponer detalles internos.
  app.use(errorHandlerMiddleware);

  return app;
}

/**
 * Localiza el directorio de distribución del frontend entre las rutas
 * candidatas habituales.
 *
 * @returns Ruta absoluta con index.html, o null si no existe build.
 */
function resolveFrontendDist(): string | null {
  const candidates = [
    // Build de Angular dentro del backend (mismo patrón que
    // express.static(__dirname, 'dist/<app>') del proyecto de referencia):
    // corriendo tsx src/server.ts, __dirname es src/, así que el build vive
    // en ../dist/frontend/browser.
    path.resolve(__dirname, '..', 'dist', 'frontend', 'browser'),
    // Respaldo si el proceso se arranca con cwd = backend/.
    path.resolve(process.cwd(), 'dist', 'frontend', 'browser'),
    path.resolve(process.cwd(), 'public')
  ];
  return (
    candidates.find((candidate) => fs.existsSync(path.join(candidate, 'index.html'))) ?? null
  );
}
