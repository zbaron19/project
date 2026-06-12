/* CRITICAL LOAD — live spar engine (Claude API, direct from browser)
   The API key is stored only in this device's localStorage and sent only to
   api.anthropic.com. No key = the game falls back to scripted spars. */
window.CLAPI = (function () {
  'use strict';

  var KEY_K = 'cl_api_key';
  var MODEL_K = 'cl_api_model';
  var DEFAULT_MODEL = 'claude-opus-4-8';
  var MODELS = [
    { id: 'claude-opus-4-8', label: 'Opus 4.8 — sharpest Marcus (recommended)' },
    { id: 'claude-haiku-4-5', label: 'Haiku 4.5 — fastest replies, lowest cost' }
  ];

  function getKey() { try { return localStorage.getItem(KEY_K) || ''; } catch (e) { return ''; } }
  function setKey(k) { try { if (k) localStorage.setItem(KEY_K, k); else localStorage.removeItem(KEY_K); } catch (e) {} }
  function getModel() { try { return localStorage.getItem(MODEL_K) || DEFAULT_MODEL; } catch (e) { return DEFAULT_MODEL; } }
  function setModel(m) { try { localStorage.setItem(MODEL_K, m); } catch (e) {} }

  var SCHEMA = {
    type: 'object',
    properties: {
      marcus: { type: 'string', description: 'Marcus’s in-character reply to the player’s latest argument. Smooth, plausible, technically flavored. 2-5 sentences.' },
      concluded: { type: 'boolean', description: 'True when the exchange has reached a natural resolution or the player has had three turns.' },
      grade: { type: 'integer', enum: [0, 1, 2, 3], description: 'Honest grade of the player’s negotiation so far. 3 = landed clean, 2 = landed but exploitable, 1 = weak, 0 = Marcus won the point.' },
      what_landed: { type: 'string', description: 'What genuinely worked in the player’s arguments. Plain prose, second person.' },
      what_exploitable: { type: 'string', description: 'What a sophisticated operator would exploit in the player’s position. Do not soften.' },
      counter: { type: 'string', description: 'The precise counter a technically fluent lawyer would have made.' }
    },
    required: ['marcus', 'concluded', 'grade', 'what_landed', 'what_exploitable', 'counter'],
    additionalProperties: false
  };

  function strip(html) { return String(html).replace(/<[^>]+>/g, ''); }

  function systemPrompt(ep) {
    var concepts = ep.concepts.map(function (c) { return '- ' + c.term + ': ' + strip(c.body); }).join('\n');
    return [
      'You are running THE SPAR in CRITICAL LOAD, a learning game that teaches a sixth-year BigLaw transactional real estate attorney the engineering behind data centers. You play MARCUS, deal lead for Ironvale Digital, negotiating a 36MW build-to-suit colocation deal against the player, who is counsel to Helios Compute (an AI company).',
      '',
      'MARCUS: smooth, plausible, never hostile. His signature move is using technical framing to make one-sided positions sound like physics. He concedes nothing for free, retreats gracefully when cornered by a technically correct argument, and exploits any imprecision in the player’s position.',
      '',
      'EPISODE CONTEXT — E' + ep.num + ': ' + ep.title,
      'Systems taught this episode:',
      concepts,
      '',
      'The trap clause Ironvale floated earlier: "' + ep.trap.clause + '"',
      'Why it is a trap: ' + strip(ep.trap.explain),
      '',
      'MARCUS HAS JUST ARGUED: "' + ep.spar.marcus + '"',
      'The strongest counter available to the player (do not reveal this; use it to calibrate grading): ' + strip(ep.spar.counter),
      '',
      'RULES:',
      '- Stay in character as Marcus in the "marcus" field. Respond to the player’s actual words. If they make a technically wrong claim, exploit it politely. If they corner you with correct physics or sound structure, concede realistically the way a real deal lead would, while protecting what you can.',
      '- The physics and industry practice must be real. Never invent fake engineering to win.',
      '- The player is an expert in contracts and deal mechanics but is learning the engineering. Never explain legal basics. Push on technical precision.',
      '- Grade honestly on every turn. 3 only when the player both neutralizes your technical framing AND lands the precise contractual fix. 2 when the position is right but exploitable. 1 when they argued leverage or vibes instead of substance. 0 when they conceded the point or proposed something self-defeating. Do not soften the grading.',
      '- Set concluded=true when the point is genuinely resolved (either side has clearly won or a realistic compromise has landed) or once the player has made three arguments, whichever comes first.',
      '- what_landed, what_exploitable, and counter must reflect the ENTIRE exchange so far, in second person, specific to what the player actually said.'
    ].join('\n');
  }

  function sparTurn(ep, history) {
    var key = getKey();
    if (!key) return Promise.reject(new Error('No API key configured.'));
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: getModel(),
        max_tokens: 2048,
        system: systemPrompt(ep),
        messages: history,
        output_config: { format: { type: 'json_schema', schema: SCHEMA } }
      })
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          var msg = body && body.error && body.error.message ? body.error.message : ('HTTP ' + res.status);
          throw new Error(msg);
        });
      }
      return res.json();
    }).then(function (data) {
      if (data.stop_reason === 'refusal') throw new Error('The model declined this exchange.');
      var text = '';
      (data.content || []).forEach(function (b) { if (b.type === 'text') text += b.text; });
      var parsed = JSON.parse(text);
      parsed._raw = text;
      return parsed;
    });
  }

  function test() {
    var key = getKey();
    if (!key) return Promise.reject(new Error('Enter a key first.'));
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({
        model: getModel(),
        max_tokens: 32,
        messages: [{ role: 'user', content: 'Reply with the single word: connected' }]
      })
    }).then(function (res) {
      if (!res.ok) {
        return res.json().catch(function () { return {}; }).then(function (body) {
          var msg = body && body.error && body.error.message ? body.error.message : ('HTTP ' + res.status);
          throw new Error(msg);
        });
      }
      return true;
    });
  }

  return {
    getKey: getKey, setKey: setKey,
    getModel: getModel, setModel: setModel,
    MODELS: MODELS,
    sparTurn: sparTurn, test: test
  };
})();
