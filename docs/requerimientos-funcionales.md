# SecureScan Web — Requerimientos Funcionales

## RF-001 — Registro de objetivo

El sistema deberá permitir al usuario ingresar la URL de una aplicación web que desea analizar.

## RF-002 — Validación de URL

El sistema deberá validar que la URL ingresada tenga un formato válido antes de iniciar el análisis.

## RF-003 — Confirmación de autorización

El sistema deberá solicitar al usuario confirmar que posee autorización para realizar el análisis sobre el objetivo indicado.

## RF-004 — Creación de auditoría

El sistema deberá crear un registro único para cada auditoría.

La auditoría deberá almacenar como mínimo:

* Identificador.
* URL.
* Dominio.
* Fecha de inicio.
* Fecha de finalización.
* Estado.
* Security Score.
* Cantidad de hallazgos.

## RF-005 — Inicio de auditoría

El sistema deberá permitir al usuario iniciar una auditoría sobre una URL validada y autorizada.

## RF-006 — Estado de auditoría

El sistema deberá mostrar el estado actual del análisis.

Los estados mínimos serán:

* PENDING.
* RUNNING.
* COMPLETED.
* FAILED.

## RF-007 — Análisis HTTPS/TLS

El sistema deberá analizar las características de seguridad observables relacionadas con HTTPS y TLS.

Deberá comprobar, cuando sea posible:

* Uso de HTTPS.
* Redirección HTTP → HTTPS.
* Certificado.
* Validez observable del certificado.
* Fecha de expiración.
* Información relevante del certificado.
* Protocolos TLS observables.
* Configuraciones potencialmente inseguras.

## RF-008 — Análisis de Security Headers

El sistema deberá analizar los principales encabezados de seguridad.

Como mínimo:

* Content-Security-Policy.
* Strict-Transport-Security.
* X-Content-Type-Options.
* X-Frame-Options.
* Referrer-Policy.
* Permissions-Policy.

El sistema deberá identificar:

* Headers presentes.
* Headers ausentes.
* Configuraciones potencialmente débiles.
* Configuraciones que requieran revisión.

## RF-009 — Análisis de cookies

El sistema deberá analizar las cookies recibidas durante la auditoría.

Deberá comprobar, cuando corresponda:

* Secure.
* HttpOnly.
* SameSite.
* Domain.
* Path.
* Expiration.

## RF-010 — Análisis HTTP

El sistema deberá analizar:

* Códigos de respuesta HTTP.
* Redirecciones.
* Headers de respuesta.
* Métodos HTTP anunciados.
* Información del servidor.
* Configuraciones potencialmente inseguras.

## RF-011 — Detección de tecnologías

El sistema deberá intentar identificar tecnologías utilizadas por la aplicación.

Podrá identificar:

* Frameworks.
* Librerías.
* CMS.
* Servidores web.
* Lenguajes.
* Plataformas.
* Servicios de infraestructura.
* Plataformas de despliegue y CDN (Vercel, Netlify, Cloudflare, Render, AWS, GitHub Pages, entre otras).

Cuando sea posible, deberá identificar también la versión.

La detección se realizará mediante firmas propias sobre las cabeceras HTTP, cookies y HTML del objetivo (análisis pasivo), sin depender de servicios externos.

## RF-012 — Análisis de exposición

El sistema deberá analizar información técnica expuesta públicamente.

Podrá identificar:

* Versiones de software.
* Información del servidor.
* Headers innecesarios.
* Metadatos.
* Información técnica potencialmente sensible.

## RF-013 — Identificación de vulnerabilidades conocidas

Cuando una tecnología y versión puedan identificarse con suficiente confianza, el sistema deberá permitir consultar vulnerabilidades conocidas asociadas.

Cuando corresponda deberá mostrar:

* CVE.
* Severidad.
* Descripción.
* Versiones afectadas.
* Referencia.

## RF-014 — Generación de hallazgos

El sistema deberá convertir los problemas detectados en hallazgos estructurados.

Cada hallazgo deberá contener:

* ID.
* Título.
* Categoría.
* Severidad.
* Nivel de confianza.
* Descripción.
* Evidencia.
* Impacto.
* Recomendación.
* Referencias.
* Risk Score con su desglose (ver RF-018.1).

## RF-015 — Clasificación de severidad

El sistema deberá clasificar los hallazgos en:

* Critical.
* High.
* Medium.
* Low.
* Informational.

## RF-016 — Clasificación de confianza

El sistema deberá asignar un nivel de confianza a cada hallazgo:

* High.
* Medium.
* Low.

## RF-017 — Priorización de riesgos

El sistema deberá ordenar los hallazgos desde el nivel de mayor riesgo hasta el menor.

## RF-018 — Security Score

El sistema deberá calcular una puntuación general de seguridad para cada auditoría.

## RF-018.1 — Risk Score por hallazgo

El sistema deberá asignar a cada hallazgo una puntuación cuantitativa calculada como:

```text
Risk Score = Impacto × Probabilidad × Exposición    (máx. 125)
```

Donde:

* Impacto se deriva de la severidad (1–5).
* Probabilidad se deriva de la confianza de la detección (1–5).
* Exposición se deriva de la categoría del vector afectado (1–5).

El sistema deberá mostrar el desglose de los tres componentes junto al resultado, y ordenar los hallazgos por esta puntuación (de mayor a menor riesgo). El desglose deberá incluirse también en el informe PDF.

## RF-019 — Asociación con OWASP

El sistema deberá permitir relacionar los hallazgos con categorías o referencias OWASP cuando corresponda.

## RF-020 — Asociación con CWE

El sistema deberá permitir relacionar los hallazgos con identificadores CWE cuando corresponda.

## RF-021 — Asociación con CVE

El sistema deberá permitir relacionar los hallazgos con identificadores CVE cuando exista una correspondencia válida.

## RF-022 — Asociación con ISO/IEC

El sistema deberá permitir relacionar los hallazgos con controles o prácticas relevantes de ISO/IEC 27001 e ISO/IEC 27002 cuando exista una relación técnicamente justificable.

## RF-023 — Dashboard

El sistema deberá mostrar un dashboard con:

* Security Score.
* Total de hallazgos.
* Critical.
* High.
* Medium.
* Low.
* Informational.
* Tecnologías detectadas.
* Estado de la auditoría.

## RF-024 — Consulta de hallazgo

El usuario deberá poder consultar el detalle de cada hallazgo.

## RF-025 — Visualización de evidencia

El sistema deberá mostrar la evidencia utilizada para generar el hallazgo.

## RF-026 — Visualización de impacto

El sistema deberá mostrar el posible impacto asociado al hallazgo.

## RF-027 — Visualización de recomendaciones

El sistema deberá mostrar recomendaciones de mitigación para cada hallazgo.

## RF-028 — Historial de auditorías

El sistema deberá almacenar las auditorías realizadas.

## RF-029 — Consulta de auditorías anteriores

El usuario deberá poder consultar los resultados de auditorías anteriores.

## RF-030 — Generación y descarga de informe

El sistema deberá permitir generar un informe técnico en PDF y el usuario deberá poder descargarlo directamente desde la interfaz.

El informe deberá incluir:

* Información del objetivo.
* Fecha.
* Security Score.
* Resumen.
* Distribución de riesgos.
* Hallazgos.
* Evidencias.
* Impactos.
* Recomendaciones.
* OWASP.
* CWE.
* CVE.
* Referencias ISO/IEC.

## RF-031 — Manejo de errores

El sistema deberá informar al usuario cuando una auditoría no pueda ejecutarse correctamente.

## RF-032 — Registro de resultados parciales

Cuando un analizador falle pero otros hayan finalizado correctamente, el sistema deberá conservar los resultados obtenidos y registrar el error correspondiente.

Cuando el objetivo no responda HTTP, el sistema no deberá generar hallazgos de "cabecera ausente" ni similares, para evitar falsos positivos.

## RF-033 — Registro de usuario

El sistema deberá permitir crear una cuenta de usuario con:

* Correo electrónico (único).
* Contraseña (mínimo 8 caracteres).
* Nombre visible (opcional).

La contraseña deberá almacenarse hasheada y nunca en texto plano.

## RF-034 — Inicio de sesión

El sistema deberá permitir autenticarse con correo y contraseña, y entregar un token JWT que la interfaz utilizará para las peticiones posteriores.

Las credenciales incorrectas no deberán revelar si el correo existe o no.

## RF-035 — Historial privado por usuario

Cada auditoría deberá pertenecer al usuario autenticado que la creó.

El historial solo deberá mostrar las auditorías del usuario de la sesión, y cualquier intento de acceder a una auditoría ajena deberá responder como si no existiera.

## RF-036 — Auditoría de ejemplo

Al registrarse, el sistema deberá entregar al usuario una auditoría de ejemplo ya completada (clonada de un análisis previo del dominio de prueba example.com) para que pueda comprobar el funcionamiento sin lanzar ningún escaneo.

Esta auditoría quedará marcada como ejemplo y no podrá ser eliminada.

## RF-037 — Eliminación de auditorías

El usuario deberá poder eliminar:

* Una auditoría propia concreta, previa confirmación.
* Todas sus auditorías de una vez, excluyendo automáticamente los ejemplos.

Los hallazgos asociados deberán eliminarse junto con su auditoría. El intento de eliminar una auditoría de ejemplo deberá rechazarse con un mensaje claro.

## RF-038 — Confirmaciones y avisos propios

El sistema deberá presentar sus confirmaciones y avisos mediante componentes propios con la estética de la aplicación, en lugar de los diálogos nativos del navegador:

* Modal de confirmación Sí/No para acciones destructivas (con variante destacada para el peligro).
* Notificaciones toast no bloqueantes para resultados de operaciones (éxito, error o información), con cierre manual y expiración automática.

## RF-039 — Navegación adaptativa

La barra de navegación deberá adaptarse al tamaño de pantalla:

* En escritorio: marca, identidad del usuario centrada y menú en fila.
* En pantallas estrechas: menú tipo hamburguesa que se despliega como panel, con el nombre del usuario en su cabecera, cerrándose al navegar, pulsar fuera o usar Escape.
* La aplicación deberá ofrecer un botón flotante "volver arriba" que aparezca tras descender y permita regresar al inicio con desplazamiento suave.
