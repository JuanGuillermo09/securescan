/**
 * ============================================================================
 * PRUEBA DE LECTURA (E1–E4)
 * ----------------------------------------------------------------------------
 * Genera carga con autocannon contra GET /api/audits (endpoint de lectura
 * protegido con JWT) y reporta la mediana de varias repeticiones.
 *
 * Uso:
 *   node read.js --connections 50 --duration 30 --repeats 3
 *
 * Variables:
 *   TARGET_BASE_URL  URL base (por defecto http://localhost:8080)
 *   TOKEN            token JWT ya emitido (opcional)
 * ============================================================================
 */

'use strict';

const autocannon = require('autocannon');
const { BASE_URL, getToken, median, round } = require('./common');

/** Lee un argumento numérico de la línea de comandos. */
function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Ejecuta una repetición de autocannon y normaliza las métricas. */
function runOnce(url, connections, duration, token) {
  return new Promise((resolve, reject) => {
    const instance = autocannon(
      {
        url,
        method: 'GET',
        connections,
        duration,
        headers: { Authorization: `Bearer ${token}` },
        timeout: 30
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }
        const total = result.requests.total || 1;
        const networkErrors = result.errors || 0;
        const non2xx = result.non2xx || 0;
        const timeouts = result.timeouts || 0;
        const failed = networkErrors + non2xx + timeouts;
        resolve({
          reqPerSec: result.requests.average,
          p50: result.latency.p50,
          p97_5: result.latency.p97_5,
          p99: result.latency.p99,
          errorPct: (failed / total) * 100,
          total,
          failed,
          networkErrors,
          non2xx,
          timeouts
        });
      }
    );
    // Silencia el progreso para que la salida sea parseable.
    instance.on('tick', () => undefined);
  });
}

async function main() {
  const connections = arg('connections', 10);
  const duration = arg('duration', 30);
  const repeats = arg('repeats', 3);
  const token = await getToken();
  const url = `${BASE_URL}/api/audits`;

  console.log(
    `[read] objetivo=${url} conexiones=${connections} duracion=${duration}s repeticiones=${repeats}`
  );

  const samples = [];
  for (let i = 1; i <= repeats; i += 1) {
    const sample = await runOnce(url, connections, duration, token);
    samples.push(sample);
    console.log(
      `[read] repeticion ${i}: req/s=${round(sample.reqPerSec)} ` +
        `p50=${sample.p50}ms p97.5=${sample.p97_5}ms p99=${sample.p99}ms ` +
        `errores=${round(sample.errorPct)}% (${sample.failed}/${sample.total}; ` +
        `red=${sample.networkErrors}, http=${sample.non2xx}, timeout=${sample.timeouts})`
    );
  }

  const summary = {
    connections,
    duration,
    repeats,
    reqPerSec: median(samples.map((sample) => sample.reqPerSec)),
    p50: median(samples.map((sample) => sample.p50)),
    p97_5: median(samples.map((sample) => sample.p97_5)),
    p99: median(samples.map((sample) => sample.p99)),
    errorPct: median(samples.map((sample) => sample.errorPct)),
    networkErrors: samples.reduce((sum, sample) => sum + sample.networkErrors, 0),
    non2xx: samples.reduce((sum, sample) => sum + sample.non2xx, 0),
    timeouts: samples.reduce((sum, sample) => sum + sample.timeouts, 0)
  };

  console.log(
    `[read] MEDIANA: req/s=${round(summary.reqPerSec)} p50=${summary.p50}ms ` +
      `p97.5=${summary.p97_5}ms p99=${summary.p99}ms errores=${round(summary.errorPct)}% ` +
      `(red=${summary.networkErrors}, http=${summary.non2xx}, timeout=${summary.timeouts})`
  );
  console.log(`[read] JSON ${JSON.stringify(summary)}`);
}

main().catch((error) => {
  console.error('[read] ERROR', error);
  process.exit(1);
});
