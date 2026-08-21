/**
 * ============================================================================
 * GUARD DE AUTENTICACIÓN
 * ----------------------------------------------------------------------------
 * Protege las rutas privadas: si no hay sesión activa redirige a /login
 * conservando la URL intentada para volver después del acceso.
 * ============================================================================
 */

import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthService);
  const router = inject(Router);

  if (auth.isAuthenticated()) {
    return true;
  }

  // Guarda la URL destino como query param para redirigir tras el login.
  return router.createUrlTree(['/login'], {
    queryParams: { returnUrl: state.url }
  });
};
