/**
 * ============================================================================
 * TESTS DEL ANALIZADOR DE TECNOLOGÍAS
 * ----------------------------------------------------------------------------
 * Verifica la detección por cabeceras, cookies y HTML, la deduplicación y
 * la regla de vulnerabilidades conocidas (RF-011, RF-013).
 * ============================================================================
 */

import {
  detectTechnologies,
} from '../../src/scanners/technology/technology.rules';
import { findKnownVulnerabilities } from '../../src/standards/cve/cve.dataset';

describe('scanners/technology · detectTechnologies', () => {
  it('detecta Nginx con versión desde la cabecera Server', () => {
    const techs = detectTechnologies({
      headers: { server: 'nginx/1.24.0' },
      setCookieNames: [],
      body: ''
    });

    expect(techs).toHaveLength(1);
    expect(techs[0]).toMatchObject({
      name: 'Nginx',
      category: 'Servidor web',
      confidence: 'HIGH',
      version: '1.24.0'
    });
  });

  it('detecta PHP por cookie PHPSESSID con confianza MEDIUM', () => {
    const techs = detectTechnologies({
      headers: {},
      setCookieNames: ['PHPSESSID'],
      body: ''
    });

    expect(techs[0]).toMatchObject({ name: 'PHP', confidence: 'MEDIUM' });
    expect(techs[0].source).toContain('cookie PHPSESSID');
  });

  it('detecta WordPress y jQuery desde el HTML', () => {
    const techs = detectTechnologies({
      headers: {},
      setCookieNames: [],
      body:
        '<meta name="generator" content="WordPress 6.4.2">' +
        '<script src="/js/jquery-3.4.1.min.js"></script>'
    });

    const names = techs.map((t) => t.name);
    expect(names).toContain('WordPress');
    expect(names).toContain('jQuery');

    const wp = techs.find((t) => t.name === 'WordPress');
    expect(wp?.version).toBe('6.4.2');
  });

  it('deduplica tecnologías detectadas por varias fuentes', () => {
    const techs = detectTechnologies({
      headers: { server: 'cloudflare' },
      setCookieNames: ['__cfduid'],
      body: ''
    });

    const cloudflare = techs.filter((t) => t.name === 'Cloudflare');
    expect(cloudflare).toHaveLength(1);
    // La fuente de la cookie se acumula en el mismo registro.
    expect(cloudflare[0].source).toContain('__cfduid');
  });
});

describe('standards/cve · findKnownVulnerabilities', () => {
  it('coincide con Apache 2.4.49 (CVE-2021-41773 y CVE-2021-42013)', () => {
    const vulns = findKnownVulnerabilities('Apache httpd', '2.4.49');
    const ids = vulns.map((v) => v.cve);
    expect(ids).toContain('CVE-2021-41773');
    expect(ids).toContain('CVE-2021-42013');
  });

  it('no coincide con Apache 2.4.57 (versión corregida)', () => {
    const vulns = findKnownVulnerabilities('Apache httpd', '2.4.57');
    expect(vulns).toHaveLength(0);
  });

  it('marca jQuery 3.3.1 como afectado por ambos CVEs de jQuery', () => {
    const ids = findKnownVulnerabilities('jQuery', '3.3.1').map((v) => v.cve);
    expect(ids).toContain('CVE-2019-11358');
    expect(ids).toContain('CVE-2020-11023');
  });

  it('jQuery 3.4.0 ya está corregido para CVE-2019-11358 pero no para CVE-2020-11023', () => {
    const ids = findKnownVulnerabilities('jQuery', '3.4.0').map((v) => v.cve);
    expect(ids).toContain('CVE-2020-11023');
    expect(ids).not.toContain('CVE-2019-11358');
  });

  it('devuelve vacío cuando no hay versión declarada', () => {
    expect(findKnownVulnerabilities('jQuery')).toHaveLength(0);
  });
});
