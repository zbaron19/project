/* Skylight app — dome renderer, almanac briefing, controls.
   Expects astro.js API and SKYDATA in scope. */
(function () {
  'use strict';

  // ---------- state ----------
  const LS_KEY = 'skylight-loc';
  const state = {
    lat: 47.6062, lon: -122.3321, place: 'Seattle',
    anchor: null,      // Date of picked day (local noon), null = today
    offsetMin: 0,      // slider offset from anchor/now
    live: true,
    red: false,
    selected: null,    // tapped object
  };
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || 'null');
    if (saved && isFinite(saved.lat)) Object.assign(state, saved);
  } catch (e) { /* fresh start */ }

  const CITIES = [
    ['Seattle', 47.6062, -122.3321], ['Portland', 45.5152, -122.6784],
    ['San Francisco', 37.7749, -122.4194], ['Los Angeles', 34.0522, -118.2437],
    ['Phoenix', 33.4484, -112.0740], ['Denver', 39.7392, -104.9903],
    ['Austin', 30.2672, -97.7431], ['Chicago', 41.8781, -87.6298],
    ['New York', 40.7128, -74.0060], ['Boston', 42.3601, -71.0589],
    ['Miami', 25.7617, -80.1918], ['Honolulu', 21.3069, -157.8583],
    ['Anchorage', 61.2181, -149.9003], ['London', 51.5074, -0.1278],
    ['Paris', 48.8566, 2.3522], ['Rome', 41.9028, 12.4964],
    ['Tokyo', 35.6762, 139.6503], ['Sydney', -33.8688, 151.2093],
  ];

  const SHOWERS = [
    { name: 'Quadrantids', from: [12, 28], to: [1, 12], peak: [1, 3], zhr: 110, radiant: 'Boötes' },
    { name: 'Lyrids', from: [4, 14], to: [4, 30], peak: [4, 22], zhr: 18, radiant: 'Lyra' },
    { name: 'Eta Aquariids', from: [4, 19], to: [5, 28], peak: [5, 6], zhr: 50, radiant: 'Aquarius' },
    { name: 'Delta Aquariids', from: [7, 12], to: [8, 23], peak: [7, 30], zhr: 25, radiant: 'Aquarius' },
    { name: 'Perseids', from: [7, 17], to: [8, 24], peak: [8, 12], zhr: 100, radiant: 'Perseus' },
    { name: 'Orionids', from: [10, 2], to: [11, 7], peak: [10, 21], zhr: 20, radiant: 'Orion' },
    { name: 'Leonids', from: [11, 6], to: [11, 30], peak: [11, 17], zhr: 15, radiant: 'Leo' },
    { name: 'Geminids', from: [12, 4], to: [12, 17], peak: [12, 14], zhr: 150, radiant: 'Gemini' },
    { name: 'Ursids', from: [12, 17], to: [12, 26], peak: [12, 22], zhr: 10, radiant: 'Ursa Minor' },
  ];

  const PLANET_LABELS = {
    mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter',
    saturn: 'Saturn', uranus: 'Uranus', neptune: 'Neptune',
  };
  const PLANET_BLURB = {
    mercury: 'The innermost planet — always hugging the sun, visible only in twilight.',
    venus: 'The brightest thing in the sky after the sun and moon.',
    mars: 'The red planet. Its rusty color is visible to the naked eye.',
    jupiter: 'The largest planet. Binoculars show its four big moons as tiny dots in a line.',
    saturn: 'The ringed planet. Even a small telescope shows the rings.',
    uranus: 'At the naked-eye limit — binoculars and a dark sky needed.',
    neptune: 'Too faint for the naked eye; a binocular/telescope target.',
  };

  // ---------- small utils ----------
  const $ = (sel) => document.querySelector(sel);
  const D2R = Math.PI / 180;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const pad = (n) => String(n).padStart(2, '0');

  function fmtTime(d) {
    if (!d) return '—';
    return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }).toLowerCase().replace(/\s/g, ' ');
  }
  function fmtDateLong(d) {
    return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  }
  function compass16(az) {
    const dirs = ['north', 'NNE', 'northeast', 'ENE', 'east', 'ESE', 'southeast', 'SSE',
      'south', 'SSW', 'southwest', 'WSW', 'west', 'WNW', 'northwest', 'NNW'];
    return dirs[Math.round(az / 22.5) % 16];
  }
  function compassShort(az) {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    return dirs[Math.round(az / 22.5) % 16];
  }

  // B−V color index -> rgb
  function bvColor(bv) {
    bv = clamp(bv, -0.4, 2.0);
    let r, g, b;
    if (bv < 0.0) { r = 0.62 + 0.4 * (bv + 0.4); g = 0.72 + 0.3 * (bv + 0.4); b = 1.0; }
    else if (bv < 0.4) { r = 0.78 + 0.55 * bv; g = 0.85 + 0.3 * bv; b = 1.0; }
    else if (bv < 1.5) { r = 1.0; g = 0.97 - 0.3 * (bv - 0.4); b = 1.0 - 0.5 * (bv - 0.4); }
    else { r = 1.0; g = 0.63; b = 0.42; }
    return [Math.round(clamp(r, 0, 1) * 255), Math.round(clamp(g, 0, 1) * 255), Math.round(clamp(b, 0, 1) * 255)];
  }

  // ---------- time model ----------
  function viewDate() {
    const base = state.anchor ? new Date(state.anchor) : new Date();
    return new Date(base.getTime() + state.offsetMin * 60000);
  }

  // ---------- ephemeris helpers ----------
  function bodyNow(name, JD) {
    if (name === 'sun') return sunPosition(JD);
    if (name === 'moon') return moonPosition(JD);
    return planetPosition(name, JD);
  }

  // rise/set events for a body in [t0, t1] (ms)
  function events(name, t0, t1) {
    let posFn, h0;
    if (name === 'sun') { posFn = sunPosition; h0 = SUN_H0; }
    else if (name === 'moon') { posFn = moonPosition; h0 = moonH0(jd(new Date(t0))); }
    else { posFn = (J) => planetPosition(name, J); h0 = -0.5667; }
    return findCrossings(posFn, h0, t0, t1, state.lat, state.lon);
  }
  function sunAltEvents(h0, t0, t1) {
    return findCrossings(sunPosition, h0, t0, t1, state.lat, state.lon);
  }

  // The night: [sunset, sunrise] containing (or following) the view time.
  function nightWindow(t) {
    const span = 40 * 3600e3;
    const evs = events('sun', t.getTime() - span / 2, t.getTime() + span);
    const sets = evs.filter((e) => !e.rising), rises = evs.filter((e) => e.rising);
    for (const s of sets) {
      const r = rises.find((x) => x.time > s.time);
      if (!r) continue;
      if (t >= s.time && t <= r.time) return { sunset: +s.time, sunrise: +r.time, ongoing: true };
      if (s.time > t) return { sunset: +s.time, sunrise: +r.time, ongoing: false };
    }
    return null; // polar day/night
  }

  // ---------- dome rendering ----------
  const dome = $('#dome');
  const ctx = dome.getContext('2d');
  let hits = []; // clickable object screen positions

  function skyTone(sunAlt) {
    // ground color of the dome by sun altitude
    const stops = [
      [6, [125, 178, 220]], [0, [82, 118, 172]], [-6, [42, 58, 94]],
      [-12, [24, 33, 58]], [-18, [11, 14, 26]],
    ];
    if (state.red) return [10, 1, 1];
    if (sunAlt >= stops[0][0]) return stops[0][1];
    for (let i = 0; i < stops.length - 1; i++) {
      const [a0, c0] = stops[i], [a1, c1] = stops[i + 1];
      if (sunAlt <= a0 && sunAlt >= a1) {
        const f = (a0 - sunAlt) / (a0 - a1);
        return c0.map((c, k) => Math.round(c + (c1[k] - c) * f));
      }
    }
    return stops[stops.length - 1][1];
  }
  // naked-eye limiting magnitude by sun altitude
  function limitingMag(sunAlt) {
    if (sunAlt > 0) return -3.5;
    if (sunAlt > -6) return -3.5 + (sunAlt / -6) * 5.0;   // to 1.5
    if (sunAlt > -12) return 1.5 + ((sunAlt + 6) / -6) * 3.0; // to 4.5
    if (sunAlt > -18) return 4.5 + ((sunAlt + 12) / -6) * 1.7; // to 6.2
    return 6.2;
  }

  function draw() {
    const t = viewDate();
    const JD = jd(t);
    const T = centuries(JD);
    const size = dome.width; // square, device px
    const cx = size / 2, cy = size / 2;
    const R = size / 2 - 14 * devicePixelRatio;

    const sun = sunPosition(JD);
    const sunH = altAz(sun.ra, sun.dec, JD, state.lat, state.lon);
    const tone = skyTone(sunH.alt);
    const limMag = limitingMag(sunH.alt);
    const dark = clamp((limMag - 1.5) / 4.7, 0, 1); // 0 day .. 1 full dark

    // sky ground
    ctx.clearRect(0, 0, size, size);
    const g = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R);
    g.addColorStop(0, `rgb(${tone[0]},${tone[1]},${tone[2]})`);
    g.addColorStop(1, `rgb(${Math.round(tone[0] * 0.72)},${Math.round(tone[1] * 0.72)},${Math.round(tone[2] * 0.8)})`);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
    ctx.clip();

    // stereographic projection, zenith centered, N top, E left (chart held overhead)
    const proj = (alt, az) => {
      const r = R * Math.tan((90 - alt) * D2R / 2) / Math.tan(45.5 * D2R);
      return [cx - r * Math.sin(az * D2R), cy - r * Math.cos(az * D2R), r];
    };
    const eqPos = (ra, dec) => {
      const h = altAz(ra, dec, JD, state.lat, state.lon);
      return { ...h, p: proj(h.alt + refraction(h.alt), h.az) };
    };
    hits = [];
    const px = devicePixelRatio;

    // milky way
    if (dark > 0.25 && !state.red) {
      ctx.fillStyle = `rgba(180, 200, 235, ${0.045 * dark})`;
      for (const layer of SKYDATA.mw) {
        for (const poly of layer) {
          ctx.beginPath();
          let started = false;
          for (let i = 0; i < poly.length; i += 2) {
            const q = eqPos(poly[i], poly[i + 1]);
            if (q.alt < -25) { started = false; continue; }
            const [x, y] = q.p;
            if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
          }
          ctx.fill();
        }
      }
    }

    // alt-az grid: 30/60° circles + ecliptic
    ctx.strokeStyle = state.red ? 'rgba(160,30,20,0.25)' : `rgba(143,148,171,0.14)`;
    ctx.setLineDash([3 * px, 5 * px]);
    ctx.lineWidth = 1 * px;
    for (const a of [30, 60]) {
      ctx.beginPath(); ctx.arc(cx, cy, proj(a, 0)[2], 0, Math.PI * 2); ctx.stroke();
    }
    // ecliptic
    ctx.strokeStyle = state.red ? 'rgba(200,50,30,0.3)' : 'rgba(255,196,107,0.22)';
    ctx.beginPath();
    let pen = false;
    const epsNow = obliquity(T);
    for (let L = 0; L <= 360; L += 4) {
      const eq = eclToEq(L, 0, epsNow);
      const q = eqPos(eq.ra, eq.dec);
      if (q.alt < -2) { pen = false; continue; }
      const [x, y] = q.p;
      if (!pen) { ctx.moveTo(x, y); pen = true; } else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // label collision bookkeeping — star names take priority over figures
    const labelBoxes = [];
    const labelFits = (x, y, w, h) => {
      for (const b of labelBoxes) {
        if (Math.abs(b.x - x) < (b.w + w) / 2 && Math.abs(b.y - y) < (b.h + h) / 2) return false;
      }
      labelBoxes.push({ x, y, w, h });
      return true;
    };
    const conLabels = [];

    // constellation lines + names
    if (dark > 0.15) {
      const lineCol = state.red ? [190, 45, 30] : [127, 180, 217];
      ctx.lineWidth = 1 * px;
      for (const con of SKYDATA.cons) {
        ctx.strokeStyle = `rgba(${lineCol[0]},${lineCol[1]},${lineCol[2]},${0.28 * dark})`;
        for (const seg of con.s) {
          ctx.beginPath();
          let started = false;
          for (let i = 0; i < seg.length; i += 2) {
            const pr = precessFromJ2000(seg[i], seg[i + 1], T);
            const q = eqPos(pr.ra, pr.dec);
            if (q.alt < -8) { started = false; continue; }
            const [x, y] = q.p;
            if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
          }
          ctx.stroke();
        }
        if (con.r <= 2 && dark > 0.5) {
          const pr = precessFromJ2000(con.p[0], con.p[1], T);
          const q = eqPos(pr.ra, pr.dec);
          if (q.alt > 12) conLabels.push({ name: con.n.toUpperCase(), x: q.p[0], y: q.p[1], col: lineCol });
        }
      }
    }

    // stars
    const S = SKYDATA.stars;
    ctx.textAlign = 'left';
    for (let i = 0; i < S.length; i += 4) {
      const mag = S[i + 2];
      if (mag > limMag) break; // sorted by magnitude
      const pr = precessFromJ2000(S[i], S[i + 1], T);
      const q = eqPos(pr.ra, pr.dec);
      if (q.alt < -0.8) continue;
      const [x, y] = q.p;
      const alpha = clamp((limMag - mag) * 0.35 + 0.25, 0.1, 1);
      const rad = clamp((6.8 - mag) * 0.42, 0.5, 3.4) * px;
      const [cr, cg, cb] = state.red ? [255, 60, 40] : bvColor(S[i + 3]);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha})`;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      const idx = i / 4;
      if (mag < 2.1) {
        hits.push({ x, y, kind: 'star', idx, alt: q.alt, az: q.az, mag });
        const nm = SKYDATA.starNames[idx];
        if (nm && mag < 1.6 && dark > 0.5 && labelFits(x, y, (nm.length * 6 + 10) * px, 16 * px)) {
          ctx.fillStyle = `rgba(${cr},${cg},${cb},${0.55 * dark})`;
          ctx.font = `${10 * px}px -apple-system, system-ui, sans-serif`;
          ctx.fillText(nm, x + 5 * px, y - 4 * px);
        }
      }
    }

    // constellation names, where room remains
    ctx.textAlign = 'center';
    ctx.font = `${10.5 * px}px -apple-system, system-ui, sans-serif`;
    for (const L of conLabels) {
      if (!labelFits(L.x, L.y, (L.name.length * 7 + 14) * px, 22 * px)) continue;
      ctx.fillStyle = `rgba(${L.col[0]},${L.col[1]},${L.col[2]},${0.48 * dark})`;
      ctx.fillText(L.name, L.x, L.y);
    }
    ctx.textAlign = 'left';

    // DSO markers
    if (dark > 0.6) {
      for (let d = 0; d < SKYDATA.dsos.length; d++) {
        const [ra, dec, mag, name] = SKYDATA.dsos[d];
        const pr = precessFromJ2000(ra, dec, T);
        const q = eqPos(pr.ra, pr.dec);
        if (q.alt < 8) continue;
        const [x, y] = q.p;
        ctx.strokeStyle = state.red ? 'rgba(220,60,40,0.5)' : 'rgba(255,196,107,0.45)';
        ctx.lineWidth = 1 * px;
        ctx.beginPath();
        const s = 3.4 * px;
        ctx.moveTo(x, y - s); ctx.lineTo(x + s, y); ctx.lineTo(x, y + s); ctx.lineTo(x - s, y); ctx.closePath();
        ctx.stroke();
        hits.push({ x, y, kind: 'dso', idx: d, alt: q.alt, az: q.az, mag });
      }
    }

    // planets
    for (const name of PLANET_LIST) {
      const p = planetPosition(name, JD);
      const q = eqPos(p.ra, p.dec);
      if (q.alt < -0.8) continue;
      if (p.mag > limMag + 0.5) continue;
      const [x, y] = q.p;
      const rad = clamp((5.6 - p.mag) * 0.6, 1.4, 4.6) * px;
      const col = state.red ? [255, 90, 60] : [255, 214, 150];
      ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},0.98)`;
      ctx.beginPath(); ctx.arc(x, y, rad, 0, Math.PI * 2); ctx.fill();
      if (dark > 0.25 || p.mag < -3) {
        ctx.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},0.8)`;
        ctx.font = `${10.5 * px}px -apple-system, system-ui, sans-serif`;
        ctx.fillText(PLANET_LABELS[name], x + rad + 3 * px, y - 3 * px);
      }
      hits.push({ x, y, kind: 'planet', name, alt: q.alt, az: q.az, mag: p.mag, dist: p.dist });
    }

    // moon
    const moon = moonPosition(JD);
    const mq = eqPos(moon.ra, moon.dec);
    if (mq.alt > -1.5) {
      const [x, y] = mq.p;
      const mr = 7.5 * px;
      // rotate lit limb toward the sun's screen position
      const sq = proj(sunH.alt, sunH.az);
      const ang = Math.atan2(sq[1] - y, sq[0] - x);
      drawMoonDisc(ctx, x, y, mr, moon.illum, moon.waxing, ang, state.red);
      hits.push({ x, y, kind: 'moon', alt: mq.alt, az: mq.az, illum: moon.illum, waxing: moon.waxing, dist: moon.dist });
    }

    // sun
    if (sunH.alt > -8) {
      const [x, y] = proj(Math.max(sunH.alt, -2), sunH.az);
      const sr = 9 * px;
      const glow = ctx.createRadialGradient(x, y, 0, x, y, sr * 5);
      const gc = state.red ? '255,80,40' : '255,236,180';
      glow.addColorStop(0, `rgba(${gc},0.9)`);
      glow.addColorStop(0.25, `rgba(${gc},0.35)`);
      glow.addColorStop(1, `rgba(${gc},0)`);
      ctx.fillStyle = glow;
      ctx.fillRect(x - sr * 5, y - sr * 5, sr * 10, sr * 10);
      ctx.fillStyle = state.red ? 'rgb(255,90,50)' : 'rgb(255,244,214)';
      ctx.beginPath(); ctx.arc(x, y, sr, 0, Math.PI * 2); ctx.fill();
      hits.push({ x, y, kind: 'sun', alt: sunH.alt, az: sunH.az });
    }

    ctx.restore();

    // horizon ring + cardinals
    ctx.strokeStyle = state.red ? 'rgba(190,50,30,0.8)' : 'rgba(143,148,171,0.55)';
    ctx.lineWidth = 1.5 * px;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `600 ${12 * px}px -apple-system, system-ui, sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = state.red ? 'rgba(230,60,40,0.9)' : 'rgba(233,231,222,0.75)';
    const lab = [['N', 0], ['E', 90], ['S', 180], ['W', 270]];
    for (const [L, az] of lab) {
      const rr = R + 9 * px;
      ctx.fillText(L, cx - rr * Math.sin(az * D2R), cy - rr * Math.cos(az * D2R));
    }
    ctx.textBaseline = 'alphabetic';

    window.__skyHits = hits; // for tests
    // selected marker
    if (state.selected) {
      const s = hits.find((h) => sameObj(h, state.selected));
      if (s) {
        ctx.strokeStyle = state.red ? 'rgba(255,90,60,0.9)' : 'rgba(255,196,107,0.9)';
        ctx.lineWidth = 1.2 * px;
        ctx.beginPath(); ctx.arc(s.x, s.y, 9 * px, 0, Math.PI * 2); ctx.stroke();
      }
    }
  }

  function drawMoonDisc(c, x, y, r, illum, waxing, angToSun, red) {
    c.save();
    c.translate(x, y);
    c.rotate(angToSun + Math.PI / 2); // lit side faces the sun
    const bright = red ? 'rgb(255,110,70)' : 'rgb(240,238,225)';
    const darkc = red ? 'rgba(90,15,8,0.9)' : 'rgba(70,76,96,0.9)';
    c.fillStyle = darkc;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    // lit portion: semicircle toward -y plus terminator ellipse
    const k = 2 * illum - 1; // -1 new .. +1 full
    c.fillStyle = bright;
    c.beginPath();
    c.arc(0, 0, r, Math.PI, 2 * Math.PI); // upper half (toward sun)
    c.ellipse(0, 0, r, Math.abs(k) * r, 0, 0, Math.PI, k < 0);
    c.fill();
    c.restore();
  }

  function sameObj(a, b) {
    return a.kind === b.kind && (a.kind === 'planet' ? a.name === b.name
      : (a.kind === 'star' || a.kind === 'dso') ? a.idx === b.idx : true);
  }

  // ---------- tap handling ----------
  function domePoint(ev) {
    const r = dome.getBoundingClientRect();
    return [(ev.clientX - r.left) * dome.width / r.width, (ev.clientY - r.top) * dome.height / r.height];
  }
  dome.addEventListener('click', (ev) => {
    const [x, y] = domePoint(ev);
    let best = null, bd = 26 * devicePixelRatio;
    for (const h of hits) {
      const d = Math.hypot(h.x - x, h.y - y);
      if (d < bd) { bd = d; best = h; }
    }
    state.selected = best;
    renderObjCard(best, ev.clientX, ev.clientY);
    draw();
  });

  function altPhrase(alt, az) {
    const dir = compass16(az);
    if (alt > 65) return 'nearly overhead';
    const h = alt > 45 ? 'high in the ' : alt > 20 ? 'partway up the ' : 'low in the ';
    return h + dir;
  }

  function renderObjCard(obj, clientX, clientY) {
    const card = $('#objcard');
    if (!obj) { card.style.display = 'none'; return; }
    const t = viewDate();
    let title = '', kind = '', rows = [];
    const where = `<b>${Math.round(obj.alt)}°</b> up, ${compass16(obj.az)} (${compassShort(obj.az)})`;
    if (obj.kind === 'star') {
      const nm = SKYDATA.starNames[obj.idx];
      const info = SKYDATA.starInfo[obj.idx];
      const conName = info && (SKYDATA.cons.find((c) => c.c === info[1]) || {}).n;
      title = nm || (info ? `${info[0]} ${conName || info[1]}` : 'Star');
      kind = conName ? `star in ${conName}` : 'star';
      rows.push(`magnitude <b>${obj.mag.toFixed(1)}</b>`);
    } else if (obj.kind === 'planet') {
      title = PLANET_LABELS[obj.name];
      kind = 'planet';
      const lightMin = obj.dist * 8.317;
      rows.push(`magnitude <b>${obj.mag.toFixed(1)}</b> · <b>${obj.dist.toFixed(2)}</b> AU away`);
      rows.push(`its light left <b>${lightMin < 90 ? Math.round(lightMin) + ' min' : (lightMin / 60).toFixed(1) + ' hr'}</b> ago`);
      rows.push(PLANET_BLURB[obj.name]);
    } else if (obj.kind === 'moon') {
      title = 'The Moon';
      kind = phaseName(obj.illum, obj.waxing).toLowerCase();
      rows.push(`<b>${Math.round(obj.illum * 100)}%</b> lit · <b>${Math.round(obj.dist / 1000)}</b> thousand km away`);
    } else if (obj.kind === 'sun') {
      title = 'The Sun'; kind = 'star (ours)';
    } else if (obj.kind === 'dso') {
      const d = SKYDATA.dsos[obj.idx];
      title = d[3]; kind = { oc: 'open star cluster', gc: 'globular cluster', s: 'galaxy', sd: 'galaxy', i: 'galaxy', sfr: 'nebula', en: 'nebula', pos: '' }[d[4]] || 'deep-sky object';
      rows.push(`magnitude <b>${d[2]}</b> — try binoculars`);
    }
    rows.push(where);
    card.innerHTML = `<button class="close" aria-label="Close">×</button>
      <div class="kind">${kind}</div><h3>${title}</h3>` +
      rows.map((r) => `<div class="row">${r}</div>`).join('');
    card.style.display = 'block';
    const holder = $('.dome-holder').getBoundingClientRect();
    let lx = clientX - holder.left + 14, ly = clientY - holder.top + 10;
    lx = clamp(lx, 6, holder.width - 230);
    ly = clamp(ly, 6, holder.height - 120);
    card.style.left = lx + 'px'; card.style.top = ly + 'px';
    card.querySelector('.close').onclick = () => { state.selected = null; card.style.display = 'none'; draw(); };
  }

  // ---------- phase names ----------
  function phaseName(illum, waxing) {
    if (illum < 0.03) return 'New Moon';
    if (illum > 0.97) return 'Full Moon';
    if (Math.abs(illum - 0.5) < 0.04) return waxing ? 'First Quarter' : 'Last Quarter';
    if (illum < 0.5) return waxing ? 'Waxing Crescent' : 'Waning Crescent';
    return waxing ? 'Waxing Gibbous' : 'Waning Gibbous';
  }

  // ---------- briefing + almanac sections ----------
  function visibilityTonight(name, night) {
    // sample altitude through the night; find best window above 10°
    const step = 12 * 60000;
    let upFrom = null, best = null, bestAlt = -99, bestT = null;
    for (let t = +night.sunset; t <= +night.sunrise; t += step) {
      const JD = jd(new Date(t));
      const p = bodyNow(name, JD);
      const { alt, az } = altAz(p.ra, p.dec, JD, state.lat, state.lon);
      if (alt > bestAlt) { bestAlt = alt; bestT = { t, az, alt }; }
      if (alt > 10 && upFrom === null) upFrom = t;
      if ((alt <= 10 || t + step > night.sunrise) && upFrom !== null) {
        const win = { from: upFrom, to: alt > 10 ? t : t - step };
        if (!best || win.to - win.from > best.to - best.from) best = win;
        upFrom = null;
      }
    }
    return { window: best, peak: bestT };
  }

  function refreshAlmanac() {
    const t = viewDate();
    const night = nightWindow(t);
    const JD = jd(t);

    // --- header date/location ---
    $('#datehead').textContent = (night && night.ongoing && t.getHours() < 12 ? 'The night of ' : 'Tonight — ') + fmtDateLong(night ? new Date(night.sunset) : t);
    $('#locname').textContent = `${state.place} · ${Math.abs(state.lat).toFixed(2)}°${state.lat >= 0 ? 'N' : 'S'}, ${Math.abs(state.lon).toFixed(2)}°${state.lon >= 0 ? 'E' : 'W'}`;

    if (!night) {
      $('#briefing').innerHTML = `<p>The sun ${sunPosition(JD) && altAz(sunPosition(JD).ra, sunPosition(JD).dec, JD, state.lat, state.lon).alt > 0 ? 'does not set' : 'does not rise'} at this latitude right now — no true night tonight.</p>`;
      return;
    }

    const span0 = night.sunset - 6 * 3600e3, span1 = night.sunrise + 6 * 3600e3;

    // twilights & golden hour
    const civil = sunAltEvents(-6, night.sunset, night.sunrise);
    const astro = sunAltEvents(-18, night.sunset, night.sunrise);
    const darkStart = astro.find((e) => !e.rising);
    const darkEnd = [...astro].reverse().find((e) => e.rising);
    const goldenStart = sunAltEvents(6, night.sunset - 4 * 3600e3, night.sunset).filter((e) => !e.rising).pop();

    // moon tonight
    const moonMid = moonPosition(jd(new Date((night.sunset + night.sunrise) / 2)));
    const mEvents = events('moon', span0, span1);
    const moonRise = mEvents.find((e) => e.rising && e.time >= span0 && e.time.getTime() <= night.sunrise);
    const moonSet = mEvents.find((e) => !e.rising && e.time.getTime() >= night.sunset - 2 * 3600e3);
    const moonVis = visibilityTonight('moon', night);
    const mName = phaseName(moonMid.illum, moonMid.waxing);
    const mPct = Math.round(moonMid.illum * 100);

    // planets tonight
    const planetInfo = [];
    for (const name of PLANET_LIST) {
      const vis = visibilityTonight(name, night);
      const evs = events(name, span0, span1);
      const p = planetPosition(name, jd(new Date((night.sunset + night.sunrise) / 2)));
      planetInfo.push({ name, vis, evs, mag: p.mag });
    }

    // --- briefing prose ---
    const P = [];
    const sunsetS = fmtTime(new Date(night.sunset)), sunriseS = fmtTime(new Date(night.sunrise));
    let l1 = `The sun sets at <b>${sunsetS}</b>`;
    if (darkStart) l1 += ` and real darkness settles in around <b>${fmtTime(darkStart.time)}</b>`;
    l1 += `; sunrise comes at <b>${sunriseS}</b>.`;
    if (goldenStart) l1 += ` Golden hour starts about ${fmtTime(goldenStart.time)}.`;
    P.push(l1);

    let ml = `The moon is a <b>${mName.toLowerCase()}</b>, ${mPct}% lit`;
    if (moonRise && moonRise.time.getTime() > night.sunset) ml += `, rising at <b>${fmtTime(moonRise.time)}</b>`;
    else if (moonSet && moonSet.time.getTime() > night.sunset && moonSet.time.getTime() < night.sunrise) ml += `, setting at <b>${fmtTime(moonSet.time)}</b>`;
    else if (moonVis.window) ml += `, up most of the night`;
    ml += '. ';
    if (mPct >= 75 && moonVis.window) ml += 'Its glare will wash out the faint stuff — a night for planets and bright stars.';
    else if (mPct <= 25) ml += 'Dark skies — a good night for faint stars and the Milky Way.';
    else if (mPct > 25 && mPct < 75) ml += 'Along the terminator — the line between lunar day and night — craters stand out sharply in binoculars.';
    P.push(ml);

    // planets sentence(s)
    const upEve = [], upMorn = [], hidden = [];
    for (const pi of planetInfo.filter((x) => ['venus', 'jupiter', 'saturn', 'mars', 'mercury'].includes(x.name))) {
      if (!pi.vis.window) { hidden.push(pi); continue; }
      const midT = (pi.vis.window.from + pi.vis.window.to) / 2;
      (midT < (night.sunset + night.sunrise) / 2 ? upEve : upMorn).push(pi);
    }
    const planetPhrase = (pi) => {
      const w = pi.vis.window;
      const pk = pi.vis.peak;
      const from = new Date(w.from), to = new Date(w.to);
      const early = w.from - night.sunset < 45 * 60000;
      const late = night.sunrise - w.to < 45 * 60000;
      let s = `<b>${PLANET_LABELS[pi.name]}</b> `;
      if (early && late) s += `is out all night, ${altPhrase(pk.alt, pk.az)} at its best`;
      else if (early) s += `shows ${altPhrase(pk.alt, pk.az)} from dusk until ${fmtTime(to)}`;
      else s += `is up from ${fmtTime(from)}, ${altPhrase(pk.alt, pk.az)} at its highest`;
      if (pi.mag < -3.5) s += ' — impossible to miss';
      else if (pi.mag < -1.5) s += ' — the brightest point in that part of the sky';
      return s + '.';
    };
    if (upEve.length + upMorn.length) {
      let ps = upEve.concat(upMorn).slice(0, 3).map(planetPhrase).join(' ');
      P.push(ps);
    } else {
      P.push('No bright planets grace tonight’s sky — they’re all keeping company with the sun right now.');
    }

    // meteor showers
    const active = activeShowers(t);
    for (const sh of active) {
      const dPeak = daysToPeak(sh, t);
      if (Math.abs(dPeak) <= 2) {
        P.push(`The <b>${sh.name}</b> meteor shower peaks ${dPeak === 0 ? 'tonight' : dPeak > 0 ? 'in ' + Math.round(dPeak) + (Math.round(dPeak) === 1 ? ' night' : ' nights') : 'about now'} — up to ~${sh.zhr}/hr under dark skies, radiating from ${sh.radiant}. Best after midnight${mPct > 60 ? ', though the moon will steal the faint ones' : ''}.`);
      }
    }

    // best-time line
    let bestLine = '';
    const target = upEve[0] || upMorn[0];
    if (darkStart && target) {
      const w = target.vis.window;
      const bt = new Date(Math.max(darkStart.time.getTime(), w.from));
      if (bt.getTime() < w.to) bestLine = `Step outside around <b>${fmtTime(bt)}</b> and look ${compass16(altAz(bodyNow(target.name, jd(bt)).ra, bodyNow(target.name, jd(bt)).dec, jd(bt), state.lat, state.lon).az)}.`;
    } else if (darkStart) {
      bestLine = `Step outside after <b>${fmtTime(darkStart.time)}</b> for the darkest sky.`;
    }
    if (bestLine) P.push(`<span class="bestline">${bestLine}</span>`);

    $('#briefing').innerHTML = P.map((p) => `<p>${p}</p>`).join('');

    // --- sun stats ---
    $('#sunstats').innerHTML = [
      ['Sunset', sunsetS, goldenStart ? 'golden hour ' + fmtTime(goldenStart.time) : ''],
      ['True darkness', darkStart ? fmtTime(darkStart.time) : '—', darkEnd ? 'until ' + fmtTime(darkEnd.time) : 'sun never drops 18° below'],
      ['Sunrise', sunriseS, civil.length ? 'first light ' + fmtTime((civil.filter((e) => e.rising).pop() || { time: new Date(night.sunrise) }).time) : ''],
    ].map(([l, v, s]) => `<div class="stat"><div class="lbl">${l}</div><div class="val">${v}</div><div class="sub">${s}</div></div>`).join('');

    // --- moon panel ---
    drawMoonPhase($('#moonphase'), moonMid.illum, moonMid.waxing);
    $('#moonfacts').innerHTML = `
      <div class="phase-name">${mName}</div>
      <div class="detail"><b>${mPct}%</b> illuminated · ${Math.round(moonMid.dist / 1000)},000 km away</div>
      <div class="detail">${moonRise ? 'rises <b>' + fmtTime(moonRise.time) + '</b>' : ''}${moonRise && moonSet ? ' · ' : ''}${moonSet ? 'sets <b>' + fmtTime(moonSet.time) + '</b>' : ''}</div>`;

    // --- planet table ---
    $('#ptable').innerHTML = planetInfo.map((pi) => {
      const w = pi.vis.window;
      let chip, when;
      if (!w) { chip = '<span class="chip">lost in sunlight</span>'; when = ''; }
      else {
        const midNight = (night.sunset + night.sunrise) / 2;
        const evening = w.from < midNight;
        const early = w.from - night.sunset < 45 * 60000;
        const late = night.sunrise - w.to < 45 * 60000;
        chip = early && late ? '<span class="chip up">all night</span>'
          : evening ? '<span class="chip up">evening</span>' : '<span class="chip morning">early morning</span>';
        const pk = pi.vis.peak;
        when = `<b>${fmtTime(new Date(w.from))}–${fmtTime(new Date(w.to))}</b> · best ${compassShort(pk.az)}, ${Math.round(pk.alt)}° up`;
      }
      return `<tr><td class="pname">${PLANET_LABELS[pi.name]}<div class="pmag">mag ${pi.mag.toFixed(1)}</div></td>
        <td>${chip}</td><td class="pwhen">${when}</td></tr>`;
    }).join('');

    // --- meteor list ---
    const upcoming = SHOWERS.map((sh) => ({ sh, d: daysToPeak(sh, t) }))
      .filter((x) => x.d > -30)
      .sort((a, b) => Math.abs(a.d) - Math.abs(b.d)).slice(0, 3)
      .sort((a, b) => a.d - b.d);
    $('#meteors').innerHTML = upcoming.map(({ sh, d }) => {
      const isActive = activeShowers(t).includes(sh);
      const peakStr = d === 0 ? 'peaks tonight' : d > 0 ? `peaks in ${Math.round(d)} night${Math.round(d) === 1 ? '' : 's'}` : `peaked ${Math.round(-d)} night${Math.round(-d) === 1 ? '' : 's'} ago`;
      return `<div class="meteor"><div><div class="mname">${sh.name}</div>
        <div class="mfacts" style="text-align:left">${isActive ? 'active now · ' : ''}from ${sh.radiant}</div></div>
        <div class="mfacts"><span class="${Math.abs(d) < 3 ? 'peaking' : ''}">${peakStr}</span><br>~${sh.zhr}/hr ideal</div></div>`;
    }).join('');
  }

  function activeShowers(t) {
    const y = t.getFullYear();
    return SHOWERS.filter((sh) => {
      for (const yy of [y - 1, y]) {
        const from = new Date(yy, sh.from[0] - 1, sh.from[1]);
        let to = new Date(yy, sh.to[0] - 1, sh.to[1]);
        if (to < from) to = new Date(yy + 1, sh.to[0] - 1, sh.to[1]);
        if (t >= from && t <= to) return true;
      }
      return false;
    });
  }
  function daysToPeak(sh, t) {
    const y = t.getFullYear();
    let best = Infinity;
    for (const yy of [y - 1, y, y + 1]) {
      const pk = new Date(yy, sh.peak[0] - 1, sh.peak[1], 23, 0);
      const d = (pk - t) / 86400e3;
      if (Math.abs(d) < Math.abs(best)) best = d;
    }
    return best;
  }

  function drawMoonPhase(cv, illum, waxing) {
    const s = 84 * devicePixelRatio;
    cv.width = s; cv.height = s;
    cv.style.width = cv.style.height = '84px';
    const c = cv.getContext('2d');
    const r = s / 2 - 3 * devicePixelRatio;
    c.clearRect(0, 0, s, s);
    c.save();
    c.translate(s / 2, s / 2);
    // waxing moon is lit on the right (northern hemisphere convention)
    c.rotate(waxing === (state.lat >= 0) ? Math.PI / 2 : -Math.PI / 2);
    const bright = state.red ? '#d5473a' : '#e6e3d5';
    const darkc = state.red ? '#2a0a06' : '#232840';
    c.fillStyle = darkc;
    c.beginPath(); c.arc(0, 0, r, 0, Math.PI * 2); c.fill();
    const k = 2 * illum - 1;
    c.fillStyle = bright;
    c.beginPath();
    c.arc(0, 0, r, Math.PI, 2 * Math.PI);
    c.ellipse(0, 0, r, Math.abs(k) * r, 0, 0, Math.PI, k < 0);
    c.fill();
    // craters, faintly, on the lit part
    c.globalAlpha = 0.12;
    c.fillStyle = darkc;
    for (const [mx, my, mr] of [[-0.3, -0.35, 0.13], [0.15, -0.5, 0.09], [0.32, -0.18, 0.11], [-0.1, -0.62, 0.06]]) {
      c.beginPath(); c.arc(mx * r, my * r, mr * r, 0, Math.PI * 2); c.fill();
    }
    c.restore();
  }

  // ---------- controls ----------
  const slider = $('#timeslider');
  function updateReadout() {
    const t = viewDate();
    const isNow = state.live && Math.abs(state.offsetMin) < 1;
    $('#whenlabel').innerHTML = isNow
      ? `<b>Now</b> · ${fmtTime(t)}`
      : `<b>${t.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}</b> · ${fmtTime(t)}`;
  }
  slider.addEventListener('input', () => {
    state.offsetMin = Number(slider.value);
    state.live = false;
    scheduleRefresh(true);
  });
  $('#nowbtn').addEventListener('click', () => {
    state.anchor = null; state.offsetMin = 0; state.live = true;
    slider.value = 0; $('#datepick').value = '';
    scheduleRefresh(true);
  });
  $('#datepick').addEventListener('change', (e) => {
    if (!e.target.value) { state.anchor = null; state.live = true; }
    else {
      const [Y, M, D] = e.target.value.split('-').map(Number);
      state.anchor = new Date(Y, M - 1, D, 21, 0); // evening of the picked day
      state.live = false; state.offsetMin = 0; slider.value = 0;
    }
    scheduleRefresh(true);
  });
  $('#redbtn').addEventListener('click', () => {
    state.red = !state.red;
    document.documentElement.classList.toggle('red', state.red);
    $('#redbtn').classList.toggle('active', state.red);
    scheduleRefresh(true);
  });
  $('#locbtn').addEventListener('click', () => $('#locpanel').classList.toggle('open'));
  $('#geobtn').addEventListener('click', () => {
    if (!navigator.geolocation) return;
    $('#geobtn').textContent = 'Locating…';
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation(pos.coords.latitude, pos.coords.longitude, 'Your location');
        $('#geobtn').textContent = 'Use my location';
        $('#locpanel').classList.remove('open');
      },
      () => { $('#geobtn').textContent = 'Location unavailable — pick a city'; },
      { timeout: 8000 });
  });
  $('#applylatlon').addEventListener('click', () => {
    const la = Number($('#latin').value), lo = Number($('#lonin').value);
    if (isFinite(la) && isFinite(lo) && Math.abs(la) <= 89.9 && Math.abs(lo) <= 180) {
      setLocation(la, lo, `${la.toFixed(2)}°, ${lo.toFixed(2)}°`);
      $('#locpanel').classList.remove('open');
    }
  });
  function setLocation(lat, lon, place) {
    state.lat = lat; state.lon = lon; state.place = place;
    localStorage.setItem(LS_KEY, JSON.stringify({ lat, lon, place }));
    scheduleRefresh(true);
  }
  const cityBox = $('#citybox');
  for (const [nm, la, lo] of CITIES) {
    const b = document.createElement('button');
    b.textContent = nm;
    b.onclick = () => { setLocation(la, lo, nm); $('#locpanel').classList.remove('open'); };
    cityBox.appendChild(b);
  }

  // ---------- sizing & loop ----------
  function sizeDome() {
    const holder = $('.dome-holder');
    const w = Math.min(holder.clientWidth, Math.round(window.innerHeight * 0.72));
    dome.style.width = w + 'px'; dome.style.height = w + 'px';
    dome.width = Math.round(w * devicePixelRatio);
    dome.height = Math.round(w * devicePixelRatio);
  }
  window.addEventListener('resize', () => { sizeDome(); draw(); });

  let almanacTimer = null;
  function scheduleRefresh(immediateDome) {
    if (immediateDome) { updateReadout(); draw(); }
    // almanac recompute is heavier — debounce while scrubbing
    clearTimeout(almanacTimer);
    almanacTimer = setTimeout(refreshAlmanac, 180);
    if (state.selected) { $('#objcard').style.display = 'none'; state.selected = null; }
  }

  // live minute tick
  setInterval(() => { if (state.live) { updateReadout(); draw(); } }, 30000);
  // full refresh every 15 min when live
  setInterval(() => { if (state.live) refreshAlmanac(); }, 15 * 60000);

  // ---------- boot ----------
  document.documentElement.classList.toggle('red', state.red);
  $('#redbtn').classList.toggle('active', state.red);
  sizeDome();
  updateReadout();
  draw();
  refreshAlmanac();
})();
