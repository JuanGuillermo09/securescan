const zlib = require('zlib');
async function main() {
  const auditsRes = await fetch('http://localhost:3000/api/audits');
  const audits = await auditsRes.json();
  const res = await fetch(`http://localhost:3000/api/reports/${audits[0].id}/report.pdf`);
  const buf = Buffer.from(await res.arrayBuffer());
  const raw = buf.toString('latin1');
  let content = '';
  const re = /stream\r?\n/g; let m;
  while ((m = re.exec(raw)) !== null) {
    const start = m.index + m[0].length;
    const end = raw.indexOf('endstream', start);
    if (end < 0) break;
    try { content += zlib.inflateSync(buf.subarray(start, end)).toString('latin1') + '\n'; } catch {}
  }
  // Decodifica las cadenas hexadecimales de los operadores TJ/Tj.
  const text = Array.from(content.matchAll(/<([0-9A-Fa-f]+)>/g))
    .map((h) => Buffer.from(h[1], 'hex').toString('latin1'))
    .join(' ');
  const terms = [
    'Risk Score', 'Impacto:', 'Probabilidad:', 'Exposición:',
    'Confianza:', 'DISTRIBUCIÓN', 'CÁLCULO DEL SCORE',
    'Score inicial', 'Security Score', 'Referencia ISO/IEC',
    'estimación relativa', '48 / 125', '32 / 125', '24 / 125', '16 / 125'
  ];
  let missing = 0;
  for (const t of terms) {
    const ok = text.includes(t);
    if (!ok) missing++;
    console.log(`${ok ? 'OK    ' : 'FALTA '} ${t}`);
  }
  process.exit(missing > 0 ? 1 : 0);
}
main().catch(e => { console.error(e); process.exit(1); });
