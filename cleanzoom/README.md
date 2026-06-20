# CleanZoom — Hover to Enlarge Images

Hover any thumbnail and CleanZoom instantly shows the full-size image. No
accounts, no tracking, and **no data ever leaves your browser**. That trust
promise is the whole point: the original "Hover Zoom" was sold, turned into
spyware, and pulled from the store — CleanZoom is the clean, honest rebuild.

## Features

- Hover-to-preview for `<img>` thumbnails, image links, `srcset`, lazy-loaded
  galleries (`data-full`, `data-large`, `data-zoom`, …), and CSS backgrounds.
- Smart full-resolution detection — only previews when a genuinely larger
  source exists, so it never just re-shows the same thumbnail.
- Shows the image's real pixel dimensions.
- Configurable: hover delay, optional activation key (Alt/Shift/Ctrl), max
  preview size, minimum thumbnail size, and a per-site off switch.
- Dismisses cleanly on mouse-out, scroll, tab blur, or `Esc`.
- Fully local. The extension makes **zero network requests of its own** and
  requests only the `storage` permission (to remember your settings).

## Install (developer / unpacked)

1. Open `chrome://extensions`.
2. Toggle **Developer mode** (top right).
3. Click **Load unpacked** and select this `cleanzoom/` folder.
4. Hover an image anywhere. Adjust behavior from the toolbar popup or the
   options page.

## Project layout

```
cleanzoom/
├── manifest.json        # MV3 manifest
├── icons/               # generated PNG icons + make_icons.py
└── src/
    ├── content.js       # hover-zoom engine (runs on the page)
    ├── content.css      # preview overlay styles
    ├── popup.html/.css/.js   # toolbar quick toggles
    └── options.html/.css/.js # full settings
```

Regenerate icons with `python3 icons/make_icons.py` (no dependencies).

## Monetization (next step, not in v1)

The plan is a free core + a one-time Pro unlock (gallery auto-advance, video
thumbnail previews, custom triggers) via [ExtensionPay](https://extensionpay.com/).
v1 ships free to build installs and reviews first; the licensing check slots
into `content.js` behind a stored `pro` flag.

## Build / package for the Chrome Web Store

```
bash package.sh        # produces cleanzoom.zip ready to upload
```

See `STORE_LISTING.md` for the listing copy and `PRIVACY.md` for the privacy
policy (required at submission).
