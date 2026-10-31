# Prototipo distribuido de SecureScan

Este documento describe el perfil **opcional** distribuido. El modo simple
(SQLite, un solo proceso, `npm run dev`/`npm start`, Render) no cambia: todas
las piezas nuevas se activan con variables de entorno y el archivo
`docker-compose.distributed.yml`.

## Arquitectura

```
cliente → NGINX (8080) → api-1 / api-2 / api-3 (Express + tsx)
                              │
                              ├── PostgreSQL (Audit, Finding, ScanJob)
                              └── pool de hilos (analizadores)
                                      │
                                 target-sim (8081)
```

- **Cola persistente**: cada auditoría crea un `ScanJob`. Las réplicas lo
  reclaman con `UPDATE … FOR UPDATE SKIP LOCKED`, envían latidos mientras
  ejecutan y lo marcan `DONE`. Un trabajo `RUNNING` sin latido vuelve a
  `PENDING`; tras 3 intentos pasa a `DEAD` y su auditoría a `FAILED`.
- **Pool de hilos**: los seis analizadores se ejecutan en `worker_threads`.
  `ANALYZER_POOL_SIZE=0` conserva la ejecución secuencial de la V1.
- **Observer**: `shared/events.ts` publica `RUNNING`/`COMPLETED`/`FAILED` y
  un suscriptor los registra en el logger.
- **NGINX**: `least_conn`, `max_fails`/`fail_timeout` y
  `proxy_next_upstream` para tolerar la caída de una réplica.

## Arranque

### 3 nodos (perfil `scale`)

```bash
docker compose -f docker-compose.distributed.yml --profile scale up -d --build
```

### 1 nodo

```bash
# Asegurarse de que api-2/api-3 no estén levantadas
docker compose -f docker-compose.distributed.yml --profile scale down

NGINX_CONF=./infra/nginx.1node.conf \
  docker compose -f docker-compose.distributed.yml up -d --build
```

Comprobar salud y reparto:

```bash
curl -i http://localhost:8080/api/health
curl -s -D - http://localhost:8080/api/health -o /dev/null | grep -i x-node-id
```

## Variables de entorno del perfil

| Variable | Defecto | Uso |
| --- | --- | --- |
| `NODE_ID` | `local` | Identificador de la réplica (cabecera `X-Node-Id`) |
| `QUEUE_MODE` | `false` | Activa la cola PostgreSQL |
| `JOB_CONCURRENCY` | `2` | Auditorías simultáneas por nodo |
| `JOB_POLL_MS` | `1000` | Sondeo de la cola |
| `JOB_HEARTBEAT_MS` | `5000` | Latido de un trabajo en ejecución |
| `JOB_STALE_SECONDS` | `30` | Segundos sin latido para reasignar |
| `TRUST_PROXY` | `0` | Proxies de confianza (`1` detrás de NGINX) |
| `ANALYZER_POOL_SIZE` | `0` | Hilos del pool (0 = sin pool) |
| `ANALYZER_TIMEOUT_MS` | `5000` | Timeout por analizador en hilo |
| `FAIL_ANALYZER` | vacío | Analizador que falla a propósito (E7) |
| `EXAMPLE_AUDIT_ENABLED` | `true` | En pruebas distribuidas se pone `false` |

## Objetivo simulado

`tools/target-sim/server.js` devuelve cabeceras y cookies débiles, tecnologías
antiguas y 404 en `/.env`, `/.git/HEAD` y `/phpinfo.php`.

```bash
curl -X POST "http://localhost:8081/__config?latency=8000"
curl -X POST "http://localhost:8081/__config?down=1"
curl -X POST "http://localhost:8081/__reset"
```

## Pruebas

Ver `loadtest/README.md`. Los resultados reales de la última ejecución están
en `REPORTE_PRUEBAS.txt` en la raíz del proyecto.
