/**
 * ============================================================================
 * RUTAS DE LA APLICACIÓN
 * ----------------------------------------------------------------------------
 * Mapa de URLs → componentes:
 *   - ''                → Landing pública de presentación del proyecto.
 *   - '/login'          → Inicio de sesión (público).
 *   - '/registro'       → Creación de cuenta (público).
 *   - '/nueva-auditoria'→ Formulario de nueva auditoría (privado).
 *   - '/auditoria/:id'  → Dashboard de resultados de una auditoría (privado).
 *   - '/historial'      → Historial del usuario autenticado (privado).
 *   - '**'              → Cualquier ruta desconocida redirige al inicio.
 * Las rutas privadas usan authGuard para exigir sesión activa.
 * ============================================================================
 */

import { Routes } from '@angular/router';
import { Home } from './features/dashboard/home/home';
import { AuditDetail } from './features/audit-detail/audit-detail';
import { History } from './features/history/history';
import { Landing } from './features/landing/landing';
import { Login } from './features/auth/login/login';
import { Register } from './features/auth/register/register';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  // Pública: presentación del proyecto.
  { path: '', component: Landing },

  // Públicas: acceso y registro.
  { path: 'login', component: Login },
  { path: 'registro', component: Register },

  // Privadas: requieren sesión iniciada.
  { path: 'nueva-auditoria', component: Home, canActivate: [authGuard] },
  { path: 'auditoria/:id', component: AuditDetail, canActivate: [authGuard] },
  { path: 'historial', component: History, canActivate: [authGuard] },

  { path: '**', redirectTo: '' }
];
