#!/usr/bin/env bash
# Track a product URL and poll until completed or failed.
# Usage: ./track-and-poll.sh "https://www.backmarket.de/de-de/p/..."
set -euo pipefail

BASE="${PRICEWATCHA_API_BASE:-https://pricewatcha.com/api/v1}"
URL="${1:?Product URL required}"

echo "→ POST /track"
RESP=$(curl -sS -w "\n%{http_code}" -X POST "${BASE}/track" \
  -H "Content-Type: application/json" \
  -d "$(jq -n --arg url "$URL" '{url:$url}')")
BODY=$(echo "$RESP" | head -n -1)
CODE=$(echo "$RESP" | tail -n 1)
echo "$BODY" | jq .
[[ "$CODE" == "202" ]] || { echo "Expected 202, got $CODE"; exit 1; }

JOB_ID=$(echo "$BODY" | jq -r .job_id)
echo "→ Polling job ${JOB_ID}"

for i in $(seq 1 30); do
  sleep 2
  JOB=$(curl -sS "${BASE}/jobs/${JOB_ID}")
  STATUS=$(echo "$JOB" | jq -r .status)
  echo "  attempt $i: $STATUS"
  echo "$JOB" | jq .
  case "$STATUS" in
    completed|failed) exit 0 ;;
  esac
done
echo "Timed out waiting for job"
exit 1
