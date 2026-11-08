#!/usr/bin/env bash
# Logs in as each demo role and loads every page. Prints the HTTP status per page and
# flags pages that rendered a Next.js error. Usage: bash scripts/smoke.sh [base-url]
BASE="${1:-http://localhost:3000}"
JAR=$(mktemp)
FAIL=0

check() {
  local path="$1"
  local body status
  body=$(curl -s -b "$JAR" -o - -w '\n__STATUS__%{http_code}' "$BASE$path")
  status="${body##*__STATUS__}"
  if [[ "$status" -ge 500 ]] || grep -q -E 'Unhandled Runtime Error|Application error|__next_error__' <<<"$body"; then
    echo "  FAIL $status $path"
    FAIL=1
  else
    echo "  ok   $status $path"
  fi
}

login() {
  rm -f "$JAR"
  curl -s -c "$JAR" -o /dev/null -X POST -d "email=$1&password=demo1234" "$BASE/api/auth/login"
}

echo "public"
for p in / /get-a-coach /login /api/public/updates; do check "$p"; done

CLIENT_ID=$(sqlite3 prisma/dev.db "select id from Client order by createdAt limit 1")
APPT_ID=$(sqlite3 prisma/dev.db "select id from Appointment order by startsAt desc limit 1")

echo "manager"
login lead@coachme2.org
for p in /workspace /chat /clients "/clients/$CLIENT_ID" /calendar "/calendar?tab=upcoming" "/calendar?tab=past" "/calendar/$APPT_ID" \
  /availability /matching /clients/new /credits /documents /updates /settings /forms /forms/builder /metrics "/metrics?clientId=$CLIENT_ID" \
  "/values?clientId=$CLIENT_ID" "/portfolio?clientId=$CLIENT_ID" /journal /goals "/api/forms/export?template=all"; do check "$p"; done

echo "coach"
login coach@example.com
for p in /workspace /chat /clients "/clients/$CLIENT_ID" /calendar "/calendar/$APPT_ID" /availability /forms /metrics /journal /goals; do check "$p"; done

echo "student"
login teen@example.com
for p in /workspace /chat /calendar /journal /goals /forms /metrics /values "/values?retake=1" /portfolio /documents /api/portfolio; do check "$p"; done

echo "parent"
login guardian@example.com
for p in /workspace /calendar /documents /credits; do check "$p"; done

rm -f "$JAR"
exit $FAIL
