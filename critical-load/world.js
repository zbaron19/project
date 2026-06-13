/* CRITICAL LOAD — 3D campus walkthrough (Three.js, stylized low-poly neon) */
window.World = (function () {
  'use strict';
  if (!window.THREE) return null;

  var renderer = null, scene, camera, failed = false, running = false;
  var zones = {};           // id -> { label, center, camPos, group, mats }
  var active = null;        // active zone id
  var clockT = 0;
  // camera tween state
  var tween = null;         // {fromPos, toPos, fromLook, toLook, t, dur}
  var look = null;          // current look target (Vector3)
  var orbit = { az: 0, el: 0 };   // user drag offsets, decay back to 0

  var C = {
    bg: 0x05070a, grid: 0x10161e,
    power: 0xf5a623, cool: 0x37c8e8, net: 0xb18cff,
    fuel: 0xe87a37, shell: 0x2a3442, hot: 0xff5d5d, scr: 0x9fe8c0
  };

  function group(zoneId) { return zones[zoneId].group; }

  function lineMat(color) {
    return new THREE.LineBasicMaterial({ color: color, transparent: true, opacity: 0.8 });
  }
  function faceMat(color) {
    return new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.13 });
  }

  function addShape(geo, x, y, z, color, g, rotY) {
    var mesh = new THREE.Mesh(geo, faceMat(color));
    mesh.position.set(x, y, z);
    if (rotY) mesh.rotation.y = rotY;
    g.add(mesh);
    var lm = lineMat(color);
    var edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lm);
    edges.position.copy(mesh.position);
    if (rotY) edges.rotation.y = rotY;
    g.add(edges);
    g.userData.mats.push(lm);
    return mesh;
  }
  function box(w, h, d, x, z, color, g, rotY) {
    return addShape(new THREE.BoxGeometry(w, h, d), x, h / 2, z, color, g, rotY || 0);
  }
  function cyl(r, h, x, z, color, g, seg) {
    return addShape(new THREE.CylinderGeometry(r, r, h, seg || 10), x, h / 2, z, color, g, 0);
  }

  function newZone(id, label, cx, cz, camOff) {
    var g = new THREE.Group();
    g.userData.mats = [];
    g.position.set(cx, 0, cz);
    scene.add(g);
    zones[id] = {
      label: label,
      center: new THREE.Vector3(cx, 2.5, cz),
      camPos: new THREE.Vector3(cx + camOff[0], camOff[1], cz + camOff[2]),
      group: g
    };
    return g;
  }

  /* ---------- build the campus ---------- */
  function build() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(C.bg);
    scene.fog = new THREE.Fog(C.bg, 60, 220);

    var grid = new THREE.GridHelper(400, 80, C.grid, C.grid);
    grid.position.y = 0.01;
    scene.add(grid);

    var g, i, r;

    /* SUBSTATION YARD */
    g = newZone('yard', 'SUBSTATION YARD · 115kV → 34.5kV', -62, 6, [16, 11, 22]);
    for (i = 0; i < 2; i++) {            // transformers
      box(7, 6, 5, i * 12 - 6, 0, C.power, g);
      cyl(0.5, 8.5, i * 12 - 8.5, -1.5, C.power, g, 6);   // bushing stack
      box(1.2, 4, 5, i * 12 - 2, 0, C.power, g);          // radiator fins
    }
    // lattice pylon + incoming line
    cyl(0.35, 16, -16, -8, C.power, g, 4);
    cyl(0.35, 16, -12, -8, C.power, g, 4);
    box(6, 0.4, 0.4, -14, -8, C.power, g).position.y = 15;
    // fence posts
    for (i = 0; i < 9; i++) cyl(0.12, 2.4, -18 + i * 4.5, 9, C.shell, g, 4);

    /* SWITCHGEAR */
    g = newZone('switchgear', 'MV SWITCHGEAR · ATS LINEUP', -30, 6, [10, 8, 18]);
    for (r = 0; r < 2; r++) for (i = 0; i < 6; i++) box(2.6, 4.4, 2, i * 3.1 - 7.5, r * 7 - 3.5, C.power, g);
    box(3.4, 5, 2.6, 11, -3.5, C.hot, g);   // the ATS, called out in red
    box(3.4, 5, 2.6, 11, 3.5, C.power, g);  // STS twin

    /* GENERATOR YARD */
    g = newZone('genyard', 'GENERATOR YARD · N+1 GENSETS', -32, -38, [14, 10, 20]);
    for (i = 0; i < 3; i++) {
      var gx = i * 11 - 11;
      box(8, 4.5, 3.6, gx, 0, C.fuel, g);             // genset block
      box(1.6, 5.5, 3.6, gx - 4.5, 0, C.fuel, g);     // radiator
      cyl(0.4, 7.5, gx + 3, -1, C.shell, g, 6);       // exhaust stack
      box(2.2, 2, 1.6, gx, 3.4, C.fuel, g);           // day tank
    }
    cyl(3.2, 5.5, 16, -2, C.fuel, g, 14);             // bulk fuel storage

    /* UPS GALLERY */
    g = newZone('ups', 'UPS GALLERY · RIDE-THROUGH', -2, 6, [9, 8, 17]);
    for (i = 0; i < 5; i++) box(2.4, 4.6, 2.2, i * 3 - 6, -4, C.power, g);   // UPS modules
    for (r = 0; r < 2; r++) for (i = 0; i < 8; i++) {                        // battery strings
      box(1.4, 2.2, 1.1, i * 1.8 - 6.3, r * 3 + 1.5, C.scr, g);
    }

    /* WHITE SPACE */
    g = newZone('whitespace', 'DATA HALL A · WHITE SPACE', 36, 6, [13, 10, 21]);
    for (r = 0; r < 4; r++) {
      for (i = 0; i < 8; i++) box(1.9, 4.8, 1.1, i * 2.3 - 8, r * 4.4 - 6.6, C.cool, g);
      box(2.2, 4.8, 1.4, 11.5, r * 4.4 - 6.6, C.power, g);   // PDU at row end
    }
    // overhead busway
    for (r = 0; r < 2; r++) box(22, 0.5, 0.5, 1, r * 8.8 - 4.4, C.power, g).position.y = 6.2;
    // containment roof over the middle aisles
    box(20, 0.25, 4.4, 0.5, -2.2, C.cool, g).position.y = 5.2;

    /* COOLING PLANT */
    g = newZone('cooling', 'CHILLER PLANT · CRAH ROW', 36, -38, [13, 9, 19]);
    for (i = 0; i < 2; i++) {
      box(9, 4.2, 4, i * 12 - 5, -2, C.cool, g);            // chillers
      cyl(0.9, 2.6, i * 12 - 9.5, 3, C.cool, g, 8);         // pumps
    }
    for (i = 0; i < 4; i++) box(2.2, 4.4, 1.6, i * 3 + 8, 4.5, C.cool, g);  // CRAH units
    box(26, 0.45, 0.45, 2, -6.5, C.cool, g).position.y = 5; // chilled water header

    /* COOLING TOWERS */
    g = newZone('towers', 'HEAT REJECTION · TOWERS', 72, -38, [12, 11, 18]);
    for (i = 0; i < 2; i++) {
      box(7, 5, 7, i * 10 - 5, 0, C.cool, g);
      cyl(2.6, 1.6, i * 10 - 5, 0, C.cool, g, 12).position.y = 5.8;  // fan shroud
    }

    /* MEET-ME ROOM */
    g = newZone('mmr', 'MEET-ME ROOM · CROSS-CONNECTS', 72, 6, [9, 7, 15]);
    for (r = 0; r < 2; r++) for (i = 0; i < 5; i++) box(1.4, 4.6, 1, i * 2 - 4, r * 4 - 2, C.net, g);
    // diverse entry conduits from opposite sides
    box(9, 0.4, 0.4, -7.5, -2, C.net, g).position.y = 0.6;
    box(9, 0.4, 0.4, 7.5, 2, C.net, g).position.y = 0.6;

    /* NOC */
    g = newZone('noc', 'NOC · OPERATIONS FLOOR', 0, -38, [10, 7, 15]);
    box(13, 4.2, 0.5, 0, -4, C.scr, g);                       // screen wall
    for (i = 0; i < 3; i++) {
      box(3.4, 1.1, 1.4, i * 4.5 - 4.5, 0, C.shell, g);       // desks
      box(1.1, 0.8, 0.15, i * 4.5 - 4.5, -0.4, C.scr, g).position.y = 1.5;
    }

    /* EXTERIOR overview pseudo-zone: shell outlines around the rooms */
    g = newZone('ext', 'HELIOS CAMPUS · 36MW BUILD-TO-SUIT', 5, -16, [55, 42, 70]);
    var shells = [[-30, 6, 26, 18], [-2, 6, 22, 18], [36, 6, 30, 20], [72, 6, 16, 14],
                  [-32, -38, 34, 16], [36, -38, 32, 18], [72, -38, 20, 16], [0, -38, 18, 14]];
    shells.forEach(function (s) {
      var geo = new THREE.BoxGeometry(s[2], 7.5, s[3]);
      var lm = lineMat(C.shell);
      var e = new THREE.LineSegments(new THREE.EdgesGeometry(geo), lm);
      e.position.set(s[0] - g.position.x, 3.75, s[1] - g.position.z);
      g.add(e);
      g.userData.mats.push(lm);
    });
  }

  /* ---------- camera ---------- */
  function flyTo(id) {
    if (failed || !zones[id]) return;
    if (!camera) return;
    var z = zones[id];
    tween = {
      fromPos: camera.position.clone(),
      toPos: z.camPos.clone(),
      fromLook: look.clone(),
      toLook: z.center.clone(),
      t: 0,
      dur: active === null ? 0.01 : 1.9
    };
    orbit.az = 0; orbit.el = 0;
    active = id;
    return z.label;
  }

  function ease(t) { return t * t * (3 - 2 * t); }

  function frame(dt) {
    clockT += dt;
    if (tween) {
      tween.t += dt / tween.dur;
      var k = ease(Math.min(1, tween.t));
      camera.position.lerpVectors(tween.fromPos, tween.toPos, k);
      // arc the dolly up slightly mid-flight for the walking feel
      camera.position.y += Math.sin(Math.min(1, tween.t) * Math.PI) * 6;
      look.lerpVectors(tween.fromLook, tween.toLook, k);
      if (tween.t >= 1) tween = null;
    } else if (active) {
      // idle sway + user drag offsets around the zone anchor
      var z = zones[active];
      var base = z.camPos.clone().sub(z.center);
      var sway = Math.sin(clockT * 0.25) * 0.06 + orbit.az;
      var rotated = base.clone().applyAxisAngle(new THREE.Vector3(0, 1, 0), sway);
      rotated.y = Math.max(3, base.y + orbit.el * 18);
      camera.position.copy(z.center).add(rotated);
      look.copy(z.center);
      // drag offsets relax back to center
      orbit.az *= 0.97; orbit.el *= 0.97;
    }
    camera.lookAt(look);

    // pulse the active zone, dim the rest
    for (var id in zones) {
      var mats = zones[id].group.userData.mats;
      var op = (id === active) ? (0.62 + 0.38 * Math.sin(clockT * 3.2)) : 0.34;
      if (id === active && active === 'ext') op = 0.85;
      for (var i = 0; i < mats.length; i++) mats[i].opacity = op;
    }
    renderer.render(scene, camera);
  }

  var rafId = null, lastT = 0;
  function loop(t) {
    if (!running) return;
    if (!renderer.domElement.isConnected) { running = false; rafId = null; return; }
    var dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
    lastT = t;
    frame(dt);
    rafId = requestAnimationFrame(loop);
  }

  /* ---------- touch look-around ---------- */
  function bindDrag(elm) {
    var px = 0, py = 0, down = false;
    function start(e) { down = true; var p = e.touches ? e.touches[0] : e; px = p.clientX; py = p.clientY; }
    function move(e) {
      if (!down) return;
      var p = e.touches ? e.touches[0] : e;
      orbit.az += (p.clientX - px) * 0.006;
      orbit.el += (p.clientY - py) * 0.004;
      orbit.el = Math.max(-0.5, Math.min(0.9, orbit.el));
      px = p.clientX; py = p.clientY;
      e.preventDefault();
    }
    function end() { down = false; }
    elm.addEventListener('touchstart', start, { passive: true });
    elm.addEventListener('touchmove', move, { passive: false });
    elm.addEventListener('touchend', end);
    elm.addEventListener('mousedown', start);
    elm.addEventListener('mousemove', move);
    elm.addEventListener('mouseup', end);
    elm.addEventListener('mouseleave', end);
  }

  /* ---------- public ---------- */
  function ensure() {
    if (failed) return false;
    if (renderer) return true;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      camera = new THREE.PerspectiveCamera(50, 1.6, 0.5, 400);
      camera.position.set(60, 50, 80);
      look = new THREE.Vector3(0, 0, 0);
      build();
      bindDrag(renderer.domElement);
      return true;
    } catch (e) {
      failed = true;
      renderer = null;
      return false;
    }
  }

  function mount(container) {
    if (!ensure()) return false;
    container.appendChild(renderer.domElement);
    var w = container.clientWidth || 360, h = container.clientHeight || 260;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!running) { running = true; lastT = 0; rafId = requestAnimationFrame(loop); }
    return true;
  }

  window.addEventListener('resize', function () {
    if (!renderer || !renderer.domElement.isConnected) return;
    var c = renderer.domElement.parentElement;
    if (!c) return;
    renderer.setSize(c.clientWidth, c.clientHeight);
    camera.aspect = c.clientWidth / c.clientHeight;
    camera.updateProjectionMatrix();
  });

  return { mount: mount, flyTo: flyTo, zoneLabel: function (id) { return zones[id] ? zones[id].label : ''; } };
})();
