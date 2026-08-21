/**
 * ============================================================================
 * TESTS DEL ANALIZADOR DE SECURITY HEADERS
 * ----------------------------------------------------------------------------
 * Verifica las reglas de cabeceras sobre entradas sintéticas (RF-008).
 * ============================================================================
 */

import { evaluateHeaderRules } from '../../src/scanners/headers/headers.rules';
import { HeadersAnalysisInput } from '../../src/scanners/headers/headers.types';

/** Entrada base HTTPS sin cabeceras de seguridad. */
function input(headers: Record<string, string>, isHttpsTarget = true): HeadersAnalysisInput {
  return { headers, isHttpsTarget };
}

describe('scanners/headers · evaluateHeaderRules', () => {
  it('reporta CSP y HSTS ausentes en un objetivo HTTPS vacío', () => {
    const keys = evaluateHeaderRules(input({})).map((f) => f.key);

    expect(keys).toContain('HDR-CSP-MISSING');
    expect(keys).toContain('HDR-HSTS-MISSING');
    expect(keys).toContain('HDR-NOSNIFF-MISSING');
    expect(keys).toContain('HDR-FRAME-MISSING');
    expect(keys).toContain('HDR-REFERRER-MISSING');
    expect(keys).toContain('HDR-PERMISSIONS-MISSING');
  });

  it('no exige HSTS en objetivos HTTP', () => {
    const keys = evaluateHeaderRules(input({}, false)).map((f) => f.key);
    expect(keys).not.toContain('HDR-HSTS-MISSING');
  });

  it('detecta CSP con unsafe-inline como configuración débil', () => {
    const findings = evaluateHeaderRules(
      input({ 'content-security-policy': "default-src 'unsafe-inline'" })
    );
    expect(findings.map((f) => f.key)).toContain('HDR-CSP-WEAK');
  });

  it('acepta una CSP correcta con frame-ancestors como protección clickjacking', () => {
    const findings = evaluateHeaderRules(
      input({
        'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
        'strict-transport-security': 'max-age=31536000; includeSubDomains'
      })
    );
    expect(findings.map((f) => f.key)).not.toContain('HDR-FRAME-MISSING');
    expect(findings.map((f) => f.key)).not.toContain('HDR-HSTS-WEAK');
  });

  it('X-Frame-Options presente también satisface la regla anti-clickjacking', () => {
    const findings = evaluateHeaderRules(
      input({
        'content-security-policy': "default-src 'self'",
        'x-frame-options': 'SAMEORIGIN'
      })
    );
    expect(findings.map((f) => f.key)).not.toContain('HDR-FRAME-MISSING');
  });

  it('marca HSTS con max-age insuficiente', () => {
    const findings = evaluateHeaderRules(
      input({ 'strict-transport-security': 'max-age=3600' })
    );
    const hstsWeak = findings.find((f) => f.key === 'HDR-HSTS-WEAK');
    expect(hstsWeak).toBeDefined();
    expect(hstsWeak?.severity).toBe('LOW');
  });

  it('rechaza valores incorrectos de X-Content-Type-Options', () => {
    const findings = evaluateHeaderRules(input({ 'x-content-type-options': 'sniff' }));
    expect(findings.map((f) => f.key)).toContain('HDR-NOSNIFF-WEAK');
  });

  it('marca Referrer-Policy unsafe-url como MEDIUM', () => {
    const findings = evaluateHeaderRules(input({ 'referrer-policy': 'unsafe-url' }));
    const referrer = findings.find((f) => f.key === 'HDR-REFERRER-UNSAFE');
    expect(referrer).toBeDefined();
    expect(referrer?.severity).toBe('MEDIUM');
  });

  it('un objetivo bien configurado no genera hallazgos', () => {
    const findings = evaluateHeaderRules(
      input({
        'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
        'strict-transport-security': 'max-age=31536000; includeSubDomains; preload',
        'x-content-type-options': 'nosniff',
        'x-frame-options': 'DENY',
        'referrer-policy': 'strict-origin-when-cross-origin',
        'permissions-policy': 'camera=()'
      })
    );
    expect(findings).toHaveLength(0);
  });
});
