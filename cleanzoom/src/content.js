/*
 * CleanZoom content script
 * -------------------------
 * Shows a full-size preview of an image when you hover its thumbnail.
 *
 * Design goals (the trust wedge): zero network calls of our own, zero
 * analytics, zero data collection. Everything below runs locally on the page
 * you are already viewing. The only storage we touch is your own settings.
 */
(() => {
  "use strict";

  const DEFAULTS = {
    enabled: true,
    delayMs: 200,            // hover dwell before preview appears
    modifier: "none",        // none | alt | shift | ctrl  (hold to activate)
    maxSizePct: 90,          // preview capped to this % of the viewport
    minThumbPx: 48,          // ignore images smaller than this (icons, sprites)
    onlyIfLarger: true,      // only show when a bigger source actually exists
    disabledSites: []        // list of hostnames where CleanZoom stays off
  };

  let settings = { ...DEFAULTS };
  let host = location.hostname;
  let active = true;         // false when this site is disabled

  // ---- runtime state ----
  let hoverTimer = null;
  let currentTarget = null;
  let overlay = null;
  let imgEl = null;
  let captionEl = null;
  let lastMouse = { x: 0, y: 0 };

  const IMG_EXT = /\.(jpe?g|png|gif|webp|bmp|avif|svg)(\?|#|$)/i;

  // ---------------------------------------------------------------- settings
  chrome.storage.sync.get(DEFAULTS, (loaded) => {
    settings = { ...DEFAULTS, ...loaded };
    active = settings.enabled && !settings.disabledSites.includes(host);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    for (const [k, v] of Object.entries(changes)) settings[k] = v.newValue;
    active = settings.enabled && !settings.disabledSites.includes(host);
    if (!active) hidePreview();
  });

  // ------------------------------------------------------------ url resolving
  // Pull the largest URL out of a srcset attribute ("url 320w, url2 640w").
  function bestFromSrcset(srcset) {
    if (!srcset) return null;
    let best = null, bestScore = -1;
    for (const part of srcset.split(",")) {
      const seg = part.trim().split(/\s+/);
      const url = seg[0];
      if (!url) continue;
      const d = seg[1] || "";
      const score = d.endsWith("w") ? parseInt(d) : d.endsWith("x") ? parseFloat(d) * 1000 : 1;
      if (score > bestScore) { bestScore = score; best = url; }
    }
    return best;
  }

  function abs(url) {
    try { return new URL(url, location.href).href; } catch { return null; }
  }

  // Given the element under the cursor, work out the best full-size image URL
  // plus the displayed size of the thumbnail we hovered.
  function resolveCandidate(el) {
    if (!el || el === overlay || (overlay && overlay.contains(el))) return null;

    // 1) Closest IMG (the element itself or a child/parent thumbnail)
    let img = el.tagName === "IMG" ? el : el.querySelector?.("img");
    if (!img && el.closest) img = el.closest("a")?.querySelector?.("img") || null;

    let thumbW = 0, thumbH = 0, candidate = null;

    if (img) {
      const r = img.getBoundingClientRect();
      thumbW = r.width; thumbH = r.height;
      // Prefer a wrapping link that points straight at an image file.
      const a = img.closest("a");
      if (a && a.href && IMG_EXT.test(a.href)) candidate = a.href;
      // Common "full res" data-attributes used by galleries/lazy-loaders.
      if (!candidate) {
        for (const attr of ["data-full", "data-large", "data-src-large",
          "data-zoom", "data-zoom-image", "data-original", "data-src", "data-hi-res"]) {
          const v = img.getAttribute?.(attr);
          if (v && IMG_EXT.test(v)) { candidate = v; break; }
        }
      }
      if (!candidate) candidate = bestFromSrcset(img.getAttribute("srcset")) || img.currentSrc || img.src;
    } else {
      // 2) A bare link to an image file (thumbnail-less galleries, forums).
      const a = el.closest?.("a");
      if (a && a.href && IMG_EXT.test(a.href)) {
        const r = a.getBoundingClientRect();
        thumbW = r.width; thumbH = r.height;
        candidate = a.href;
      } else {
        // 3) CSS background-image.
        const bg = getComputedStyle(el).backgroundImage;
        const m = bg && bg.match(/url\(["']?(.*?)["']?\)/);
        if (m && IMG_EXT.test(m[1])) {
          const r = el.getBoundingClientRect();
          thumbW = r.width; thumbH = r.height;
          candidate = m[1];
        }
      }
    }

    if (!candidate) return null;
    const url = abs(candidate);
    if (!url || url.startsWith("data:")) return null;
    return { url, thumbW, thumbH, img };
  }

  // --------------------------------------------------------------- modifiers
  function modifierHeld(e) {
    switch (settings.modifier) {
      case "alt": return e.altKey;
      case "shift": return e.shiftKey;
      case "ctrl": return e.ctrlKey || e.metaKey;
      default: return true; // "none" => always eligible
    }
  }

  // ------------------------------------------------------------------ overlay
  function ensureOverlay() {
    if (overlay) return;
    overlay = document.createElement("div");
    overlay.className = "cleanzoom-overlay";
    overlay.setAttribute("aria-hidden", "true");
    imgEl = document.createElement("img");
    imgEl.className = "cleanzoom-img";
    imgEl.alt = "";
    captionEl = document.createElement("div");
    captionEl.className = "cleanzoom-caption";
    overlay.appendChild(imgEl);
    overlay.appendChild(captionEl);
    document.documentElement.appendChild(overlay);
  }

  function showPreview(cand) {
    ensureOverlay();
    overlay.classList.add("cleanzoom-loading");
    overlay.classList.remove("cleanzoom-visible");
    captionEl.textContent = "Loading…";

    const probe = new Image();
    probe.onload = () => {
      // Decide whether the source is genuinely bigger than the thumbnail.
      const natW = probe.naturalWidth, natH = probe.naturalHeight;
      if (settings.onlyIfLarger && cand.thumbW && cand.thumbH) {
        const biggerEnough = natW > cand.thumbW * 1.15 || natH > cand.thumbH * 1.15;
        if (!biggerEnough) { hidePreview(); return; }
      }
      if (currentTarget == null) return; // moved off before it loaded
      imgEl.src = cand.url;
      overlay.classList.remove("cleanzoom-loading");
      overlay.classList.add("cleanzoom-visible");
      captionEl.textContent = `${natW} × ${natH}`;
      position(natW, natH);
    };
    probe.onerror = () => hidePreview();
    probe.src = cand.url;
  }

  // Size to fit the viewport, then place opposite the cursor's quadrant so the
  // preview never lands under the pointer or off-screen.
  function position(natW, natH) {
    const margin = 16;
    const maxW = (window.innerWidth * settings.maxSizePct) / 100;
    const maxH = (window.innerHeight * settings.maxSizePct) / 100;
    const scale = Math.min(maxW / natW, maxH / natH, 1);
    const w = Math.round(natW * scale);
    const h = Math.round(natH * scale);
    imgEl.style.width = w + "px";
    imgEl.style.height = h + "px";

    const boxW = w + 8, boxH = h + 26;
    let left = lastMouse.x + 24;
    let top = lastMouse.y + 24;
    if (left + boxW > window.innerWidth - margin) left = lastMouse.x - boxW - 24;
    if (left < margin) left = margin;
    if (top + boxH > window.innerHeight - margin) top = window.innerHeight - boxH - margin;
    if (top < margin) top = margin;
    overlay.style.left = left + "px";
    overlay.style.top = top + "px";
  }

  function hidePreview() {
    if (hoverTimer) { clearTimeout(hoverTimer); hoverTimer = null; }
    currentTarget = null;
    if (overlay) {
      overlay.classList.remove("cleanzoom-visible", "cleanzoom-loading");
      if (imgEl) imgEl.removeAttribute("src");
    }
  }

  // ------------------------------------------------------------------- events
  document.addEventListener("mousemove", (e) => {
    lastMouse.x = e.clientX; lastMouse.y = e.clientY;
  }, { passive: true });

  document.addEventListener("mouseover", (e) => {
    if (!active) return;
    if (!modifierHeld(e)) return;

    const cand = resolveCandidate(e.target);
    if (!cand) return;
    if ((cand.thumbW && cand.thumbW < settings.minThumbPx) &&
        (cand.thumbH && cand.thumbH < settings.minThumbPx)) return;

    if (currentTarget === e.target) return;
    hidePreview();
    currentTarget = e.target;
    hoverTimer = setTimeout(() => showPreview(cand), Math.max(0, settings.delayMs));
  }, { passive: true });

  document.addEventListener("mouseout", (e) => {
    if (e.target === currentTarget) hidePreview();
  }, { passive: true });

  // Bail out cleanly on the things that should always dismiss a preview.
  document.addEventListener("scroll", hidePreview, { passive: true, capture: true });
  window.addEventListener("blur", hidePreview);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") hidePreview();
  });
})();
