/*
 * Parlor — daily deduction mystery engine.
 *
 * Everything is generated client-side from the date string. The generator
 * builds a hidden solution (who carried what, who was where), then greedily
 * assembles clues and verifies — by brute force over all 576 possible
 * worlds — that exactly one solution satisfies them. No servers, no data
 * files, no API. The same date always yields the same puzzle on any device.
 */

(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.Parlor = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  var EPOCH = "2026-06-10"; // Parlor No. 1

  // ---------------------------------------------------------------- casting
  var SUSPECTS = [
    { name: "Colonel Ash", emoji: "🎖️" },
    { name: "Madame Vermillion", emoji: "💄" },
    { name: "Doctor Larkspur", emoji: "🥼" },
    { name: "Professor Quill", emoji: "🦉" },
    { name: "The Heiress", emoji: "💎" },
    { name: "Captain Mireau", emoji: "⚓" },
    { name: "Sister Beatrice", emoji: "📿" },
    { name: "Mr. Greaves the Butler", emoji: "🕯️" },
    { name: "Lady Foxglove", emoji: "🦊" },
    { name: "The Cartographer", emoji: "🗺️" },
    { name: "Miss Wren", emoji: "🪶" },
    { name: "Judge Mortlake", emoji: "⚖️" },
  ];

  var WEAPONS = [
    { name: "the candlestick", emoji: "🕯️" },
    { name: "the letter opener", emoji: "🗡️" },
    { name: "a vial of poison", emoji: "🧪" },
    { name: "the antique revolver", emoji: "🔫" },
    { name: "a silk scarf", emoji: "🧣" },
    { name: "the brass telescope", emoji: "🔭" },
    { name: "a violin string", emoji: "🎻" },
    { name: "the heavy ledger", emoji: "📕" },
    { name: "the fireplace poker", emoji: "🔥" },
    { name: "a hat pin", emoji: "📌" },
    { name: "the croquet mallet", emoji: "🏏" },
    { name: "a bottle of sherry", emoji: "🍾" },
  ];

  var ROOMS = [
    { name: "Library", emoji: "📚" },
    { name: "Conservatory", emoji: "🪴" },
    { name: "Wine Cellar", emoji: "🍷" },
    { name: "Observatory", emoji: "🌙" },
    { name: "Ballroom", emoji: "💃" },
    { name: "Billiard Room", emoji: "🎱" },
    { name: "Portrait Gallery", emoji: "🖼️" },
    { name: "Kitchen", emoji: "🍳" },
    { name: "Greenhouse", emoji: "🌿" },
    { name: "Clock Room", emoji: "🕰️" },
    { name: "Smoking Lounge", emoji: "🚬" },
    { name: "Trophy Hall", emoji: "🏆" },
  ];

  var VICTIMS = [
    "Lord Pemberton", "Baroness von Hatt", "Sir Reginald Crowe",
    "the Dowager Countess", "Mayor Thistlewood", "Admiral Pike",
    "Madame Solange", "Old Man Fennimore", "the Opera Singer",
    "Bishop Caldwell", "the Visiting Magnate", "Duchess Amaranth",
  ];

  var ESTATES = [
    "Blackbriar Manor", "Hollowmere Hall", "the Gilded Swan Hotel",
    "Ravenscourt Abbey", "Thornfield House", "the Meridian Club",
    "Greymoor Lodge", "Candlewick Estate", "the Winter Palace Casino",
    "Foxhollow Grange", "the S.S. Aurelia", "Larkspur Sanatorium",
  ];

  // ------------------------------------------------------------------- rng
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function shuffle(rng, arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  function pick(rng, pool, n) {
    return shuffle(rng, pool).slice(0, n);
  }

  // ---------------------------------------------------------------- solver
  // A "world" is a pair of permutations over [0..3]:
  //   W[s] = index of the weapon suspect s carried
  //   R[s] = index of the room suspect s occupied
  var PERMS4 = (function () {
    var out = [];
    function rec(prefix, rest) {
      if (!rest.length) { out.push(prefix); return; }
      for (var i = 0; i < rest.length; i++) {
        rec(prefix.concat(rest[i]), rest.slice(0, i).concat(rest.slice(i + 1)));
      }
    }
    rec([], [0, 1, 2, 3]);
    return out;
  })();

  function checkClue(c, W, R) {
    switch (c.t) {
      case "SW": return (W[c.s] === c.w) === c.pos;
      case "SR": return (R[c.s] === c.r) === c.pos;
      case "WR": return (R[W.indexOf(c.w)] === c.r) === c.pos;
      case "EW": return W[c.s1] === c.w || W[c.s2] === c.w;
      case "ER": return R[c.s1] === c.r || R[c.s2] === c.r;
      default: throw new Error("unknown clue " + c.t);
    }
  }

  function countSolutions(clues) {
    var count = 0, found = null;
    for (var i = 0; i < 24; i++) {
      for (var j = 0; j < 24; j++) {
        var W = PERMS4[i], R = PERMS4[j], ok = true;
        for (var k = 0; k < clues.length; k++) {
          if (!checkClue(clues[k], W, R)) { ok = false; break; }
        }
        if (ok) { count++; found = { W: W, R: R }; }
      }
    }
    return { count: count, found: found };
  }

  // ------------------------------------------------------------- generator
  function generate(dateStr) {
    var rng = mulberry32(hashStr("parlor:" + dateStr));

    var suspects = pick(rng, SUSPECTS, 4);
    var weapons = pick(rng, WEAPONS, 4);
    var rooms = pick(rng, ROOMS, 4);
    var victim = VICTIMS[Math.floor(rng() * VICTIMS.length)];
    var estate = ESTATES[Math.floor(rng() * ESTATES.length)];

    var W = shuffle(rng, [0, 1, 2, 3]); // suspect -> weapon
    var R = shuffle(rng, [0, 1, 2, 3]); // suspect -> room
    var guilty = Math.floor(rng() * 4);
    var crimeRoom = R[guilty];

    // Candidate clues, all true of the hidden solution. Positives get a low
    // weight so generated puzzles lean on negatives and either/or clues,
    // which force real cross-grid deduction.
    var cands = [];
    var s, w, r;
    for (s = 0; s < 4; s++) {
      for (w = 0; w < 4; w++) {
        var posW = W[s] === w;
        cands.push({ t: "SW", s: s, w: w, pos: posW, wt: posW ? 0.25 : 1 });
      }
      for (r = 0; r < 4; r++) {
        var posR = R[s] === r;
        cands.push({ t: "SR", s: s, r: r, pos: posR, wt: posR ? 0.25 : 1 });
      }
    }
    for (w = 0; w < 4; w++) {
      var holder = W.indexOf(w);
      for (r = 0; r < 4; r++) {
        var posWR = R[holder] === r;
        cands.push({ t: "WR", w: w, r: r, pos: posWR, wt: posWR ? 0.4 : 1 });
      }
      var otherS = (holder + 1 + Math.floor(rng() * 3)) % 4;
      cands.push({ t: "EW", s1: Math.min(holder, otherS), s2: Math.max(holder, otherS), w: w, wt: 1.4 });
    }
    for (r = 0; r < 4; r++) {
      var occupant = R.indexOf(r);
      var otherS2 = (occupant + 1 + Math.floor(rng() * 3)) % 4;
      cands.push({ t: "ER", s1: Math.min(occupant, otherS2), s2: Math.max(occupant, otherS2), r: r, wt: 1.4 });
    }

    // Weighted random order: higher weight sorts earlier on average.
    cands.forEach(function (c) { c.key = Math.pow(rng(), 1 / c.wt); });
    cands.sort(function (a, b) { return b.key - a.key; });

    // Greedy build: add a clue only if it prunes worlds; stop at uniqueness.
    var clues = [];
    var best = countSolutions(clues).count;
    for (var i = 0; i < cands.length && best > 1; i++) {
      var trial = clues.concat(cands[i]);
      var n = countSolutions(trial).count;
      if (n < best) { clues = trial; best = n; }
    }

    // Minimize: drop any clue that isn't needed for uniqueness.
    var order = shuffle(rng, clues.slice());
    for (i = 0; i < order.length; i++) {
      var without = clues.filter(function (c) { return c !== order[i]; });
      if (countSolutions(without).count === 1) clues = without;
    }

    clues = shuffle(rng, clues);

    return {
      date: dateStr,
      number: dayNumber(dateStr),
      suspects: suspects,
      weapons: weapons,
      rooms: rooms,
      victim: victim,
      estate: estate,
      solution: { W: W, R: R, guilty: guilty },
      crimeRoom: crimeRoom,
      clues: clues,
    };
  }

  // ------------------------------------------------------------------ text
  function clueText(p, c) {
    var S = function (i) { return p.suspects[i].name; };
    var Wn = function (i) { return p.weapons[i].name; };
    var Rn = function (i) { return p.rooms[i].name; };
    var cap = function (str) { return str.charAt(0).toUpperCase() + str.slice(1); };
    switch (c.t) {
      case "SW":
        return c.pos
          ? S(c.s) + " was carrying " + Wn(c.w) + "."
          : S(c.s) + " was not carrying " + Wn(c.w) + ".";
      case "SR":
        return c.pos
          ? S(c.s) + " spent the whole evening in the " + Rn(c.r) + "."
          : S(c.s) + " never set foot in the " + Rn(c.r) + ".";
      case "WR":
        return c.pos
          ? cap(Wn(c.w)) + " was seen in the " + Rn(c.r) + "."
          : cap(Wn(c.w)) + " was nowhere near the " + Rn(c.r) + ".";
      case "EW":
        return "Either " + S(c.s1) + " or " + S(c.s2) + " was carrying " + Wn(c.w) + ".";
      case "ER":
        return "Either " + S(c.s1) + " or " + S(c.s2) + " was in the " + Rn(c.r) + ".";
    }
  }

  function story(p) {
    return p.victim + " was found dead at " + p.estate +
      " last night. Four guests remain on the premises. " +
      "Each carried one item; each kept to one room. One of them is lying about everything.";
  }

  function coroner(p) {
    return "The coroner is certain of one thing: " + p.victim +
      " was killed in the " + p.rooms[p.crimeRoom].name + ".";
  }

  function dayNumber(dateStr) {
    var ms = Date.parse(dateStr + "T00:00:00Z") - Date.parse(EPOCH + "T00:00:00Z");
    return Math.round(ms / 86400000) + 1;
  }

  function todayStr(d) {
    d = d || new Date();
    var m = String(d.getMonth() + 1).padStart(2, "0");
    var day = String(d.getDate()).padStart(2, "0");
    return d.getFullYear() + "-" + m + "-" + day;
  }

  return {
    EPOCH: EPOCH,
    generate: generate,
    countSolutions: countSolutions,
    checkClue: checkClue,
    clueText: clueText,
    story: story,
    coroner: coroner,
    dayNumber: dayNumber,
    todayStr: todayStr,
    PERMS4: PERMS4,
  };
});
