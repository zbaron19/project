// Compare astro.js against pyephem reference values.
const fs = require('fs');
const A = require('../src/astro.js');

const ref = JSON.parse(fs.readFileSync(__dirname + '/reference.json', 'utf8'));
const LAT = 47.6062, LON = -122.3321;

function parseEphemDate(s) { // "2026/7/7 06:00:00" as UTC
  const [d, t] = s.split(' ');
  const [Y, M, D] = d.split('/').map(Number);
  const [h, m, sec] = t.split(':').map(Number);
  return new Date(Date.UTC(Y, M - 1, D, h, m, Math.round(sec || 0)));
}

let worst = { sep: 0, what: '' }, failures = 0;
const sepDeg = (ra1, dec1, ra2, dec2) => {
  const c = Math.sin(dec1 * A.D2R) * Math.sin(dec2 * A.D2R) +
    Math.cos(dec1 * A.D2R) * Math.cos(dec2 * A.D2R) * Math.cos((ra1 - ra2) * A.D2R);
  return Math.acos(Math.max(-1, Math.min(1, c))) * A.R2D;
};

console.log('=== geocentric positions (angular separation vs pyephem) ===');
for (const row of ref.positions) {
  const JD = A.jd(parseEphemDate(row.date));
  for (const [name, r] of Object.entries(row.bodies)) {
    let p, magStr = '';
    if (name === 'sun') p = A.sunPosition(JD);
    else if (name === 'moon') {
      p = A.moonPosition(JD);
      magStr = `  illum mine=${p.illum.toFixed(3)} ref=${r.illum.toFixed(3)}`;
    } else {
      p = A.planetPosition(name, JD);
      magStr = `  mag mine=${p.mag.toFixed(2)} ref=${r.mag.toFixed(2)}`;
    }
    const sep = sepDeg(p.ra, p.dec, r.ra, r.dec);
    const arcmin = sep * 60;
    const limit = name === 'moon' ? 8 : (name === 'sun' ? 1 : 6); // arcmin
    const ok = arcmin < limit;
    if (!ok) failures++;
    if (sep > worst.sep) worst = { sep, what: `${name} @ ${row.date}` };
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${row.date}  ${name.padEnd(8)} sep=${arcmin.toFixed(2)}'${magStr}`);
  }
}

console.log('\n=== rise/set at Seattle (minutes vs pyephem) ===');
for (const row of ref.riseset) {
  const t0 = parseEphemDate(row.date).getTime();
  const t1 = t0 + 48 * 3600 * 1000;
  for (const [name, ev] of Object.entries(row.events)) {
    if (!ev) continue;
    let posFn, h0;
    if (name === 'sun') { posFn = A.sunPosition; h0 = A.SUN_H0; }
    else if (name === 'moon') { posFn = A.moonPosition; h0 = A.moonH0(A.jd(new Date(t0))); }
    else { posFn = (jd) => A.planetPosition(name, jd); h0 = -0.5667; }
    const events = A.findCrossings(posFn, h0, t0, t1, LAT, LON);
    for (const kind of ['rise', 'set']) {
      const refT = parseEphemDate(ev[kind]).getTime();
      const mine = events.filter(e => e.rising === (kind === 'rise'))
        .reduce((best, e) => Math.abs(e.time - refT) < Math.abs(best - refT) ? e.time.getTime() : best, Infinity);
      const dMin = (mine - refT) / 60000;
      const ok = Math.abs(dMin) < 3;
      if (!ok) failures++;
      console.log(`${ok ? 'ok  ' : 'FAIL'} ${row.date}  ${name.padEnd(8)} ${kind.padEnd(4)} diff=${dMin.toFixed(1)} min`);
    }
  }
}

console.log(`\nworst separation: ${(worst.sep * 60).toFixed(2)}' (${worst.what})`);
console.log(failures ? `${failures} FAILURES` : 'ALL CHECKS PASSED');
process.exit(failures ? 1 : 0);
