/* Popup: quick global toggle + per-site off switch. */
const enabledEl = document.getElementById("enabled");
const siteOffEl = document.getElementById("siteOff");
const siteEl = document.getElementById("site");

let currentHost = "";

function currentTabHost() {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      try {
        resolve(new URL(tabs[0].url).hostname);
      } catch {
        resolve("");
      }
    });
  });
}

async function init() {
  currentHost = await currentTabHost();
  if (currentHost) siteEl.textContent = currentHost;

  chrome.storage.sync.get({ enabled: true, disabledSites: [] }, (s) => {
    enabledEl.checked = s.enabled;
    siteOffEl.checked = currentHost ? s.disabledSites.includes(currentHost) : false;
    siteOffEl.disabled = !currentHost;
  });
}

enabledEl.addEventListener("change", () => {
  chrome.storage.sync.set({ enabled: enabledEl.checked });
});

siteOffEl.addEventListener("change", () => {
  chrome.storage.sync.get({ disabledSites: [] }, (s) => {
    const set = new Set(s.disabledSites);
    if (siteOffEl.checked) set.add(currentHost);
    else set.delete(currentHost);
    chrome.storage.sync.set({ disabledSites: [...set] });
  });
});

document.getElementById("opts").addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

init();
