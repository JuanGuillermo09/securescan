# SecureScan Web

### Automated Web Security Assessment Platform

SecureScan Web es una plataforma de evaluación automatizada de seguridad para aplicaciones web.

El proyecto permite analizar una URL autorizada, identificar configuraciones potencialmente inseguras y vulnerabilidades observables, clasificar los riesgos, generar un Security Score, cuantificar el riesgo de cada hallazgo y presentar referencias relacionadas con estándares y marcos internacionales de seguridad.

Cada usuario dispone de **cuenta propia con inicio de sesión**, un **historial privado de auditorías** y una **auditoría de ejemplo** para comprobar el funcionamiento desde el primer momento. Los resultados pueden descargarse en PDF.

---

## 🚀 Características

* 🔑 Registro e inicio de sesión con JWT.
* 🎁 Auditoría de ejemplo automática al registrarse (no eliminable).
* 🔐 Análisis HTTPS/TLS.
* 🛡️ Análisis de Security Headers.
* 🍪 Análisis de cookies.
* 🌐 Análisis HTTP.
* 🔎 Detección de tecnologías (frameworks, CMS, librerías).
* 🚀 Detección de despliegue (hosting y CDN: Vercel, Netlify, Cloudflare, Render…).
* 📡 Análisis de información expuesta.
* 🚨 Identificación de vulnerabilidades conocidas (CVE).
* 📊 Clasificación de riesgos.
* 🧮 Risk Score por hallazgo (Impacto × Probabilidad × Exposición).
* 🎯 Security Score general con nota A–F.
* 📚 Referencias OWASP, CWE, CVE e ISO/IEC 27001/27002.
* 🕐 Historial privado por usuario, con borrado individual y masivo.
* 📄 Informe PDF profesional descargable.
* 🔔 Alertas propias: modales de confirmación Sí/No y notificaciones toast.
* 📱 Interfaz responsive: menú hamburguesa en móvil, botón "volver arriba" y scroll temático.
* 🔁 Scanner resiliente: reintento automático ante fallos de red transitorios (p. ej. cold starts).

---

## 🎯 Objetivo

El objetivo de SecureScan Web es proporcionar una herramienta que permita realizar una evaluación inicial automatizada de la seguridad de una aplicación web.

La plataforma busca facilitar la identificación y priorización de problemas de seguridad mediante evidencia técnica, clasificación de riesgos y referencias de estándares internacionales.

---

## ⚠️ Uso responsable

SecureScan Web está diseñado para analizar únicamente aplicaciones web sobre las cuales el usuario tenga autorización.

El proyecto utiliza inicialmente un enfoque de análisis principalmente pasivo y no intrusivo.

No debe utilizarse para realizar análisis no autorizados contra sistemas de terceros.

---

## 🏗️ Arquitectura

```text
                  ┌─────────────────────┐
                  │       Angular       │
                  │      Frontend       │
                  └──────────┬──────────┘
                             │
                    REST API + JWT
                             │
                  ┌──────────▼──────────┐
                  │ Node.js + Express   │
                  │      Backend        │
                  └──────────┬──────────┘
                             │
           ┌────────┬────────┼────────┬──────────────┐
           ▼        ▼        ▼        ▼              ▼
        Auth     Security  Risk    Standards     Reports
        (JWT)    Analyzers Engine   Engine         (PDF)
                        │
                  ┌─────┼─────┬────────┬────────┐
                  ▼     ▼     ▼        ▼        ▼
                 TLS  Headers Cookies  HTTP  Technology
                                            Exposure
                             │
                      ┌──────▼───────┐
                      │ SQLite/Prisma│
                      └──────────────┘
```

---

## 🛠️ Tecnologías

### Frontend

* Angular 20 (componentes standalone)
* TypeScript
* RxJS
* Guards e interceptores HTTP para la sesión

### Backend

* Node.js
* Express
* TypeScript
* Prisma ORM
* jsonwebtoken (sesiones)
* bcryptjs (hash de contraseñas)

### Base de datos

* SQLite (archivo local, sin instalación)
* PostgreSQL opcional cambiando el provider de Prisma

### Seguridad

* Autenticación JWT con expiración configurable
* Contraseñas hasheadas con bcrypt (10 rondas)
* Historial privado: cada auditoría pertenece a su creador
* Rate limiting selectivo: cuota estricta para iniciar escaneos (20/15 min) y cuota amplia para lecturas y borrados (300/15 min), ambas configurables
* Validación de entradas con Zod

### Testing

* Jest (33 pruebas automatizadas)

### Reportes

* PDF generado con pdfkit

---

## 📋 Requisitos

Para ejecutar el proyecto localmente se requiere:

* Node.js 18 o superior.
* npm.
* Angular CLI.
* Git.

El proyecto **no requiere Docker** ni instalar base de datos (SQLite por defecto).

---

## 💻 Instalación

### 1. Clonar el repositorio

```bash
git clone <repository-url>
cd securescan-web
```

### 2. Instalar dependencias del backend

```bash
cd backend
npm install
```

### 3. Configurar variables de entorno

Crear un archivo `.env`:

```env
DATABASE_URL="file:./dev.db"
PORT=3000
JWT_SECRET="cambia-esto-por-un-secreto-largo"
JWT_EXPIRES_IN="7d"

# Rate limiting (opcional; valores por defecto mostrados)
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=20
RATE_LIMIT_READ_MAX=300
```

`JWT_SECRET` debe reemplazarse por un valor aleatorio y largo en producción. No incluir secretos reales en el repositorio.

### 4. Base de datos

Por defecto el proyecto usa **SQLite** (archivo local, sin instalación adicional).

Si se desea usar **PostgreSQL**, cambiar el provider en `backend/prisma/schema.prisma` y configurar la conexión mediante `DATABASE_URL`.

### 5. Ejecutar migraciones

```bash
npx prisma migrate dev
```

### 6. Iniciar backend

```bash
npm run dev
```

El backend estará disponible en:

```text
http://localhost:3000
```

### 7. Instalar dependencias del frontend

En otra terminal:

```bash
cd frontend
npm install
```

### 8. Iniciar Angular

```bash
ng serve
```

El frontend estará disponible en:

```text
http://localhost:4200
```

### Modo producción (un solo puerto)

El backend sirve el frontend compilado: toda la aplicación funciona desde `http://localhost:3000` ejecutando únicamente el backend.

```bash
# 1. Compilar el frontend y copiarlo al backend
cd frontend
npm run build:deploy        # ng build → backend/dist/frontend/browser

# 2. Arrancar el backend (TypeScript directo con tsx, sin paso de compilación)
cd ../backend
npm start
```

---

## 🚀 Despliegue (Render)

El proyecto está preparado para desplegarse como **un único servicio** en [Render](https://render.com): el Express sirve tanto el API como el frontend.

**Preparación antes de subir:**

```bash
cd frontend
npm run build:deploy        # genera el build y lo copia a backend/dist/frontend/browser
git add .
git commit -m "deploy"
git push
```

> El `.gitignore` incluye la excepción `!backend/dist/frontend/` para que el build del frontend viaje por git dentro del backend.

**Configuración del Web Service en Render:**

| Configuración | Valor |
|---------------|-------|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Environment | `JWT_SECRET` (valor largo y aleatorio) |

Render provee HTTPS automáticamente y detecta el puerto mediante la variable `PORT`.

**⚠️ Limitación del plan gratuito:** el disco es efímero; la base SQLite se reinicia en cada redeploy. Para persistencia real, usar disco pagado o migrar a PostgreSQL.

---

## 👤 Cuentas y sesión

1. Al abrir la aplicación se muestra una **landing pública** de presentación.
2. **Registrarse** crea la cuenta e inicia la sesión automáticamente. Cada cuenta nueva recibe una **auditoría de ejemplo** ya completada en su historial para comprobar que la herramienta funciona; esta auditoría está protegida y **no puede eliminarse**.
3. Con la sesión activa el usuario puede crear auditorías, consultar su **historial privado** (nadie más puede ver sus auditorías), descargar informes PDF y **eliminar auditorías** de una en una o todas a la vez (los ejemplos siempre se conservan).
4. Las peticiones llevan el token JWT mediante un interceptor HTTP; las rutas privadas están protegidas con guards de Angular.

---

## 🔄 Flujo de funcionamiento

```text
Usuario
   ↓
Registro / Inicio de sesión
   ↓
Ingresar URL
   ↓
Confirmar autorización
   ↓
Crear auditoría
   ↓
Ejecutar scanner (asíncrono)
   ↓
Analizar HTTPS/TLS · Headers · Cookies · HTTP
   ↓
Detectar tecnologías y despliegue
   ↓
Analizar exposición
   ↓
Generar hallazgos
   ↓
Clasificar severidad y calcular Risk Score
   ↓
Calcular Security Score
   ↓
Relacionar estándares
   ↓
Mostrar Dashboard
   ↓
Generar informe PDF
```

---

## 🚨 Clasificación de riesgos

Los hallazgos se clasifican en:

| Nivel         | Descripción                |
| ------------- | -------------------------- |
| Critical      | Riesgo extremadamente alto |
| High          | Riesgo alto                |
| Medium        | Riesgo moderado            |
| Low           | Riesgo menor               |
| Informational | Información relevante      |

Cada hallazgo también contará con un nivel de confianza:

* High.
* Medium.
* Low.

Esto permite diferenciar la gravedad de un hallazgo de la certeza de su detección.

### Risk Score por hallazgo

Además de la severidad cualitativa, cada hallazgo recibe una puntuación cuantitativa transparente:

```text
Risk Score = Impacto × Probabilidad × Exposición    (máx. 5·5·5 = 125)

Impacto      ← severidad del hallazgo      (1–5)
Probabilidad ← confianza de la detección   (1–5)
Exposición    ← categoría del vector afectado (1–5)
```

Los hallazgos se ordenan por este valor, de modo que los problemas más relevantes aparecen primero (SEC-001, SEC-002…). El desglose de los tres componentes se muestra en el dashboard y en el informe PDF para que el motor de riesgos no sea una caja negra.

---

## 📚 Estándares y referencias

SecureScan Web utiliza diferentes referencias dependiendo del tipo de hallazgo.

### OWASP

Para categorías y buenas prácticas relacionadas con seguridad de aplicaciones web.

### CWE

Para clasificación de debilidades de software.

### CVE

Para identificación de vulnerabilidades conocidas. La V1 incluye un dataset curado local de CVEs asociados a las tecnologías detectables; la estructura permite migrar a una fuente externa (NVD/OSV) sin cambiar las reglas.

### ISO/IEC 27001

Para relacionar determinados hallazgos con controles de seguridad de la información cuando corresponda.

### ISO/IEC 27002

Para relacionar hallazgos con prácticas y controles de seguridad.

### Importante

La relación con ISO/IEC representa una **referencia técnica** y no constituye una certificación, auditoría formal de cumplimiento ni declaración de incumplimiento de una organización.

---

## 🧪 Testing

Para ejecutar las pruebas:

```bash
cd backend
npm test
```

La suite actual (33 pruebas) cubre:

* Security analyzers.
* Motor de riesgos (score global y Risk Score por hallazgo).
* Finding Engine.
* Standards mapping.
* Servicios principales.

---

## 📊 Ejemplo de resultado

```text
SECURITY SCORE

72 / 100 — Nota C

CRITICAL       0
HIGH           1
MEDIUM         3
LOW            2
INFORMATIONAL  1
```

Ejemplo de hallazgo:

```text
SEC-001

Content-Security-Policy ausente

Severity:      MEDIUM
Confidence:    HIGH

Risk Score:    48 / 125
Impacto: 3/5 · Probabilidad: 4/5 · Exposición: 4/5

Evidence:
Content-Security-Policy no encontrado.

Impact:
La aplicación no dispone de esta capa de protección.

Recommendation:
Implementar una política CSP adecuada.

References:
OWASP · CWE · ISO/IEC
```

---

## 📁 Estructura del proyecto

```text
SecureScan/
│
├── frontend/                      # Angular 20 (standalone components)
│   └── src/
│       ├── app/                   # Organización por capas (ver app/README.md)
│       │   ├── core/                 # Servicios singleton de infraestructura
│       │   │   ├── auth/                # auth.service · auth.guard · auth.interceptor
│       │   │   ├── api/api.service.ts   # Cliente REST
│       │   │   └── alerts/alert.service.ts  # Modal de confirmación y toasts
│       │   ├── shared/               # Reutilizables sin lógica de negocio
│       │   │   ├── components/alerts/   # alerts.component (modal + toasts)
│       │   │   └── models/              # Tipos espejo de los DTOs del backend
│       │   ├── features/             # Una carpeta por página/dominio
│       │   │   ├── landing/             # Página pública de presentación
│       │   │   ├── auth/login|register/ # Inicio de sesión y registro
│       │   │   ├── dashboard/home/      # Formulario de nueva auditoría
│       │   │   ├── history/             # Historial privado + borrado
│       │   │   └── audit-detail/        # Dashboard: score, hallazgos, PDF
│       │   ├── app.routes.ts         # Mapa de URLs → features
│       │   └── app.config.ts         # Router + HttpClient + interceptor JWT
│       ├── environments/
│       └── scripts/copy-dist.mjs  # Copia el build a backend/dist/frontend (build:deploy)
│
├── backend/                       # Node.js + Express + TypeScript
│   ├── prisma/
│   │   ├── schema.prisma          # User · Audit · Finding (SQLite)
│   │   └── migrations/            # init · finding_risk_score · user_auth · audit_example_flag
│   ├── tests/                     # Jest (scanners, risk-engine, standards, modules)
│   ├── dist/frontend/browser/     # Build de Angular servido por Express (viaja por git)
│   └── src/
│       ├── server.ts              # Arranque: conexión BD + listen
│       ├── app.ts                 # Fábrica Express: routers y SPA estática
│       ├── config/env.ts          # Variables de entorno (incluye JWT_SECRET)
│       ├── database/prisma.ts     # Cliente Prisma compartido
│       ├── modules/               # Capa de dominio (controller/service/repository)
│       │   ├── auth/              # Registro, login y perfil (JWT + bcrypt)
│       │   ├── audits/            # Auditorías: creación, detalle, historial, borrado
│       │   ├── findings/          # Hallazgos: buildFindings + consulta
│       │   ├── technologies/      # Tecnologías detectadas por auditoría
│       │   └── reports/           # Informe PDF descargable (RF-030)
│       ├── scanners/              # Analizadores (core + reglas + tipos)
│       │   ├── core/              # ScanContext, engine orquestador, utilidades
│       │   ├── tls/  headers/  cookies/  http/  technology/  exposure/
│       ├── risk-engine/           # Score global, nota y Risk Score por hallazgo
│       ├── standards/             # owasp · cwe · cve · iso + standards.service
│       └── shared/                # errors · middleware (JWT, rate limit) · utils
│
├── docs/                          # Visión, requerimientos e historias de usuario
├── README.md
└── .gitignore
```

---

## ⚠️ Limitaciones

SecureScan Web no garantiza detectar todas las vulnerabilidades de una aplicación.

La V1 se enfoca principalmente en análisis pasivos y no intrusivos.

Algunos resultados pueden requerir validación manual.

La detección de tecnologías depende de lo que el objetivo exponga públicamente: un sitio que oculte sus cabeceras y minifique su código mostrará pocas o ninguna tecnología.

La identificación de una tecnología vulnerable no implica automáticamente que la aplicación sea explotable.

La relación con ISO/IEC no representa una certificación ni una auditoría formal de cumplimiento.

---

## 🗺️ Roadmap

### V1 — Evaluación inicial ✅

* [x] HTTPS/TLS Analyzer.
* [x] Security Headers Analyzer.
* [x] Cookie Analyzer.
* [x] HTTP Analyzer.
* [x] Technology Detection (incluye detección de hosting/CDN).
* [x] Exposure Analyzer.
* [x] Finding Engine.
* [x] Risk Engine (Security Score + Risk Score por hallazgo).
* [x] OWASP / CWE / ISO/IEC Mapping.
* [x] Dashboard.
* [x] Historial privado por usuario.
* [x] PDF Reports.
* [x] Autenticación con cuentas de usuario.
* [x] Auditoría de ejemplo para cuentas nuevas.
* [x] Rate limiting selectivo (escaneos vs. lecturas).
* [x] Interfaz responsive con menú hamburguesa, alertas propias y botón "volver arriba".

### V2 — Análisis avanzado

* [ ] Integración con fuente externa de CVEs (NVD/OSV).
* [ ] API Security.
* [ ] Más reglas de seguridad y firmas de tecnologías.
* [ ] Comparación entre auditorías.
* [ ] Análisis avanzado de autenticación.

### V3 — DevSecOps

* [ ] Integración con GitHub/GitLab.
* [ ] Análisis en CI/CD.
* [ ] Quality/Security Gates.
* [ ] Reportes avanzados.

---

## 📄 Licencia

Definir la licencia correspondiente al proyecto.

---

## 👨‍💻 Autor

**Juan Guillermo Cárdenas Miranda**

* GitHub: [añadir enlace]
* LinkedIn: [añadir enlace]
* Portafolio: [añadir enlace]
