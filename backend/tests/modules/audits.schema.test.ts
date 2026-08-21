/**
 * ============================================================================
 * TESTS DEL ESQUEMA DE VALIDACIÓN DE AUDITORÍAS
 * ----------------------------------------------------------------------------
 * Verifica la validación y sanitización de la creación de auditorías
 * (RF-001 a RF-003, RNF-005).
 * ============================================================================
 */

import { createAuditSchema } from '../../src/modules/audits/audits.schema';

describe('modules/audits · createAuditSchema', () => {
  it('acepta una URL HTTPS con autorización confirmada', () => {
    const result = createAuditSchema.safeParse({
      url: 'https://example.com',
      authorized: true
    });
    expect(result.success).toBe(true);
  });

  it('rechaza texto que no es una URL', () => {
    const result = createAuditSchema.safeParse({ url: 'no-es-url', authorized: true });
    expect(result.success).toBe(false);
  });

  it('rechaza URLs sin esquema http/https', () => {
    const result = createAuditSchema.safeParse({
      url: 'ftp://example.com/recurso',
      authorized: true
    });
    expect(result.success).toBe(false);
  });

  it('rechaza cuando no se confirma la autorización', () => {
    const result = createAuditSchema.safeParse({
      url: 'https://example.com',
      authorized: false
    });
    expect(result.success).toBe(false);
  });

  it('recorta espacios en blanco alrededor de la URL', () => {
    const result = createAuditSchema.safeParse({
      url: '  https://example.com/ruta  ',
      authorized: true
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.url).toBe('https://example.com/ruta');
    }
  });
});
