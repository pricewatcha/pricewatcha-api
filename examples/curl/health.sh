#!/usr/bin/env bash
set -euo pipefail
BASE="${PRICEWATCHA_API_BASE:-https://pricewatcha.com/api/v1}"
curl -sS "${BASE}/health" | jq .
