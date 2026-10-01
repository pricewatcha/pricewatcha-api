#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
VERSION=$(python3 -c "import json; print(json.load(open('$ROOT/.codex-plugin/plugin.json'))['version'])")
OUT_DIR="$ROOT/../../dist/pricewatcha-plugin-${VERSION}"
ZIP="$ROOT/../../dist/pricewatcha-plugin-${VERSION}.zip"
rm -rf "$OUT_DIR" "$ZIP"
mkdir -p "$OUT_DIR"
cp -R "$ROOT/.codex-plugin" "$OUT_DIR/"
cp -R "$ROOT/assets" "$OUT_DIR/"
cp "$ROOT/chatgpt-app-submission.json" "$OUT_DIR/"
cp "$ROOT/plugin.json" "$OUT_DIR/"
cp "$ROOT/mcp.json" "$OUT_DIR/"
cp "$ROOT/.mcp.json" "$OUT_DIR/"
(cd "$OUT_DIR" && zip -r "$ZIP" . -x '*.DS_Store' -x '*/.DS_Store')
echo "Wrote $ZIP"
unzip -l "$ZIP"
