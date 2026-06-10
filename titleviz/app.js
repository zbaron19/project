/* TitleViz — AI title commitment review.
 *
 * Architecture: zero-build single-page app. The commitment goes directly from
 * this browser to the Anthropic API (no intermediary server), which is what
 * keeps client documents off third-party infrastructure. Structured outputs
 * (output_config.format) guarantee the response parses as JSON.
 *
 * v2 additions: per-exception ALTA endorsement suggestions, extraction of the
 * commitment's hyperlinked underlying documents (PDF.js, mapped to exception
 * numbers), and per-exception deep-dive review of an uploaded instrument.
 */

"use strict";

const API_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-opus-4-8";
const MAX_PDF_BYTES = 30 * 1024 * 1024;
const KEY_STORAGE = "titleviz_api_key";

const state = {
  perspective: "buyer",
  source: "pdf",          // "pdf" | "text"
  fileName: null,
  fileBase64: null,
  pastedText: "",
  result: null,
  docLinks: [],           // [{url, page, exception, label}] from PDF link annotations
  deepDives: {},          // exception number -> deep-dive result
  lastScreen: "home",
};

const $ = (id) => document.getElementById(id);

/* ============================ navigation ============================ */

const SCREENS = ["home", "settings", "working", "error", "report"];

function show(screen) {
  for (const s of SCREENS) $("screen-" + s).hidden = s !== screen;
  if (screen !== "error" && screen !== "working") state.lastScreen = screen;
  window.scrollTo(0, 0);
}

/* ============================ settings ============================ */

function getApiKey() {
  return sessionStorage.getItem(KEY_STORAGE) || localStorage.getItem(KEY_STORAGE) || "";
}

function saveSettings() {
  const key = $("api-key").value.trim();
  if (key) {
    if ($("remember-key").checked) localStorage.setItem(KEY_STORAGE, key);
    else sessionStorage.setItem(KEY_STORAGE, key);
  }
  toast("Settings saved");
  show("home");
}

function forgetKey() {
  localStorage.removeItem(KEY_STORAGE);
  sessionStorage.removeItem(KEY_STORAGE);
  $("api-key").value = "";
  toast("Key removed from this device");
}

/* ============================ intake ============================ */

function setPerspective(p) {
  state.perspective = p;
  document.querySelectorAll(".seg-btn[data-perspective]").forEach((b) => {
    b.classList.toggle("active", b.dataset.perspective === p);
  });
}

function setSource(src) {
  state.source = src;
  document.querySelectorAll(".src-tab").forEach((t) => {
    t.classList.toggle("active", t.dataset.src === src);
  });
  $("src-pdf").hidden = src !== "pdf";
  $("src-text").hidden = src !== "text";
  updateAnalyzeButton();
}

function updateAnalyzeButton() {
  const ready =
    state.source === "pdf" ? !!state.fileBase64 : $("text-input").value.trim().length > 200;
  $("btn-analyze").disabled = !ready;
}

function readBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // result is "data:<mime>;base64,<data>"
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1]);
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.readAsDataURL(file);
  });
}

async function acceptFile(file) {
  if (!file) return;
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    toast("Please choose a PDF file");
    return;
  }
  if (file.size > MAX_PDF_BYTES) {
    toast("That PDF is over 30 MB — try the paste-text option instead");
    return;
  }
  try {
    state.fileBase64 = await readBase64(file);
  } catch (err) {
    toast(err.message);
    return;
  }
  state.fileName = file.name;
  $("file-chip-name").textContent = file.name;
  $("file-chip").hidden = false;
  updateAnalyzeButton();

  state.docLinks = [];
  extractDocLinks(file).then((n) => {
    if (n) toast(`Found ${n} linked document${n === 1 ? "" : "s"} in the commitment`);
  }).catch((err) => console.warn("Link extraction skipped:", err));
}

function clearFile() {
  state.fileBase64 = null;
  state.fileName = null;
  state.docLinks = [];
  $("file-input").value = "";
  $("file-chip").hidden = true;
  updateAnalyzeButton();
}

/* ============================ hyperlink extraction ============================ */
/* Many commitments hyperlink each Schedule B-II exception to the recorded
 * underlying document. PDF.js reads those link annotations; we map each link
 * to the nearest exception number printed at or above it on the page. */

const ANCHOR_RE = /^\s*(?:exception|item)?\s*(\d+[a-z]?)\s*[.):]/i;

// Group text items into lines by rounded y, return [{y, num}] for lines that
// start with a list number. Items: [{str, transform}] (transform[4]=x, [5]=y).
function findExceptionAnchors(items) {
  const lines = new Map();
  for (const it of items) {
    if (!it.str || !it.str.trim()) continue;
    const y = Math.round(it.transform[5]);
    if (!lines.has(y)) lines.set(y, []);
    lines.get(y).push(it);
  }
  const anchors = [];
  for (const [y, parts] of lines) {
    parts.sort((a, b) => a.transform[4] - b.transform[4]);
    const text = parts.map((p) => p.str).join(" ");
    const m = text.match(ANCHOR_RE);
    if (m) anchors.push({ y, num: m[1].toLowerCase() });
  }
  return anchors.sort((a, b) => b.y - a.y); // PDF y grows upward: top of page first
}

// The exception a link belongs to is the numbered line at or above it.
function nearestAnchor(anchors, linkY) {
  let best = null;
  for (const a of anchors) {
    if (a.y >= linkY - 2 && (best === null || a.y < best.y)) best = a;
  }
  return best ? best.num : "";
}

function linkLabel(items, rect) {
  const [, y1, , y2] = rect;
  const parts = items
    .filter((it) => it.str && it.transform[5] >= y1 - 2 && it.transform[5] <= y2 + 2)
    .sort((a, b) => a.transform[4] - b.transform[4])
    .map((it) => it.str)
    .join(" ")
    .trim();
  return parts.slice(0, 90) || "Linked document";
}

async function extractDocLinks(file) {
  if (!window.pdfjsLib) return 0;
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjsLib.getDocument({ data }).promise;
  const links = [];
  const seen = new Set();
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const [annots, text] = await Promise.all([page.getAnnotations(), page.getTextContent()]);
    const anchors = findExceptionAnchors(text.items);
    for (const a of annots) {
      if (a.subtype !== "Link" || !a.url || !/^https?:/i.test(a.url)) continue;
      const linkY = (a.rect[1] + a.rect[3]) / 2;
      const exception = nearestAnchor(anchors, linkY);
      const key = exception + "|" + a.url;
      if (seen.has(key)) continue;
      seen.add(key);
      links.push({ url: a.url, page: p, exception, label: linkLabel(text.items, a.rect) });
    }
  }
  state.docLinks = links;
  return links.length;
}

const normNum = (s) => String(s || "").toLowerCase().replace(/[^0-9a-z]/g, "");

function linksForException(number) {
  const n = normNum(number);
  return state.docLinks.filter((l) => l.exception && normNum(l.exception) === n);
}

/* ============================ analysis schema ============================ */

const RISK_ENUM = ["high", "medium", "low"];

const REPORT_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "object",
      properties: {
        property_description: { type: "string", description: "Street address or legal-description shorthand of the insured property" },
        commitment_date: { type: "string", description: "Effective date of the commitment, or 'not stated'" },
        underwriter: { type: "string", description: "Title insurance underwriter and issuing agent, if stated" },
        proposed_insured: { type: "string", description: "Proposed insured party/parties, if stated" },
        policy_amount: { type: "string", description: "Policy amount(s), if stated" },
        estate_or_interest: { type: "string", description: "Estate or interest to be insured (fee simple, leasehold, etc.)" },
        overall_risk: { type: "string", enum: RISK_ENUM },
        headline: { type: "string", description: "Two or three sentences: the overall picture and the single most important thing to act on" }
      },
      required: ["property_description", "commitment_date", "underwriter", "proposed_insured", "policy_amount", "estate_or_interest", "overall_risk", "headline"],
      additionalProperties: false
    },
    priority_items: {
      type: "array",
      description: "The 3-6 items to act on first, most urgent first, each one sentence with the exception/requirement number it refers to",
      items: { type: "string" }
    },
    exceptions: {
      type: "array",
      description: "Every Schedule B-II exception, in order",
      items: {
        type: "object",
        properties: {
          number: { type: "string", description: "Exception number as printed, e.g. '7' or '7(a)'" },
          title: { type: "string", description: "Short label, e.g. 'Reciprocal Easement Agreement (1987)'" },
          plain_english: { type: "string", description: "What this exception actually is and what it does to the property, in plain English" },
          risk: { type: "string", enum: RISK_ENUM },
          perspective_concerns: { type: "string", description: "Why this matters (or doesn't) specifically from the selected perspective" },
          recommended_action: { type: "string", description: "Concrete next step: accept, obtain and review the document, request deletion, negotiate endorsement, escrow holdback, etc." },
          removal_outlook: { type: "string", enum: ["likely_removable", "possibly_removable", "stays_on_policy"], description: "Whether the title company would plausibly delete or insure over this exception if asked" },
          suggested_endorsements: {
            type: "array",
            description: "ALTA (or state-equivalent) endorsements worth requesting to mitigate this specific exception, each as a short string like 'ALTA 28.1-06 — encroachments'. Empty array if none applies.",
            items: { type: "string" }
          }
        },
        required: ["number", "title", "plain_english", "risk", "perspective_concerns", "recommended_action", "removal_outlook", "suggested_endorsements"],
        additionalProperties: false
      }
    },
    requirements: {
      type: "array",
      description: "Every Schedule B-I requirement, in order",
      items: {
        type: "object",
        properties: {
          number: { type: "string" },
          plain_english: { type: "string", description: "What must happen before the policy issues, in plain English" },
          responsible_party: { type: "string", description: "Who typically handles this: seller, buyer, lender, escrow, title company" },
          flag: { type: "string", description: "One short note if this requirement hides a problem (e.g. unreleased deed of trust, gap in vesting); empty string if routine" }
        },
        required: ["number", "plain_english", "responsible_party", "flag"],
        additionalProperties: false
      }
    },
    questions_for_title: {
      type: "array",
      description: "Ready-to-send questions for the title officer / escrow, phrased professionally",
      items: { type: "string" }
    }
  },
  required: ["summary", "priority_items", "exceptions", "requirements", "questions_for_title"],
  additionalProperties: false
};

const DEEP_DIVE_SCHEMA = {
  type: "object",
  properties: {
    instrument: { type: "string", description: "What this document is: instrument type, parties, date, recording information if shown" },
    matches_exception: { type: "string", description: "Whether this document plausibly is the instrument described in the exception; if it appears to be a different document, say so plainly" },
    plain_english_summary: { type: "string", description: "What this document does to the property, in plain English" },
    key_provisions: {
      type: "array",
      description: "The provisions that matter for the deal, each one sentence",
      items: { type: "string" }
    },
    risks: {
      type: "array",
      description: "Specific risks found in the document text",
      items: {
        type: "object",
        properties: {
          description: { type: "string" },
          severity: { type: "string", enum: RISK_ENUM }
        },
        required: ["description", "severity"],
        additionalProperties: false
      }
    },
    recommended_position: { type: "string", description: "Concrete recommendation: accept as-is, negotiate (what), cure (how), endorsement to request, or escalate to counsel" },
    rating_effect: { type: "string", enum: ["raises", "confirms", "lowers"], description: "Whether reading the actual document raises, confirms, or lowers the risk relative to the initial exception rating" }
  },
  required: ["instrument", "matches_exception", "plain_english_summary", "key_provisions", "risks", "recommended_position", "rating_effect"],
  additionalProperties: false
};

function buildSystemPrompt() {
  const perspectiveBlock =
    state.perspective === "lender"
      ? `PERSPECTIVE: You are reviewing for the LENDER. Focus on lien priority, insurability of the mortgage/deed of trust, exceptions that could prime or impair the lien (taxes, assessments, mechanics' liens, prior encumbrances), survey and access issues affecting collateral value, and which endorsements a lender would customarily require.`
      : `PERSPECTIVE: You are reviewing for the BUYER / PURCHASER. Focus on what each exception means for the buyer's intended ownership and use: monetary liens that must be paid off, use restrictions and reverters, easements that burden development or operations, leases and parties in possession, and anything that should be objected to or cured before closing.`;

  return [
    "You are a senior commercial real estate title attorney reviewing a title insurance commitment (ALTA or state form).",
    perspectiveBlock,
    `METHOD:
1. Read Schedule A first to orient yourself (property, estate, proposed insured, amount, effective date).
2. Walk Schedule B-I (Requirements) item by item. Flag any requirement that signals a hidden problem rather than routine closing mechanics.
3. Walk Schedule B-II (Exceptions) item by item, in order, without skipping any. Number them exactly as printed. If the same instrument appears in multiple exceptions, note the connection.
4. Standard preprinted/general exceptions (taxes not yet due, parties in possession, survey matters, mechanics' liens not of record) are usually low risk but say which can customarily be deleted with an owner's affidavit, survey, or extended coverage — and note that practice varies by state and underwriter.
RISK CALIBRATION: 'high' = could block closing, impair the insured interest, or cost real money if unaddressed (unreleased monetary liens, reverters, defects in the chain, unsubordinated interests). 'medium' = needs the underlying document reviewed or an endorsement/negotiation (REAs, restrictive covenants, significant easements). 'low' = routine and customarily accepted or deleted.
ENDORSEMENTS: For each exception, suggest the ALTA (or state-equivalent) endorsement(s) that would mitigate it, tailored to the perspective — e.g. 9-series (restrictions/encroachments), 17/17.1 (access), 22 (location), 25 (same as survey), 28-series (easements/encroachments); for lenders include the customary lender package items where the exceptions call for them. Leave the list empty when no endorsement helps. Endorsement availability varies by state and underwriter — phrase as items to request, not promises.
STYLE: Plain English a sophisticated non-lawyer client can follow. State the main point first, qualifications second. Never bluff: if the commitment text is unclear, cut off, or the underlying document is needed to assess the exception, say exactly that in the recommended action.`,
  ].join("\n\n");
}

function buildUserContent() {
  const context = $("deal-context").value.trim();
  const ask =
    `Review the attached title commitment from the ${state.perspective} perspective and produce the full structured report.` +
    (context ? `\n\nDeal context from the reviewer: ${context}` : "");

  if (state.source === "pdf") {
    return [
      {
        type: "document",
        source: { type: "base64", media_type: "application/pdf", data: state.fileBase64 },
        title: state.fileName || "Title Commitment",
      },
      { type: "text", text: ask },
    ];
  }
  return [
    { type: "text", text: ask + "\n\n--- COMMITMENT TEXT ---\n\n" + $("text-input").value.trim() },
  ];
}

/* ============================ API call ============================ */

// One structured call to the Messages API. Returns {ok:true, result} or
// {ok:false, message, needKey?}. Reads the raw body first, then parses —
// avoids double-consume issues and surfaces non-JSON error bodies verbatim.
async function callStructured({ system, content, schema, maxTokens = 16000 }) {
  const apiKey = getApiKey();
  if (!apiKey) return { ok: false, needKey: true, message: "Add your Anthropic API key first" };

  const body = {
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: "adaptive" },
    system,
    output_config: { format: { type: "json_schema", schema } },
    messages: [{ role: "user", content }],
  };

  let response;
  try {
    response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true",
        "content-type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return {
      ok: false,
      message:
        "Network error reaching the Claude API.\n\n" + err.message +
        "\n\nCheck your connection. If you are on a corporate network, api.anthropic.com may be blocked.",
    };
  }

  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, message: `The API returned an unexpected response (HTTP ${response.status}):\n\n${raw.slice(0, 2000)}` };
  }

  if (!response.ok) {
    const msg = data?.error?.message || raw.slice(0, 2000);
    const hint =
      response.status === 401 ? "\n\nYour API key looks invalid — re-enter it in Settings."
      : response.status === 429 ? "\n\nRate limited — wait a minute and retry."
      : response.status === 529 ? "\n\nThe API is overloaded — retry in a moment."
      : "";
    return { ok: false, message: `API error (HTTP ${response.status}): ${msg}${hint}` };
  }

  const blocks = Array.isArray(data.content) ? data.content : [];
  const textBlock = blocks.find((b) => b.type === "text");
  if (!textBlock) {
    return { ok: false, message: "The API response contained no analysis text.\n\n" + JSON.stringify(data).slice(0, 2000) };
  }
  if (data.stop_reason === "max_tokens") {
    return {
      ok: false,
      message: "The analysis ran out of room before finishing — this document may be unusually long.\n\nTry splitting it, or paste only the relevant schedules as text.",
    };
  }

  try {
    return { ok: true, result: JSON.parse(textBlock.text) };
  } catch (err) {
    return { ok: false, message: "Could not parse the analysis as JSON:\n\n" + err.message + "\n\n" + textBlock.text.slice(0, 1500) };
  }
}

async function analyze() {
  show("working");
  state.deepDives = {};

  const out = await callStructured({
    system: buildSystemPrompt(),
    content: buildUserContent(),
    schema: REPORT_SCHEMA,
  });

  if (!out.ok) {
    if (out.needKey) {
      toast(out.message);
      show("settings");
      $("api-key").focus();
      return;
    }
    return showError(out.message);
  }

  state.result = out.result;
  renderReport(out.result);
  show("report");
}

function showError(message) {
  $("error-message").textContent = message;
  show("error");
}

/* ============================ deep dive ============================ */

function findException(number) {
  return (state.result?.exceptions || []).find((e) => normNum(e.number) === normNum(number));
}

async function deepDive(number, file, resultDiv) {
  const exc = findException(number);
  if (!exc) return;
  if (file.size > MAX_PDF_BYTES) {
    toast("That PDF is over 30 MB");
    return;
  }

  resultDiv.innerHTML = `<p class="dd-status">Reading the document…</p>`;

  let base64;
  try {
    base64 = await readBase64(file);
  } catch (err) {
    resultDiv.innerHTML = `<p class="dd-status dd-error">${esc(err.message)}</p>`;
    return;
  }

  const system =
    `You are a senior commercial real estate title attorney. You previously reviewed a title commitment from the ${state.perspective} perspective. ` +
    `Now you are reading ONE recorded instrument that underlies a single Schedule B-II exception. Analyze only this document, against this deal. ` +
    `Quote or pinpoint the provisions that drive your conclusions. Never bluff: if pages are missing or illegible, say so.`;

  const content = [
    {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: base64 },
      title: file.name,
    },
    {
      type: "text",
      text:
        `This document was uploaded as the instrument underlying Schedule B-II exception ${exc.number} — "${exc.title}".\n\n` +
        `Initial read of the exception (from the commitment alone): ${exc.plain_english}\n` +
        `Initial risk rating: ${exc.risk}. Concern: ${exc.perspective_concerns}\n\n` +
        `Review the document itself from the ${state.perspective} perspective and produce the structured deep-dive report.`,
    },
  ];

  const out = await callStructured({ system, content, schema: DEEP_DIVE_SCHEMA, maxTokens: 8000 });

  if (!out.ok) {
    resultDiv.innerHTML = `<p class="dd-status dd-error">${esc(out.message)}</p><button type="button" class="link-btn dd-retry">Try another file</button>`;
    if (out.needKey) { show("settings"); $("api-key").focus(); }
    return;
  }

  state.deepDives[exc.number] = { ...out.result, file_name: file.name };
  resultDiv.innerHTML = deepDiveHtml(out.result, file.name);
}

const RATING_EFFECT_LABEL = {
  raises: "Reading the document RAISES the risk vs. the initial rating",
  confirms: "Reading the document confirms the initial rating",
  lowers: "Reading the document lowers the risk vs. the initial rating",
};

function deepDiveHtml(d, fileName) {
  return `
  <div class="dd-card">
    <p class="dd-kicker">Deep-dive · ${esc(fileName)}</p>
    <p><strong>${esc(d.instrument)}</strong></p>
    ${normNum(d.matches_exception).includes("yes") ? "" : `<p class="dd-match">${esc(d.matches_exception)}</p>`}
    <p>${esc(d.plain_english_summary)}</p>
    ${(d.key_provisions || []).length ? `<p class="lbl">Key provisions</p><ul>${d.key_provisions.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>` : ""}
    ${(d.risks || []).length ? `<p class="lbl">Risks in the document</p><ul>${d.risks.map((r) => `<li><span class="badge ${esc(r.severity)}">${esc(r.severity)}</span> ${esc(r.description)}</li>`).join("")}</ul>` : ""}
    <p><span class="lbl">Recommended position:</span> ${esc(d.recommended_position)}</p>
    <p class="dd-effect ${esc(d.rating_effect)}">${esc(RATING_EFFECT_LABEL[d.rating_effect] || d.rating_effect)}</p>
  </div>`;
}

/* ============================ rendering ============================ */

function esc(s) {
  const d = document.createElement("div");
  d.textContent = s == null ? "" : String(s);
  return d.innerHTML;
}

function riskLabel(r) {
  return { high: "High risk", medium: "Medium risk", low: "Low risk" }[r] || r;
}

const REMOVAL_LABEL = {
  likely_removable: "Likely removable on request (affidavit / extended coverage)",
  possibly_removable: "Possibly removable — worth asking the title company",
  stays_on_policy: "Expect this to stay on the policy",
};

function aggregateEndorsements(result) {
  const seen = new Map(); // endorsement -> [exception numbers]
  for (const e of result.exceptions || []) {
    for (const end of e.suggested_endorsements || []) {
      const key = end.trim();
      if (!key) continue;
      if (!seen.has(key)) seen.set(key, []);
      seen.get(key).push(e.number);
    }
  }
  return [...seen.entries()].map(([endorsement, nums]) => ({ endorsement, exceptions: nums }));
}

function renderReport(r) {
  const s = r.summary;
  $("rpt-perspective").textContent =
    (state.perspective === "lender" ? "Lender" : "Buyer") + " perspective · " + MODEL_LABEL();
  $("rpt-property").textContent = s.property_description;
  $("rpt-meta").textContent = [
    s.proposed_insured && "Proposed insured: " + s.proposed_insured,
    s.estate_or_interest,
    s.policy_amount && "Amount: " + s.policy_amount,
    "Effective " + s.commitment_date,
    s.underwriter,
  ].filter(Boolean).join(" · ");

  const gauge = $("rpt-risk-badge");
  gauge.className = "risk-gauge " + s.overall_risk;
  gauge.textContent = "Overall: " + riskLabel(s.overall_risk);

  $("rpt-headline").textContent = s.headline;

  $("rpt-priority").innerHTML = (r.priority_items || [])
    .map((p) => `<li>${esc(p)}</li>`).join("");
  $("rpt-priority-wrap").style.display = (r.priority_items || []).length ? "" : "none";

  $("rpt-exceptions").innerHTML = (r.exceptions || []).map((e) => {
    const links = linksForException(e.number);
    const dive = state.deepDives[e.number];
    return `
    <div class="exc-card ${esc(e.risk)}" data-risk="${esc(e.risk)}">
      <div class="exc-top">
        <span class="exc-title"><span class="exc-num">B‑II ${esc(e.number)}</span>${esc(e.title)}</span>
        <span class="badge ${esc(e.risk)}">${esc(riskLabel(e.risk))}</span>
      </div>
      <p class="exc-plain">${esc(e.plain_english)}</p>
      <p class="exc-row"><span class="lbl">Why it matters to you:</span> ${esc(e.perspective_concerns)}</p>
      <p class="exc-row"><span class="lbl">Recommended action:</span> ${esc(e.recommended_action)}</p>
      ${(e.suggested_endorsements || []).length
        ? `<p class="exc-row"><span class="lbl">Endorsements to request:</span> ${esc(e.suggested_endorsements.join("; "))}</p>` : ""}
      ${links.length
        ? `<p class="exc-row exc-links"><span class="lbl">Linked documents:</span> ${links.map((l) =>
            `<a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a>`).join(" · ")}</p>` : ""}
      <p class="exc-removal">${esc(REMOVAL_LABEL[e.removal_outlook] || e.removal_outlook)}</p>
      <div class="deep-dive" data-num="${esc(e.number)}">
        <div class="no-print">
          <button type="button" class="btn-secondary dd-btn">Deep-dive: upload the underlying document</button>
          <input type="file" accept="application/pdf" class="dd-input" hidden>
        </div>
        <div class="dd-result">${dive ? deepDiveHtml(dive, dive.file_name) : ""}</div>
      </div>
    </div>`;
  }).join("");

  // consolidated endorsement request list
  const ends = aggregateEndorsements(r);
  $("rpt-endorsements").innerHTML = ends
    .map((x) => `<li>${esc(x.endorsement)} <span class="muted">(exception${x.exceptions.length > 1 ? "s" : ""} ${esc(x.exceptions.join(", "))})</span></li>`)
    .join("");
  $("rpt-endorsements-wrap").style.display = ends.length ? "" : "none";

  // links the mapper couldn't tie to a numbered exception
  const orphans = state.docLinks.filter((l) => !l.exception);
  $("rpt-doclinks").innerHTML = orphans
    .map((l) => `<li><a href="${esc(l.url)}" target="_blank" rel="noopener noreferrer">${esc(l.label)}</a> <span class="muted">(p. ${esc(l.page)})</span></li>`)
    .join("");
  $("rpt-doclinks-wrap").style.display = orphans.length ? "" : "none";

  $("rpt-requirements").innerHTML = (r.requirements || []).map((q) => `
    <div class="req-item">
      <span class="req-num">B‑I ${esc(q.number)}</span>
      <span>${esc(q.plain_english)}
        ${q.flag ? `<strong style="color:var(--high)"> ⚑ ${esc(q.flag)}</strong>` : ""}
        <span class="req-party"> — ${esc(q.responsible_party)}</span>
      </span>
    </div>`).join("");

  $("rpt-questions").innerHTML = (r.questions_for_title || [])
    .map((q) => `<li>${esc(q)}</li>`).join("");

  setExceptionFilter("all");
}

function MODEL_LABEL() {
  return state.result === window.TITLEVIZ_DEMO ? "sample data" : "TitleViz";
}

function setExceptionFilter(filter) {
  document.querySelectorAll(".seg-btn[data-filter]").forEach((b) => {
    b.classList.toggle("active", b.dataset.filter === filter);
  });
  document.querySelectorAll(".exc-card").forEach((c) => {
    c.style.display = filter === "all" || c.dataset.risk === filter ? "" : "none";
  });
}

/* ============================ memo export ============================ */

function buildMemo(r) {
  const s = r.summary;
  const lines = [];
  lines.push(`# Title Commitment Review — ${s.property_description}`);
  lines.push("");
  lines.push(`*Perspective:* ${state.perspective === "lender" ? "Lender" : "Buyer"}  `);
  lines.push(`*Effective date:* ${s.commitment_date}  `);
  if (s.proposed_insured) lines.push(`*Proposed insured:* ${s.proposed_insured}  `);
  if (s.policy_amount) lines.push(`*Policy amount:* ${s.policy_amount}  `);
  if (s.underwriter) lines.push(`*Underwriter:* ${s.underwriter}  `);
  lines.push(`*Overall risk:* ${riskLabel(s.overall_risk)}`);
  lines.push("");
  lines.push(s.headline);
  lines.push("");
  if ((r.priority_items || []).length) {
    lines.push("## Priority items");
    r.priority_items.forEach((p, i) => lines.push(`${i + 1}. ${p}`));
    lines.push("");
  }
  lines.push("## Schedule B-II — Exceptions");
  lines.push("");
  for (const e of r.exceptions || []) {
    lines.push(`### ${e.number}. ${e.title} — ${riskLabel(e.risk)}`);
    lines.push(e.plain_english);
    lines.push(`- **Concern:** ${e.perspective_concerns}`);
    lines.push(`- **Action:** ${e.recommended_action}`);
    if ((e.suggested_endorsements || []).length) {
      lines.push(`- **Endorsements to request:** ${e.suggested_endorsements.join("; ")}`);
    }
    const links = linksForException(e.number);
    if (links.length) {
      lines.push(`- **Linked documents:** ${links.map((l) => `[${l.label}](${l.url})`).join("; ")}`);
    }
    lines.push(`- **Removal outlook:** ${REMOVAL_LABEL[e.removal_outlook] || e.removal_outlook}`);
    const d = state.deepDives[e.number];
    if (d) {
      lines.push("");
      lines.push(`#### Deep-dive: ${d.file_name}`);
      lines.push(d.instrument);
      lines.push("");
      lines.push(d.plain_english_summary);
      for (const k of d.key_provisions || []) lines.push(`- ${k}`);
      for (const risk of d.risks || []) lines.push(`- **${riskLabel(risk.severity)}:** ${risk.description}`);
      lines.push(`- **Recommended position:** ${d.recommended_position}`);
      lines.push(`- ${RATING_EFFECT_LABEL[d.rating_effect] || d.rating_effect}`);
    }
    lines.push("");
  }
  const ends = aggregateEndorsements(r);
  if (ends.length) {
    lines.push("## Endorsement request list");
    lines.push("");
    for (const x of ends) lines.push(`- ${x.endorsement} *(exceptions ${x.exceptions.join(", ")})*`);
    lines.push("");
  }
  lines.push("## Schedule B-I — Requirements");
  lines.push("");
  for (const q of r.requirements || []) {
    lines.push(`- **${q.number}.** ${q.plain_english} *(${q.responsible_party})*${q.flag ? ` — ⚑ ${q.flag}` : ""}`);
  }
  lines.push("");
  if ((r.questions_for_title || []).length) {
    lines.push("## Questions for the title officer");
    lines.push("");
    r.questions_for_title.forEach((q) => lines.push(`- ${q}`));
    lines.push("");
  }
  lines.push("---");
  lines.push("*AI-assisted first-pass review generated with TitleViz. Not legal advice; verify against the underlying exception documents.*");
  return lines.join("\n");
}

async function copyMemo() {
  if (!state.result) return;
  try {
    await navigator.clipboard.writeText(buildMemo(state.result));
    toast("Memo copied to clipboard");
  } catch {
    toast("Clipboard unavailable — use Download instead");
  }
}

function downloadMemo() {
  if (!state.result) return;
  const blob = new Blob([buildMemo(state.result)], { type: "text/markdown" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "title-review.md";
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ============================ misc ============================ */

let toastTimer;
function toast(msg) {
  const t = $("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
}

function loadDemo() {
  state.perspective = "buyer";
  state.result = window.TITLEVIZ_DEMO;
  state.docLinks = [];
  state.deepDives = {};
  renderReport(window.TITLEVIZ_DEMO);
  show("report");
  toast("This is a sample review of a fictional commitment");
}

/* ============================ wiring ============================ */

document.addEventListener("DOMContentLoaded", () => {
  if (window.pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  // perspective + source
  document.querySelectorAll(".seg-btn[data-perspective]").forEach((b) =>
    b.addEventListener("click", () => setPerspective(b.dataset.perspective)));
  document.querySelectorAll(".src-tab").forEach((t) =>
    t.addEventListener("click", () => setSource(t.dataset.src)));

  // dropzone
  const dz = $("dropzone");
  dz.addEventListener("click", () => $("file-input").click());
  dz.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") $("file-input").click(); });
  dz.addEventListener("dragover", (e) => { e.preventDefault(); dz.classList.add("dragover"); });
  dz.addEventListener("dragleave", () => dz.classList.remove("dragover"));
  dz.addEventListener("drop", (e) => {
    e.preventDefault();
    dz.classList.remove("dragover");
    acceptFile(e.dataTransfer.files[0]);
  });
  $("file-input").addEventListener("change", (e) => acceptFile(e.target.files[0]));
  $("file-clear").addEventListener("click", clearFile);
  $("text-input").addEventListener("input", updateAnalyzeButton);

  // actions
  $("btn-analyze").addEventListener("click", analyze);
  $("btn-retry").addEventListener("click", analyze);
  $("btn-error-home").addEventListener("click", () => show("home"));
  $("btn-new-review").addEventListener("click", () => show("home"));

  // settings
  $("nav-settings").addEventListener("click", () => {
    $("api-key").value = getApiKey();
    show("settings");
  });
  $("btn-save-settings").addEventListener("click", saveSettings);
  $("btn-forget-key").addEventListener("click", forgetKey);

  // demo
  $("nav-demo").addEventListener("click", loadDemo);

  // report
  document.querySelectorAll(".seg-btn[data-filter]").forEach((b) =>
    b.addEventListener("click", () => setExceptionFilter(b.dataset.filter)));
  $("btn-copy-memo").addEventListener("click", copyMemo);
  $("btn-download-memo").addEventListener("click", downloadMemo);
  $("btn-print").addEventListener("click", () => window.print());

  // deep-dive controls are re-rendered with the report — delegate
  $("rpt-exceptions").addEventListener("click", (e) => {
    const wrap = e.target.closest(".deep-dive");
    if (!wrap) return;
    if (e.target.closest(".dd-btn") || e.target.closest(".dd-retry")) {
      wrap.querySelector(".dd-input").click();
    }
  });
  $("rpt-exceptions").addEventListener("change", (e) => {
    if (!e.target.classList.contains("dd-input")) return;
    const wrap = e.target.closest(".deep-dive");
    const file = e.target.files[0];
    e.target.value = "";
    if (file) deepDive(wrap.dataset.num, file, wrap.querySelector(".dd-result"));
  });

  updateAnalyzeButton();
});
