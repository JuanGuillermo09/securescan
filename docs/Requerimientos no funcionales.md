# SecureScan Web — Requerimientos No Funcionales

## RNF-001 — Seguridad

El sistema deberá implementar buenas prácticas de seguridad en frontend, backend y base de datos.

## RNF-002 — Autenticación y sesiones

> Nota: este requisito evolucionó respecto al planteamiento inicial de "acceso sin autenticación". La versión actual exige cuentas de usuario e historial privado.

La plataforma deberá gestionar cuentas de usuario mediante registro e inicio de sesión, emitiendo un token JWT firmado con expiración configurable.

Las rutas privadas de la API deberán exigir un token válido, y las rutas privadas del frontend deberán estar protegidas mediante guards.

## RNF-003 — Protección de contraseñas

Las contraseñas deberán almacenarse hasheadas con un algoritmo de hash para contraseñas (bcrypt) y un coste adecuado (mínimo 10 rondas).

Nunca deberán almacenarse ni registrarse en texto plano, ni devolverse en las respuestas de la API.

## RNF-004 — Acceso a auditorías

Cada auditoría pertenecerá al usuario autenticado que la creó.

El listado del historial deberá filtrarse por propietario, y los intentos de acceso o eliminación sobre auditorías ajenas deberán responder como recurso inexistente (404), sin revelar su existencia.

## RNF-005 — Validación de entradas

El backend deberá validar y sanitizar los datos recibidos.

## RNF-006 — Protección contra abuso

El sistema deberá implementar rate limiting con cuotas diferenciadas según el coste de la operación:

* Cuota estricta para iniciar escaneos (operación costosa): 20 peticiones por ventana de 15 minutos.
* Cuota amplia para lecturas y borrados del historial (operaciones baratas que la interfaz repite en cada navegación): 300 peticiones por la misma ventana.

Ambos límites deberán ser configurables mediante variables de entorno (`RATE_LIMIT_MAX`, `RATE_LIMIT_READ_MAX`, `RATE_LIMIT_WINDOW_MS`).

## RNF-007 — Manejo seguro de errores

Los errores no deberán exponer información sensible, credenciales, configuraciones internas o detalles innecesarios del servidor.

## RNF-008 — Tolerancia a fallos

El fallo de un analizador no deberá provocar necesariamente la pérdida completa de una auditoría.

La descarga de la página del objetivo deberá reintentarse una vez ante errores de red transitorios (por ejemplo, arranques en frío de plataformas serverless), sin duplicar las esperas por timeout. Cuando el objetivo no responda, la auditoría deberá finalizar en estado FAILED con un mensaje claro, sin generar falsos positivos.

## RNF-009 — Modularidad

Cada analizador de seguridad deberá estar desarrollado como un módulo independiente.

## RNF-010 — Extensibilidad

La arquitectura deberá permitir incorporar nuevos analizadores sin modificar significativamente los módulos existentes.

## RNF-011 — Mantenibilidad

El código deberá mantenerse organizado, documentado y separado por responsabilidades.

El frontend deberá seguir una organización por capas (`core/` para servicios singleton, `shared/` para reutilizables y `features/` para páginas), documentada en `frontend/src/app/README.md`.

## RNF-012 — Separación de responsabilidades

Frontend, backend, lógica de análisis, motor de riesgos y persistencia deberán mantenerse desacoplados.

## RNF-013 — Rendimiento

Las operaciones normales del sistema deberán presentar tiempos de respuesta adecuados.

Los análisis podrán ejecutarse de manera asíncrona debido a su naturaleza.

## RNF-014 — Escalabilidad lógica

La arquitectura deberá permitir aumentar progresivamente la cantidad de analizadores y reglas de seguridad.

## RNF-015 — Trazabilidad

Cada hallazgo deberá poder relacionarse con la auditoría que lo generó.

## RNF-016 — Integridad de datos

La información almacenada deberá mantener relaciones e integridad entre usuarios, auditorías, hallazgos y referencias.

## RNF-017 — Disponibilidad local

El sistema deberá poder ejecutarse completamente en un entorno local sin depender de Docker.

## RNF-018 — Compatibilidad

La aplicación deberá funcionar correctamente en navegadores web modernos.

## RNF-019 — Diseño responsive

La interfaz deberá adaptarse a computadores, tablets y diferentes resoluciones, incluyendo:

* Rejillas fluidas y tipografía escalable.
* Menú de navegación tipo hamburguesa en pantallas estrechas.
* Barras de desplazamiento visibles y coherentes con el tema oscuro.

## RNF-020 — Usabilidad

Los resultados deberán presentarse de forma clara, permitiendo diferenciar rápidamente los riesgos críticos de los informativos.

## RNF-021 — Testabilidad

Los componentes críticos deberán contar con pruebas automatizadas.

Como mínimo:

* Analizadores.
* Motor de riesgos.
* Servicios principales.
* Reglas de detección.

## RNF-022 — Documentación

El proyecto deberá contar con documentación técnica y funcional suficiente para comprender su instalación, arquitectura y funcionamiento.

## RNF-023 — Observabilidad

El backend deberá registrar errores, eventos relevantes y estados de las auditorías.

## RNF-024 — Privacidad

El sistema deberá almacenar únicamente la información necesaria para ejecutar y documentar las auditorías.

## RNF-025 — Uso responsable

El sistema deberá estar diseñado para realizar análisis únicamente sobre aplicaciones para las cuales el usuario tenga autorización.

## RNF-026 — Confiabilidad de resultados

Los hallazgos deberán diferenciar entre detecciones confirmadas y posibles vulnerabilidades que requieran validación manual.

## RNF-027 — Precisión

El sistema deberá procurar minimizar los falsos positivos mediante reglas de detección y niveles de confianza.

## RNF-028 — Portabilidad del código

El proyecto deberá poder instalarse y ejecutarse en otro equipo que cumpla con los requisitos establecidos, sin depender de una configuración específica de la máquina del desarrollador.
