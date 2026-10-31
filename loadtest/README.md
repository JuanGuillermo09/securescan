# Pruebas de carga y robustez

Todas las pruebas apuntan **solo** al objetivo simulado propio
(`tools/target-sim`). Nunca a sitios de terceros.

## Requisitos

```bash
cd loadtest
npm install
```

## E1–E4 · Lecturas concurrentes

```bash
node read.js --connections 10 --duration 30 --repeats 3   # E1 (1 nodo)
node read.js --connections 50 --duration 30 --repeats 3   # E2 (1 nodo)
node read.js --connections 50 --duration 30 --repeats 3   # E3 (3 nodos)
node read.js --connections 100 --duration 30 --repeats 3  # E4 (3 nodos)
```

`read.js` hace login/registro automático y mide `GET /api/audits`. Imprime
req/s, p50, p97.5, p99 y % de errores de cada repetición y la mediana.

Variables: `TARGET_BASE_URL` (defecto `http://localhost:8080`), `TOKEN`,
`LOADTEST_EMAIL`, `LOADTEST_PASSWORD`.

## Auditorías completas

```bash
TARGET_URL=http://target-sim:8081 node audits.js --count 30
```

Mide tiempo total, auditorías/min, tiempo medio inicio→fin y FAILED.

## E5 · Caída de una réplica

```bash
bash loadtest/chaos-kill-node.sh api-2
```

Lanza auditorías, mata `api-2` con SIGKILL en plena carga, espera el timeout
de latido, la vuelve a levantar y comprueba que no quedan auditorías
`RUNNING` atascadas. Muestra los logs de reasignación.

## E6 · Objetivo lento y caído

```bash
curl -X POST "http://localhost:8081/__config?latency=8000"
TARGET_URL=http://target-sim:8081 node audits.js --count 10
curl -X POST "http://localhost:8081/__config?down=1"
TARGET_URL=http://target-sim:8081 node audits.js --count 10
curl -X POST "http://localhost:8081/__reset"
```

Con `SCAN_TIMEOUT_MS=5000` (perfil distribuido), una latencia de 8000 ms
provoca timeout y la auditoría termina en `FAILED` con mensaje claro.

## E7 · Analizador que falla

```bash
FAIL_ANALYZER=headers docker compose -f docker-compose.distributed.yml \
  --profile scale up -d --force-recreate api-1 api-2 api-3
docker compose -f docker-compose.distributed.yml restart nginx
TARGET_URL=http://target-sim:8081 node audits.js --count 10
```

La auditoría debe completarse con resultados parciales y el error de
`headers` registrado en `analyzerErrors`. Al terminar, restaurar
`FAIL_ANALYZER` vacío y recrear las APIs.
