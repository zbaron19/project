#!/usr/bin/env bash
# Build an upload-ready zip for the Chrome Web Store.
# Excludes docs and tooling that don't belong in the shipped package.
set -euo pipefail
cd "$(dirname "$0")"

OUT="cleanzoom.zip"
rm -f "$OUT"

zip -r "$OUT" \
  manifest.json \
  icons/icon16.png icons/icon32.png icons/icon48.png icons/icon128.png \
  src \
  -x "*.DS_Store" >/dev/null

echo "Built $OUT ($(du -h "$OUT" | cut -f1))"
echo "Upload it at https://chrome.google.com/webstore/devconsole"
