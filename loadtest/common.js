/**
 * Utilidades compartidas por las pruebas de carga:
 *   - autenticación contra la API (login o registro),
 *   - cálculo de medianas,
 *   - peticiones JSON.
 */

'use strict';

const BASE_URL = process.env.TARGET_BASE_URL || 'http://localhost:8080';
const EMAIL = process.env.LOADTEST_EMAIL || 'loadtest@securescan.local';
const PASSWORD = process.env.LOADTEST_PASSWORD || 'loadtest-password-123';

/** Realiza una petición JSON y devuelve { status, body }. */
async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  return { status: response.status, body };
}

/** Obtiene un token válido; registra la cuenta si aún no existe. */
async function getToken() {
  if (process.env.TOKEN) return process.env.TOKEN;

  const login = await request('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD })
  });
  if (login.status === 200 && login.body?.token) return login.body.token;

  const register = await request('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PASSWORD, displayName: 'Load Test' })
  });
  if (register.status === 201 && register.body?.token) return register.body.token;

  throw new Error(
    `No se pudo autenticar (login=${login.status}, register=${register.status}): ` +
      JSON.stringify(register.body)
  );
}

/** Mediana de una lista de números (los ordena sin mutar el original). */
function median(values) {
  if (values.length === 0) return NaN;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[middle - 1] + sorted[middle]) / 2
    : sorted[middle];
}

/** Redondea a un número fijo de decimales. */
function round(value, decimals = 2) {
  if (!Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

/** Espera asíncrona. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = {
  BASE_URL,
  EMAIL,
  PASSWORD,
  request,
  getToken,
  median,
  round,
  sleep
};
