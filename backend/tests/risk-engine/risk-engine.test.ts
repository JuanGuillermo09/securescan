/**
 * ============================================================================
 * TESTS DEL MOTOR DE RIESGOS
 * ----------------------------------------------------------------------------
 * Verifica conteos por severidad, cálculo del score, nota cualitativa y el
 * ordenamiento por riesgo (RF-015 a RF-018).
 * ============================================================================
 */

import { calculateRisk, sortByRisk } from '../../src/risk-engine/risk.engine';
import { calculateFindingRisk } from '../../src/risk-engine/finding-risk.calculator';
import { FindingDraft } from '../../src/modules/findings/findings.types';

/**
 * Fábrica de hallazgos de prueba con valores mínimos válidos.
 */
function draft(severity: FindingDraft['severity'], confidence: FindingDraft['confidence'] = 'HIGH'): FindingDraft {
  return {
    key: `TEST-${severity}-${confidence}`,
    title: 'Hallazgo de prueba',
    category: 'test',
    severity,
    confidence,
    description: 'Descripción',
    evidence: 'Evidencia',
    impact: 'Impacto',
    recommendation: 'Recomendación',
    references: {}
  };
}

describe('risk-engine · calculateRisk', () => {
  it('devuelve score 100 y nota A cuando no hay hallazgos', () => {
    const result = calculateRisk([]);
    expect(result.score).toBe(100);
    expect(result.grade).toBe('A');
    expect(result.counts.CRITICAL).toBe(0);
  });

  it('descuenta 8 por cada hallazgo MEDIUM', () => {
    const result = calculateRisk([draft('MEDIUM'), draft('MEDIUM')]);
    expect(result.score).toBe(84);
    expect(result.grade).toBe('B');
    expect(result.counts.MEDIUM).toBe(2);
  });

  it('aplica los descuentos combinados de todas las severidades', () => {
    // 30 + 18 + 8 + 3 + 0 = 59 → score 41.
    const result = calculateRisk([
      draft('CRITICAL'),
      draft('HIGH'),
      draft('MEDIUM'),
      draft('LOW'),
      draft('INFORMATIONAL')
    ]);
    expect(result.score).toBe(41);
    expect(result.grade).toBe('D');
    expect(result.counts).toEqual({
      CRITICAL: 1,
      HIGH: 1,
      MEDIUM: 1,
      LOW: 1,
      INFORMATIONAL: 1
    });
  });

  it('nunca baja de 0 aunque la suma de descuentos supere 100', () => {
    const findings = Array.from({ length: 5 }, () => draft('CRITICAL'));
    const result = calculateRisk(findings);
    expect(result.score).toBe(0);
    expect(result.grade).toBe('F');
  });
});

describe('risk-engine · sortByRisk', () => {
  it('ordena de mayor a menor severidad y, a igualdad, por confianza', () => {
    const ordered = sortByRisk([
      draft('LOW', 'HIGH'),
      draft('HIGH', 'MEDIUM'),
      draft('MEDIUM', 'LOW'),
      draft('MEDIUM', 'HIGH')
    ]);

    expect(ordered.map((f) => f.severity)).toEqual(['HIGH', 'MEDIUM', 'MEDIUM', 'LOW']);
    // Dentro de MEDIUM, la confianza HIGH precede a LOW.
    expect(ordered[1].confidence).toBe('HIGH');
    expect(ordered[2].confidence).toBe('LOW');
  });

  it('no muta el array original', () => {
    const original = [draft('LOW'), draft('CRITICAL')];
    sortByRisk(original);
    expect(original[0].severity).toBe('LOW');
  });
});

describe('risk-engine · calculateFindingRisk', () => {
  it('calcula el CSP ausente (MEDIUM/HIGH/cabeceras) como 3·4·4 = 48', () => {
    const risk = calculateFindingRisk({
      ...draft('MEDIUM', 'HIGH'),
      category: 'Cabeceras de seguridad'
    });
    expect(risk.impactLevel).toBe(3);
    expect(risk.probabilityLevel).toBe(4);
    expect(risk.exposureLevel).toBe(4);
    expect(risk.riskScore).toBe(48);
  });

  it('otorga la exposición máxima a hallazgos TLS', () => {
    const risk = calculateFindingRisk({
      ...draft('HIGH', 'HIGH'),
      category: 'TLS / Cifrado'
    });
    expect(risk.exposureLevel).toBe(5);
    expect(risk.riskScore).toBe(4 * 4 * 5);
  });

  it('usa niveles intermedios para categorías no catalogadas', () => {
    const risk = calculateFindingRisk({ ...draft('LOW', 'LOW'), category: 'Otra' });
    expect(risk.exposureLevel).toBe(3);
    expect(risk.probabilityLevel).toBe(2);
    expect(risk.riskScore).toBe(2 * 2 * 3);
  });

  it('nunca excede 125 ni baja de 1', () => {
    const max = calculateFindingRisk({ ...draft('CRITICAL', 'HIGH'), category: 'TLS / Cifrado' });
    const min = calculateFindingRisk({ ...draft('INFORMATIONAL', 'LOW'), category: 'Tecnologías' });
    expect(max.riskScore).toBeLessThanOrEqual(125);
    expect(min.riskScore).toBeGreaterThanOrEqual(1);
  });
});
