// Skylight astronomy engine — positional astronomy for the naked-eye sky.
// Algorithms: Jean Meeus, "Astronomical Algorithms" (2nd ed.) and the JPL
// approximate planetary elements (Standish, valid 1800–2050). Accuracy goal:
// a few arcminutes — far better than the eye can point.
// Runs in the browser and in Node (for the validation harness).

const D2R = Math.PI / 180, R2D = 180 / Math.PI;
const sin = (d) => Math.sin(d * D2R), cos = (d) => Math.cos(d * D2R), tan = (d) => Math.tan(d * D2R);
const norm360 = (d) => ((d % 360) + 360) % 360;

// ---- time ----
function jd(date) { return date.getTime() / 86400000 + 2440587.5; }
function centuries(JD) { return (JD - 2451545.0) / 36525; }

// Greenwich mean sidereal time, degrees (Meeus 12.4)
function gmst(JD) {
  const T = centuries(JD);
  return norm360(280.46061837 + 360.98564736629 * (JD - 2451545.0) + 0.000387933 * T * T - T * T * T / 38710000);
}

// Mean obliquity of the ecliptic, degrees (Meeus 22.2, truncated)
function obliquity(T) {
  return 23.43929111 - (46.8150 * T + 0.00059 * T * T - 0.001813 * T * T * T) / 3600;
}

// ---- coordinate transforms ----
function eclToEq(lambda, beta, eps) {
  const ra = Math.atan2(sin(lambda) * cos(eps) - tan(beta) * sin(eps), cos(lambda)) * R2D;
  const dec = Math.asin(sin(beta) * cos(eps) + cos(beta) * sin(eps) * sin(lambda)) * R2D;
  return { ra: norm360(ra), dec };
}

// Precession J2000 -> equinox of date (Meeus 21.2/21.3), input/output degrees
function precessFromJ2000(ra, dec, T) {
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T * T * T) / 3600;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T * T * T) / 3600;
  const theta = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T * T * T) / 3600;
  const A = cos(dec) * sin(ra + zeta);
  const B = cos(theta) * cos(dec) * cos(ra + zeta) - sin(theta) * sin(dec);
  const C = sin(theta) * cos(dec) * cos(ra + zeta) + cos(theta) * sin(dec);
  return { ra: norm360(Math.atan2(A, B) * R2D + z), dec: Math.asin(Math.max(-1, Math.min(1, C))) * R2D };
}

// Equatorial (of date) -> horizontal. lat/lon degrees, east-positive lon.
function altAz(ra, dec, JD, lat, lon) {
  const H = norm360(gmst(JD) + lon - ra); // hour angle, degrees
  const alt = Math.asin(sin(lat) * sin(dec) + cos(lat) * cos(dec) * cos(H)) * R2D;
  const az = norm360(Math.atan2(sin(H), cos(H) * sin(lat) - tan(dec) * cos(lat)) * R2D + 180);
  return { alt, az }; // az from north, through east
}

// Atmospheric refraction for apparent altitude (Sæmundsson), degrees
function refraction(altTrue) {
  if (altTrue < -2) return 0;
  return (1.02 / Math.tan((altTrue + 10.3 / (altTrue + 5.11)) * D2R)) / 60;
}

// ---- Sun (Meeus ch. 25, low-precision: ~0.01°) ----
function sunPosition(JD) {
  const T = centuries(JD);
  const L0 = norm360(280.46646 + 36000.76983 * T + 0.0003032 * T * T);
  const M = norm360(357.52911 + 35999.05029 * T - 0.0001537 * T * T);
  const e = 0.016708634 - 0.000042037 * T - 0.0000001267 * T * T;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * sin(M)
    + (0.019993 - 0.000101 * T) * sin(2 * M) + 0.000289 * sin(3 * M);
  const trueLong = L0 + C;
  const nu = M + C;
  const R = 1.000001018 * (1 - e * e) / (1 + e * cos(nu)); // AU
  const Omega = 125.04 - 1934.136 * T;
  const lambdaApp = trueLong - 0.00569 - 0.00478 * sin(Omega);
  const eps = obliquity(T) + 0.00256 * cos(Omega);
  const eq = eclToEq(lambdaApp, 0, eps);
  return { ra: eq.ra, dec: eq.dec, dist: R, eclLon: norm360(trueLong), eclLonApp: norm360(lambdaApp) };
}

// ---- Moon (Meeus ch. 47, truncated ELP-2000/82: a few arcminutes) ----
// term tables: [D, M, Mp, F, coeff]; longitude/distance in 1e-6 deg / 1e-3 km
const MOON_LR = [
  [0, 0, 1, 0, 6288774, -20905355], [2, 0, -1, 0, 1274027, -3699111], [2, 0, 0, 0, 658314, -2955968],
  [0, 0, 2, 0, 213618, -569925], [0, 1, 0, 0, -185116, 48888], [0, 0, 0, 2, -114332, -3149],
  [2, 0, -2, 0, 58793, 246158], [2, -1, -1, 0, 57066, -152138], [2, 0, 1, 0, 53322, -170733],
  [2, -1, 0, 0, 45758, -204586], [0, 1, -1, 0, -40923, -129620], [1, 0, 0, 0, -34720, 108743],
  [0, 1, 1, 0, -30383, 104755], [2, 0, 0, -2, 15327, 10321], [0, 0, 1, 2, -12528, 0],
  [0, 0, 1, -2, 10980, 79661], [4, 0, -1, 0, 10675, -34782], [0, 0, 3, 0, 10034, -23210],
  [4, 0, -2, 0, 8548, -21636], [2, 1, -1, 0, -7888, 24208], [2, 1, 0, 0, -6766, 30824],
  [1, 0, -1, 0, -5163, -8379], [1, 1, 0, 0, 4987, -16675], [2, -1, 1, 0, 4036, -12831],
  [2, 0, 2, 0, 3994, -10445], [4, 0, 0, 0, 3861, -11650], [2, 0, -3, 0, 3665, 14403],
  [0, 1, -2, 0, -2689, -7003], [2, 0, -1, 2, -2602, 0], [2, -1, -2, 0, 2390, 10056],
  [1, 0, 1, 0, -2348, 6322], [2, -2, 0, 0, 2236, -9884], [0, 1, 2, 0, -2120, 5751],
  [0, 2, 0, 0, -2069, 0], [2, -2, -1, 0, 2048, -4950], [2, 0, 1, -2, -1773, 4130],
  [2, 0, 0, 2, -1595, 0], [4, -1, -1, 0, 1215, -3958], [0, 0, 2, 2, -1110, 0],
  [3, 0, -1, 0, -892, 3258], [2, 1, 1, 0, -810, 2616], [4, -1, -2, 0, 759, -1897],
  [0, 2, -1, 0, -713, -2117], [2, 2, -1, 0, -700, 2354], [2, 1, -2, 0, 691, 0],
  [2, -1, 0, -2, 596, 0], [4, 0, 1, 0, 549, -1423], [0, 0, 4, 0, 537, -1117],
  [4, -1, 0, 0, 520, -1571], [1, 0, -2, 0, -487, -1739], [2, 1, 0, -2, -399, 0],
  [0, 0, 2, -2, -381, -4421], [1, 1, 1, 0, 351, 0], [3, 0, -2, 0, -340, 0],
  [4, 0, -3, 0, 330, 0], [2, -1, 2, 0, 327, 0], [0, 2, 1, 0, -323, 1165],
  [1, 1, -1, 0, 299, 0], [2, 0, 3, 0, 294, 0], [2, 0, -1, -2, 0, 8752],
];
// latitude terms: [D, M, Mp, F, coeff] in 1e-6 deg
const MOON_B = [
  [0, 0, 0, 1, 5128122], [0, 0, 1, 1, 280602], [0, 0, 1, -1, 277693], [2, 0, 0, -1, 173237],
  [2, 0, -1, 1, 55413], [2, 0, -1, -1, 46271], [2, 0, 0, 1, 32573], [0, 0, 2, 1, 17198],
  [2, 0, 1, -1, 9266], [0, 0, 2, -1, 8822], [2, -1, 0, -1, 8216], [2, 0, -2, -1, 4324],
  [2, 0, 1, 1, 4200], [2, 1, 0, -1, -3359], [2, -1, -1, 1, 2463], [2, -1, 0, 1, 2211],
  [2, -1, -1, -1, 2065], [0, 1, -1, -1, -1870], [4, 0, -1, -1, 1828], [0, 1, 0, 1, -1794],
  [0, 0, 0, 3, -1749], [0, 1, -1, 1, -1565], [1, 0, 0, 1, -1491], [0, 1, 1, 1, -1475],
  [0, 1, 1, -1, -1410], [0, 1, 0, -1, -1344], [1, 0, 0, -1, -1335], [0, 0, 3, 1, 1107],
  [4, 0, 0, -1, 1021], [4, 0, -1, 1, 833], [0, 0, 1, -3, 777], [4, 0, -2, 1, 671],
  [2, 0, 0, -3, 607], [2, 0, 2, -1, 596], [2, -1, 1, -1, 491], [2, 0, -2, 1, -451],
  [0, 0, 3, -1, 439], [2, 0, 2, 1, 422], [2, 0, -3, -1, 421], [2, 1, -1, 1, -366],
  [2, 1, 0, 1, -351], [4, 0, 0, 1, 331], [2, -1, 1, 1, 315], [2, -2, 0, -1, 302],
  [0, 0, 1, 3, -283], [2, 1, 1, -1, -229], [1, 1, 0, -1, 223], [1, 1, 0, 1, 223],
  [0, 1, -2, -1, -220], [2, 1, -1, -1, -220], [1, 0, 1, 1, -185], [2, -1, -2, -1, 181],
  [0, 1, 2, 1, -177], [4, 0, -2, -1, 176], [4, -1, -1, -1, 166], [1, 0, 1, -1, -164],
  [4, 0, 1, -1, 132], [1, 0, -1, -1, -119], [4, -1, 0, -1, 115], [2, -2, 0, 1, 107],
];

function moonPosition(JD) {
  const T = centuries(JD);
  const Lp = norm360(218.3164477 + 481267.88123421 * T - 0.0015786 * T * T + T * T * T / 538841 - T * T * T * T / 65194000);
  const D = norm360(297.8501921 + 445267.1114034 * T - 0.0018819 * T * T + T * T * T / 545868 - T * T * T * T / 113065000);
  const M = norm360(357.5291092 + 35999.0502909 * T - 0.0001536 * T * T + T * T * T / 24490000);
  const Mp = norm360(134.9633964 + 477198.8675055 * T + 0.0087414 * T * T + T * T * T / 69699 - T * T * T * T / 14712000);
  const F = norm360(93.2720950 + 483202.0175233 * T - 0.0036539 * T * T - T * T * T / 3526000 + T * T * T * T / 863310000);
  const A1 = norm360(119.75 + 131.849 * T);
  const A2 = norm360(53.09 + 479264.290 * T);
  const A3 = norm360(313.45 + 481266.484 * T);
  const E = 1 - 0.002516 * T - 0.0000074 * T * T;

  let sumL = 0, sumR = 0, sumB = 0;
  for (const [d, m, mp, f, cl, cr] of MOON_LR) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const ef = m === 0 ? 1 : (Math.abs(m) === 1 ? E : E * E);
    sumL += cl * ef * sin(arg);
    sumR += (cr || 0) * ef * cos(arg);
  }
  sumL += 3958 * sin(A1) + 1962 * sin(Lp - F) + 318 * sin(A2);
  for (const [d, m, mp, f, cb] of MOON_B) {
    const arg = d * D + m * M + mp * Mp + f * F;
    const ef = m === 0 ? 1 : (Math.abs(m) === 1 ? E : E * E);
    sumB += cb * ef * sin(arg);
  }
  sumB += -2235 * sin(Lp) + 382 * sin(A3) + 175 * sin(A1 - F) + 175 * sin(A1 + F)
    + 127 * sin(Lp - Mp) - 115 * sin(Lp + Mp);

  const lambda = Lp + sumL / 1e6;
  const beta = sumB / 1e6;
  const dist = 385000.56 + sumR / 1e3; // km
  const eps = obliquity(T);
  const eq = eclToEq(lambda, beta, eps);
  const parallax = Math.asin(6378.14 / dist) * R2D;

  // phase: elongation from sun via ecliptic longitudes
  const sunL = sunPosition(JD);
  const elong = Math.acos(cos(lambda - sunL.eclLon) * cos(beta)) * R2D;
  const phaseAngle = 180 - elong - 0.1468 * ((1 - 0.0549 * sin(Mp)) / (1 - 0.0167 * sin(M))) * sin(elong);
  const illum = (1 + cos(phaseAngle)) / 2;
  // waxing if moon east of sun in ecliptic longitude
  const dLon = norm360(lambda - sunL.eclLonApp);
  return {
    ra: eq.ra, dec: eq.dec, dist, parallax,
    eclLon: norm360(lambda), eclLat: beta,
    illum, waxing: dLon < 180, phaseFrac: dLon / 360, // 0=new .5=full
  };
}

// ---- Planets: JPL approximate elements, 1800–2050 (Standish) ----
// [a, e, I, L, longPeri, longNode] + rates per Julian century; angles in degrees, a in AU
const PLANET_ELEMENTS = {
  mercury: [[0.38709927, 0.20563593, 7.00497902, 252.25032350, 77.45779628, 48.33076593],
            [0.00000037, 0.00001906, -0.00594749, 149472.67411175, 0.16047689, -0.12534081]],
  venus:   [[0.72333566, 0.00677672, 3.39467605, 181.97909950, 131.60246718, 76.67984255],
            [0.00000390, -0.00004107, -0.00078890, 58517.81538729, 0.00268329, -0.27769418]],
  earth:   [[1.00000261, 0.01671123, -0.00001531, 100.46457166, 102.93768193, 0.0],
            [0.00000562, -0.00004392, -0.01294668, 35999.37244981, 0.32327364, 0.0]],
  mars:    [[1.52371034, 0.09339410, 1.84969142, -4.55343205, -23.94362959, 49.55953891],
            [0.00001847, 0.00007882, -0.00813131, 19140.30268499, 0.44441088, -0.29257343]],
  jupiter: [[5.20288700, 0.04838624, 1.30439695, 34.39644051, 14.72847983, 100.47390909],
            [-0.00011607, -0.00013253, -0.00183714, 3034.74612775, 0.21252668, 0.20469106]],
  saturn:  [[9.53667594, 0.05386179, 2.48599187, 49.95424423, 92.59887831, 113.66242448],
            [-0.00125060, -0.00050991, 0.00193609, 1222.49362201, -0.41897216, -0.28867794]],
  uranus:  [[19.18916464, 0.04725744, 0.77263783, 313.23810451, 170.95427630, 74.01692503],
            [-0.00196176, -0.00004397, -0.00242939, 428.48202785, 0.40805281, 0.04240589]],
  neptune: [[30.06992276, 0.00859048, 1.77004347, -55.12002969, 44.96476227, 131.78422574],
            [0.00026291, 0.00005105, 0.00035372, 218.45945325, -0.32241464, -0.00508664]],
};

function keplerSolve(M, e) { // M degrees, returns E degrees
  const Mr = M * D2R;
  let E = e < 0.8 ? Mr : Math.PI;
  for (let i = 0; i < 20; i++) {
    const dE = (E - e * Math.sin(E) - Mr) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-9) break;
  }
  return E * R2D;
}

// heliocentric rectangular J2000 ecliptic coords, AU
function helioXYZ(name, T) {
  const [el0, rate] = PLANET_ELEMENTS[name];
  const a = el0[0] + rate[0] * T, e = el0[1] + rate[1] * T, I = el0[2] + rate[2] * T;
  const L = el0[3] + rate[3] * T, wbar = el0[4] + rate[4] * T, Om = el0[5] + rate[5] * T;
  const w = wbar - Om;
  const M = norm360(L - wbar);
  const E = keplerSolve(M, e);
  const xp = a * (cos(E) - e);
  const yp = a * Math.sqrt(1 - e * e) * sin(E);
  const x = (cos(w) * cos(Om) - sin(w) * sin(Om) * cos(I)) * xp + (-sin(w) * cos(Om) - cos(w) * sin(Om) * cos(I)) * yp;
  const y = (cos(w) * sin(Om) + sin(w) * cos(Om) * cos(I)) * xp + (-sin(w) * sin(Om) + cos(w) * cos(Om) * cos(I)) * yp;
  const z = (sin(w) * sin(I)) * xp + (cos(w) * sin(I)) * yp;
  return [x, y, z];
}

const PLANET_LIST = ['mercury', 'venus', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];

// visual magnitude (Meeus ch. 41 / classic formulas), i = phase angle deg
function planetMagnitude(name, r, delta, i) {
  const lg = 5 * Math.log10(r * delta);
  switch (name) {
    case 'mercury': return lg - 0.42 + 0.0380 * i - 0.000273 * i * i + 0.000002 * i * i * i;
    case 'venus': return lg - 4.40 + 0.0009 * i + 0.000239 * i * i - 0.00000065 * i * i * i;
    case 'mars': return lg - 1.52 + 0.016 * i;
    case 'jupiter': return lg - 9.40 + 0.005 * i;
    case 'saturn': return lg - 8.88 + 0.044 * i; // ring term omitted; ~0.3–1 mag conservative
    case 'uranus': return lg - 7.19 + 0.0028 * i;
    case 'neptune': return lg - 6.87;
    default: return 0;
  }
}

// geocentric apparent RA/Dec (of date) for a planet
function planetPosition(name, JD) {
  const T = centuries(JD);
  const eXYZ = helioXYZ('earth', T);
  let pXYZ = helioXYZ(name, T);
  // one light-time iteration
  let dx = pXYZ[0] - eXYZ[0], dy = pXYZ[1] - eXYZ[1], dz = pXYZ[2] - eXYZ[2];
  let delta = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const tau = 0.0057755183 * delta; // days
  pXYZ = helioXYZ(name, centuries(JD - tau));
  dx = pXYZ[0] - eXYZ[0]; dy = pXYZ[1] - eXYZ[1]; dz = pXYZ[2] - eXYZ[2];
  delta = Math.sqrt(dx * dx + dy * dy + dz * dz);
  const r = Math.sqrt(pXYZ[0] ** 2 + pXYZ[1] ** 2 + pXYZ[2] ** 2);
  const rE = Math.sqrt(eXYZ[0] ** 2 + eXYZ[1] ** 2 + eXYZ[2] ** 2);

  // ecliptic J2000 -> equatorial J2000
  const epsJ2000 = 23.43928;
  const xeq = dx, yeq = dy * cos(epsJ2000) - dz * sin(epsJ2000), zeq = dy * sin(epsJ2000) + dz * cos(epsJ2000);
  const raJ2000 = norm360(Math.atan2(yeq, xeq) * R2D);
  const decJ2000 = Math.asin(zeq / delta) * R2D;
  const eq = precessFromJ2000(raJ2000, decJ2000, T);

  // phase angle
  const cosi = (r * r + delta * delta - rE * rE) / (2 * r * delta);
  const i = Math.acos(Math.max(-1, Math.min(1, cosi))) * R2D;
  const mag = planetMagnitude(name, r, delta, i);
  return { ra: eq.ra, dec: eq.dec, dist: delta, r, mag, phaseAngle: i };
}

// ---- rise / set / transit ----
// find altitude crossings of h0 between t0..t1 (Date ms), sampling + bisection
function findCrossings(posFn, h0, t0, t1, lat, lon, stepMin = 6) {
  t0 = +t0; t1 = +t1;
  const events = [];
  const step = stepMin * 60000;
  let prev = null;
  for (let t = t0; t <= t1 + 1; t += step) {
    const JD = jd(new Date(t));
    const p = posFn(JD);
    const { alt } = altAz(p.ra, p.dec, JD, lat, lon);
    const v = alt - h0;
    if (prev && prev.v * v <= 0 && prev.v !== v) {
      // bisect
      let a = prev.t, b = t, va = prev.v;
      for (let i = 0; i < 30; i++) {
        const m = (a + b) / 2;
        const JDm = jd(new Date(m));
        const pm = posFn(JDm);
        const vm = altAz(pm.ra, pm.dec, JDm, lat, lon).alt - h0;
        if (va * vm <= 0) b = m; else { a = m; va = vm; }
      }
      events.push({ time: new Date((a + b) / 2), rising: v > prev.v });
    }
    prev = { t, v };
  }
  return events;
}

const SUN_H0 = -0.8333; // standard rise/set altitude for sun
function moonH0(JD) { return 0.7275 * moonPosition(JD).parallax - 0.566; }

module.exports = {
  D2R, R2D, jd, centuries, gmst, obliquity, eclToEq, precessFromJ2000, altAz,
  refraction, sunPosition, moonPosition, planetPosition, planetMagnitude,
  findCrossings, SUN_H0, moonH0, PLANET_LIST, norm360,
};
