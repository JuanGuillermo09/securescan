# Arquitectura del frontend (Angular 20 — standalone)

Organización por capas siguiendo la convención moderna de Angular.
La regla general: **lo que solo usa un dominio vive en `features/`, lo que
comparten todos vive en `core/` o `shared/`**.

```
src/app/
├── app.ts / .html / .css     Componente raíz: header, footer, menú móvil,
│                             botón "volver arriba" y <router-outlet>.
├── app.config.ts             Proveedores globales (router, HttpClient + interceptor JWT).
├── app.routes.ts             Mapa de URLs → componentes de features/.
│
├── core/                     Servicios singleton de infraestructura (uno por dominio).
│   ├── auth/
│   │   ├── auth.service.ts       Sesión: login, registro, token JWT, usuario actual.
│   │   ├── auth.guard.ts         Protege rutas privadas (redirige a /login).
│   │   └── auth.interceptor.ts   Añade el header Authorization a cada petición.
│   ├── api/
│   │   └── api.service.ts        Cliente HTTP del backend (/api/audits).
│   └── alerts/
│       └── alert.service.ts      Modal de confirmación y toasts globales (signals).
│
├── shared/                   Reutilizables sin lógica de negocio propia.
│   ├── components/alerts/    alerts.component: pinta modal + toasts (se monta en App).
│   └── models/               Tipos compartidos con el backend:
│       ├── audit.model.ts        auditorías, severidades, etiquetas de estado.
│       └── user.model.ts         usuarios y respuestas de autenticación.
│
└── features/                 Una carpeta por página/dominio de la aplicación.
    ├── landing/              Página pública de presentación.
    ├── auth/
    │   ├── login/            Inicio de sesión.
    │   └── register/         Creación de cuenta.
    ├── dashboard/
    │   └── home/             Formulario de nueva auditoría (ruta /nueva-auditoria).
    ├── history/              Historial de auditorías del usuario (+ borrado).
    └── audit-detail/         Dashboard de resultados, score, hallazgos y PDF.
```

## Convenciones

- **Componentes standalone** con sintaxis de control de flujo moderno
  (`@if`, `@for`) y signals para el estado reactivo.
- Cada componente vive en su propia carpeta junto a su `.html` y `.css`.
- Los miembros usados solo por la plantilla se declaran `protected`.
- Rutas privadas → `canActivate: [authGuard]` (de `core/auth`).
- Comentarios del código en español.

## Dónde buscar qué

| Quiero...                        | Voy a...                          |
|----------------------------------|-----------------------------------|
| Cambiar una pantalla             | `features/<dominio>/`             |
| Añadir un endpoint nuevo         | `core/api/api.service.ts`         |
| Tocar sesión/token/guardián      | `core/auth/`                      |
| Reutilizar un tipo del backend   | `shared/models/`                  |
| Mostrar un aviso o confirmación  | `inject(AlertService)`            |
