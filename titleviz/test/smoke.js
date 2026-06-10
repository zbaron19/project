/* Node smoke test for TitleViz (no browser needed).
 * Run: node test/smoke.js
 * Verifies: scripts parse, demo data satisfies the report schema,
 * memo builder produces sane output, and renderReport runs against a DOM stub. */

const fs = require("fs");
const path = require("path");
const vm = require("vm");

let failures = 0;
function check(name, cond, detail) {
  if (cond) console.log("  ok  " + name);
  else { failures++; console.error("FAIL  " + name + (detail ? " — " + detail : "")); }
}

/* ---- minimal DOM stub ---- */
function makeEl() {
  return {
    hidden: false, value: "", textContent: "", innerHTML: "", className: "",
    style: {}, dataset: {}, classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {}, focus() {}, click() {},
    appendChild() {}, setAttribute() {},
  };
}
const elements = {};
const documentStub = {
  getElementById: (id) => (elements[id] ||= makeEl()),
  querySelectorAll: () => [],
  createElement: () => {
    const el = makeEl();
    // esc() uses textContent -> innerHTML round trip; emulate basic escaping
    return new Proxy(el, {
      set(t, k, v) {
        if (k === "textContent") {
          t.innerHTML = String(v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        }
        t[k] = v; return true;
      },
    });
  },
  addEventListener() {},
};
const sandbox = {
  window: {}, document: documentStub, console,
  sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
  navigator: {}, fetch: () => { throw new Error("no network in smoke test"); },
  FileReader: function () {}, Blob: function () {}, URL: { createObjectURL: () => "", revokeObjectURL() {} },
  setTimeout, clearTimeout, scrollTo() {},
};
sandbox.window = sandbox;
vm.createContext(sandbox);

const read = (f) => fs.readFileSync(path.join(__dirname, "..", f), "utf8");

/* ---- 1. scripts parse and load ---- */
try {
  vm.runInContext(read("demo.js"), sandbox, { filename: "demo.js" });
  check("demo.js loads", !!sandbox.TITLEVIZ_DEMO);
} catch (e) { check("demo.js loads", false, e.message); }

try {
  vm.runInContext(read("app.js"), sandbox, { filename: "app.js" });
  check("app.js loads", true);
} catch (e) { check("app.js loads", false, e.message); }

const demo = sandbox.TITLEVIZ_DEMO;
// const/let at a vm script's top level don't land on the context global —
// evaluate inside the context to reach them.
const inCtx = (code) => vm.runInContext(code, sandbox);

/* ---- 2. demo data satisfies the report schema ---- */
function validate(schema, data, where) {
  if (schema.type === "object") {
    check(`${where} is object`, data && typeof data === "object" && !Array.isArray(data));
    for (const key of schema.required || []) {
      check(`${where}.${key} present`, key in (data || {}));
    }
    for (const [key, sub] of Object.entries(schema.properties || {})) {
      if (data && key in data) validate(sub, data[key], `${where}.${key}`);
    }
    if (schema.additionalProperties === false && data) {
      for (const key of Object.keys(data)) {
        check(`${where}.${key} allowed by schema`, key in schema.properties);
      }
    }
  } else if (schema.type === "array") {
    check(`${where} is array`, Array.isArray(data));
    if (Array.isArray(data) && schema.items && schema.items.type === "object") {
      data.forEach((item, i) => validate(schema.items, item, `${where}[${i}]`));
    }
  } else if (schema.type === "string") {
    const ok = typeof data === "string" && (!schema.enum || schema.enum.includes(data));
    check(`${where} valid string${schema.enum ? " (enum)" : ""}`, ok, JSON.stringify(data));
  }
}
const schema = inCtx("REPORT_SCHEMA");
check("REPORT_SCHEMA exposed", !!schema);
if (schema && demo) {
  // suppress per-field spam: count silently, report aggregate
  const realCheck = check;
  let sub = { total: 0, failed: 0, firstFail: "" };
  check = (name, cond, detail) => {
    sub.total++;
    if (!cond) { sub.failed++; if (!sub.firstFail) sub.firstFail = name + (detail ? " — " + detail : ""); }
  };
  validate(schema, demo, "demo");
  check = realCheck;
  check(`demo data matches schema (${sub.total} assertions)`, sub.failed === 0, sub.firstFail);
}

/* ---- 3. memo builder ---- */
try {
  inCtx("state.result = TITLEVIZ_DEMO");
  const memo = sandbox.buildMemo(demo);
  check("memo builds", typeof memo === "string" && memo.length > 500);
  check("memo has title", memo.startsWith("# Title Commitment Review"));
  check("memo covers all exceptions", demo.exceptions.every((e) => memo.includes(e.title)));
  check("memo covers all requirements", demo.requirements.every((q) => memo.includes(q.plain_english)));
  check("memo has disclaimer", memo.includes("Not legal advice"));
} catch (e) { check("memo builds", false, e.message); }

/* ---- 4. renderReport runs against the DOM stub ---- */
try {
  sandbox.renderReport(demo);
  const exc = elements["rpt-exceptions"];
  check("renderReport runs", true);
  check("exceptions rendered", exc.innerHTML.includes("exc-card") && exc.innerHTML.includes("Quarry Point"));
  check("risk badge set", elements["rpt-risk-badge"].className.includes(demo.summary.overall_risk));
  check("HTML-escapes content", !exc.innerHTML.includes("<script"));
} catch (e) { check("renderReport runs", false, e.message); }

/* ---- 5. request body shape (no API call) ---- */
try {
  const sys = sandbox.buildSystemPrompt();
  check("system prompt mentions perspective", /BUYER|LENDER/.test(sys));
  inCtx('state.source = "text"');
  documentStub.getElementById("text-input").value = "Schedule A ... Schedule B-II ...";
  documentStub.getElementById("deal-context").value = "";
  const content = sandbox.buildUserContent();
  check("text-mode content is text block", content.length === 1 && content[0].type === "text");
  inCtx('state.source = "pdf"; state.fileBase64 = "JVBERi0="; state.fileName = "commitment.pdf";');
  const content2 = sandbox.buildUserContent();
  check("pdf-mode content is document+text", content2[0].type === "document" && content2[1].type === "text");
  check("pdf media type", content2[0].source.media_type === "application/pdf");
} catch (e) { check("request body shape", false, e.message); }

/* ---- 6. link-to-exception mapping (pure functions) ---- */
try {
  // synthetic page: "7." anchor at y=700, "8." anchor at y=500, link at y=650 → exception 7
  const item = (str, x, y) => ({ str, transform: [1, 0, 0, 1, x, y] });
  const items = [
    item("SCHEDULE B - PART II", 50, 760),
    item("7.", 50, 700), item("Easement recorded under", 70, 700), item("No. 1962-0414", 240, 700),
    item("8.", 50, 500), item("Declaration of covenants", 70, 500),
  ];
  const anchors = sandbox.findExceptionAnchors(items);
  check("anchors found", anchors.length === 2 && anchors[0].num === "7" && anchors[1].num === "8");
  check("link below 7 maps to 7", sandbox.nearestAnchor(anchors, 650) === "7");
  check("link below 8 maps to 8", sandbox.nearestAnchor(anchors, 450) === "8");
  check("link above all anchors maps to none", sandbox.nearestAnchor(anchors, 750) === "");
  check("link label reads line text", sandbox.linkLabel(items, [60, 698, 300, 702]).includes("Easement recorded"));
} catch (e) { check("link mapping", false, e.message); }

/* ---- 7. endorsement aggregation + deep-dive schema ---- */
try {
  const ends = sandbox.aggregateEndorsements(demo);
  check("endorsements aggregate", ends.length >= 2 && ends.every((x) => x.endorsement && x.exceptions.length));
  const dd = inCtx("DEEP_DIVE_SCHEMA");
  check("deep-dive schema exposed", dd && dd.required.includes("rating_effect") && dd.additionalProperties === false);
  const memo = sandbox.buildMemo(demo);
  check("memo has endorsement list", memo.includes("## Endorsement request list") && memo.includes("ALTA 25-06"));
} catch (e) { check("endorsements/deep-dive", false, e.message); }

console.log(failures === 0 ? "\nAll smoke tests passed." : `\n${failures} failure(s).`);
process.exit(failures === 0 ? 0 : 1);
