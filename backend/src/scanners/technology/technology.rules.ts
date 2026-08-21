/**
 * ============================================================================
 * REGLAS DEL ANALIZADOR DE TECNOLOGÍAS
 * ----------------------------------------------------------------------------
 * Firmas de detección de tecnologías (RF-011) a partir de tres fuentes:
 *
 *   1. Cabeceras HTTP (Server, X-Powered-By)      → confianza HIGH.
 *   2. Nombres de cookies (PHPSESSID, JSESSIONID) → confianza MEDIUM.
 *   3. Patrones en el HTML (generator, bundles)   → confianza variable.
 *
 * También define la regla que relaciona tecnologías con versiones
 * declaradas contra el dataset curado de CVEs (RF-013, HU-007).
 * ============================================================================
 */

import { FindingDraft } from '../../modules/findings/findings.types';
import { standardsService } from '../../standards/standards.service';
import { createFinding } from '../core/scanner.utils';
import { DetectedTechnology } from './technology.types';

/** Firma de detección basada en cabeceras HTTP. */
interface HeaderSignature {
  header: string;
  pattern: RegExp;
  name: string;
  category: string;
  /** Grupo de captura del regex que contiene la versión (si aplica). */
  versionGroup?: number;
}

/** Firma de detección basada en nombres de cookies. */
interface CookieSignature {
  pattern: RegExp;
  name: string;
  category: string;
}

/** Firma de detección basada en patrones del HTML. */
interface HtmlSignature {
  pattern: RegExp;
  name: string;
  category: string;
  versionGroup?: number;
  confidence: DetectedTechnology['confidence'];
}

/**
 * Firmas por cabecera HTTP.
 */
const HEADER_SIGNATURES: HeaderSignature[] = [
  { header: 'server', pattern: /nginx\/?([\d.]+)?/i, name: 'Nginx', category: 'Servidor web', versionGroup: 1 },
  { header: 'server', pattern: /apache\/?([\d.]+)?/i, name: 'Apache httpd', category: 'Servidor web', versionGroup: 1 },
  { header: 'server', pattern: /microsoft-iis\/?([\d.]+)?/i, name: 'Microsoft IIS', category: 'Servidor web', versionGroup: 1 },
  { header: 'server', pattern: /litespeed/i, name: 'LiteSpeed', category: 'Servidor web' },
  { header: 'server', pattern: /cloudflare/i, name: 'Cloudflare', category: 'Infraestructura' },
  { header: 'x-powered-by', pattern: /php\/?([\d.]+)?/i, name: 'PHP', category: 'Lenguaje', versionGroup: 1 },
  { header: 'x-powered-by', pattern: /asp\.net/i, name: 'ASP.NET', category: 'Framework' },
  { header: 'x-powered-by', pattern: /express/i, name: 'Express', category: 'Framework' },
  { header: 'x-powered-by', pattern: /next\.js\s?([\d.]+)?/i, name: 'Next.js', category: 'Framework', versionGroup: 1 }
];

/**
 * Firmas por nombre de cookie.
 */
const COOKIE_SIGNATURES: CookieSignature[] = [
  { pattern: /^phpsessid$/i, name: 'PHP', category: 'Lenguaje' },
  { pattern: /^jsessionid$/i, name: 'Java (Servlet)', category: 'Plataforma' },
  { pattern: /^asp\.net_sessionid$/i, name: 'ASP.NET', category: 'Framework' },
  { pattern: /^csrftoken$/i, name: 'Django', category: 'Framework' },
  { pattern: /^laravel_session$/i, name: 'Laravel', category: 'Framework' },
  { pattern: /^wp-/i, name: 'WordPress', category: 'CMS' },
  { pattern: /^__cf/i, name: 'Cloudflare', category: 'Infraestructura' }
];

/**
 * Firmas por patrones presentes en el HTML.
 */
const HTML_SIGNATURES: HtmlSignature[] = [
  {
    pattern: /<meta[^>]+name=["']generator["'][^>]+content=["']wordpress\s([\d.]+)/i,
    name: 'WordPress',
    category: 'CMS',
    versionGroup: 1,
    confidence: 'HIGH'
  },
  { pattern: /wp-content|wp-includes/i, name: 'WordPress', category: 'CMS', confidence: 'HIGH' },
  {
    pattern: /<meta[^>]+name=["']generator["'][^>]+content=["']joomla!?\s?([\d.]+)?/i,
    name: 'Joomla',
    category: 'CMS',
    versionGroup: 1,
    confidence: 'HIGH'
  },
  {
    pattern: /<meta[^>]+name=["']generator["'][^>]+content=["']drupal\s?([\d.]+)?/i,
    name: 'Drupal',
    category: 'CMS',
    versionGroup: 1,
    confidence: 'HIGH'
  },
  {
    // Angular expone su versión en el atributo ng-version del root.
    pattern: /ng-version=["']([\d.]+)["']/i,
    name: 'Angular',
    category: 'Framework',
    versionGroup: 1,
    confidence: 'HIGH'
  },
  {
    // Build de producción de Angular CLI: el trío runtime/polyfills/main con
    // hash aparece incluso cuando ng-version se elimina en producción.
    pattern: /(?:src|href)=["'][^"']*polyfills\.[a-f0-9]{8,}\.js["']/i,
    name: 'Angular',
    category: 'Framework',
    confidence: 'HIGH'
  },
  { pattern: /ngsw-worker\.js|ngsw-config/i, name: 'Angular', category: 'Framework', confidence: 'MEDIUM' },
  { pattern: /__NEXT_DATA__/i, name: 'Next.js', category: 'Framework', confidence: 'HIGH' },
  { pattern: /__NUXT__/i, name: 'Nuxt.js', category: 'Framework', confidence: 'HIGH' },
  { pattern: /data-reactroot|react-dom/i, name: 'React', category: 'Framework', confidence: 'MEDIUM' },
  { pattern: /data-v-app|vue(?:\.runtime)?(?:\.min)?\.js/i, name: 'Vue.js', category: 'Framework', confidence: 'MEDIUM' },
  {
    pattern: /jquery[-.]?([\d.]+)(?:\.min)?\.js/i,
    name: 'jQuery',
    category: 'Librería',
    versionGroup: 1,
    confidence: 'HIGH'
  },
  { pattern: /bootstrap(?:\.min)?\.(?:css|js)/i, name: 'Bootstrap', category: 'Librería', confidence: 'MEDIUM' },
  {
    // Biblioteca de iconos de Iconscout (enlace CSS o clases unicons).
    pattern: /unicons\.iconscout\.com|class=["'][^"']*unicons/i,
    name: 'Unicons',
    category: 'Librería',
    confidence: 'HIGH'
  },
  {
    // Font Awesome por CDN o clases fa-.
    pattern: /font-?awesome|class=["'][^"']*\bfa[bsrl]? fa-/i,
    name: 'Font Awesome',
    category: 'Librería',
    confidence: 'MEDIUM'
  },
  { pattern: /cdn\.tailwindcss\.com|tailwind\.config/i, name: 'Tailwind CSS', category: 'Librería', confidence: 'HIGH' },
  { pattern: /swiper(?:-bundle)?(?:\.min)?\.(?:css|js)/i, name: 'Swiper', category: 'Librería', confidence: 'MEDIUM' },
  { pattern: /astro-island|data-astro-cid/i, name: 'Astro', category: 'Framework', confidence: 'HIGH' },
  { pattern: /class=["'][^"']*svelte-[a-z0-9]{4,}/i, name: 'Svelte', category: 'Framework', confidence: 'MEDIUM' },
  { pattern: /fonts\.googleapis\.com/i, name: 'Google Fonts', category: 'Servicio externo', confidence: 'HIGH' },
  { pattern: /cdn\.shopify\.com|shopify\.theme/i, name: 'Shopify', category: 'Plataforma', confidence: 'HIGH' },
  { pattern: /static\.parastorage\.com|wixstatic/i, name: 'Wix', category: 'Plataforma', confidence: 'HIGH' },
  { pattern: /squarespace/i, name: 'Squarespace', category: 'Plataforma', confidence: 'MEDIUM' },
  { pattern: /googletagmanager\.com|gtag\/js/i, name: 'Google Tag Manager', category: 'Analítica', confidence: 'HIGH' },
  { pattern: /google-analytics\.com\/analytics\.js|gtag\(/i, name: 'Google Analytics', category: 'Analítica', confidence: 'MEDIUM' }
];

/**
 * Firmas de despliegue: identifican la plataforma de hosting o el CDN que
 * sirve el sitio a partir de cabeceras características que cada proveedor
 * añade a sus respuestas. Se comprueban sobre TODAS las cabeceras.
 */
const DEPLOY_SIGNATURES: Array<{ header: string; pattern: RegExp; name: string }> = [
  { header: 'cf-ray', pattern: /.+/, name: 'Cloudflare' },
  { header: 'cf-cache-status', pattern: /.+/, name: 'Cloudflare' },
  { header: 'x-vercel-id', pattern: /.+/, name: 'Vercel' },
  { header: 'x-vercel-cache', pattern: /.+/, name: 'Vercel' },
  { header: 'x-nf-request-id', pattern: /.+/, name: 'Netlify' },
  { header: 'x-amz-cf-id', pattern: /.+/, name: 'Amazon CloudFront' },
  { header: 'x-amz-request-id', pattern: /.+/, name: 'Amazon S3' },
  { header: 'x-github-request-id', pattern: /.+/, name: 'GitHub Pages' },
  { header: 'x-served-by', pattern: /cache-/i, name: 'Fastly' },
  { header: 'x-fastly-request-id', pattern: /.+/, name: 'Fastly' },
  { header: 'fly-request-id', pattern: /.+/, name: 'Fly.io' },
  { header: 'x-render-origin-server', pattern: /.+/, name: 'Render' },
  { header: 'x-azure-ref', pattern: /.+/, name: 'Microsoft Azure' },
  { header: 'x-gws', pattern: /.+/, name: 'Google Cloud' },
  { header: 'x-shopify-stage', pattern: /.+/, name: 'Shopify' }
];

/**
 * Regla: vulnerabilidades conocidas asociadas a una tecnología con versión
 * declarada. La confianza es MEDIUM porque la versión puede no reflejar la
 * realidad del despliegue (proxy, caché, ofuscación).
 * Exportada para reutilización desde el analizador de tecnologías.
 *
 * @param technology Tecnología detectada con versión.
 */
export function ruleKnownVulnerabilities(technology: DetectedTechnology): FindingDraft[] {
  const vulns = standardsService.findKnownVulnerabilities(technology.name, technology.version);
  return vulns.map((vuln) =>
    createFinding({
      key: `TECH-CVE-${vuln.cve}`,
      title: `Posible vulnerabilidad conocida en ${technology.name} ${technology.version} (${vuln.cve})`,
      severity: vuln.severity,
      confidence: 'MEDIUM',
      description:
        `${vuln.description} La versión fue declarada públicamente por el objetivo y debe validarse manualmente.`,
      evidence: `${technology.name} detectado con versión ${technology.version} (fuente: ${technology.source}).`,
      impact:
        'Esta versión podría ser explotable dependiendo de la configuración y del uso que haga la aplicación del componente.',
      recommendation: `Actualizar ${technology.name} a una versión corregida. Consultar ${vuln.reference}.`,
      references: {
        owasp: [standardsService.owasp.A06_2021],
        cwe: [standardsService.cwe.CWE_1104],
        cve: [vuln.cve],
        iso: standardsService.iso.VULN_MGMT
      }
    })
  );
}

/**
 * Detecta las tecnologías del objetivo combinando las tres fuentes de
 * firmas. Las coincidencias se deduplican por nombre conservando la
 * primera versión encontrada y acumulando las fuentes.
 *
 * @param input Cabeceras, cookies y HTML del objetivo.
 */
export function detectTechnologies(input: {
  headers: Record<string, string>;
  setCookieNames: string[];
  body: string;
}): DetectedTechnology[] {
  const found = new Map<string, DetectedTechnology>();

  /**
   * Agrega o enriquece una tecnología detectada.
   */
  const add = (
    name: string,
    category: string,
    confidence: DetectedTechnology['confidence'],
    source: string,
    version?: string
  ) => {
    const existing = found.get(name);
    if (!existing) {
      found.set(name, { name, category, confidence, source, ...(version ? { version } : {}) });
      return;
    }
    // Completa la versión si otra fuente la aportó primero sin versión.
    if (version && !existing.version) {
      existing.version = version;
    }
    if (!existing.source.includes(source)) {
      existing.source = `${existing.source}, ${source}`;
    }
  };

  // Fuente 1: cabeceras HTTP.
  for (const sig of HEADER_SIGNATURES) {
    const value = input.headers[sig.header];
    if (!value) continue;
    const match = value.match(sig.pattern);
    if (match) {
      const version = sig.versionGroup !== undefined ? match[sig.versionGroup] : undefined;
      add(sig.name, sig.category, 'HIGH', `header ${sig.header}`, version || undefined);
    }
  }

  // Fuente 1b: cabeceras de despliegue (hosting/CDN). Cada proveedor añade
  // sus propias cabeceras distintivas, lo que permite saber dónde está
  // servido el sitio sin necesidad de consultas externas.
  for (const [header, value] of Object.entries(input.headers)) {
    const sig = DEPLOY_SIGNATURES.find((d) => d.header === header && d.pattern.test(value));
    if (sig) {
      add(sig.name, 'Despliegue', 'HIGH', `header ${header}`);
    }
  }

  // Fuente 2: nombres de cookies.
  for (const cookieName of input.setCookieNames) {
    for (const sig of COOKIE_SIGNATURES) {
      if (sig.pattern.test(cookieName)) {
        add(sig.name, sig.category, 'MEDIUM', `cookie ${cookieName}`);
      }
    }
  }

  // Fuente 3: patrones en el HTML.
  for (const sig of HTML_SIGNATURES) {
    const match = input.body.match(sig.pattern);
    if (match) {
      const version = sig.versionGroup !== undefined ? match[sig.versionGroup] : undefined;
      add(sig.name, sig.category, sig.confidence, 'html', version || undefined);
    }
  }

  return Array.from(found.values());
}
