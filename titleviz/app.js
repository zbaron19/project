/* TitleViz — AI title commitment review.
 *
 * Architecture: zero-build single-page app. The commitment goes directly from
 * this browser to the Anthropic API (no intermediary server), which is what
 * keeps client documents off third-party infrastructure. Structured outputs
 * (output_config.format) guarantee the response parses as JSON.
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

function acceptFile(file) {
  if (!file) return;
  if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
    toast("Please choose a PDF file");
    return;
  }
  if (file.size > MAX_PDF_BYTES) {
    toast("That PDF is over 30 MB — try the paste-text option instead");
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    // result is "data:application/pdf;base64,<data>"
    state.fileBase64 = String(reader.result).split(",", 2)[1];
    state.fileName = file.name;
    $("file-chip-name").textContent = file.name;
    $("file-chip").hidden = false;
    updateAnalyzeButton();
  };
  reader.onerror = () => toast("Could not read that file");
  reader.readAsDataURL(file);
}

function clearFile() {
  state.fileBase64 = null;
  state.fileName = null;
  $("file-input").value = "";
  $("file-chip").hidden = true;
  updateAnalyzeButton();
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
          removal_outlook: { type: "string", enum: ["likely_removable", "possibly_removable", "stays_on_policy"], description: "Whether the title company would plausibly delete or insure over this exception if asked" }
        },
        required: ["number", "title", "plain_english", "risk", "perspective_concerns", "recommended_action", "removal_outlook"],
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

async function analyze() {
  const apiKey = getApiKey();
  if (!apiKey) {
    toast("Add your Anthropic API key first");
    show("settings");
    $("api-key").focus();
    return;
  }

  show("working");

  const body = {
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    system: buildSystemPrompt(),
    output_config: { format: { type: "json_schema", schema: REPORT_SCHEMA } },
    messages: [{ role: "user", content: buildUserContent() }],
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
    return showError(
      "Network error reaching the Claude API.\n\n" + err.message +
      "\n\nCheck your connection. If you are on a corporate network, api.anthropic.com may be blocked."
    );
  }

  // Read raw text first, then parse — avoids double-consume issues and lets us
  // surface non-JSON error bodies verbatim.
  const raw = await response.text();
  let data;
  try {
    data = JSON.parse(raw);
  } catch {
    return showError(`The API returned an unexpected response (HTTP ${response.status}):\n\n${raw.slice(0, 2000)}`);
  }

  if (!response.ok) {
    const msg = data?.error?.message || raw.slice(0, 2000);
    const hint =
      response.status === 401 ? "\n\nYour API key looks invalid — re-enter it in Settings."
      : response.status === 429 ? "\n\nRate limited — wait a minute and retry."
      : response.status === 529 ? "\n\nThe API is overloaded — retry in a moment."
      : "";
    return showError(`API error (HTTP ${response.status}): ${msg}${hint}`);
  }

  // Find the text block (content may also include thinking blocks).
  const blocks = Array.isArray(data.content) ? data.content : [];
  const textBlock = blocks.find((b) => b.type === "text");
  if (!textBlock) {
    return showError("The API response contained no analysis text.\n\n" + JSON.stringify(data).slice(0, 2000));
  }
  if (data.stop_reason === "max_tokens") {
    return showError(
      "The analysis ran out of room before finishing — this commitment may be unusually long.\n\nTry splitting the document, or paste only Schedules A and B as text."
    );
  }

  let result;
  try {
    result = JSON.parse(textBlock.text);
  } catch (err) {
    return showError("Could not parse the analysis as JSON:\n\n" + err.message + "\n\n" + textBlock.text.slice(0, 1500));
  }

  state.result = result;
  renderReport(result);
  show("report");
}

function showError(message) {
  $("error-message").textContent = message;
  show("error");
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

  $("rpt-exceptions").innerHTML = (r.exceptions || []).map((e) => `
    <div class="exc-card ${esc(e.risk)}" data-risk="${esc(e.risk)}">
      <div class="exc-top">
        <span class="exc-title"><span class="exc-num">B‑II ${esc(e.number)}</span>${esc(e.title)}</span>
        <span class="badge ${esc(e.risk)}">${esc(riskLabel(e.risk))}</span>
      </div>
      <p class="exc-plain">${esc(e.plain_english)}</p>
      <p class="exc-row"><span class="lbl">Why it matters to you:</span> ${esc(e.perspective_concerns)}</p>
      <p class="exc-row"><span class="lbl">Recommended action:</span> ${esc(e.recommended_action)}</p>
      <p class="exc-removal">${esc(REMOVAL_LABEL[e.removal_outlook] || e.removal_outlook)}</p>
    </div>`).join("");

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
    lines.push(`- **Removal outlook:** ${REMOVAL_LABEL[e.removal_outlook] || e.removal_outlook}`);
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
  renderReport(window.TITLEVIZ_DEMO);
  show("report");
  toast("This is a sample review of a fictional commitment");
}

/* ============================ wiring ============================ */

document.addEventListener("DOMContentLoaded", () => {
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

  updateAnalyzeButton();
});
