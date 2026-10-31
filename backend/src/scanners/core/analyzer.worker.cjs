/**
 * Arranque CommonJS de un hilo del pool.
 *
 * Los worker_threads no heredan el cargador de tsx del proceso principal, por
 * lo que primero registramos tsx/cjs y después cargamos el código TypeScript
 * del hilo.
 */
'use strict';

require('tsx/cjs');
require('./analyzer.worker.ts');
