/* CRITICAL LOAD — maps each episode's teach beats to a campus zone */
window.Tour = (function () {
  'use strict';
  /* One zone per concept, in episode order. 'ext' = campus overview. */
  var MAP = {
    e1: ['yard', 'yard', 'switchgear', 'ups', 'genyard', 'switchgear', 'ups', 'whitespace'],
    e2: ['ups', 'genyard', 'ups', 'switchgear', 'switchgear', 'ups', 'ext'],
    e3: ['cooling', 'cooling', 'towers', 'whitespace', 'whitespace', 'towers', 'whitespace'],
    e4: ['whitespace', 'whitespace', 'whitespace', 'whitespace', 'ext', 'ups'],
    e5: ['mmr', 'mmr', 'mmr', 'mmr', 'yard', 'mmr'],
    e6: ['noc', 'noc', 'noc', 'noc', 'noc', 'noc'],
    e7: ['noc', 'genyard', 'switchgear', 'ups', 'ext', 'ext'],
    e8: ['switchgear', 'noc', 'yard', 'cooling', 'noc', 'noc'],
    e9: ['ups', 'noc', 'switchgear', 'ext', 'noc', 'noc']
  };
  return {
    zoneFor: function (epId, conceptIdx) {
      var zones = MAP[epId];
      if (!zones) return 'ext';
      return zones[conceptIdx] || 'ext';
    }
  };
})();
