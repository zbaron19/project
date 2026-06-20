/* Options page: load, live-save, and reset CleanZoom settings. */
const DEFAULTS = {
  enabled: true,
  delayMs: 200,
  modifier: "none",
  maxSizePct: 90,
  minThumbPx: 48,
  onlyIfLarger: true,
  disabledSites: []
};

const $ = (id) => document.getElementById(id);
const statusEl = $("status");

function flash(msg) {
  statusEl.textContent = msg;
  statusEl.classList.add("show");
  clearTimeout(flash._t);
  flash._t = setTimeout(() => statusEl.classList.remove("show"), 1200);
}

function render(s) {
  $("delayMs").value = s.delayMs;
  $("delayMsOut").textContent = s.delayMs + " ms";
  $("modifier").value = s.modifier;
  $("maxSizePct").value = s.maxSizePct;
  $("maxSizePctOut").textContent = s.maxSizePct + " %";
  $("minThumbPx").value = s.minThumbPx;
  $("minThumbPxOut").textContent = s.minThumbPx + " px";
  $("onlyIfLarger").checked = s.onlyIfLarger;
  $("disabledSites").value = (s.disabledSites || []).join("\n");
}

function collect() {
  return {
    delayMs: parseInt($("delayMs").value, 10),
    modifier: $("modifier").value,
    maxSizePct: parseInt($("maxSizePct").value, 10),
    minThumbPx: parseInt($("minThumbPx").value, 10),
    onlyIfLarger: $("onlyIfLarger").checked,
    disabledSites: $("disabledSites").value
      .split("\n").map((l) => l.trim().toLowerCase()).filter(Boolean)
  };
}

function save() {
  const patch = collect();
  // keep the live numeric labels in sync as sliders move
  $("delayMsOut").textContent = patch.delayMs + " ms";
  $("maxSizePctOut").textContent = patch.maxSizePct + " %";
  $("minThumbPxOut").textContent = patch.minThumbPx + " px";
  chrome.storage.sync.set(patch, () => flash("Saved"));
}

["delayMs", "modifier", "maxSizePct", "minThumbPx", "onlyIfLarger", "disabledSites"]
  .forEach((id) => {
    const ev = id === "disabledSites" ? "change" : "input";
    $(id).addEventListener(ev, save);
  });

$("reset").addEventListener("click", () => {
  chrome.storage.sync.set(DEFAULTS, () => {
    render(DEFAULTS);
    flash("Reset");
  });
});

chrome.storage.sync.get(DEFAULTS, render);
