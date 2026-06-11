/* TitleViz — commitment cross-check workbench.
 *
 * Posture: "check me," never "trust me." The tool organizes and
 * cross-references; the attorney examines. Every claim made in this UI
 * is one click from the source language that supports it.
 */
"use strict";

(function () {

  // ---------- State ----------

  const state = {
    file: null,          // loaded file (demo or live-extracted)
    analysis: null,      // cross-reference results
    selectedId: null,
    live: false,         // extraction server detected
    isLiveFile: false,   // current file came from live extraction
    attorney: localStorage.getItem("titleviz.attorney") || "",
    attestations: {},    // itemId -> { name, date }
  };

  const $ = (sel) => document.querySelector(sel);

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  // ---------- Cross-reference engine ----------
  //
  // Statuses:
  //   "standard"     — standard/general exception: NO recorded instrument is
  //                    cited, so no source document is expected. Never treated
  //                    as an orphan. (A tool that flags "general taxes" as a
  //                    missing document has not met a title examiner.)
  //   "matched"      — every recording number the exception cites resolves to
  //                    a document in the file. "Matched" means the citation
  //                    resolves — it does not mean the exception is correct.
  //   "unmatched"    — a cited recording number has NO document in the file.
  //   "needs_review" — a document in the file that no exception or requirement
  //                    accounts for (reverse orphan), or any live-extracted
  //                    item (no documents were provided to check against).
  //   "info"         — requirement rows; informational, attestable.

  function analyze(file, isLiveFile) {
    const docs = file.documents || [];
    const docByAfn = {};
    docs.forEach((d) => { docByAfn[d.afn] = d; });

    const exceptions = (file.commitment.exceptions || []).map((exc) => {
      const item = {
        kind: "exception",
        id: exc.id,
        number: exc.number,
        exception_class: exc.exception_class,
        heading: exc.heading || ("Exception " + exc.number),
        text: exc.text,
        afns: exc.afns || [],
        docs: [],
        missingAfns: [],
        status: null,
      };
      if (exc.exception_class === "standard") {
        // Standard exceptions cite no instrument. Nothing to cross-reference;
        // do NOT orphan-flag.
        item.status = "standard";
        return item;
      }
      // Special exception: resolve every cited recording number.
      item.afns.forEach((afn) => {
        if (docByAfn[afn]) item.docs.push(docByAfn[afn]);
        else item.missingAfns.push(afn);
      });
      if (isLiveFile && docs.length === 0) {
        item.status = "needs_review"; // no documents provided to check against
      } else if (item.missingAfns.length > 0) {
        item.status = "unmatched";
      } else {
        item.status = "matched";
      }
      return item;
    });

    const requirements = (file.commitment.requirements || []).map((req) => {
      const item = {
        kind: "requirement",
        id: req.id,
        number: req.number,
        heading: "Requirement " + req.number,
        text: req.text,
        afns: req.afns || [],
        docs: [],
        missingAfns: [],
        status: isLiveFile && docs.length === 0 ? "needs_review" : "info",
      };
      item.afns.forEach((afn) => {
        if (docByAfn[afn]) item.docs.push(docByAfn[afn]);
        else item.missingAfns.push(afn);
      });
      if (!isLiveFile && item.missingAfns.length > 0) item.status = "unmatched";
      return item;
    });

    // Reverse orphans: documents in the file that nothing accounts for.
    // A document is accounted for when:
    //   (1) its recording number is cited by an exception or requirement;
    //   (2) it is the Schedule A vesting instrument;
    //   (3) it discharges another instrument in the file (e.g., a full
    //       reconveyance terminating a deed of trust) — that pair explains
    //       both the discharging document and its target.
    const cited = new Set();
    exceptions.forEach((e) => e.afns.forEach((a) => cited.add(a)));
    requirements.forEach((r) => r.afns.forEach((a) => cited.add(a)));
    const schedA = file.commitment.schedule_a || {};
    if (schedA.vesting_instrument_afn) cited.add(schedA.vesting_instrument_afn);
    docs.forEach((d) => {
      if (d.discharges && docByAfn[d.discharges]) {
        cited.add(d.afn);
        cited.add(d.discharges);
      }
    });

    const orphanDocs = docs
      .filter((d) => !cited.has(d.afn))
      .map((d) => ({
        kind: "orphan_doc",
        id: "doc-" + d.afn,
        heading: d.title,
        text: "Recorded instrument present in the file, but no Schedule B exception " +
              "or requirement references " + d.afn_label + ". Possible un-excepted " +
              "encumbrance or omitted exception — review the instrument and the " +
              "commitment together.",
        afns: [d.afn],
        docs: [d],
        missingAfns: [],
        status: "needs_review",
      }));

    const attention = []
      .concat(exceptions.filter((e) => e.status === "unmatched"))
      .concat(requirements.filter((r) => r.status === "unmatched"))
      .concat(orphanDocs);

    const items = {};
    exceptions.concat(requirements, orphanDocs).forEach((i) => { items[i.id] = i; });

    return { exceptions, requirements, orphanDocs, attention, items, docByAfn };
  }

  // ---------- Attestations ----------

  function attestKey() {
    return "titleviz.attest." + (state.file ? state.file.file_id : "none");
  }
  function loadAttestations() {
    try { state.attestations = JSON.parse(localStorage.getItem(attestKey())) || {}; }
    catch (e) { state.attestations = {}; }
  }
  function saveAttestations() {
    localStorage.setItem(attestKey(), JSON.stringify(state.attestations));
  }
  function toggleAttestation(itemId) {
    if (state.attestations[itemId]) {
      delete state.attestations[itemId];
    } else {
      if (!state.attorney.trim()) return; // toggle disabled without a name
      state.attestations[itemId] = {
        name: state.attorney.trim(),
        date: new Date().toISOString().slice(0, 10),
      };
    }
    saveAttestations();
    renderList();
    renderDetail();
  }

  // ---------- Status labels ----------

  const STATUS_LABEL = {
    matched: "Matched",
    unmatched: "UNMATCHED",
    needs_review: "Needs review",
    standard: "Standard",
    info: "Requirement",
  };

  function statusBadge(status) {
    return '<span class="badge ' + status + '">' + STATUS_LABEL[status] + "</span>";
  }

  // ---------- Rendering: summary ----------

  function renderSummary() {
    const c = state.file.commitment;
    const a = c.schedule_a || {};
    const cells = [
      ["File / form", esc(c.file_no || "—") + " · " + esc(c.form || "")],
      ["Effective date", esc(c.effective_date || "—")],
      ["Policy", esc(a.policy_type || "—") + (a.policy_amount
        ? " · $" + Number(a.policy_amount).toLocaleString("en-US") : "")],
      ["Proposed insured", esc(a.proposed_insured || "—")],
      ["Title vested in", esc(a.vesting || "—")],
      ["Land", esc(a.legal_description || "—")],
    ];
    $("#file-summary").innerHTML = cells.map(([k, v]) =>
      '<div class="summary-cell"><div class="k">' + k + '</div><div class="v">' + v + "</div></div>"
    ).join("");
  }

  // ---------- Rendering: timeline ----------

  function renderTimeline() {
    const el = $("#timeline");
    const chain = (state.file.chain || [])
      .map((afn) => state.analysis.docByAfn[afn])
      .filter(Boolean);
    if (!chain.length) {
      el.innerHTML = '<p class="timeline-empty">No structured chain data for this file. ' +
        "(Live-extracted files carry no pre-verified chain; the chain strip only renders " +
        "from structured document data, never from inference.)</p>";
      return;
    }
    el.innerHTML = chain.map((d, i) =>
      '<div class="timeline-node">' +
        (i > 0 ? '<div class="timeline-link"></div>' : "") +
        '<div class="timeline-card" data-afn="' + esc(d.afn) + '" role="button" tabindex="0">' +
          '<div class="t-type">' + esc(d.doc_type) + "</div>" +
          '<div class="t-date">' + esc(d.recorded_display) + "</div>" +
          '<div class="t-afn">' + esc(d.afn_label) + "</div>" +
          '<div class="t-verified">✓ verified per source — click to read</div>' +
        "</div>" +
      "</div>"
    ).join("");
    el.querySelectorAll(".timeline-card").forEach((card) => {
      const open = () => showDoc(state.analysis.docByAfn[card.dataset.afn]);
      card.addEventListener("click", open);
      card.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    });
  }

  // ---------- Rendering: left pane ----------

  function itemRow(item) {
    const att = state.attestations[item.id];
    const sub =
      item.kind === "exception"
        ? "Schedule B-II, No. " + item.number +
          (item.afns.length ? " · " + item.afns.join(", ") : " · no instrument cited")
        : item.kind === "requirement"
          ? "Schedule B-I, No. " + item.number
          : (item.docs[0] ? item.docs[0].afn_label + " · " + item.docs[0].recorded_display : "");
    return (
      '<button class="item-row status-' + item.status +
        (state.selectedId === item.id ? " selected" : "") +
        '" data-id="' + esc(item.id) + '">' +
        '<span class="row-head"><span class="row-label">' + esc(item.heading) + "</span>" +
        statusBadge(item.status) + "</span>" +
        '<span class="row-sub">' + esc(sub) + "</span>" +
        (att ? '<span class="row-attest">✓ Reviewed — ' + esc(att.name) + ", " + esc(att.date) + "</span>" : "") +
      "</button>"
    );
  }

  function renderList() {
    const a = state.analysis;
    const groups = [];

    // The unmatched / needs-review bucket renders FIRST. The tool shows what
    // it could NOT do before anything it claims it did.
    groups.push(
      '<div class="group attention">' +
        '<h2 class="group-title">⚠ Requires your attention (' + a.attention.length + ")</h2>" +
        '<p class="group-note">What TitleViz could <strong>not</strong> account for. Cited instruments ' +
        "with no document in the file, and documents no exception references.</p>" +
        (a.attention.length
          ? a.attention.map(itemRow).join("")
          : '<p class="group-note">Nothing outstanding — every cited instrument resolved and every document is referenced. Verify anyway.</p>') +
      "</div>"
    );

    groups.push(
      '<div class="group">' +
        '<h2 class="group-title">Schedule B — Part I · Requirements</h2>' +
        a.requirements.map(itemRow).join("") +
      "</div>"
    );

    const special = a.exceptions.filter((e) => e.exception_class === "special");
    const standard = a.exceptions.filter((e) => e.exception_class === "standard");

    groups.push(
      '<div class="group">' +
        '<h2 class="group-title">Schedule B — Part II · Special exceptions (recorded instruments)</h2>' +
        special.map(itemRow).join("") +
      "</div>"
    );
    groups.push(
      '<div class="group">' +
        '<h2 class="group-title">Schedule B — Part II · Standard / general exceptions</h2>' +
        '<p class="group-note">No recorded instrument is cited for these; no source document is expected.</p>' +
        standard.map(itemRow).join("") +
      "</div>"
    );

    const el = $("#pane-list");
    el.innerHTML = groups.join("");
    el.querySelectorAll(".item-row").forEach((row) => {
      row.addEventListener("click", () => selectItem(row.dataset.id));
    });
  }

  // ---------- Rendering: center pane ----------

  function statusBanner(item) {
    switch (item.status) {
      case "matched":
        return "<strong>Matched ✓ — citation resolves to a document in this file.</strong>" +
          "TitleViz matched the recording number(s) cited in this item to the document(s) below. " +
          "That is a clerical match, not an examination. Open the source and read the operative language.";
      case "unmatched":
        return "<strong>UNMATCHED — cited instrument is not in this file.</strong>" +
          "This item cites " + esc(item.missingAfns.join(", ")) + ", and no document with that " +
          "recording number exists in the file. The instrument was never provided, the number is a " +
          "scrivener's error, or the document is missing. Obtain the instrument or resolve the citation " +
          "before relying on this exception.";
      case "needs_review":
        return item.kind === "orphan_doc"
          ? "<strong>Needs review — document not referenced by any exception or requirement.</strong>" +
            "This recorded instrument is in the file, but the commitment does not except for it and no " +
            "requirement addresses it. It may be an un-excepted encumbrance, an omitted exception, or " +
            "properly outside the policy. Your call — not the tool's."
          : "<strong>Needs review — extracted item, nothing verified.</strong>" +
            "This item came from live extraction. No source documents were provided, so nothing has been " +
            "cross-referenced. Treat every field as unconfirmed until you check it against the instrument.";
      case "standard":
        return "<strong>Standard / general exception — no source document expected.</strong>" +
          "This exception cites no recorded instrument, so there is nothing to cross-reference and it is " +
          "never flagged as an orphan. Evaluate it on its own terms (taxes, possession, survey, unrecorded liens).";
      case "info":
        return "<strong>Requirement — to be satisfied at or before closing.</strong>" +
          "Listed for completeness of the exam record. Where it references a recorded instrument, the " +
          "document is linked below.";
      default:
        return "";
    }
  }

  function renderDetail() {
    const el = $("#pane-detail");
    const item = state.selectedId ? state.analysis.items[state.selectedId] : null;
    if (!item) {
      el.innerHTML =
        '<p class="detail-kicker">Workbench</p>' +
        '<h2 class="detail-title">Select an item to begin your exam</h2>' +
        '<p class="muted">The list at left is your exam queue. Anything TitleViz could not ' +
        "account for is at the top — start there.</p>";
      return;
    }

    const kicker =
      item.kind === "exception"
        ? "Schedule B — Part II · " + (item.exception_class === "standard" ? "Standard exception" : "Special exception") + " No. " + item.number
        : item.kind === "requirement"
          ? "Schedule B — Part I · Requirement No. " + item.number
          : "Recorded document · not referenced by the commitment";

    let html =
      '<p class="detail-kicker">' + esc(kicker) + "</p>" +
      '<h2 class="detail-title">' + esc(item.heading) + " " + statusBadge(item.status) + "</h2>" +
      '<div class="status-banner ' + item.status + '">' + statusBanner(item) + "</div>";

    html +=
      '<div class="detail-section"><h3>' +
      (item.kind === "orphan_doc" ? "Why this is in your queue" : "Commitment language") +
      '</h3><div class="exception-text">' + esc(item.text) + "</div></div>";

    if (item.afns.length) {
      html += '<div class="detail-section"><h3>Cited recording numbers</h3><div>' +
        item.afns.map((afn) =>
          '<span class="afn-chip' + (item.missingAfns.indexOf(afn) >= 0 ? " missing" : "") + '">' +
          esc(afn) + "</span>"
        ).join("") +
        (item.missingAfns.length
          ? '<p class="muted small" style="margin:6px 0 0">Struck-through numbers have no document in this file.</p>'
          : "") +
        "</div></div>";
    }

    if (item.docs.length) {
      html += '<div class="detail-section"><h3>Source document' + (item.docs.length > 1 ? "s" : "") + "</h3>" +
        item.docs.map((d) =>
          '<div class="doc-link-card"><div><div class="d-title">' + esc(d.title) + "</div>" +
          '<div class="d-cite">' + esc(d.citation) + "</div></div>" +
          '<button class="btn open-doc" data-afn="' + esc(d.afn) + '">Verify source →</button></div>'
        ).join("") + "</div>";

      const primary = item.docs[0];
      if (primary.operative_excerpt) {
        html += '<div class="detail-section"><h3>Operative language (from ' + esc(primary.afn_label) + ")</h3>" +
          '<div class="excerpt">&ldquo;' + esc(primary.operative_excerpt) + "&rdquo;</div>" +
          '<p class="muted small" style="margin:6px 0 0">Excerpt for orientation only — the recorded ' +
          "instrument controls. Click &ldquo;Verify source&rdquo; to read it in context.</p></div>";
      }
    } else if (item.status === "unmatched") {
      html += '<div class="detail-section"><h3>Source document</h3>' +
        '<p class="muted">None in file. This is the gap.</p></div>';
    }

    // Attestation — the attorney's act, not the tool's.
    const att = state.attestations[item.id];
    const hasName = !!state.attorney.trim();
    html +=
      '<div class="attest-block">' +
        '<label class="attest-toggle">' +
          '<input type="checkbox" id="attest-toggle" ' + (att ? "checked" : "") +
            ((!att && !hasName) ? " disabled" : "") + ">" +
          '<span class="attest-label">Reviewed — <em>' +
            (att
              ? 'attestation of <span class="who">' + esc(att.name) + "</span>, " + esc(att.date)
              : "the reviewing attorney&rsquo;s own attestation") +
          "</em></span>" +
        "</label>" +
        ((!att && !hasName)
          ? '<p class="attest-hint">Enter the reviewing attorney&rsquo;s name in the header to attest.</p>'
          : "") +
        '<p class="attest-note">Checking this box records that the named attorney reviewed this item ' +
        "and its source. TitleViz records the attestation; it does not make it.</p>" +
      "</div>";

    el.innerHTML = html;

    el.querySelectorAll(".open-doc").forEach((btn) => {
      btn.addEventListener("click", () => showDoc(state.analysis.docByAfn[btn.dataset.afn]));
    });
    const toggle = el.querySelector("#attest-toggle");
    if (toggle) toggle.addEventListener("change", () => toggleAttestation(item.id));
  }

  // ---------- Rendering: right pane (document) ----------

  function showDoc(doc) {
    if (!doc) return;
    const meta = $("#doc-meta");
    const frame = $("#doc-frame");
    const src = doc.href + (doc.anchor ? "#" + doc.anchor : "");
    meta.innerHTML =
      "<h3>" + esc(doc.title) + "</h3>" +
      '<div class="d-cite">' + esc(doc.afn_label) + " · recorded " + esc(doc.recorded_display) + "</div>" +
      '<div class="d-cite">' + esc(doc.citation) + "</div>" +
      '<div class="d-actions"><a href="' + esc(src) + '" target="_blank" rel="noopener">Open in new tab ↗</a>' +
      ' · <span class="muted small">operative language highlighted</span></div>';
    frame.hidden = false;
    // Re-set src even if identical so the :target highlight re-fires.
    frame.src = "about:blank";
    requestAnimationFrame(() => { frame.src = src; });
  }

  function clearDoc() {
    $("#doc-meta").innerHTML =
      '<p class="muted doc-placeholder">Select an item with a source document to view the ' +
      "recorded instrument here, with its operative language highlighted.</p>";
    const frame = $("#doc-frame");
    frame.hidden = true;
    frame.src = "about:blank";
  }

  // ---------- Selection ----------

  function selectItem(id) {
    state.selectedId = id;
    const item = state.analysis.items[id];
    renderList();
    renderDetail();
    if (item && item.docs.length) showDoc(item.docs[0]);
    else clearDoc();
  }

  // ---------- Print report ----------

  function dispositionText(item) {
    switch (item.status) {
      case "matched": return "Matched — citation resolves to document in file";
      case "unmatched": return "UNMATCHED — cited instrument not in file (" + item.missingAfns.join(", ") + ")";
      case "needs_review": return item.kind === "orphan_doc"
        ? "NEEDS REVIEW — document not referenced by any exception"
        : "NEEDS REVIEW — extracted, unverified";
      case "standard": return "Standard exception — no recorded instrument cited; none expected";
      case "info": return "Requirement — to be satisfied at or before closing";
      default: return item.status;
    }
  }

  function buildPrintReport() {
    const f = state.file;
    const a = state.analysis;
    const c = f.commitment;
    const sa = c.schedule_a || {};
    const today = new Date().toISOString().slice(0, 10);

    const row = (item, label) => {
      const att = state.attestations[item.id];
      const cls = item.status === "unmatched" ? "pr-unmatched" : item.status === "needs_review" ? "pr-needs" : "";
      const cite = item.docs.length
        ? item.docs.map((d) => d.citation).join("; ")
        : item.afns.length ? "Cited: " + item.afns.join(", ") + " — NOT IN FILE" : "No instrument cited";
      return "<tr class=\"" + cls + "\"><td>" + esc(label) + "</td><td>" + esc(item.heading) +
        "</td><td>" + esc(dispositionText(item)) + "</td><td>" + esc(cite) + "</td><td>" +
        (att ? esc(att.name) + "<br>" + esc(att.date) : "&mdash; not yet reviewed &mdash;") + "</td></tr>";
    };

    const tableHead = "<tr><th style='width:9%'>Item</th><th style='width:21%'>Caption</th>" +
      "<th style='width:28%'>Disposition (clerical cross-check)</th><th style='width:26%'>Citation</th>" +
      "<th style='width:16%'>Reviewed by / date</th></tr>";

    let html =
      "<h1>TitleViz Exam Worksheet</h1>" +
      '<p class="pr-tagline">Cross-check of commitment citations against documents in the file — prepared ' + esc(today) + "</p>" +
      '<div class="pr-framing">TitleViz organizes and cross-references documents. It does not examine title, ' +
      "determine insurability or marketability, or render an opinion of title. All determinations remain the " +
      "reviewing attorney&rsquo;s professional judgment. Dispositions below are clerical citation checks only.</div>" +

      "<h2>Commitment summary</h2>" +
      '<p class="pr-meta">' +
      "<strong>File:</strong> " + esc(c.file_no || "—") + " · " + esc(c.form || "") + "<br>" +
      "<strong>Effective date:</strong> " + esc(c.effective_date || "—") + "<br>" +
      "<strong>Policy:</strong> " + esc(sa.policy_type || "—") +
      (sa.policy_amount ? " · Amount $" + Number(sa.policy_amount).toLocaleString("en-US") : "") + "<br>" +
      "<strong>Proposed insured:</strong> " + esc(sa.proposed_insured || "—") + "<br>" +
      "<strong>Title vested in:</strong> " + esc(sa.vesting || "—") + "<br>" +
      "<strong>Land:</strong> " + esc(sa.legal_description || "—") + "</p>";

    if (a.attention.length) {
      html += '<div class="pr-attention"><h2>⚠ Unresolved items (' + a.attention.length + ") — resolve before reliance</h2>" +
        "<table>" + tableHead +
        a.attention.map((i) => row(i,
          i.kind === "exception" ? "B-II #" + i.number : i.kind === "requirement" ? "B-I #" + i.number : "Doc")).join("") +
        "</table></div>";
    } else {
      html += '<div class="pr-attention"><h2>Unresolved items</h2><p>None — every cited instrument resolved ' +
        "and every document in the file is referenced by the commitment.</p></div>";
    }

    html += "<h2>Schedule B — Part I · Requirements</h2><table>" + tableHead +
      a.requirements.map((i) => row(i, "B-I #" + i.number)).join("") + "</table>";

    html += "<h2>Schedule B — Part II · Exceptions</h2><table>" + tableHead +
      a.exceptions.map((i) => row(i, "B-II #" + i.number)).join("") + "</table>";

    const extraOrphans = a.orphanDocs;
    if (extraOrphans.length) {
      html += "<h2>Documents in file not referenced by the commitment</h2><table>" + tableHead +
        extraOrphans.map((i) => row(i, "Doc")).join("") + "</table>";
    }

    html +=
      '<div class="pr-sig"><p>Reviewing attorney: <strong>' + esc(state.attorney || "________________") +
      "</strong></p><p style='margin-top:18pt'><span class='pr-sigline'></span><br>Signature / date</p>" +
      '<p style="margin-top:10pt;font-size:8.5pt;color:#333">' + esc(f.synthetic_notice || "") + "</p></div>";

    $("#print-report").innerHTML = html;
  }

  // ---------- Live mode ----------

  async function detectServer() {
    try {
      const res = await fetch("api/health", { cache: "no-store" });
      if (!res.ok) throw new Error("no server");
      const data = await res.json();
      if (data && data.service === "titleviz") {
        state.live = true;
        $("#mode-badge").textContent = data.key_present
          ? "● live — extraction server connected"
          : "● live server found — no API key set";
        $("#mode-badge").className = "mode-badge live";
        $("#btn-live").hidden = false;
        return;
      }
      throw new Error("not titleviz");
    } catch (e) {
      state.live = false;
      $("#mode-badge").textContent = "demo mode — static file";
      $("#mode-badge").className = "mode-badge demo";
      $("#btn-live").hidden = true;
      $("#live-panel").hidden = true;
    }
  }

  async function runExtraction() {
    const text = $("#live-text").value.trim();
    const status = $("#live-status");
    if (text.length < 40) {
      status.textContent = "Paste the full commitment text first.";
      return;
    }
    status.textContent = "Extracting… (this calls the local server, which calls the API)";
    $("#btn-extract").disabled = true;
    try {
      const res = await fetch("api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || ("Server error " + res.status));
      const file = {
        file_id: "live-" + Date.now(),
        file_label: "Live-extracted commitment (unverified)",
        synthetic_notice: "Live extraction output. Every item starts at needs-review; nothing has been verified against source documents.",
        commitment: data.commitment,
        documents: [],
        chain: [],
      };
      loadFile(file, true);
      status.textContent = "Extracted. Every item is at needs-review — that is the point.";
    } catch (e) {
      status.textContent = "Extraction failed: " + e.message;
    } finally {
      $("#btn-extract").disabled = false;
    }
  }

  // ---------- File loading ----------

  function loadFile(file, isLiveFile) {
    // Normalize ids on extracted files.
    (file.commitment.requirements || []).forEach((r, i) => {
      if (!r.id) r.id = "req-" + (i + 1);
      if (!r.number) r.number = i + 1;
    });
    (file.commitment.exceptions || []).forEach((x, i) => {
      if (!x.id) x.id = "exc-" + (i + 1);
      if (!x.number) x.number = i + 1;
      if (x.exception_class !== "standard") x.exception_class = x.exception_class === "special" ? "special" : (x.afns && x.afns.length ? "special" : "standard");
    });

    state.file = file;
    state.isLiveFile = !!isLiveFile;
    state.analysis = analyze(file, state.isLiveFile);
    state.selectedId = null;
    loadAttestations();
    $("#synthetic-notice").textContent = file.synthetic_notice || "";
    renderSummary();
    renderTimeline();
    renderList();
    renderDetail();
    clearDoc();

    // Default selection: the first attention item. Lead with what we couldn't do.
    if (state.analysis.attention.length) selectItem(state.analysis.attention[0].id);
  }

  async function loadDemo() {
    try {
      const res = await fetch("data/demo-file.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      loadFile(await res.json(), false);
    } catch (e) {
      $("#pane-detail").innerHTML =
        "<h2 class='detail-title'>Could not load the demo file</h2>" +
        "<p class='muted'>Serve this folder over HTTP — e.g. <code>python3 -m http.server</code> " +
        "from the titleviz directory — and reload. (Browsers block fetch() under file://.)</p>" +
        "<p class='muted small'>" + esc(e.message) + "</p>";
    }
  }

  // ---------- Wire-up ----------

  function init() {
    const nameInput = $("#attorney-name");
    nameInput.value = state.attorney;
    nameInput.addEventListener("input", () => {
      state.attorney = nameInput.value;
      localStorage.setItem("titleviz.attorney", state.attorney);
      renderDetail(); // enable/disable the attestation toggle live
    });

    $("#btn-print").addEventListener("click", () => { buildPrintReport(); window.print(); });
    window.addEventListener("beforeprint", buildPrintReport);

    $("#btn-live").addEventListener("click", () => {
      const panel = $("#live-panel");
      panel.hidden = !panel.hidden;
    });
    $("#btn-extract").addEventListener("click", runExtraction);
    $("#btn-load-demo").addEventListener("click", () => { $("#live-panel").hidden = true; loadDemo(); });

    detectServer();
    loadDemo();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
