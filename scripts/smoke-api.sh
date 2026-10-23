#!/usr/bin/env bash
#
# Smoke-test a deployed RhemaVoice API.
#
#   ./scripts/smoke-api.sh https://your-function.neon.tech
#   API_URL=https://your-function.neon.tech ./scripts/smoke-api.sh
#
# Requires: curl, python3. The demo account must exist and OTP_DEBUG must be
# enabled on the API (the script reads `debug_code` from the login response).

set -euo pipefail

BASE="${1:-${API_URL:-}}"
if [[ -z "$BASE" ]]; then
  echo "usage: $0 <api-base-url>" >&2
  exit 2
fi
BASE="${BASE%/}"

EMAIL="${SMOKE_EMAIL:-demo@rhemavoice.app}"
PASSWORD="${SMOKE_PASSWORD:-Demo123!}"

json() {
  python3 -c "import sys,json; d=json.load(sys.stdin); print($1)"
}

step() {
  printf '%-40s' "$1"
}

fail() {
  echo "FAIL"
  exit 1
}

step "GET /health/"
HEALTH=$(curl -fsS -m 30 "$BASE/health/")
[[ "$(printf '%s' "$HEALTH" | json 'd["status"]')" == "ok" ]] || fail
echo "ok"

step "POST /api/v1/auth/login/"
LOGIN=$(curl -fsS -m 60 -X POST "$BASE/api/v1/auth/login/" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
CHALLENGE=$(printf '%s' "$LOGIN" | json 'd["challenge_id"]')
DEBUG_CODE=$(printf '%s' "$LOGIN" | json 'd.get("debug_code","")')
[[ -n "$CHALLENGE" ]] || fail
echo "ok"

step "POST /api/v1/auth/otp/verify/"
if [[ -z "$DEBUG_CODE" ]]; then
  echo "SKIP (OTP_DEBUG is off)"
  exit 0
fi
VERIFY=$(curl -fsS -m 60 -X POST "$BASE/api/v1/auth/otp/verify/" \
  -H 'Content-Type: application/json' \
  -d "{\"challenge_id\":\"$CHALLENGE\",\"code\":\"$DEBUG_CODE\"}")
TOKEN=$(printf '%s' "$VERIFY" | json 'd["tokens"]["access"]')
[[ -n "$TOKEN" ]] || fail
echo "ok"

step "GET /api/v1/modules/"
MODULES=$(curl -fsS -m 60 "$BASE/api/v1/modules/" -H "Authorization: Bearer $TOKEN")
COUNT=$(printf '%s' "$MODULES" | json 'len(d)')
[[ "$COUNT" -ge 10 ]] || fail
echo "ok ($COUNT modules)"

step "GET /api/v1/dashboard/"
DASH=$(curl -fsS -m 60 "$BASE/api/v1/dashboard/" -H "Authorization: Bearer $TOKEN")
printf '%s' "$DASH" | json 'd["greeting"]' >/dev/null || fail
echo "ok"

for ENDPOINT in music/tracks marketplace/products store/products jobs/postings; do
  step "GET /api/v1/$ENDPOINT/"
  LIST=$(curl -fsS -m 60 "$BASE/api/v1/$ENDPOINT/" -H "Authorization: Bearer $TOKEN")
  N=$(printf '%s' "$LIST" | json 'len(d)')
  echo "ok ($N)"
done

echo
echo "Smoke test passed against $BASE"
