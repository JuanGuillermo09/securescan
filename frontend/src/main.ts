/**
 * ============================================================================
 * PUNTO DE ENTRADA DE LA APLICACIÓN
 * ----------------------------------------------------------------------------
 * Arranca Angular en modo standalone: monta el componente raíz `App` con la
 * configuración global (rutas, HttpClient) sobre index.html.
 * ============================================================================
 */

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
