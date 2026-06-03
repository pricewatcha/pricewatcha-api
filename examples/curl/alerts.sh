#!/usr/bin/env bash
# Create and fetch a price alert (requires API key).
#
# Create keys at: https://pricewatcha.com/en/developers
#
# Usage:
#   export API_KEY="pwk_live_YOUR_KEY"
#   export PRODUCT_ID="prod_xxxxxxxx"
#   export THRESHOLD="500"
#   ./alerts.sh
set -euo pipefail

BASE="${PRICEWATCHA_API_BASE:-https://pricewatcha.com/api/v1}"
API_KEY="${API_KEY:?Set API_KEY to your pwk_live_... key}"
PRODUCT_ID="${PRODUCT_ID:?Set PRODUCT_ID to a catalog product_id}"
THRESHOLD="${THRESHOLD:?Set THRESHOLD to your target price (number)}"

echo "→ POST /api/v1/alerts"
CREATE=$(curl -sS -w "\n%{http_code}" -X POST "${BASE}/alerts" \
  -H "Authorization: Bearer ${API_KEY}" \
  -H "Content-Type: application/json" \
  -d "$(jq -n \
    --arg product_id "$PRODUCT_ID" \
    --argjson threshold "$THRESHOLD" \
    '{product_id: $product_id, threshold_price: $threshold, notify_email: true}')")
BODY=$(echo "$CREATE" | head -n -1)
CODE=$(echo "$CREATE" | tail -n 1)
echo "$BODY" | jq .
[[ "$CODE" == "201" ]] || { echo "Expected 201, got $CODE"; exit 1; }

ALERT_ID=$(echo "$BODY" | jq -r .id)
echo "→ GET /api/v1/alerts/${ALERT_ID}"
curl -sS "${BASE}/alerts/${ALERT_ID}" \
  -H "Authorization: Bearer ${API_KEY}" | jq .
