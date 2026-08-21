# SecureScan Web — Historias de Usuario

## HU-001 — Ingresar objetivo

**Como** usuario
**quiero** ingresar la URL de una aplicación web
**para** iniciar una evaluación de seguridad.

### Criterios de aceptación

* La URL debe tener un formato válido.
* El sistema debe validar la URL.
* Debe solicitar confirmación de autorización.
* El usuario debe poder iniciar la auditoría.

---

## HU-002 — Ejecutar auditoría

**Como** usuario
**quiero** ejecutar una auditoría sobre una URL autorizada
**para** conocer el estado de seguridad de la aplicación.

### Criterios de aceptación

* Se debe crear una auditoría.
* Debe generarse un identificador.
* Debe mostrarse el estado del análisis.
* El sistema debe informar cuando finalice.

---

## HU-003 — Analizar HTTPS/TLS

**Como** usuario
**quiero** analizar la configuración HTTPS/TLS de mi aplicación
**para** identificar posibles problemas de seguridad relacionados con la comunicación.

### Criterios de aceptación

* Se debe comprobar el uso de HTTPS.
* Se debe analizar el certificado.
* Se debe analizar la configuración TLS observable.
* Los resultados deben quedar asociados a la auditoría.

---

## HU-004 — Analizar Security Headers

**Como** usuario
**quiero** analizar los headers de seguridad
**para** conocer qué mecanismos de protección tiene configurados mi aplicación.

### Criterios de aceptación

* Se deben analizar los headers definidos.
* Se deben identificar headers ausentes.
* Se deben identificar configuraciones potencialmente débiles.
* Los problemas detectados deben generar hallazgos.

---

## HU-005 — Analizar cookies

**Como** usuario
**quiero** analizar las cookies utilizadas por mi aplicación
**para** identificar configuraciones que puedan representar un riesgo.

### Criterios de aceptación

* Se debe comprobar Secure.
* Se debe comprobar HttpOnly.
* Se debe comprobar SameSite.
* Se debe mostrar la evidencia correspondiente.

---

## HU-006 — Detectar tecnologías

**Como** usuario
**quiero** conocer las tecnologías detectables de mi aplicación
**para** identificar componentes que puedan estar relacionados con riesgos conocidos.

### Criterios de aceptación

* Se deben mostrar las tecnologías identificadas.
* Se deben mostrar versiones cuando sea posible.
* Se debe indicar el nivel de confianza de la detección.

---

## HU-007 — Identificar vulnerabilidades conocidas

**Como** usuario
**quiero** conocer vulnerabilidades conocidas relacionadas con las tecnologías identificadas
**para** conocer posibles riesgos de mi aplicación.

### Criterios de aceptación

* El sistema debe consultar fuentes confiables.
* Debe mostrar CVE cuando corresponda.
* Debe indicar la severidad.
* Debe indicar el nivel de confianza.
* Las posibles vulnerabilidades deberán diferenciarse de las confirmadas.

---

## HU-008 — Consultar riesgos

**Como** usuario
**quiero** visualizar los hallazgos ordenados por severidad
**para** solucionar primero los problemas más importantes.

### Criterios de aceptación

Los resultados deben ordenarse:

1. Critical.
2. High.
3. Medium.
4. Low.
5. Informational.

---

## HU-009 — Consultar detalle de vulnerabilidad

**Como** usuario
**quiero** consultar el detalle de un hallazgo
**para** comprender qué problema fue detectado.

### Criterios de aceptación

Debe mostrar:

* Título.
* Severidad.
* Confianza.
* Descripción.
* Evidencia.
* Impacto.
* Recomendación.

---

## HU-010 — Consultar referencias de seguridad

**Como** usuario
**quiero** conocer las referencias técnicas relacionadas con un hallazgo
**para** comprender su clasificación y contexto.

### Criterios de aceptación

Cuando corresponda se deberá mostrar:

* OWASP.
* CWE.
* CVE.
* ISO/IEC.

---

## HU-011 — Consultar relación con ISO

**Como** usuario
**quiero** conocer qué controles o prácticas de ISO/IEC están relacionados con un hallazgo
**para** comprender su relación con estándares internacionales.

### Criterios de aceptación

* Se debe indicar el estándar.
* Se debe indicar el control o referencia cuando corresponda.
* Se debe explicar la relación.
* No se deberá presentar el resultado como certificación ISO.

---

## HU-012 — Consultar Security Score

**Como** usuario
**quiero** conocer una puntuación general de seguridad
**para** obtener una visión rápida del estado de mi aplicación.

### Criterios de aceptación

* El score debe calcularse automáticamente.
* Debe mostrarse en el dashboard.
* Debe estar relacionado con los resultados de la auditoría.

---

## HU-013 — Consultar dashboard

**Como** usuario
**quiero** visualizar un resumen de la auditoría
**para** comprender rápidamente sus resultados.

### Criterios de aceptación

El dashboard deberá mostrar:

* Security Score.
* Total de hallazgos.
* Critical.
* High.
* Medium.
* Low.
* Informational.
* Tecnologías detectadas.

---

## HU-014 — Consultar historial

**Como** usuario
**quiero** consultar auditorías anteriores
**para** revisar el historial de seguridad de mis aplicaciones.

### Criterios de aceptación

* Se deben mostrar auditorías anteriores.
* Debe mostrarse la fecha.
* Debe mostrarse el objetivo.
* Debe mostrarse el Security Score.
* Debe mostrarse la cantidad de hallazgos.

---

## HU-015 — Generar informe

**Como** usuario
**quiero** generar un informe de seguridad
**para** documentar los resultados de una auditoría.

### Criterios de aceptación

El informe debe incluir:

* Objetivo.
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

---

## HU-016 — Manejar errores del análisis

**Como** usuario
**quiero** recibir información cuando un análisis no pueda completarse
**para** saber qué ocurrió y tomar una decisión.

### Criterios de aceptación

* El sistema debe informar el error.
* No debe mostrar información interna sensible.
* Debe conservar los resultados parciales cuando sea posible.

---

## HU-017 — Consultar recomendaciones

**Como** usuario
**quiero** conocer cómo corregir cada problema detectado
**para** poder reducir los riesgos encontrados.

### Criterios de aceptación

* Cada hallazgo deberá incluir una recomendación cuando exista una medida de mitigación conocida.
* La recomendación debe estar relacionada con el hallazgo.

---

## HU-018 — Crear cuenta

**Como** visitante
**quiero** registrarme con mi correo y una contraseña
**para** disponer de un historial propio de auditorías.

### Criterios de aceptación

* El correo debe ser válido y único.
* La contraseña debe cumplir la política mínima (8 caracteres).
* Tras el registro, la sesión queda iniciada automáticamente.
* Las contraseñas no se almacenan en texto plano.

---

## HU-019 — Iniciar sesión

**Como** usuario registrado
**quiero** autenticarme con mis credenciales
**para** acceder a mis auditorías.

### Criterios de aceptación

* Las credenciales incorrectas muestran un mensaje genérico (sin revelar si el correo existe).
* La sesión se mantiene entre visitas hasta que expire el token o el usuario cierre sesión.
* Al iniciar sesión se muestra un saludo de bienvenida.

---

## HU-020 — Historial privado

**Como** usuario
**quiero** que mis auditorías solo sean visibles para mí
**para** mantener la privacidad de los resultados de seguridad de mis aplicaciones.

### Criterios de aceptación

* El historial muestra únicamente auditorías propias.
* Un usuario no puede consultar ni eliminar auditorías de otro (responde como inexistentes).
* Las rutas privadas redirigen al login si no hay sesión.

---

## HU-021 — Auditoría de ejemplo al registrarse

**Como** usuario nuevo
**quiero** recibir una auditoría de ejemplo ya completada
**para** comprobar que la herramienta funciona sin lanzar ningún análisis.

### Criterios de aceptación

* El ejemplo aparece en el historial inmediatamente tras el registro.
* El ejemplo está identificado visualmente con una insignia.
* El ejemplo no puede eliminarse, ni individual ni masivamente.
* Sobre el intento de borrado del ejemplo, el sistema informa con un aviso claro.

---

## HU-022 — Eliminar auditorías del historial

**Como** usuario
**quiero** eliminar auditorías antiguas de mi historial
**para** conservar solo lo relevante.

### Criterios de aceptación

* Puedo eliminar una auditoría concreta previa confirmación en un modal Sí/No.
* Puedo borrar todas mis auditorías de una vez, con confirmación previa.
* Los ejemplos siempre se conservan en el borrado masivo.
* Los hallazgos asociados se eliminan junto con su auditoría.
* Se muestra un aviso con el resultado de la operación.

---

## HU-023 — Consultar el Risk Score de un hallazgo

**Como** usuario
**quiero** ver una puntuación cuantitativa por hallazgo con su desglose
**para** entender por qué un problema es más prioritario que otro.

### Criterios de aceptación

* Cada hallazgo muestra su Risk Score (máx. 125) y el desglose Impacto/Probabilidad/Exposición.
* Los hallazgos se ordenan por esta puntuación.
* El desglose también aparece en el informe PDF.

---

## HU-024 — Recibir avisos con la estética de la aplicación

**Como** usuario
**quiero** que las confirmaciones y notificaciones usen ventanas propias de la aplicación
**para** tener una experiencia coherente y clara en todas las acciones.

### Criterios de aceptación

* Las acciones destructivas piden confirmación en un modal Sí/No (variante roja para peligro).
* El resultado de las operaciones se informa con toasts no bloqueantes que desaparecen solos.
* No se utilizan los diálogos nativos del navegador (alert/confirm).

---

## HU-025 — Usar la aplicación desde el móvil

**Como** usuario
**quiero** que la aplicación se adapte a la pantalla de mi teléfono
**para** poder gestionar mis auditorías desde cualquier dispositivo.

### Criterios de aceptación

* En pantallas estrechas el menú se convierte en un botón hamburguesa con panel desplegable.
* El panel muestra el nombre del usuario y se cierra al navegar, tocar fuera o pulsar Escape.
* Existe un botón flotante "volver arriba" tras descender en la página.
* Las tarjetas, tableros y textos se reorganizan sin desbordarse.
