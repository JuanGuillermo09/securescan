/**
 * ============================================================================
 * SITIO OBJETIVO SIMULADO
 * ----------------------------------------------------------------------------
 * Servidor Node puro que imita un sitio web deliberadamente inseguro. Solo se
 * usa como blanco de las pruebas de carga y robustez; nunca se apunta a
 * sitios de terceros.
 *
 * Configuración en caliente:
 *   POST /__config?latency=8000&jitter=0&failRate=0.2&down=1
 *   GET  /__config            → configuración actual
 *   POST /__reset             → vuelve a los valores iniciales
 *
 * Variables de entorno iniciales: PORT, LATENCY_MS, JITTER_MS, FAIL_RATE,
 * DOWN.
 * ============================================================================
 */

'use strict';

const http = require('http');

const initialConfig = {
  latency: Number(process.env.LATENCY_MS || 0),
  jitter: Number(process.env.JITTER_MS || 0),
  failRate: Number(process.env.FAIL_RATE || 0),
  down: String(process.env.DOWN || '0') === '1'
};

let config = { ...initialConfig };

/** Convierte un parámetro de query en número no negativo. */
function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Cabeceras débiles comunes a la página principal. */
function weakHeaders(extra = {}) {
  return {
    Server: 'Apache/2.4.49 (Unix)',
    'X-Powered-By': 'PHP/7.4.3',
    'Set-Cookie': 'PHPSESSID=abc123; Path=/',
    ...extra
  };
}

/** Página principal con tecnologías y configuraciones vulnerables. */
const HOME_HTML = `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="generator" content="WordPress 5.8">
  <title>SecureScan target sim</title>
  <script src="/wp-includes/js/jquery/jquery.min.js?ver=3.3.1"></script>
</head>
<body>
  <h1>Objetivo de pruebas SecureScan</h1>
  <p>Este sitio es un blanco simulado, deliberadamente inseguro.</p>
</body>
</html>`;

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);

  // ---- API de configuración (nunca se retrasa ni se cae) ----------------
  if (url.pathname === '/__config') {
    if (req.method === 'POST') {
      config = {
        latency: toNumber(url.searchParams.get('latency'), config.latency),
        jitter: toNumber(url.searchParams.get('jitter'), config.jitter),
        failRate: toNumber(url.searchParams.get('failRate'), config.failRate),
        down: url.searchParams.has('down')
          ? ['1', 'true'].includes(String(url.searchParams.get('down')).toLowerCase())
          : config.down
      };
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(config));
    return;
  }

  if (url.pathname === '/__reset' && req.method === 'POST') {
    config = { ...initialConfig };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(config));
    return;
  }

  // ---- Caída total: se corta la conexión sin respuesta -------------------
  if (config.down) {
    req.socket.destroy();
    return;
  }

  const delay = config.latency + Math.random() * config.jitter;

  setTimeout(() => {
    // Fallo aleatorio configurable (500) para pruebas de tolerancia.
    if (config.failRate > 0 && Math.random() < config.failRate) {
      res.writeHead(500, weakHeaders({ 'Content-Type': 'text/plain' }));
      res.end('simulated failure');
      return;
    }

    // Rutas sensibles: el simulador NO las expone (404), de modo que el
    // analizador de exposición no debe reportar falsos positivos.
    if (['/.env', '/.git/HEAD', '/phpinfo.php'].includes(url.pathname)) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }

    if (url.pathname === '/') {
      res.writeHead(200, weakHeaders({ 'Content-Type': 'text/html; charset=utf-8' }));
      res.end(HOME_HTML);
      return;
    }

    res.writeHead(200, weakHeaders({ 'Content-Type': 'text/plain' }));
    res.end('ok');
  }, delay);
});

const port = Number(process.env.PORT || 8081);
server.listen(port, () => {
  console.log(`[target-sim] escuchando en http://0.0.0.0:${port}`, config);
});
