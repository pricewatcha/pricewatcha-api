#!/usr/bin/env bash
set -euo pipefail
BASE="${PRICEWATCHA_API_BASE:-https://pricewatcha.com/api/v1}"
ID="${1:-demo_iphone_15_pro}"
curl -sS "${BASE}/products/${ID}" | jq .
echo "--- price history ---"
curl -sS "${BASE}/products/${ID}/price-history" | jq .
