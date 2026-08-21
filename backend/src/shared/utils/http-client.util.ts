/**
 * ============================================================================
 * CLIENTE HTTP PARA LOS ANALIZADORES
 * ----------------------------------------------------------------------------
 * Encapsula todas las solicitudes HTTP que el scanner realiza contra el
 * objetivo: descarga de la página principal, sondeos de rutas y parseo de
 * cookies. Todas las peticiones aplican:
 *   - User-Agent identificable como SecureScan (uso responsable, RNF-025).
 *   - Timeout configurable para no colgar la auditoría (RNF-013).
 *   - Tolerancia a fallos: los errores se devuelven como resultado, no
 *     interrumpen el proceso (RF-032 / RNF-008).
 * ============================================================================
 */

import { env } from '../../config/env';

/** Cookie ya parseada con sus atributos de seguridad. */
export interface ParsedCookie {
  /** Cabecera Set-Cookie original (evidencia). */
  raw: string;
  name: string;
  value: string;
  domain: string;
  path: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  expires: string;
}

/** Resultado normalizado de una descarga de página. */
export interface FetchedPage {
  ok: boolean;
  status: number;
  finalUrl: string;
  /** Cabeceras de respuesta en minúsculas para acceso uniforme. */
  headers: Record<string, string>;
  setCookies: ParsedCookie[];
  /** Cuerpo truncado (~300 KB) suficiente para detección de tecnologías. */
  body: string;
  /** Redirecciones observadas cuando se solicita seguimiento manual. */
  redirects: Array<{ status: number; location: string }>;
  error?: string;
}

/** Resultado del sondeo de una ruta específica del objetivo. */
export interface HttpProbe {
  path: string;
  status: number | null;
  bodySnippet: string;
  error?: string;
}

/**
 * Convierte una cabecera Set-Cookie cruda en un objeto estructurado.
 *
 * @param raw  Valor completo de la cabecera Set-Cookie.
 */
function parseSetCookie(raw: string): ParsedCookie {
  const parts = raw.split(';').map((p) => p.trim());
  const [nameValue, ...attributes] = parts;
  const eq = nameValue.indexOf('=');
  const name = eq >= 0 ? nameValue.slice(0, eq).trim() : nameValue.trim();
  const value = eq >= 0 ? nameValue.slice(eq + 1).trim() : '';

  let domain = '';
  let path = '/';
  let sameSite = '';
  let expires = '';
  let secure = false;
  let httpOnly = false;

  // Recorre los atributos de la cookie extrayendo flags de seguridad.
  for (const attr of attributes) {
    const lower = attr.toLowerCase();
    if (lower.startsWith('domain=')) {
      domain = attr.slice(7).trim();
    } else if (lower.startsWith('path=')) {
      path = attr.slice(5).trim();
    } else if (lower.startsWith('samesite=')) {
      sameSite = attr.slice(9).trim();
    } else if (lower.startsWith('expires=')) {
      expires = attr.slice(8).trim();
    } else if (lower === 'secure') {
      secure = true;
    } else if (lower === 'httponly') {
      httpOnly = true;
    }
  }

  return { raw, name, value, domain, path, secure, httpOnly, sameSite, expires };
}

/**
 * Envuelve `fetch` con un timeout basado en AbortController.
 *
 * @param url   URL absoluta a solicitar.
 * @param init  Opciones estándar de fetch.
 */
async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.scanTimeoutMs);
  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
      headers: {
        'User-Agent': env.userAgent,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...(init.headers ?? {})
      },
      redirect: init.redirect ?? 'follow'
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Descarga una URL y devuelve su respuesta normalizada.
 * Nunca lanza: ante un fallo devuelve un FetchedPage con `ok:false` y el
 * motivo en `error`, permitiendo que la auditoría continúe (RF-032).
 *
 * Ante errores de red (DNS, conexión rechazada, reinicio del servidor)
 * se reintenta UNA vez tras una breve espera: muchos hosting gratuitos
 * (p. ej. Render) fallan el primer contacto mientras despiertan la
 * aplicación ("cold start"). Los timeouts genuinos no se reintentan para
 * no duplicar la espera total.
 *
 * @param url                   URL a descargar.
 * @param options.followRedirects Si es false, las redirecciones NO se siguen
 *                              y quedan registradas en `redirects`.
 */
export async function fetchPage(
  url: string,
  options: { followRedirects?: boolean } = {}
): Promise<FetchedPage> {
  const MAX_ATTEMPTS = 2;
  const RETRY_DELAY_MS = 2500;

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchOnce(url, options);
    } catch (error) {
      lastError = error;
      // Un AbortError es un timeout real: reintentar solo alargaría la espera.
      if (error instanceof Error && error.name === 'AbortError') break;
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
      }
    }
  }

  return {
    ok: false,
    status: 0,
    finalUrl: url,
    headers: {},
    setCookies: [],
    body: '',
    redirects: [],
    error: lastError instanceof Error ? lastError.message : 'unknown-fetch-error'
  };
}

/**
 * Intento único de descarga (usado internamente por fetchPage).
 *
 * @param url                   URL a descargar.
 * @param options               Opciones de descarga.
 */
async function fetchOnce(
  url: string,
  options: { followRedirects?: boolean }
): Promise<FetchedPage> {
  const redirects: Array<{ status: number; location: string }> = [];

  const response = await fetchWithTimeout(url, {
    redirect: options.followRedirects === false ? 'manual' : 'follow'
  });

  // En modo manual registramos el destino de la redirección como evidencia.
  if (options.followRedirects === false) {
    const location = response.headers.get('location');
    if (location) {
      redirects.push({ status: response.status, location });
    }
  }

  // Normaliza las cabeceras a claves en minúscula.
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key.toLowerCase()] = value;
  });

  // getSetCookie() devuelve cada cabecera Set-Cookie por separado.
  const setCookies = response.headers.getSetCookie().map((raw) => parseSetCookie(raw));

  // Descarga y decodifica solo los primeros ~300 KB del cuerpo.
  const buffer = await response.arrayBuffer();
  const body = new TextDecoder('utf-8', { fatal: false }).decode(buffer.slice(0, 300_000));

  return {
    ok: response.ok,
    status: response.status,
    finalUrl: response.url || url,
    headers,
    setCookies,
    body,
    redirects
  };
}

/**
 * Sondea una ruta concreta dentro del origen del objetivo (sin seguir
 * redirecciones) para detectar recursos expuestos.
 *
 * @param origin  Origen del objetivo, por ejemplo https://example.com
 * @param path    Ruta a sondear, por ejemplo /.env
 */
export async function probePath(origin: string, path: string): Promise<HttpProbe> {
  const result = await fetchPage(`${origin}${path}`, { followRedirects: false });
  return {
    path,
    status: result.status || null,
    bodySnippet: result.body.slice(0, 500),
    error: result.error
  };
}
