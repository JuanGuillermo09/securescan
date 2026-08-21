/**
 * ============================================================================
 * INTERCEPTOR HTTP DE AUTENTICACIÓN
 * ----------------------------------------------------------------------------
 * Añade la cabecera Authorization: Bearer <token> a todas las peticiones
 * salientes cuando existe una sesión activa.
 * ============================================================================
 */

import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const token = auth.token;

  // Sin sesión (o petición de login/registro) la petición sigue intacta.
  if (!token) return next(req);

  const authorized = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` }
  });
  return next(authorized);
};
