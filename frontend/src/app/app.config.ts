/**
 * ============================================================================
 * CONFIGURACIÓN GLOBAL DE LA APLICACIÓN
 * ----------------------------------------------------------------------------
 * Proveedores de nivel de aplicación: detección de cambios, enrutado y
 * cliente HTTP con el interceptor de autenticación que adjunta el token JWT.
 * ============================================================================
 */

import { ApplicationConfig, provideBrowserGlobalErrorListeners, provideZoneChangeDetection } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    // Escucha errores globales del navegador y los reporta a la consola.
    provideBrowserGlobalErrorListeners(),
    // Detección de cambios por zonas con coalescencia de eventos (rendimiento).
    provideZoneChangeDetection({ eventCoalescing: true }),
    // Registra el mapa de rutas definido en app.routes.ts.
    provideRouter(routes),
    // HttpClient con el interceptor que añade el token Bearer a cada llamada.
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
