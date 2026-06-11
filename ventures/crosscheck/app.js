/* CrossCheck — lease diligence workbench (demo MVP)
 *
 * Engine model:
 *   - Operative documents (lease, memo, amendments) form supersession CHAINS per
 *     term category. A later amendment replacing an earlier provision is lineage,
 *     never a conflict.
 *   - The estoppel is a FACTUAL certification. Flags compare what the estoppel
 *     certifies against what the operative documents show as of the estoppel date.
 *   - One intra-document contradiction check (same fact asserted twice within a
 *     single document with different values).
 *
 * Engine functions are pure and exported for verification under node.
 */

"use strict";

/* =========================== Engine (pure) =========================== */

function rentAsOf(schedule, dateISO) {
  // schedule: [{from, to, monthly}] with ISO dates; lexicographic compare is safe.
  for (const row of schedule) {
    if (dateISO >= row.from && dateISO <= row.to) return row.monthly;
  }
  return null;
}

function subtractMonths(dateISO, months) {
  const [y, m, d] = dateISO.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1 - months, d));
  // If day overflowed into next month (e.g., subtracting from the 31st into a
  // 30-day month), clamp to last day of intended month.
  const intended = ((m - 1 - months) % 12 + 12) % 12;
  if (dt.getUTCMonth() !== intended) dt.setUTCDate(0);
  return dt.toISOString().slice(0, 10);
}

function docById(data, id) {
  return data.documents.find((d) => d.id === id);
}

function provById(data, id) {
  return data.provisions.find((p) => p.id === id);
}

function docOrder(data, docId) {
  return data.documents.findIndex((d) => d.id === docId);
}

/** Build the supersession chain for each tracked category.
 *  Returns [{ category, label, steps:[{prov, status, relationText}], operative }] */
function buildChains(data) {
  const chains = [];
  for (const cat of data.categories) {
    const provs = data.provisions
      .filter((p) => p.category === cat.id)
      .filter((p) => docById(data, p.docId).kind === "operative")
      .sort((a, b) => docOrder(data, a.docId) - docOrder(data, b.docId));
    if (!provs.length) continue;

    // Within a single document, multiple provisions on the same category do not
    // supersede each other (that's the intra-document check's job). The operative
    // provision is the latest-document provision; ties broken by listing order.
    const lastDocId = provs[provs.length - 1].docId;
    const steps = provs.map((p) => {
      const isLastDoc = p.docId === lastDocId;
      let status = isLastDoc ? "operative" : "superseded";
      if (p.relation && p.relation.type === "confirms" && !isLastDoc) status = "confirmed";
      let relationText = "";
      if (p.relation) {
        const verbs = { supersedes: "Supersedes", confirms: "Confirms", amends: "Amends" };
        const targets = p.relation.targets
          .map((t) => {
            const tp = provById(data, t);
            return tp ? `${docById(data, tp.docId).short} ${tp.section}` : t;
          })
          .join(" and ");
        relationText = `${verbs[p.relation.type] || "Modifies"} ${targets}`;
      }
      return { prov: p, status, relationText };
    });

    // If two provisions in the SAME (last) document disagree, the chain still
    // reports the first as operative; the contradiction is flagged separately.
    const operative = provs.filter((p) => p.docId === lastDocId)[0];
    chains.push({ category: cat.id, label: cat.label, steps, operative });
  }
  return chains;
}

/** Derive the operative state of each tracked term as of the estoppel date. */
function deriveOperative(data, chains) {
  const asOf = data.estoppel.date;
  const byCat = {};
  for (const c of chains) byCat[c.category] = c;

  const out = { asOf };

  if (byCat.rent) {
    const sched = byCat.rent.operative.facts.rentSchedule;
    out.currentMonthlyRent = rentAsOf(sched, asOf);
    out.rentProvision = byCat.rent.operative;
  }
  if (byCat.term) {
    out.expiration = byCat.term.operative.facts.expiration;
    out.termProvision = byCat.term.operative;
  }
  if (byCat.deposit) {
    out.securityDeposit = byCat.deposit.operative.facts.securityDeposit;
    out.depositProvision = byCat.deposit.operative;
  }
  if (byCat.renewal) {
    const r = byCat.renewal.operative;
    out.renewalProvision = r;
    out.renewalYears = r.facts.renewalYears;
    out.renewalNoticeMonths = r.facts.noticeMonthsBeforeExpiration;
    if (out.expiration) {
      out.renewalNoticeDeadline = subtractMonths(out.expiration, out.renewalNoticeMonths);
    }
  }
  return out;
}

/** Build conflict-candidate flags + the list of consistent certifications.
 *  Returns { flags:[...], consistent:[...] } */
function buildFlags(data, chains, op) {
  const flags = [];
  const consistent = [];
  const est = data.estoppel;
  const estDoc = docById(data, est.docId);

  const passageFromCert = (cert) => ({
    docId: est.docId,
    title: estDoc.title,
    section: cert.section,
    anchor: cert.anchor,
    quote: cert.quote,
  });
  const passageFromProv = (p) => ({
    docId: p.docId,
    title: docById(data, p.docId).title,
    section: p.section,
    anchor: p.anchor,
    quote: p.quote,
  });

  const certs = {};
  for (const c of est.certifications) certs[c.field] = c;

  // ---- 1. Omitted amendment (the highest-value estoppel check) ----
  if (certs.amendments) {
    const cert = certs.amendments;
    const modifying = data.documents.filter((d) => d.modifiesLease).map((d) => d.id);
    const missing = modifying.filter((id) => !cert.listedDocs.includes(id));
    for (const id of missing) {
      const missedDoc = docById(data, id);
      // Cite the missed document's first provision so the link lands on real text.
      const firstProv = data.provisions.find((p) => p.docId === id);
      flags.push({
        id: `flag-omitted-${id}`,
        severity: "high",
        category: "amendments",
        title: `Estoppel omits the ${missedDoc.title} (${missedDoc.dateDisplay})`,
        explanation:
          `The estoppel certifies that the Lease has not been amended except by the documents listed in ${cert.section} — ` +
          `but the file contains the ${missedDoc.title} dated ${missedDoc.dateDisplay}, which is omitted. ` +
          `That instrument changes operative economic terms (${missedDoc.summary}) ` +
          `An estoppel certifies facts; it does not amend the lease — but a certification that omits an operative amendment ` +
          `cannot be relied on as a complete statement of the lease, and the omission may signal a dispute about the ` +
          `instrument's effectiveness. Counsel should require a corrected certificate or expressly note the exception.`,
        left: passageFromCert(cert),
        right: firstProv
          ? passageFromProv(firstProv)
          : { docId: id, title: missedDoc.title, section: "", anchor: "", quote: missedDoc.summary },
        leftHeading: "Estoppel certifies",
        rightHeading: "Operative documents show",
      });
    }
    if (!missing.length) {
      consistent.push("Amendment list in the estoppel matches the document set.");
    }
  }

  // ---- 2. Monthly rent: certified vs operative as of the estoppel date ----
  if (certs.monthlyRent && op.currentMonthlyRent != null) {
    const cert = certs.monthlyRent;
    if (Math.abs(cert.value - op.currentMonthlyRent) > 0.005) {
      // Is the certified figure the superseded First Amendment number? Check
      // every superseded rent schedule for an exact match as of the same date.
      let staleSource = null;
      const rentChain = chains.find((c) => c.category === "rent");
      if (rentChain) {
        for (const step of rentChain.steps) {
          if (step.status === "operative") continue;
          const s = step.prov.facts.rentSchedule;
          if (s && rentAsOf(s, est.date) !== null && Math.abs(rentAsOf(s, est.date) - cert.value) < 0.005) {
            staleSource = step.prov;
          }
        }
      }
      flags.push({
        id: "flag-rent-mismatch",
        severity: "high",
        category: "rent",
        title: "Estoppel certifies a monthly rent the operative schedule does not support",
        explanation:
          `The estoppel certifies current monthly Base Rent of ${fmtMoney(cert.value)}; the operative rent schedule ` +
          `(${citeOf(data, op.rentProvision)}) puts the rent for the period including ${fmtDate(est.date)} at ` +
          `${fmtMoney(op.currentMonthlyRent)} — a difference of ${fmtMoney(Math.abs(cert.value - op.currentMonthlyRent))} per month.` +
          (staleSource
            ? ` The certified figure exactly matches the superseded schedule in ${citeOf(data, staleSource)}, suggesting the ` +
              `certificate was prepared from the ${docById(data, staleSource.docId).title} without the later amendment.`
            : "") +
          ` Counsel should obtain a corrected certificate and confirm the rent actually being invoiced and paid.`,
        left: passageFromCert(cert),
        right: passageFromProv(op.rentProvision),
        leftHeading: "Estoppel certifies",
        rightHeading: "Operative documents show",
      });
    } else {
      consistent.push(`Certified monthly rent matches the operative schedule (${fmtMoney(op.currentMonthlyRent)}).`);
    }
  }

  // ---- 3. Security deposit ----
  if (certs.securityDeposit && op.securityDeposit != null) {
    const cert = certs.securityDeposit;
    if (Math.abs(cert.value - op.securityDeposit) > 0.005) {
      flags.push({
        id: "flag-deposit-mismatch",
        severity: "high",
        category: "deposit",
        title: "Estoppel certifies a security deposit the operative documents do not support",
        explanation:
          `The estoppel certifies a security deposit of ${fmtMoney(cert.value)}; the operative provision ` +
          `(${citeOf(data, op.depositProvision)}) reduced the deposit to ${fmtMoney(op.securityDeposit)}, with the ` +
          `difference credited against rent. For a purchaser this is a direct proration/credit issue at closing: ` +
          `the deposit actually transferred must match the operative amount, and the certificate should be corrected.`,
        left: passageFromCert(cert),
        right: passageFromProv(op.depositProvision),
        leftHeading: "Estoppel certifies",
        rightHeading: "Operative documents show",
      });
    } else {
      consistent.push(`Certified security deposit matches the operative amount (${fmtMoney(op.securityDeposit)}).`);
    }
  }

  // ---- 4. Expiration date (comparison runs; consistent in this matter) ----
  if (certs.expiration && op.expiration) {
    const cert = certs.expiration;
    if (cert.value !== op.expiration) {
      flags.push({
        id: "flag-expiration-mismatch",
        severity: "high",
        category: "term",
        title: "Estoppel certifies an expiration date the operative documents do not support",
        explanation:
          `The estoppel certifies expiration on ${fmtDate(cert.value)}; the operative provision ` +
          `(${citeOf(data, op.termProvision)}) sets expiration at ${fmtDate(op.expiration)}.`,
        left: passageFromCert(cert),
        right: passageFromProv(op.termProvision),
        leftHeading: "Estoppel certifies",
        rightHeading: "Operative documents show",
      });
    } else {
      consistent.push(`Certified expiration date matches the operative documents (${fmtDate(op.expiration)}).`);
    }
  }

  // ---- 5. Renewal option: informational "verify exercise window" ----
  if (certs.renewalOption && op.renewalProvision) {
    const cert = certs.renewalOption;
    flags.push({
      id: "flag-renewal-window",
      severity: "info",
      category: "renewal",
      title: "Verify the renewal option exercise window",
      explanation:
        `The estoppel certifies one remaining ${op.renewalYears}-year option "on the terms stated in the Lease." ` +
        `The operative notice requirement (${citeOf(data, op.renewalProvision)}: written notice no later than ` +
        `${op.renewalNoticeMonths} months before expiration, time of the essence) runs from the CURRENT expiration date — ` +
        `${fmtDate(op.expiration)} as extended by the First Amendment — so the exercise deadline is ${fmtDate(op.renewalNoticeDeadline)}. ` +
        `Had the window been computed from the original 2026 expiration, it would already have closed before the estoppel date. ` +
        `Counsel should confirm the parties are computing the window from the extended expiration, and that no exercise, ` +
        `waiver, or side agreement exists outside this file.`,
      left: passageFromCert(cert),
      right: passageFromProv(op.renewalProvision),
      leftHeading: "Estoppel certifies",
      rightHeading: "Operative option terms",
    });
  }

  // ---- 6. Intra-document contradictions (same fact, same document, different values) ----
  for (const doc of data.documents) {
    if (doc.kind !== "operative") continue;
    const provs = data.provisions.filter((p) => p.docId === doc.id);
    const byField = {};
    for (const p of provs) {
      for (const [field, value] of Object.entries(p.facts || {})) {
        if (typeof value !== "number" && typeof value !== "string") continue;
        (byField[field] = byField[field] || []).push({ prov: p, value });
      }
    }
    for (const [field, entries] of Object.entries(byField)) {
      if (entries.length < 2) continue;
      const distinct = [...new Set(entries.map((e) => JSON.stringify(e.value)))];
      if (distinct.length < 2) continue;
      const [a, b] = entries;
      flags.push({
        id: `flag-intradoc-${doc.id}-${field}`,
        severity: "medium",
        category: "intra-document",
        title: `Internal contradiction in the ${doc.title}: ${fieldLabel(field)} stated two ways`,
        explanation:
          `Within the same document, ${a.prov.section} states ${fmtFact(field, a.value)} while ${b.prov.section} states ` +
          `${fmtFact(field, b.value)}. This is a classic drafting error. Which control depends on the document's ` +
          `order-of-precedence language — here, Exhibit C's "notwithstanding anything in the Lease to the contrary" ` +
          `lead-in cuts toward the exhibit, but the body section is the more specific economic term. Counsel should ` +
          `resolve the precedence question and consider an estoppel or amendment clarification before closing.`,
        left: { ...passageOf(data, a.prov), },
        right: { ...passageOf(data, b.prov), },
        leftHeading: `${doc.short} ${a.prov.section}`,
        rightHeading: `${doc.short} ${b.prov.section}`,
      });
    }
  }

  // ---- Informational certifications with no operative counterpart ----
  if (certs.rentPaidThrough) {
    consistent.push(
      `Rent certified paid through ${fmtDate(certs.rentPaidThrough.value)} (factual statement; no operative counterpart to compare — confirm against the rent ledger).`
    );
  }
  if (certs.defaults) {
    consistent.push(
      `No-default certification is knowledge-qualified ("to Tenant's actual knowledge") — standard, but it limits the certification's reach.`
    );
  }

  const sevRank = { high: 0, medium: 1, info: 2 };
  flags.sort((x, y) => sevRank[x.severity] - sevRank[y.severity]);
  return { flags, consistent };
}

function passageOf(data, p) {
  return {
    docId: p.docId,
    title: docById(data, p.docId).title,
    section: p.section,
    anchor: p.anchor,
    quote: p.quote,
  };
}

function citeOf(data, p) {
  return `${docById(data, p.docId).title} ${p.section}`;
}

function fieldLabel(field) {
  const labels = {
    camCapPct: "the cap on Controllable Operating Expenses",
    securityDeposit: "the security deposit",
    expiration: "the expiration date",
  };
  return labels[field] || field;
}

function fmtFact(field, value) {
  if (field === "camCapPct") return `${value}% per year`;
  if (field === "securityDeposit") return fmtMoney(value);
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return fmtDate(value);
  return String(value);
}

function fmtMoney(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];
function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

/* =========================== Node export for verification =========================== */

if (typeof module !== "undefined" && module.exports) {
  module.exports = { rentAsOf, subtractMonths, buildChains, deriveOperative, buildFlags };
}

/* =========================== Browser app =========================== */

if (typeof document !== "undefined") {
  (async function main() {
    let DATA;
    try {
      const resp = await fetch("data/demo-matter.json");
      DATA = await resp.json();
    } catch (e) {
      document.getElementById("matter-bar").textContent =
        "Could not load data/demo-matter.json — serve this folder over HTTP (python3 -m http.server) rather than file://.";
      return;
    }

    const CHAINS = buildChains(DATA);
    const OP = deriveOperative(DATA, CHAINS);
    const { flags: FLAGS, consistent: CONSISTENT } = buildFlags(DATA, CHAINS, OP);

    const STORE_KEY = `crosscheck.dispositions.${DATA.matter.id}`;
    let state = loadState();

    function loadState() {
      try {
        const raw = localStorage.getItem(STORE_KEY);
        if (raw) return JSON.parse(raw);
      } catch (e) { /* fall through */ }
      return { reviewer: "", items: {}, generatedAt: null };
    }
    function saveState() {
      try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* ignore */ }
    }

    /* ---------- chrome ---------- */

    document.getElementById("framing").textContent = DATA.framing;
    document.getElementById("matter-desc").textContent = DATA.matter.description;
    document.getElementById("matter-bar").innerHTML =
      `<span><strong>${esc(DATA.matter.name)}</strong></span>` +
      `<span>Client: ${esc(DATA.matter.client)}</span>` +
      `<span>${esc(DATA.matter.property)}</span>` +
      `<span>As of ${fmtDate(DATA.matter.asOf)}</span>`;

    const tabs = document.getElementById("tabs");
    tabs.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-view]");
      if (!btn) return;
      showView(btn.dataset.view);
    });
    function showView(name) {
      for (const b of tabs.querySelectorAll("button")) b.classList.toggle("active", b.dataset.view === name);
      for (const s of document.querySelectorAll("section.view")) s.classList.toggle("active", s.id === `view-${name}`);
      window.scrollTo(0, 0);
    }

    /* ---------- overview ---------- */

    document.getElementById("doc-rows").innerHTML = DATA.documents
      .map(
        (d) => `<tr>
          <td><a href="${esc(d.file)}" target="_blank" rel="noopener"><strong>${esc(d.title)}</strong></a></td>
          <td style="white-space:nowrap">${esc(d.dateDisplay)}</td>
          <td><span class="doc-kind ${d.kind}">${d.kind === "operative" ? "Operative" : "Factual cert."}</span></td>
          <td style="color:var(--slate);font-size:13.5px">${esc(d.summary)}</td>
        </tr>`
      )
      .join("");

    document.getElementById("not-checked-list").innerHTML = DATA.notChecked
      .map((x) => `<li>${esc(x)}</li>`)
      .join("");

    /* ---------- operative terms ---------- */

    const chainsEl = document.getElementById("chains");
    chainsEl.innerHTML = CHAINS.map(renderChain).join("");

    function operativeSummary(c) {
      switch (c.category) {
        case "rent":
          return `${fmtMoney(OP.currentMonthlyRent)}/mo as of ${fmtDate(OP.asOf)}`;
        case "term":
          return `Expires ${fmtDate(OP.expiration)}`;
        case "deposit":
          return fmtMoney(OP.securityDeposit);
        case "renewal":
          return `1 × ${OP.renewalYears}-yr option · notice by ${fmtDate(OP.renewalNoticeDeadline)}`;
        case "opex":
          return `Cap stated 4% (§ 6.3) / 5% (Ex. C) — see Review Queue`;
        default:
          return "";
      }
    }

    function renderChain(c) {
      const steps = c.steps
        .map((s) => {
          const d = docById(DATA, s.prov.docId);
          const marker =
            s.status === "operative" ? `<span class="chain-marker operative">Operative</span>`
            : s.status === "confirmed" ? `<span class="chain-marker confirmed">Confirms</span>`
            : `<span class="chain-marker superseded">Superseded</span>`;
          const link = `${esc(d.file)}#${esc(s.prov.anchor)}`;
          let extra = "";
          if (s.status === "operative" && s.prov.facts.rentSchedule) {
            extra = renderRentTable(s.prov.facts.rentSchedule);
          }
          return `<div class="chain-step ${s.status}">
            ${marker}
            <div class="chain-detail">
              <div class="cite"><a href="${link}" target="_blank" rel="noopener">${esc(d.title)} ${esc(s.prov.section)}</a>
                <span style="font-weight:400;color:var(--muted)">(${esc(d.dateDisplay)})</span></div>
              <div class="gloss">${esc(s.prov.label)}${s.relationText ? ` — ${esc(s.relationText)}` : ""}</div>
              ${extra}
            </div>
          </div>`;
        })
        .join("");

      const lineage = c.steps
        .map((s) => `${docById(DATA, s.prov.docId).short} ${s.prov.section}`)
        .join(" → ");
      const last = c.steps[c.steps.length - 1];

      return `<div class="chain">
        <div class="chain-head">
          <h3>${esc(c.label)}</h3>
          <span class="operative-value">${esc(operativeSummary(c))}</span>
        </div>
        <div class="chain-body">${steps}</div>
        <div class="lineage-note">Lineage: ${esc(lineage)}${last ? ` — ${esc(docById(DATA, last.prov.docId).short)} ${esc(last.prov.section)} controls.` : ""} Supersession is the documents working as intended; it is not flagged as a conflict.</div>
      </div>`;
    }

    function renderRentTable(schedule) {
      const rows = schedule
        .map((r) => {
          const cur = OP.asOf >= r.from && OP.asOf <= r.to;
          return `<tr class="${cur ? "current" : ""}"><td>${fmtDate(r.from)} – ${fmtDate(r.to)}</td><td class="num">${fmtMoney(r.monthly)}</td></tr>`;
        })
        .join("");
      return `<table class="rent-table"><tr><th>Period</th><th>Monthly</th></tr>${rows}</table>`;
    }

    /* ---------- review queue ---------- */

    const flagsEl = document.getElementById("flags");
    flagsEl.innerHTML = FLAGS.map(renderFlag).join("");
    document.getElementById("consistent-list").innerHTML = CONSISTENT
      .map((x) => `<li><span class="okmark">✓</span> ${esc(x)}</li>`)
      .join("");

    function renderFlag(f) {
      const it = state.items[f.id] || {};
      return `<div class="flag-card sev-${f.severity}" data-flag="${esc(f.id)}">
        <div class="flag-head">
          <span class="sev-badge ${f.severity}">${f.severity === "info" ? "verify" : f.severity}</span>
          <h3>${esc(f.title)}</h3>
        </div>
        <div class="flag-explain">${esc(f.explanation)}</div>
        <div class="passage-grid">
          ${renderPassage(f.left, f.leftHeading)}
          ${renderPassage(f.right, f.rightHeading)}
        </div>
        <div class="disposition">
          <div class="dlabel">Attorney disposition (required)</div>
          <div class="choices">
            <label><input type="radio" name="disp-${esc(f.id)}" value="confirm" ${it.choice === "confirm" ? "checked" : ""}> Confirm issue</label>
            <label><input type="radio" name="disp-${esc(f.id)}" value="dismiss" ${it.choice === "dismiss" ? "checked" : ""}> Dismiss — not an issue</label>
            <label><input type="radio" name="disp-${esc(f.id)}" value="note" ${it.choice === "note" ? "checked" : ""}> Note</label>
          </div>
          <textarea data-note="${esc(f.id)}" placeholder="Reviewer note (required for 'Note'; optional otherwise)">${esc(it.note || "")}</textarea>
          <div class="dstate" data-state="${esc(f.id)}"></div>
        </div>
      </div>`;
    }

    function renderPassage(p, heading) {
      const doc = docById(DATA, p.docId);
      const href = p.anchor ? `${esc(doc.file)}#${esc(p.anchor)}` : esc(doc.file);
      return `<div class="passage">
        <div class="passage-role">${esc(heading)}</div>
        <div class="passage-cite"><a href="${href}" target="_blank" rel="noopener">${esc(p.title)} ${esc(p.section)}</a></div>
        <blockquote>${esc(p.quote)}</blockquote>
      </div>`;
    }

    flagsEl.addEventListener("change", (e) => {
      const card = e.target.closest(".flag-card");
      if (!card) return;
      const id = card.dataset.flag;
      const it = state.items[id] || (state.items[id] = {});
      if (e.target.matches('input[type="radio"]')) {
        it.choice = e.target.value;
        it.date = new Date().toISOString().slice(0, 10);
      }
      saveState();
      refreshGate();
    });
    flagsEl.addEventListener("input", (e) => {
      if (!e.target.matches("textarea[data-note]")) return;
      const id = e.target.dataset.note;
      const it = state.items[id] || (state.items[id] = {});
      it.note = e.target.value;
      saveState();
      refreshGate();
    });

    const reviewerInput = document.getElementById("reviewer-name");
    reviewerInput.value = state.reviewer || "";
    reviewerInput.addEventListener("input", () => {
      state.reviewer = reviewerInput.value;
      saveState();
      refreshGate();
    });

    function dispositionComplete(f) {
      const it = state.items[f.id];
      if (!it || !it.choice) return false;
      if (it.choice === "note" && !(it.note || "").trim()) return false;
      return true;
    }

    function gateStatus() {
      const done = FLAGS.filter(dispositionComplete).length;
      const reviewerOk = !!(state.reviewer || "").trim();
      return { done, total: FLAGS.length, reviewerOk, ready: done === FLAGS.length && reviewerOk };
    }

    const genBtn = document.getElementById("generate-report");
    function refreshGate() {
      const g = gateStatus();
      document.getElementById("gate-progress").innerHTML =
        `<strong>${g.done} of ${g.total}</strong> flags dispositioned`;
      const why = document.getElementById("gate-why");
      if (g.ready) {
        why.textContent = "All flags dispositioned and reviewer named — the report can be generated.";
        why.className = "gate-why ok";
      } else {
        const missing = [];
        if (g.done < g.total) missing.push(`${g.total - g.done} flag(s) await disposition (a 'Note' disposition requires note text)`);
        if (!g.reviewerOk) missing.push("reviewing attorney's name is required");
        why.textContent = "Report locked: " + missing.join("; ") + ". Export is deliberately disabled until the attorney has ruled on every flag.";
        why.className = "gate-why";
      }
      genBtn.disabled = !g.ready;

      // per-flag state lines + tab count
      for (const f of FLAGS) {
        const el = document.querySelector(`[data-state="${cssEscape(f.id)}"]`);
        if (!el) continue;
        const it = state.items[f.id];
        if (dispositionComplete(f)) {
          const labels = { confirm: "Confirmed as an issue", dismiss: "Dismissed — not an issue", note: "Noted" };
          el.textContent = `${labels[it.choice]}${state.reviewer ? ` · ${state.reviewer}` : ""}${it.date ? ` · ${fmtDate(it.date)}` : ""}`;
          el.className = "dstate done";
        } else {
          el.textContent = "Awaiting disposition";
          el.className = "dstate pending";
        }
      }
      const count = document.getElementById("flag-count");
      count.textContent = g.ready ? "✓" : `${g.total - g.done}`;
      count.className = "count " + (g.ready ? "done" : "warn");
    }

    function cssEscape(s) {
      return (window.CSS && CSS.escape) ? CSS.escape(s) : s.replace(/[^a-zA-Z0-9_-]/g, "\\$&");
    }

    genBtn.addEventListener("click", () => {
      if (!gateStatus().ready) return;
      state.generatedAt = new Date().toISOString();
      saveState();
      renderReport();
      showView("report");
    });

    document.getElementById("print-report").addEventListener("click", () => window.print());

    refreshGate();
    // If a complete prior session exists, allow the report tab to re-render it.
    if (state.generatedAt && gateStatus().ready) renderReport();

    /* ---------- report ---------- */

    function renderReport() {
      const out = document.getElementById("report-output");
      const today = new Date().toISOString().slice(0, 10);
      const reviewer = esc(state.reviewer.trim());

      const opRows = CHAINS.map((c) => {
        const lineage = c.steps
          .map((s) => {
            const cite = `${docById(DATA, s.prov.docId).short} ${s.prov.section}`;
            return s.status === "operative" ? `<strong>${esc(cite)} (operative)</strong>` : esc(cite);
          })
          .join(" → ");
        return `<tr>
          <td>${esc(c.label)}</td>
          <td>${esc(operativeSummary(c))}</td>
          <td>${lineage}</td>
        </tr>`;
      }).join("");

      const flagBlocks = FLAGS.map((f) => {
        const it = state.items[f.id];
        const labels = { confirm: "CONFIRMED ISSUE", dismiss: "DISMISSED — NOT AN ISSUE", note: "NOTED" };
        const sevLabel = f.severity === "info" ? "Verify" : f.severity.charAt(0).toUpperCase() + f.severity.slice(1);
        return `<h3>${esc(f.title)} <span style="font-weight:normal">[${esc(sevLabel)}]</span></h3>
          <p>${esc(f.explanation)}</p>
          <table>
            <tr><th style="width:50%">${esc(f.leftHeading)}</th><th>${esc(f.rightHeading)}</th></tr>
            <tr>
              <td><em>${esc(f.left.title)} ${esc(f.left.section)}</em><blockquote>${esc(f.left.quote)}</blockquote></td>
              <td><em>${esc(f.right.title)} ${esc(f.right.section)}</em><blockquote>${esc(f.right.quote)}</blockquote></td>
            </tr>
          </table>
          <p class="rep-disposition"><strong>Disposition: ${labels[it.choice]}.</strong>
            ${it.note ? esc(it.note) + " " : ""}
            <span class="who">Reviewed by ${reviewer}, ${fmtDate(it.date || today)}.</span></p>`;
      }).join("");

      out.innerHTML = `
        <h1>Lease Diligence Report — Operative Terms and Reviewed Flags</h1>
        <div class="rep-meta">${esc(DATA.matter.name)}</div>
        <div class="rep-meta">Prepared for ${esc(DATA.matter.client)} · ${esc(DATA.matter.property)}</div>
        <div class="rep-meta">Reviewing attorney: ${reviewer} · Report generated ${fmtDate(today)} · Estoppel dated ${fmtDate(DATA.estoppel.date)}</div>

        <h2>1. Matter summary</h2>
        <p>${esc(DATA.matter.description)}</p>
        <table>
          <tr><th>Document</th><th>Date</th><th>Role</th></tr>
          ${DATA.documents.map((d) => `<tr><td>${esc(d.title)}</td><td>${esc(d.dateDisplay)}</td><td>${d.kind === "operative" ? "Operative" : "Factual certification"}</td></tr>`).join("")}
        </table>

        <h2>2. Operative terms (with lineage)</h2>
        <p>The controlling provision for each tracked term, with its supersession lineage. Supersession by amendment is the
        documents working as intended and is not a flag.</p>
        <table>
          <tr><th>Term</th><th>Operative state as of ${fmtDate(OP.asOf)}</th><th>Lineage</th></tr>
          ${opRows}
        </table>

        <h2>3. Reviewed flags and dispositions</h2>
        <p>Each flag below was generated by CrossCheck as a candidate discrepancy and dispositioned by the reviewing
        attorney. Estoppel flags are framed as: the estoppel certifies X; the operative documents show Y. An estoppel
        certifies facts as of its date; it does not amend the lease.</p>
        ${flagBlocks}

        <h2>4. Certifications with no discrepancy found</h2>
        <ul>${CONSISTENT.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>

        <h2>5. What CrossCheck does not check</h2>
        <p>The following subject areas are outside the v1 comparison engine and were not analyzed by the software. Review
        of these provisions remains entirely the responsibility of counsel:</p>
        <ul class="rep-notchecked">${DATA.notChecked.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>

        <div class="rep-framing">${esc(DATA.framing)}</div>
      `;
      out.hidden = false;
      document.getElementById("report-locked").hidden = true;
      document.getElementById("report-actions").hidden = false;
    }

    /* ---------- optional live mode ---------- */

    (async function probeLive() {
      try {
        const r = await fetch("/api/health", { method: "GET" });
        if (!r.ok) return;
        const j = await r.json();
        if (!j || !j.live) return;
        document.getElementById("live-panel").hidden = false;
        const badge = document.getElementById("live-badge");
        badge.textContent = "live extraction available";
        badge.classList.add("on");
      } catch (e) { /* static mode — panel stays hidden */ }
    })();

    document.getElementById("live-extract").addEventListener("click", async () => {
      const text = document.getElementById("live-text").value.trim();
      const status = document.getElementById("live-status");
      const resultEl = document.getElementById("live-result");
      if (!text) { status.textContent = "Paste some document text first."; return; }
      status.textContent = "Extracting…";
      resultEl.innerHTML = "";
      try {
        const r = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, docType: document.getElementById("live-doctype").value }),
        });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || `HTTP ${r.status}`);
        status.textContent = `Extracted ${j.provisions.length} provision(s). Candidates for attorney review — not conclusions.`;
        resultEl.innerHTML = j.provisions
          .map(
            (p) => `<div class="ext-item">
              <strong>${esc(p.section || "")} ${esc(p.label || "")}</strong>
              <span style="color:var(--muted)"> · ${esc(p.category || "uncategorized")}</span>
              <blockquote style="margin:4px 0 0;padding:4px 10px;border-left:3px solid var(--line);font-family:var(--serif);font-size:13px">${esc(p.quote || "")}</blockquote>
            </div>`
          )
          .join("");
      } catch (e) {
        status.textContent = `Extraction failed: ${e.message}`;
      }
    });

    function esc(s) {
      return String(s == null ? "" : s)
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
    }
  })();
}

/* esc for engine-side use under node (no-op safe) */
function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
