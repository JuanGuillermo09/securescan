/**
 * ============================================================================
 * COPIA DEL BUILD DE PRODUCCIÓN AL BACKEND
 * ----------------------------------------------------------------------------
 * Tras `ng build`, copia dist/frontend/browser a ../backend/dist/frontend/
 * para que el Express lo sirva en un solo puerto/paquete (despliegue único
 * en Render), replicando el patrón dist/<app> del proyecto de referencia.
 *
 * Uso: npm run build:deploy   (desde la carpeta frontend)
 * ============================================================================
 */

import { cpSync, existsSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const src = resolve(process.cwd(), 'dist/frontend/browser');
const dest = resolve(process.cwd(), '../backend/dist/frontend/browser');

if (!existsSync(src)) {
  console.error(`[copy-dist] No se encontró el build: ${src}`);
  console.error('[copy-dist] Ejecuta antes: npx @angular/cli@20 build');
  process.exit(1);
}

// Limpia la copia anterior para no arrastrar archivos obsoletos (hashes viejos).
rmSync(dest, { recursive: true, force: true });
cpSync(src, dest, { recursive: true });

console.log(`[copy-dist] Frontend copiado a ${dest}`);
