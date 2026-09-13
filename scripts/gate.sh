#!/bin/sh
# Every quality gate, each with its real exit code. Usage: sh scripts/gate.sh [--no-build]
set -u
fail() { echo "GATE FAILED: $1"; exit 1; }
npx tsc --noEmit || fail typecheck
npx eslint src test || fail lint
npx vitest run > /tmp/mjgrid-vitest.log 2>&1; code=$?
grep -E "Test Files|Tests |✗|×|FAIL " /tmp/mjgrid-vitest.log
[ $code -eq 0 ] || fail tests
if [ "${1:-}" != "--no-build" ]; then
  npx tsup > /dev/null 2>&1 || fail build
  node scripts/check-esm.mjs > /dev/null || fail check:esm
  echo "build+esm ok"
fi
echo "ALL GATES PASSED"
