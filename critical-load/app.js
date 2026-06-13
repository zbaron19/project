/* CRITICAL LOAD — game engine */
(function () {
  'use strict';

  var EPISODES = [].concat(window.DATA1, window.DATA2, window.DATA3, [window.BOSS]);
  var STORE_KEY = 'critical-load-v1';
  var BOSS_UNLOCK = 6; // episodes completed before E10 opens

  var state = load();
  var app = document.getElementById('app');

  function load() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return { done: {}, quiz: { asked: 0, correct: 0 } };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function clear() { app.innerHTML = ''; window.scrollTo(0, 0); }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function gradeFor(pts, max) {
    var p = pts / max;
    if (p >= 0.85) return 'A';
    if (p >= 0.65) return 'B';
    if (p >= 0.45) return 'C';
    if (p >= 0.25) return 'D';
    return 'F';
  }
  function doneCount() {
    var n = 0;
    for (var k in state.done) if (k !== 'e10') n++;
    return n;
  }

  function header(title, sub, backFn) {
    var h = el('div', 'header');
    h.appendChild(el('div', 'header-label', 'Critical Load'));
    h.appendChild(el('h1', null, esc(title)));
    if (sub) h.appendChild(el('div', 'header-sub', sub));
    if (backFn) {
      var b = el('button', 'back-btn', '&larr; Map');
      b.onclick = backFn;
      h.appendChild(b);
    }
    return h;
  }

  /* ================= HOME / MAP ================= */
  function renderHome() {
    clear();
    var n = doneCount();
    app.appendChild(header('CRITICAL LOAD', 'A technical academy for deal counsel &middot; Helios v. Ironvale, 36MW'));

    var banner = el('div', 'progress-banner');
    if (n === 0) {
      banner.innerHTML = 'Dee is waiting at the security mantrap. You are counsel to <b>Helios Compute</b> on a 36MW build-to-suit with <b>Ironvale Digital</b>. Tour the facility, learn the systems, then use them at the table. Start with <b>E1: The Power Chain</b>.';
    } else if (!state.done.e10) {
      var left = BOSS_UNLOCK - n;
      banner.innerHTML = '<b>' + n + ' of 9</b> systems toured. ' +
        (n >= BOSS_UNLOCK ? 'The <b>Redline Gauntlet</b> is open. Marcus has sent paper.' :
         'Complete ' + left + ' more episode' + (left === 1 ? '' : 's') + ' to unlock the <b>Redline Gauntlet</b>.');
    } else {
      banner.innerHTML = 'Campaign complete. Gauntlet grade: <b>' + state.done.e10.grade + '</b>. Replay any episode to raise your grade, or hit Quiz to keep the recall sharp.';
    }
    app.appendChild(banner);

    var actions = el('div', 'home-actions');
    var qBtn = el('button', 'home-action', 'Quiz<small>recall round</small>');
    qBtn.onclick = renderQuiz;
    var gBtn = el('button', 'home-action', 'Glossary<small>banked terms</small>');
    gBtn.onclick = renderGlossary;
    var sBtn = el('button', 'home-action', 'Spar AI<small>' + (liveSparReady() ? 'live: on' : 'set up') + '</small>');
    sBtn.onclick = renderSettings;
    var rBtn = el('button', 'home-action', 'Reset<small>wipe progress</small>');
    rBtn.onclick = function () {
      if (confirm('Wipe all progress and grades?')) {
        state = { done: {}, quiz: { asked: 0, correct: 0 } };
        save(); renderHome();
      }
    };
    actions.appendChild(qBtn); actions.appendChild(gBtn); actions.appendChild(sBtn); actions.appendChild(rBtn);
    app.appendChild(actions);

    app.appendChild(el('div', 'section-label', 'Campaign Map'));
    var list = el('div', 'ep-list');
    EPISODES.forEach(function (ep) {
      var locked = ep.boss && doneCount() < BOSS_UNLOCK;
      var card = el('div', 'ep-card' + (locked ? ' locked' : ''));
      card.appendChild(el('div', 'ep-icon', ep.icon));
      var info = el('div', 'ep-info');
      info.appendChild(el('div', 'ep-num', 'Episode ' + ep.num));
      info.appendChild(el('div', 'ep-title', esc(ep.title)));
      info.appendChild(el('div', 'ep-tag', esc(ep.tagline)));
      card.appendChild(info);
      var st = el('div', 'ep-status');
      var rec = state.done[ep.id];
      if (locked) st.innerHTML = '<span class="grade-none">&#128274;</span>';
      else if (rec) st.innerHTML = '<span class="grade-chip grade-' + rec.grade + '">' + rec.grade + '</span>';
      else st.innerHTML = '<span class="grade-none">&#9675;</span>';
      card.appendChild(st);
      card.onclick = function () {
        if (locked) return;
        if (ep.boss) startBoss(ep); else startEpisode(ep);
      };
      list.appendChild(card);
    });
    app.appendChild(list);
  }

  /* ================= EPISODE PLAYER ================= */
  function startEpisode(ep) {
    var steps = [];
    steps.push({ t: 'walk' });
    ep.concepts.forEach(function (c, i) { steps.push({ t: 'concept', i: i }); });
    steps.push({ t: 'warstory' });
    steps.push({ t: 'bites' });
    steps.push({ t: 'trap' });
    steps.push({ t: 'fix' });
    steps.push({ t: 'spar' });
    ep.bank.forEach(function (q, i) { steps.push({ t: 'bank', i: i }); });
    steps.push({ t: 'card' });
    steps.push({ t: 'results' });

    var run = { ep: ep, steps: steps, idx: 0, pts: 0, max: 2 + 3 + ep.bank.length, trapRight: null, sparPick: null };
    renderStep(run);
  }

  var PHASES = { walk: 'The Walk', concept: 'The Teardown', warstory: 'The Teardown', bites: 'Where It Bites', trap: 'Where It Bites', fix: 'Where It Bites', spar: 'The Spar', bank: 'The Bank', card: 'The Bank', results: 'Debrief' };

  function phaseBar(run) {
    var wrap = el('div', 'phase-bar');
    var step = run.steps[run.idx];
    wrap.appendChild(el('div', 'phase-label', 'E' + run.ep.num + ' &middot; ' + PHASES[step.t]));
    var track = el('div', 'phase-track');
    run.steps.forEach(function (s, i) {
      track.appendChild(el('div', 'phase-seg' + (i <= run.idx ? ' done' : '')));
    });
    wrap.appendChild(track);
    return wrap;
  }

  function nextBtn(run, label) {
    var row = el('div', 'btn-row');
    var b = el('button', 'btn', label || 'Continue');
    b.onclick = function () { run.idx++; renderStep(run); };
    row.appendChild(b);
    return row;
  }

  /* ---------- 3D walkthrough viewport ---------- */
  function vizPref() {
    try { return localStorage.getItem('cl_3d') !== 'off'; } catch (e) { return true; }
  }
  function mountViz(run, step) {
    var zone = step.t === 'walk' ? 'ext' : (window.Tour ? Tour.zoneFor(run.ep.id, step.i) : 'ext');
    if (!vizPref()) {
      var on = el('button', 'viz-restore', 'Show 3D walkthrough');
      on.onclick = function () {
        try { localStorage.setItem('cl_3d', 'on'); } catch (e) {}
        renderStep(run);
      };
      app.appendChild(on);
      return;
    }
    if (!(window.World && World.mount)) return;
    var vp = el('div', 'viz');
    app.appendChild(vp);
    if (!World.mount(vp)) { vp.remove(); return; }
    var label = World.flyTo(zone) || '';
    vp.appendChild(el('div', 'viz-label', esc(label)));
    var off = el('button', 'viz-toggle', '2D');
    off.onclick = function () {
      try { localStorage.setItem('cl_3d', 'off'); } catch (e) {}
      renderStep(run);
    };
    vp.appendChild(off);
    vp.appendChild(el('div', 'viz-hint', 'drag to look around'));
  }

  function renderStep(run) {
    clear();
    var ep = run.ep;
    var step = run.steps[run.idx];
    app.appendChild(header(ep.icon + ' ' + ep.title, null, function () {
      if (confirm('Leave the episode? Progress in it is lost.')) renderHome();
    }));
    app.appendChild(phaseBar(run));
    if (step.t === 'walk' || step.t === 'concept') mountViz(run, step);
    var scene = el('div', 'scene');

    if (step.t === 'walk') {
      scene.appendChild(el('div', 'speaker dee', 'Dee &middot; VP Critical Facilities'));
      ep.walk.forEach(function (p) { scene.appendChild(el('p', null, p)); });
      app.appendChild(scene);
      app.appendChild(nextBtn(run, 'Walk the system'));

    } else if (step.t === 'concept') {
      var c = ep.concepts[step.i];
      scene.appendChild(el('p', 'muted', 'Dee breaks it down (' + (step.i + 1) + ' of ' + ep.concepts.length + '):'));
      var box = el('div', 'term-card-box');
      box.appendChild(el('div', 't-term', esc(c.term)));
      box.appendChild(el('div', 't-body', c.body));
      scene.appendChild(box);
      app.appendChild(scene);
      app.appendChild(nextBtn(run, step.i + 1 < ep.concepts.length ? 'Next' : 'One more thing&hellip;'));

    } else if (step.t === 'warstory') {
      var ws = el('div', 'warstory');
      ws.appendChild(el('div', 'ws-label', '&#128293; War Story'));
      ep.warStory.forEach(function (p) { ws.appendChild(el('p', null, p)); });
      scene.appendChild(ws);
      app.appendChild(scene);
      app.appendChild(nextBtn(run, 'So where does this bite the contract?'));

    } else if (step.t === 'bites') {
      scene.appendChild(el('h2', null, 'Where it bites the contract'));
      ep.bites.forEach(function (b) {
        var row = el('div', 'bite-row');
        row.appendChild(el('div', 'b-where', esc(b.where)));
        row.appendChild(el('div', 'b-what', b.what));
        scene.appendChild(row);
      });
      app.appendChild(scene);
      app.appendChild(nextBtn(run, 'Show me a clause in the wild'));

    } else if (step.t === 'trap') {
      scene.appendChild(el('h2', null, 'Spot the trap'));
      scene.appendChild(el('p', 'muted', 'Ironvale’s draft. One device in here quietly moves money or risk. Read it, then call it.'));
      var cb = el('div', 'clause-box');
      cb.appendChild(el('div', 'clause-label bad', 'Operator draft'));
      cb.appendChild(document.createTextNode(ep.trap.clause));
      scene.appendChild(cb);
      app.appendChild(scene);
      renderMCQ(ep.trap.q, ep.trap.options, ep.trap.correct, ep.trap.explain, function (right) {
        run.trapRight = right;
        if (right) run.pts += 2;
        run.idx++; renderStep(run);
      });

    } else if (step.t === 'fix') {
      scene.appendChild(el('h2', null, 'The fix'));
      var cb2 = el('div', 'clause-box fixed');
      cb2.appendChild(el('div', 'clause-label good', 'Customer markup'));
      cb2.appendChild(document.createTextNode(ep.trap.fix));
      scene.appendChild(cb2);
      if (ep.trap.fixNote) scene.appendChild(el('p', 'muted', ep.trap.fixNote));
      app.appendChild(scene);
      app.appendChild(nextBtn(run, 'Take it to the table'));

    } else if (step.t === 'spar') {
      scene.appendChild(el('h2', null, 'The Spar'));
      if (ep.spar.setup) scene.appendChild(el('p', 'muted', ep.spar.setup));
      scene.appendChild(el('div', 'speaker marcus', 'Marcus &middot; Ironvale deal lead'));
      scene.appendChild(el('p', null, '“' + ep.spar.marcus + '”'));
      if (liveSparReady()) {
        scene.appendChild(el('p', 'muted', 'Live spar: respond in your own words. Marcus argues back. Graded straight, no curve.'));
        app.appendChild(scene);
        renderLiveSpar(run);
      } else {
        scene.appendChild(el('p', 'muted', 'Pick your response. Graded straight, no curve. (Add your API key under Spar AI on the home screen to argue in your own words.)'));
        app.appendChild(scene);
        renderSpar(run);
      }

    } else if (step.t === 'bank') {
      var q = ep.bank[step.i];
      scene.appendChild(el('h2', null, 'The Bank &middot; recall ' + (step.i + 1) + ' of ' + ep.bank.length));
      scene.appendChild(el('p', null, q.q));
      app.appendChild(scene);
      renderMCQ(null, q.options, q.correct, q.explain, function (right) {
        if (right) run.pts += 1;
        run.idx++; renderStep(run);
      });

    } else if (step.t === 'card') {
      scene.appendChild(el('h2', null, 'Term card banked'));
      var tc = el('div', 'term-card-box');
      tc.appendChild(el('div', 't-term', esc(ep.card.term)));
      tc.appendChild(el('div', 't-kind', 'The physical thing'));
      tc.appendChild(el('div', 't-body', ep.card.physical));
      tc.appendChild(el('div', 't-kind', 'Why the contract cares')).style.marginTop = '12px';
      tc.appendChild(el('div', 't-body', ep.card.contractual));
      scene.appendChild(tc);
      app.appendChild(scene);
      app.appendChild(nextBtn(run, 'Debrief'));

    } else if (step.t === 'results') {
      finishRun(run);
    }
  }

  function renderMCQ(prompt, options, correct, explain, onDone) {
    var wrap = el('div', 'choices');
    if (prompt) {
      var p = el('p', null, prompt);
      p.style.cssText = 'font-size:14.5px;font-weight:700;margin-bottom:10px;';
      wrap.appendChild(p);
    }
    var order = shuffle(options.map(function (_, i) { return i; }));
    var btns = [];
    order.forEach(function (origIdx) {
      var b = el('button', 'choice', esc(options[origIdx]));
      b.onclick = function () {
        btns.forEach(function (x) { x.disabled = true; x.classList.add('dimmed'); });
        var right = origIdx === correct;
        b.classList.remove('dimmed');
        b.classList.add(right ? 'correct' : 'wrong');
        if (!right) {
          btns.forEach(function (x, k) {
            if (order[k] === correct) { x.classList.remove('dimmed'); x.classList.add('correct'); }
          });
        }
        var fb = el('div', 'feedback ' + (right ? 'good' : 'bad'));
        fb.appendChild(el('div', 'fb-grade', right ? 'Called it' : 'Missed it'));
        fb.appendChild(el('div', null, explain));
        app.appendChild(fb);
        var row = el('div', 'btn-row');
        var nb = el('button', 'btn', 'Continue');
        nb.onclick = function () { onDone(right); };
        row.appendChild(nb);
        app.appendChild(row);
        nb.scrollIntoView({ behavior: 'smooth', block: 'end' });
      };
      btns.push(b);
      wrap.appendChild(b);
    });
    app.appendChild(wrap);
  }

  function renderSpar(run) {
    var ep = run.ep;
    var wrap = el('div', 'choices');
    var order = shuffle(ep.spar.options.map(function (_, i) { return i; }));
    var btns = [];
    order.forEach(function (origIdx) {
      var opt = ep.spar.options[origIdx];
      var b = el('button', 'choice', esc(opt.text));
      b.onclick = function () {
        btns.forEach(function (x) { x.disabled = true; x.classList.add('dimmed'); });
        b.classList.remove('dimmed');
        var cls = opt.grade >= 3 ? 'good' : (opt.grade >= 2 ? 'mid' : 'bad');
        b.classList.add(opt.grade >= 2 ? 'correct' : 'wrong');
        run.pts += opt.grade;
        run.sparPick = origIdx;
        var fb = el('div', 'feedback ' + cls);
        var label = opt.grade >= 3 ? 'Landed clean' : opt.grade === 2 ? 'Landed, but exploitable' : opt.grade === 1 ? 'Marcus is smiling' : 'Marcus just won the point';
        fb.appendChild(el('div', 'fb-grade', label + ' &middot; ' + opt.grade + '/3'));
        fb.appendChild(el('div', null, opt.feedback));
        app.appendChild(fb);
        if (opt.grade < 3 && ep.spar.counter) {
          var fc = el('div', 'feedback good');
          fc.appendChild(el('div', 'fb-grade', 'The counter a fluent lawyer makes'));
          fc.appendChild(el('div', null, ep.spar.counter));
          app.appendChild(fc);
        }
        var row = el('div', 'btn-row');
        var nb = el('button', 'btn', 'Bank it');
        nb.onclick = function () { run.idx++; renderStep(run); };
        row.appendChild(nb);
        app.appendChild(row);
        nb.scrollIntoView({ behavior: 'smooth', block: 'end' });
      };
      btns.push(b);
      wrap.appendChild(b);
    });
    app.appendChild(wrap);
  }

  /* ================= LIVE SPAR (Claude API) ================= */
  function liveSparReady() {
    return !!(window.CLAPI && window.CLAPI.getKey());
  }

  function renderLiveSpar(run) {
    var ep = run.ep;
    var convo = [];      // API message history
    var playerTurns = 0;
    var last = null;     // most recent parsed result

    var thread = el('div', 'spar-thread');
    app.appendChild(thread);

    var inputWrap = el('div', 'spar-input');
    var ta = el('textarea', 'spar-ta');
    ta.placeholder = 'Your response to Marcus…';
    ta.rows = 3;
    var btnRow = el('div', 'spar-btns');
    var sendBtn = el('button', 'btn', 'Send');
    var endBtn = el('button', 'btn secondary', 'End spar & get graded');
    endBtn.style.display = 'none';
    btnRow.appendChild(sendBtn);
    btnRow.appendChild(endBtn);
    inputWrap.appendChild(ta);
    inputWrap.appendChild(btnRow);
    app.appendChild(inputWrap);

    function bubble(who, text) {
      var b = el('div', 'bubble ' + who);
      b.appendChild(el('div', 'speaker ' + (who === 'marcus' ? 'marcus' : 'dee'), who === 'marcus' ? 'Marcus' : 'You'));
      b.appendChild(el('p', null, esc(text)));
      thread.appendChild(b);
      b.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    function conclude() {
      inputWrap.remove();
      var g = last ? last.grade : 0;
      run.pts += g;
      var cls = g >= 3 ? 'good' : (g >= 2 ? 'mid' : 'bad');
      var label = g >= 3 ? 'Landed clean' : g === 2 ? 'Landed, but exploitable' : g === 1 ? 'Marcus is smiling' : 'Marcus just won the point';
      var fb = el('div', 'feedback ' + cls);
      fb.appendChild(el('div', 'fb-grade', label + ' &middot; ' + g + '/3'));
      if (last) {
        fb.appendChild(el('div', null, '<b>What landed:</b> ' + esc(last.what_landed)));
        var fx = el('div', null, '<b>What a sophisticated operator would exploit:</b> ' + esc(last.what_exploitable));
        fx.style.marginTop = '8px';
        fb.appendChild(fx);
      }
      app.appendChild(fb);
      if (last && g < 3) {
        var fc = el('div', 'feedback good');
        fc.appendChild(el('div', 'fb-grade', 'The counter a fluent lawyer makes'));
        fc.appendChild(el('div', null, esc(last.counter)));
        app.appendChild(fc);
      }
      var row = el('div', 'btn-row');
      var nb = el('button', 'btn', 'Bank it');
      nb.onclick = function () { run.idx++; renderStep(run); };
      row.appendChild(nb);
      app.appendChild(row);
      nb.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }

    function fallbackToScripted(errMsg) {
      thread.remove();
      inputWrap.remove();
      var note = el('div', 'feedback bad');
      note.appendChild(el('div', 'fb-grade', 'Live spar unavailable'));
      note.appendChild(el('div', null, esc(errMsg) + ' Falling back to the scripted spar.'));
      app.appendChild(note);
      renderSpar(run);
    }

    function send() {
      var text = ta.value.trim();
      if (!text) return;
      ta.value = '';
      playerTurns++;
      bubble('player', text);
      convo.push({ role: 'user', content: text });
      sendBtn.disabled = true;
      endBtn.disabled = true;
      sendBtn.textContent = 'Marcus is thinking…';
      window.CLAPI.sparTurn(ep, convo).then(function (parsed) {
        last = parsed;
        convo.push({ role: 'assistant', content: parsed._raw });
        bubble('marcus', parsed.marcus);
        if (parsed.concluded || playerTurns >= 3) {
          conclude();
        } else {
          sendBtn.disabled = false;
          endBtn.disabled = false;
          sendBtn.textContent = 'Send';
          endBtn.style.display = 'block';
          ta.focus();
        }
      }).catch(function (err) {
        if (last) {
          // mid-spar failure: grade on what we have rather than losing the run
          conclude();
        } else {
          fallbackToScripted(err && err.message ? err.message : 'Request failed.');
        }
      });
    }

    sendBtn.onclick = send;
    endBtn.onclick = conclude;
  }

  /* ================= SETTINGS ================= */
  function renderSettings() {
    clear();
    app.appendChild(header('Spar AI', 'Live free-text sparring against Marcus', renderHome));
    var scene = el('div', 'scene');
    scene.appendChild(el('p', null, 'With an Anthropic API key, THE SPAR becomes live: you argue in your own words, Marcus argues back, and Claude grades the exchange. Without a key, spars use the scripted multiple-choice mode.'));
    scene.appendChild(el('p', 'muted', 'Your key is stored only on this device and sent only to api.anthropic.com. A spar costs a few cents at most. Get a key at console.anthropic.com.'));
    app.appendChild(scene);

    var wrap = el('div', 'choices');
    var input = el('input', 'settings-input');
    input.type = 'password';
    input.placeholder = 'sk-ant-…';
    input.value = window.CLAPI ? window.CLAPI.getKey() : '';
    wrap.appendChild(input);

    var sel = el('select', 'settings-input');
    (window.CLAPI ? window.CLAPI.MODELS : []).forEach(function (m) {
      var o = el('option', null, esc(m.label));
      o.value = m.id;
      if (window.CLAPI.getModel() === m.id) o.selected = true;
      sel.appendChild(o);
    });
    wrap.appendChild(sel);

    var status = el('div', 'settings-status');
    wrap.appendChild(status);
    app.appendChild(wrap);

    var row = el('div', 'btn-row');
    var saveBtn = el('button', 'btn', 'Save & test connection');
    saveBtn.onclick = function () {
      window.CLAPI.setKey(input.value.trim());
      window.CLAPI.setModel(sel.value);
      if (!input.value.trim()) {
        status.textContent = 'Key cleared. Spars will use scripted mode.';
        return;
      }
      status.textContent = 'Testing…';
      window.CLAPI.test().then(function () {
        status.textContent = '✓ Connected. Live sparring is on.';
      }).catch(function (err) {
        status.textContent = '✗ ' + (err && err.message ? err.message : 'Connection failed.');
      });
    };
    var clearBtn = el('button', 'btn secondary', 'Remove key from this device');
    clearBtn.onclick = function () {
      window.CLAPI.setKey('');
      input.value = '';
      status.textContent = 'Key removed.';
    };
    row.appendChild(saveBtn);
    row.appendChild(clearBtn);
    app.appendChild(row);
  }

  function finishRun(run) {
    var ep = run.ep;
    var grade = gradeFor(run.pts, run.max);
    var prev = state.done[ep.id];
    var ORDER = { A: 5, B: 4, C: 3, D: 2, F: 1 };
    if (!prev || ORDER[grade] > ORDER[prev.grade]) {
      state.done[ep.id] = { grade: grade, pts: run.pts, max: run.max };
    }
    save();
    clear();
    app.appendChild(header(ep.icon + ' ' + ep.title, 'Episode complete'));
    var rg = el('div', 'results-grade g' + grade);
    rg.appendChild(el('div', 'rg-big', grade));
    rg.appendChild(el('div', 'rg-pts', run.pts + ' / ' + run.max + ' leverage points' + (prev && ORDER[grade] <= ORDER[prev.grade] ? ' &middot; best grade kept: ' + state.done[ep.id].grade : '')));
    app.appendChild(rg);
    var scene = el('div', 'scene');
    scene.appendChild(el('div', 'speaker dee', 'Dee'));
    scene.appendChild(el('p', null, ep.debrief && ep.debrief[grade] ? ep.debrief[grade] : debriefLine(grade)));
    app.appendChild(scene);
    var row = el('div', 'btn-row');
    var b1 = el('button', 'btn', 'Back to the map');
    b1.onclick = renderHome;
    var b2 = el('button', 'btn secondary', 'Replay episode');
    b2.onclick = function () { if (ep.boss) startBoss(ep); else startEpisode(ep); };
    row.appendChild(b1); row.appendChild(b2);
    app.appendChild(row);
  }

  function debriefLine(g) {
    if (g === 'A') return '“Twenty-five years and I don’t say this much: I’d let you redline my own employment agreement. Next system.”';
    if (g === 'B') return '“Solid. You’d survive that meeting. But Marcus gets paid to find the one thing you left soft, and there was one. Walk it again sometime.”';
    if (g === 'C') return '“You got the shape of it. But shape doesn’t survive a redline. Run the teardown again before you sit across from Marcus with real money on the table.”';
    return '“If this had been the real negotiation, your client just bought a different building than the one they think they bought. Again. From the top.”';
  }

  /* ================= BOSS ================= */
  function startBoss(ep) {
    var run = { ep: ep, idx: -1, pts: 0, max: ep.clauses.length * 2 };
    renderBossStep(run);
  }

  function renderBossStep(run) {
    clear();
    var ep = run.ep;
    app.appendChild(header(ep.icon + ' ' + ep.title, null, function () {
      if (confirm('Leave the gauntlet? Progress in it is lost.')) renderHome();
    }));
    var scene = el('div', 'scene');

    if (run.idx === -1) {
      scene.appendChild(el('div', 'speaker marcus', 'Marcus'));
      ep.intro.forEach(function (p) { scene.appendChild(el('p', null, p)); });
      app.appendChild(scene);
      var row = el('div', 'btn-row');
      var b = el('button', 'btn', 'Open the redline');
      b.onclick = function () { run.idx = 0; renderBossStep(run); };
      row.appendChild(b);
      app.appendChild(row);
      return;
    }

    if (run.idx >= ep.clauses.length) {
      run.steps = []; run.bank = [];
      finishBoss(run);
      return;
    }

    var c = ep.clauses[run.idx];
    scene.appendChild(el('h2', null, 'Clause ' + (run.idx + 1) + ' of ' + ep.clauses.length + ': ' + esc(c.title)));
    var cb = el('div', 'clause-box');
    cb.appendChild(el('div', 'clause-label bad', 'Ironvale draft'));
    cb.appendChild(document.createTextNode(c.clause));
    scene.appendChild(cb);
    app.appendChild(scene);
    renderMCQ(c.q || 'Where is the trap?', c.options, c.correct, c.priya, function (right) {
      if (right) run.pts += 2;
      run.idx++; renderBossStep(run);
    });
  }

  function finishBoss(run) {
    var ep = run.ep;
    var grade = gradeFor(run.pts, run.max);
    var prev = state.done[ep.id];
    var ORDER = { A: 5, B: 4, C: 3, D: 2, F: 1 };
    if (!prev || ORDER[grade] > ORDER[prev.grade]) {
      state.done[ep.id] = { grade: grade, pts: run.pts, max: run.max };
    }
    save();
    clear();
    app.appendChild(header(ep.icon + ' ' + ep.title, 'Gauntlet complete'));
    var rg = el('div', 'results-grade g' + grade);
    rg.appendChild(el('div', 'rg-big', grade));
    rg.appendChild(el('div', 'rg-pts', run.pts + ' / ' + run.max + ' &middot; graded by the commissioning agent'));
    app.appendChild(rg);
    var scene = el('div', 'scene');
    scene.appendChild(el('div', 'speaker priya', 'Priya &middot; Commissioning agent'));
    scene.appendChild(el('p', null, ep.outro[grade] || ep.outro.C));
    app.appendChild(scene);
    var row = el('div', 'btn-row');
    var b1 = el('button', 'btn', 'Back to the map');
    b1.onclick = renderHome;
    var b2 = el('button', 'btn secondary', 'Run it again');
    b2.onclick = function () { startBoss(ep); };
    row.appendChild(b1); row.appendChild(b2);
    app.appendChild(row);
  }

  /* ================= QUIZ ================= */
  function renderQuiz() {
    var pool = [];
    EPISODES.forEach(function (ep) {
      if (!state.done[ep.id] || ep.boss) return;
      ep.bank.forEach(function (q) { pool.push({ ep: ep, q: q }); });
      pool.push({ ep: ep, q: { q: ep.trap.q + '\n\n“' + ep.trap.clause + '”', options: ep.trap.options, correct: ep.trap.correct, explain: ep.trap.explain } });
    });
    clear();
    app.appendChild(header('Recall Round', null, renderHome));
    if (pool.length === 0) {
      app.appendChild(el('div', 'empty-note', 'Nothing banked yet. Finish an episode first — the quiz draws from systems you’ve already toured.'));
      return;
    }
    var qs = shuffle(pool).slice(0, 5);
    var i = 0, right = 0;
    function ask() {
      clear();
      app.appendChild(header('Recall Round', null, renderHome));
      if (i >= qs.length) {
        state.quiz.asked += qs.length;
        state.quiz.correct += right;
        save();
        var scene = el('div', 'scene');
        scene.appendChild(el('h2', null, right + ' / ' + qs.length));
        scene.appendChild(el('div', 'speaker dee', 'Dee'));
        scene.appendChild(el('p', null, right === qs.length ? '“Clean sweep. That’s the stuff that wins at 11pm on a redline call.”' : right >= 3 ? '“Most of it stuck. The ones you missed are the ones Marcus is counting on.”' : '“The vocabulary fades fast if you don’t use it. Tour the weak systems again.”'));
        scene.appendChild(el('p', 'muted', 'Lifetime recall: ' + state.quiz.correct + ' / ' + state.quiz.asked));
        app.appendChild(scene);
        var row = el('div', 'btn-row');
        var b = el('button', 'btn', 'Back to the map');
        b.onclick = renderHome;
        row.appendChild(b);
        app.appendChild(row);
        return;
      }
      app.appendChild(el('div', 'quiz-meta', 'Question ' + (i + 1) + ' of ' + qs.length + ' · from E' + qs[i].ep.num));
      var scene = el('div', 'scene');
      var parts = qs[i].q.q.split('\n\n');
      scene.appendChild(el('p', null, esc(parts[0])));
      if (parts[1]) {
        var cb = el('div', 'clause-box');
        cb.appendChild(document.createTextNode(parts[1].replace(/[“”]/g, '')));
        scene.appendChild(cb);
      }
      app.appendChild(scene);
      renderMCQ(null, qs[i].q.options, qs[i].q.correct, qs[i].q.explain, function (ok) {
        if (ok) right++;
        i++; ask();
      });
    }
    ask();
  }

  /* ================= GLOSSARY ================= */
  function renderGlossary() {
    clear();
    app.appendChild(header('Glossary', 'Term cards you’ve banked', renderHome));
    var any = false;
    EPISODES.forEach(function (ep) {
      if (ep.boss || !state.done[ep.id]) return;
      any = true;
      var g = el('div', 'gloss-card');
      g.appendChild(el('div', 'g-term', esc(ep.card.term)));
      g.appendChild(el('div', 'g-src', 'Banked in E' + ep.num + ' · ' + esc(ep.title)));
      var r1 = el('div', 'g-row');
      r1.appendChild(el('div', 'g-k', 'The physical thing'));
      r1.appendChild(el('div', 'g-v', ep.card.physical));
      g.appendChild(r1);
      var r2 = el('div', 'g-row');
      r2.appendChild(el('div', 'g-k', 'Why the contract cares'));
      r2.appendChild(el('div', 'g-v', ep.card.contractual));
      g.appendChild(r2);
      app.appendChild(g);
    });
    if (!any) app.appendChild(el('div', 'empty-note', 'No term cards yet. Each episode banks one term of art — its physical meaning and its contractual significance.'));
  }

  renderHome();
})();
