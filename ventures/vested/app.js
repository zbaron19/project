/* Vested — entitlement intelligence tracker (vanilla JS, no dependencies). */
"use strict";

(function () {
  var DATA_URL = "data/actions.json";
  var CHANGE_WINDOW_DAYS = 7;

  var STATE_NAMES = { VA: "Virginia", GA: "Georgia", TX: "Texas", KY: "Kentucky" };

  var ACTION_TYPE_LABELS = {
    moratorium: "Moratorium",
    ordinance_amendment: "Ordinance amendment",
    overlay_district: "Overlay district",
    comprehensive_plan: "Comprehensive plan",
    staff_pause: "Staff pause",
    litigation: "Litigation"
  };

  var STATUS_LABELS = {
    proposed: "Proposed",
    adopted: "Adopted",
    extended: "Extended",
    expired: "Expired",
    repealed: "Repealed",
    pending_litigation: "Pending litigation"
  };

  var INSTRUMENT_LABELS = {
    ordinance: "Ordinance",
    resolution: "Resolution",
    staff_action: "Staff action"
  };

  var state = {
    meta: null,
    actions: [],
    view: "all",          // "all" | "week"
    filters: { state: "", action_type: "", status: "", q: "" },
    openId: null
  };

  // ---------- utilities ----------

  function esc(s) {
    if (s === null || s === undefined) return "";
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function notVerified() {
    return '<span class="notver">Not yet verified</span>';
  }

  function fmtDate(iso) {
    if (!iso) return null;
    var parts = iso.split("-");
    if (parts.length !== 3) return iso;
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var m = parseInt(parts[1], 10);
    return months[m - 1] + " " + parseInt(parts[2], 10) + ", " + parts[0];
  }

  function dateOrNV(iso) {
    var f = fmtDate(iso);
    return f ? esc(f) : notVerified();
  }

  function daysAgo(iso) {
    if (!iso) return Infinity;
    var then = new Date(iso + "T12:00:00");
    return (Date.now() - then.getTime()) / 86400000;
  }

  function changedThisWeek(a) {
    return daysAgo(a.changed_date) <= CHANGE_WINDOW_DAYS;
  }

  // ---------- filtering ----------

  function searchableText(a) {
    var bits = [
      a.id, a.state, STATE_NAMES[a.state] || "", a.jurisdiction, a.jurisdiction_type,
      a.title, a.action_type, a.status, a.instrument_kind,
      a.scope_decode && a.scope_decode.summary,
      a.pending_application_carveout && a.pending_application_carveout.note,
      a.pending_application_carveout && a.pending_application_carveout.quote,
      a.vesting_context, a.numeric_standards, a.entitlement_path,
      a.vote_tally, a.litigation, a.editorial_analysis, a.change_note
    ];
    return bits.filter(Boolean).join("  ").toLowerCase();
  }

  function applyFilters() {
    var f = state.filters;
    var q = f.q.trim().toLowerCase();
    return state.actions.filter(function (a) {
      if (state.view === "week" && !changedThisWeek(a)) return false;
      if (f.state && a.state !== f.state) return false;
      if (f.action_type && a.action_type !== f.action_type) return false;
      if (f.status && a.status !== f.status) return false;
      if (q && searchableText(a).indexOf(q) === -1) return false;
      return true;
    });
  }

  function sortForView(list) {
    var copy = list.slice();
    if (state.view === "week") {
      copy.sort(function (a, b) { return (b.changed_date || "").localeCompare(a.changed_date || ""); });
    } else {
      copy.sort(function (a, b) {
        var s = a.state.localeCompare(b.state);
        if (s !== 0) return s;
        return a.jurisdiction.localeCompare(b.jurisdiction);
      });
    }
    return copy;
  }

  // ---------- rendering ----------

  function srcLink(src) {
    return '<a class="src" href="' + esc(src.url) + '" target="_blank" rel="noopener noreferrer">[' + esc(src.label) + "]</a>";
  }

  function primarySrc(a) {
    return a.sources && a.sources.length ? srcLink(a.sources[0]) : "";
  }

  function flagItem(value, label) {
    var cls = value === true ? "flag-yes" : value === false ? "flag-no" : "flag-null";
    var word = value === true ? "Yes" : value === false ? "No" : "Not yet verified";
    return '<li class="' + cls + '">' + esc(label) + ": <strong>" + word + "</strong></li>";
  }

  function detailHTML(a) {
    var sd = a.scope_decode || {};
    var co = a.pending_application_carveout || {};
    var sourceList = (a.sources || []).map(function (s) {
      return "<li>" + srcLink(s) + " &mdash; <span style=\"color:var(--muted)\">" + esc(s.url) + "</span></li>";
    }).join("");

    var html = "";
    html += '<div class="detail-inner">';
    html += "<h3>" + esc(a.title) + "</h3>";
    html += '<div class="detail-meta">'
      + esc(a.id) + " &middot; " + esc(INSTRUMENT_LABELS[a.instrument_kind] || a.instrument_kind)
      + " &middot; " + esc(ACTION_TYPE_LABELS[a.action_type] || a.action_type)
      + " &middot; adopted: " + (fmtDate(a.adopted_date) || "not yet verified")
      + " &middot; expires: " + (fmtDate(a.expiry_date) || (a.expiry_date === null ? "none / not yet verified" : ""))
      + "</div>";

    // Scope decode
    html += '<div class="field"><h4>Scope decode ' + primarySrc(a) + "</h4>";
    html += '<ul class="scope-flags">'
      + flagItem(sd.prohibits_new_applications, "Prohibits new applications")
      + flagItem(sd.prohibits_pending_applications, "Reaches pending applications")
      + flagItem(sd.prohibits_permit_issuance, "Blocks permit issuance")
      + "</ul>";
    html += "<p>" + esc(sd.summary || "") + "</p></div>";

    // Carve-out callout
    html += '<div class="callout carveout"><h4>Pending-application carve-out</h4>';
    if (co.quote) {
      html += "<blockquote>&ldquo;" + esc(co.quote) + "&rdquo;</blockquote>";
    }
    html += "<p>" + (co.note ? esc(co.note) : notVerified()) + " " + primarySrc(a) + "</p></div>";

    // Vesting callout
    html += '<div class="callout"><h4>Vesting context (' + esc(STATE_NAMES[a.state] || a.state) + ")</h4><p>"
      + esc(a.vesting_context || "") + "</p></div>";

    // Grid of remaining fields
    html += '<div class="field-grid">';
    html += '<div class="field"><h4>Numeric standards ' + primarySrc(a) + "</h4><p>"
      + (a.numeric_standards ? esc(a.numeric_standards) : notVerified()) + "</p></div>";
    html += '<div class="field"><h4>Entitlement path</h4><p>'
      + (a.entitlement_path ? esc(a.entitlement_path) : notVerified()) + "</p></div>";
    html += '<div class="field"><h4>Vote tally</h4><p>'
      + (a.vote_tally ? esc(a.vote_tally) + " " + primarySrc(a) : notVerified()) + "</p></div>";
    html += '<div class="field"><h4>Next hearing</h4><p>'
      + (a.next_hearing ? esc(a.next_hearing) : '<span class="notver">None scheduled / not yet verified</span>') + "</p></div>";
    html += '<div class="field"><h4>Litigation</h4><p>'
      + (a.litigation ? esc(a.litigation) : "None identified as of last verification.") + "</p></div>";
    html += '<div class="field"><h4>Latest change</h4><p>'
      + (fmtDate(a.changed_date) || "&mdash;") + (a.change_note ? " &mdash; " + esc(a.change_note) : "") + "</p></div>";
    html += "</div>";

    // Editorial
    html += '<div class="editorial"><h4>Editorial analysis &mdash; opinion, not legal advice</h4><p>'
      + esc((a.editorial_analysis || "").replace(/^Editorial analysis:\s*/i, "")) + "</p></div>";

    // Sources
    html += '<div class="sources-block"><h4>Sources</h4><ol>' + sourceList + "</ol></div>";

    html += '<div class="verify-line">last_verified: ' + esc(a.last_verified)
      + " &middot; verification_method: " + esc(a.verification_method) + "</div>";

    html += "</div>";
    return html;
  }

  function rowHTML(a) {
    var open = state.openId === a.id;
    var changed = changedThisWeek(a);
    var html = '<tr class="row' + (open ? " open" : "") + '" data-id="' + esc(a.id) + '" tabindex="0" '
      + 'aria-expanded="' + open + '">';
    html += '<td class="jur"><strong>' + esc(a.jurisdiction) + "</strong>"
      + '<span class="jur-type">' + (a.jurisdiction_type === "municipal" ? "Municipal" : "County") + "</span>"
      + '<br><span style="color:var(--muted);font-size:0.76rem">' + esc(STATE_NAMES[a.state] || a.state) + "</span></td>";
    html += '<td><span class="action-title">' + esc(a.title) + "</span>"
      + '<span class="action-type-label">' + esc(ACTION_TYPE_LABELS[a.action_type] || a.action_type)
      + " &middot; " + esc(INSTRUMENT_LABELS[a.instrument_kind] || a.instrument_kind) + "</span></td>";
    html += '<td><span class="badge ' + esc(a.status) + '">' + esc(STATUS_LABELS[a.status] || a.status) + "</span>"
      + (changed ? '<span class="chip-changed">Changed</span>' : "") + "</td>";
    html += '<td class="date">' + dateOrNV(a.adopted_date) + "</td>";
    html += '<td class="verified">' + dateOrNV(a.last_verified) + "</td>";
    html += "</tr>";
    if (open) {
      html += '<tr class="detail"><td colspan="5">' + detailHTML(a) + "</td></tr>";
    }
    return html;
  }

  function render() {
    var list = sortForView(applyFilters());
    var tbody = document.getElementById("tbody");
    var count = document.getElementById("resultCount");
    var weekNote = document.getElementById("weekNote");
    var emptyEl = document.getElementById("emptyState");
    var tableWrap = document.getElementById("tableWrap");

    count.textContent = list.length + " of " + state.actions.length + " tracked actions shown"
      + (state.view === "week" ? " (changed in the last " + CHANGE_WINDOW_DAYS + " days)" : "");

    if (state.view === "week") {
      weekNote.style.display = "";
      weekNote.innerHTML = "<strong>Changed this week</strong> &mdash; records whose underlying government action "
        + "changed in the last " + CHANGE_WINDOW_DAYS + " days, derived from each record&rsquo;s "
        + "<code>changed_date</code> field. Dataset as of " + esc(state.meta.as_of)
        + ". An empty list means nothing in covered jurisdictions changed &mdash; we do not manufacture news.";
    } else {
      weekNote.style.display = "none";
    }

    if (list.length === 0) {
      tableWrap.style.display = "none";
      emptyEl.style.display = "";
      emptyEl.textContent = state.view === "week"
        ? "No tracked actions changed in the last " + CHANGE_WINDOW_DAYS + " days."
        : "No records match the current filters.";
    } else {
      tableWrap.style.display = "";
      emptyEl.style.display = "none";
      tbody.innerHTML = list.map(rowHTML).join("");
    }

    document.getElementById("tabAll").classList.toggle("active", state.view === "all");
    document.getElementById("tabWeek").classList.toggle("active", state.view === "week");
  }

  function renderCoverage() {
    var n = state.actions.length;
    var states = {};
    state.actions.forEach(function (a) { states[a.state] = true; });
    var stateList = Object.keys(states).sort().map(function (s) { return STATE_NAMES[s] || s; });
    var el = document.getElementById("coverageLine");
    el.innerHTML = "<strong>Coverage:</strong> tracking <strong>" + n + " actions</strong> across <strong>"
      + stateList.length + " states</strong> (" + esc(stateList.join(", ")) + "), as of " + esc(state.meta.as_of)
      + ". <strong>Not yet covering:</strong> " + esc(state.meta.not_yet_covering.join("; ")) + ".";
  }

  function populateFilterOptions() {
    var stSel = document.getElementById("fState");
    var tySel = document.getElementById("fType");
    var suSel = document.getElementById("fStatus");

    var states = {}, types = {}, statuses = {};
    state.actions.forEach(function (a) {
      states[a.state] = true; types[a.action_type] = true; statuses[a.status] = true;
    });

    Object.keys(states).sort().forEach(function (s) {
      stSel.appendChild(new Option((STATE_NAMES[s] || s) + " (" + s + ")", s));
    });
    Object.keys(types).sort().forEach(function (t) {
      tySel.appendChild(new Option(ACTION_TYPE_LABELS[t] || t, t));
    });
    Object.keys(statuses).sort().forEach(function (s) {
      suSel.appendChild(new Option(STATUS_LABELS[s] || s, s));
    });
  }

  // ---------- CSV export ----------

  function csvCell(v) {
    if (v === null || v === undefined) v = "";
    v = String(v);
    if (/[",\r\n]/.test(v)) v = '"' + v.replace(/"/g, '""') + '"';
    return v;
  }

  function exportCSV() {
    var list = sortForView(applyFilters());
    var header = [
      "id", "state", "jurisdiction", "jurisdiction_type", "title", "action_type", "instrument_kind",
      "status", "adopted_date", "expiry_date",
      "prohibits_new_applications", "prohibits_pending_applications", "prohibits_permit_issuance",
      "scope_summary", "pending_application_carveout_quote", "pending_application_carveout_note",
      "vesting_context", "numeric_standards", "entitlement_path",
      "next_hearing", "vote_tally", "litigation", "editorial_analysis",
      "source_urls", "last_verified", "verification_method", "changed_date", "change_note"
    ];
    var rows = list.map(function (a) {
      var sd = a.scope_decode || {};
      var co = a.pending_application_carveout || {};
      return [
        a.id, a.state, a.jurisdiction, a.jurisdiction_type, a.title, a.action_type, a.instrument_kind,
        a.status, a.adopted_date, a.expiry_date,
        sd.prohibits_new_applications, sd.prohibits_pending_applications, sd.prohibits_permit_issuance,
        sd.summary, co.quote, co.note,
        a.vesting_context, a.numeric_standards, a.entitlement_path,
        a.next_hearing, a.vote_tally, a.litigation, a.editorial_analysis,
        (a.sources || []).map(function (s) { return s.url; }).join(" | "),
        a.last_verified, a.verification_method, a.changed_date, a.change_note
      ].map(csvCell).join(",");
    });
    var csv = header.join(",") + "\r\n" + rows.join("\r\n") + "\r\n";
    var blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    var url = URL.createObjectURL(blob);
    var aTag = document.createElement("a");
    aTag.href = url;
    aTag.download = "vested-actions-" + state.meta.as_of + ".csv";
    document.body.appendChild(aTag);
    aTag.click();
    document.body.removeChild(aTag);
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    toast("Exported " + list.length + " records to CSV.");
  }

  // ---------- Copy this week's changes ----------

  function weekChangesText() {
    var changed = state.actions.filter(changedThisWeek).sort(function (a, b) {
      return (b.changed_date || "").localeCompare(a.changed_date || "");
    });
    var lines = [];
    lines.push("VESTED — DATA CENTER ENTITLEMENT CHANGES, WEEK OF " + state.meta.as_of);
    lines.push("(" + changed.length + " tracked action" + (changed.length === 1 ? "" : "s") + " changed in the last "
      + CHANGE_WINDOW_DAYS + " days)");
    lines.push("");
    if (changed.length === 0) {
      lines.push("No tracked actions changed this week in covered jurisdictions.");
    }
    changed.forEach(function (a, i) {
      lines.push((i + 1) + ". " + a.jurisdiction + ", " + a.state + " — " + a.title);
      lines.push("   Status: " + (STATUS_LABELS[a.status] || a.status)
        + " | Changed: " + (fmtDate(a.changed_date) || "n/a"));
      if (a.change_note) lines.push("   What changed: " + a.change_note);
      if (a.scope_decode && a.scope_decode.summary) {
        lines.push("   Scope: " + a.scope_decode.summary);
      }
      if (a.sources && a.sources.length) {
        lines.push("   Source: " + a.sources[0].url);
      }
      lines.push("   Last verified: " + a.last_verified + " (" + a.verification_method + ")");
      lines.push("");
    });
    lines.push("--");
    lines.push("Compiled from public records for informational purposes. Editorial analysis, not legal advice.");
    lines.push("No attorney-client relationship is formed. Verify against official ordinance text.");
    return lines.join("\n");
  }

  function copyWeekChanges() {
    var text = weekChangesText();
    function done() { toast("This week's changes copied to clipboard."); }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); }
      catch (e) { toast("Copy failed — your browser blocked clipboard access."); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fallback);
    } else {
      fallback();
    }
  }

  function toast(msg) {
    var t = document.getElementById("toast");
    t.textContent = msg;
    t.classList.add("show");
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  // ---------- events ----------

  function wireEvents() {
    document.getElementById("fState").addEventListener("change", function (e) {
      state.filters.state = e.target.value; render();
    });
    document.getElementById("fType").addEventListener("change", function (e) {
      state.filters.action_type = e.target.value; render();
    });
    document.getElementById("fStatus").addEventListener("change", function (e) {
      state.filters.status = e.target.value; render();
    });
    document.getElementById("fSearch").addEventListener("input", function (e) {
      state.filters.q = e.target.value; render();
    });
    document.getElementById("tabAll").addEventListener("click", function () {
      state.view = "all"; render();
    });
    document.getElementById("tabWeek").addEventListener("click", function () {
      state.view = "week"; render();
    });
    document.getElementById("btnExport").addEventListener("click", exportCSV);
    document.getElementById("btnCopyWeek").addEventListener("click", copyWeekChanges);

    document.getElementById("tbody").addEventListener("click", function (e) {
      if (e.target.closest("a")) return; // let links work
      var row = e.target.closest("tr.row");
      if (!row) return;
      var id = row.getAttribute("data-id");
      state.openId = (state.openId === id) ? null : id;
      render();
    });
    document.getElementById("tbody").addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var row = e.target.closest("tr.row");
      if (!row) return;
      e.preventDefault();
      var id = row.getAttribute("data-id");
      state.openId = (state.openId === id) ? null : id;
      render();
    });
  }

  // ---------- init ----------

  fetch(DATA_URL)
    .then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    })
    .then(function (data) {
      state.meta = data.meta;
      state.actions = data.actions;
      renderCoverage();
      populateFilterOptions();
      wireEvents();
      render();
    })
    .catch(function (err) {
      document.getElementById("emptyState").style.display = "";
      document.getElementById("emptyState").textContent =
        "Failed to load data/actions.json (" + err.message + "). If you opened this file directly, " +
        "serve it instead: python3 -m http.server (browsers block fetch() on file:// URLs).";
      document.getElementById("tableWrap").style.display = "none";
    });
})();
