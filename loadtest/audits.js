/**
 * ============================================================================
 * PRUEBA DE AUDITORÍAS COMPLETAS
 * ----------------------------------------------------------------------------
 * Crea N auditorías reales contra el objetivo simulado, espera a que todas
 * terminen y mide:
 *   - tiempo total,
 *   - auditorías por minuto,
 *   - tiempo medio inicio → fin,
 *   - cuántas terminaron en FAILED.
 *
 * Uso:
 *   TARGET_URL=http://localhost:8081 node audits.js --count 30
 *
 * Variables:
 *   TARGET_BASE_URL  API de SecureScan (por defecto http://localhost:8080)
 *   TARGET_URL       objetivo a auditar (por defecto http://localhost:8081)
 *   TOKEN            token JWT ya emitido (opcional)
 * ============================================================================
 */

'use strict';

const { BASE_URL, request, getToken, round, sleep } = require('./common');

/** Lee un argumento numérico de la línea de comandos. */
function arg(name, fallback) {
  const index = process.argv.indexOf(`--${name}`);
  if (index === -1) return fallback;
  const value = Number(process.argv[index + 1]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/** Crea una auditoría y devuelve su DTO o lanza error. */
async function createAudit(token, targetUrl) {
  const response = await request('/api/audits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ url: targetUrl, authorized: true })
  });
  if (response.status !== 201) {
    throw new Error(`creación falló (${response.status}): ${JSON.stringify(response.body)}`);
  }
  return response.body;
}

/** Crea N auditorías con concurrencia limitada. */
async function createAll(token, targetUrl, count, concurrency) {
  const created = [];
  let index = 0;

  async function worker() {
    while (index < count) {
      const current = index;
      index += 1;
      try {
        created.push(await createAudit(token, targetUrl));
      } catch (error) {
        console.error(`[audits] no se pudo crear la auditoría ${current + 1}:`, error.message);
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, count) }, () => worker())
  );
  return created;
}

/**
 * Consulta el estado de las auditorías creadas hasta que todas terminen.
 *
 * Se consulta una por una porque GET /api/audits devuelve como máximo 50
 * filas y en E5 se crean 120: un listado no alcanzaría para verlas todas.
 */
async function waitForCompletion(token, ids, timeoutSeconds) {
  const pending = new Set(ids);
  const finished = new Map();
  const deadline = Date.now() + timeoutSeconds * 1000;

  while (pending.size > 0 && Date.now() < deadline) {
    const batch = [...pending];
    let cursor = 0;

    async function worker() {
      while (cursor < batch.length) {
        const id = batch[cursor];
        cursor += 1;
        const detail = await request(`/api/audits/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (
          detail.status === 200 &&
          (detail.body.status === 'COMPLETED' || detail.body.status === 'FAILED')
        ) {
          pending.delete(id);
          finished.set(id, detail.body);
        }
      }
    }

    await Promise.all(
      Array.from({ length: Math.min(10, batch.length) }, () => worker())
    );

    if (pending.size > 0) await sleep(1000);
  }

  return { finished, stillPending: [...pending] };
}

async function main() {
  const count = arg('count', 30);
  const concurrency = arg('concurrency', 10);
  const timeoutSeconds = arg('timeout', 600);
  const targetUrl = process.env.TARGET_URL || 'http://localhost:8081';
  const token = await getToken();

  console.log(
    `[audits] API=${BASE_URL} objetivo=${targetUrl} cantidad=${count} ` +
      `concurrencia_creacion=${concurrency}`
  );

  const startedAt = Date.now();
  const created = await createAll(token, targetUrl, count, concurrency);
  const { finished, stillPending } = await waitForCompletion(
    token,
    created.map((audit) => audit.id),
    timeoutSeconds
  );
  const elapsedSeconds = (Date.now() - startedAt) / 1000;

  let failed = 0;
  let completed = 0;
  let sumSeconds = 0;
  let samples = 0;

  for (const audit of finished.values()) {
    if (audit.status === 'FAILED') failed += 1;
    if (audit.status === 'COMPLETED') completed += 1;
    if (audit.startedAt && audit.finishedAt) {
      sumSeconds += (new Date(audit.finishedAt) - new Date(audit.startedAt)) / 1000;
      samples += 1;
    }
  }

  const summary = {
    count,
    created: created.length,
    completed,
    failed,
    stillPending: stillPending.length,
    totalSeconds: round(elapsedSeconds),
    auditsPerMinute: round((created.length / elapsedSeconds) * 60),
    averageSeconds: samples > 0 ? round(sumSeconds / samples) : null
  };

  console.log(
    `[audits] RESULTADO: creadas=${summary.created} completadas=${summary.completed} ` +
      `fallidas=${summary.failed} pendientes=${summary.stillPending} ` +
      `total=${summary.totalSeconds}s auditorias/min=${summary.auditsPerMinute} ` +
      `tiempo_medio=${summary.averageSeconds}s`
  );
  if (stillPending.length > 0) {
    console.log(`[audits] IDs sin terminar: ${stillPending.join(',')}`);
  }
  console.log(`[audits] JSON ${JSON.stringify(summary)}`);
}

main().catch((error) => {
  console.error('[audits] ERROR', error);
  process.exit(1);
});
