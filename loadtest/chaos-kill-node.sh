#!/usr/bin/env bash
# ============================================================================
# E5 · CAOS: CAÍDA DE UNA RÉPLICA EN PLENA CARGA
# ----------------------------------------------------------------------------
# 1. Configura el objetivo simulado con latencia para que la carga dure.
# 2. Lanza auditorías reales en segundo plano.
# 3. Mata una réplica con SIGKILL (caída dura, sin apagado ordenado).
# 4. Espera a que los trabajos huérfanos superen el timeout de latido.
# 5. Vuelve a levantar la réplica.
# 6. Comprueba que no quedan auditorías RUNNING y muestra los logs de
#    reasignación.
#
# Uso:
#   bash loadtest/chaos-kill-node.sh api-2
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.distributed.yml}"
NODE="${1:-api-2}"
COUNT="${COUNT:-120}"
LATENCY_MS="${LATENCY_MS:-1000}"
STALE_SECONDS="${JOB_STALE_SECONDS:-15}"
OUT_FILE="$(mktemp)"

cd "${ROOT_DIR}"

echo "[chaos] objetivo simulado: latencia=${LATENCY_MS}ms"
curl -s -X POST "http://localhost:8081/__config?latency=${LATENCY_MS}&jitter=0&failRate=0&down=0" >/dev/null

echo "[chaos] lanzando ${COUNT} auditorías en segundo plano"
TARGET_URL="${TARGET_URL:-http://target-sim:8081}" node loadtest/audits.js \
  --count "${COUNT}" --concurrency 20 --timeout 300 >"${OUT_FILE}" 2>&1 &
LOAD_PID=$!

# Deja que la carga esté en pleno vuelo antes de matar la réplica.
sleep 5

echo "[chaos] matando ${NODE} con SIGKILL"
docker compose -f "${COMPOSE_FILE}" --profile scale kill -s KILL "${NODE}"

# Espera superior al timeout de latido para que los supervivientes recuperen
# los trabajos huérfanos.
echo "[chaos] esperando $((STALE_SECONDS + 5))s para la reasignación"
sleep $((STALE_SECONDS + 5))

echo "[chaos] levantando ${NODE} de nuevo"
docker compose -f "${COMPOSE_FILE}" --profile scale start "${NODE}" >/dev/null

echo "[chaos] esperando a que terminen las auditorías"
wait "${LOAD_PID}" || true

# Restaura el objetivo para no contaminar pruebas posteriores.
curl -s -X POST "http://localhost:8081/__config?latency=0&jitter=0&failRate=0&down=0" >/dev/null

echo "[chaos] salida de audits.js:"
cat "${OUT_FILE}"
rm -f "${OUT_FILE}"

echo "[chaos] estado de la cola:"
docker compose -f "${COMPOSE_FILE}" exec -T postgres \
  psql -U securescan -d securescan -c \
  'SELECT "status", COUNT(*) FROM "ScanJob" GROUP BY "status" ORDER BY "status";'

echo "[chaos] auditorías por estado:"
docker compose -f "${COMPOSE_FILE}" exec -T postgres \
  psql -U securescan -d securescan -c \
  'SELECT "status", COUNT(*) FROM "Audit" GROUP BY "status" ORDER BY "status";'

echo "[chaos] auditorías RUNNING con más de 60s (debe ser 0):"
docker compose -f "${COMPOSE_FILE}" exec -T postgres \
  psql -U securescan -d securescan -c \
  'SELECT COUNT(*) AS running_viejas FROM "Audit" WHERE "status" = '\''RUNNING'\'' AND "startedAt" < NOW() - INTERVAL '\''60 seconds'\'';'

echo "[chaos] evidencia de reasignación en logs:"
docker compose -f "${COMPOSE_FILE}" logs --no-color api-1 api-3 2>/dev/null \
  | grep -E "huérfano|DEAD|reasignado|reclamado" | tail -n 30 || true
