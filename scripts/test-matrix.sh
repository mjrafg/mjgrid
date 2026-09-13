#!/bin/sh
# Typecheck + tests against another MUI / React pair, then restore the lockfile install.
# Usage: sh scripts/test-matrix.sh <mui-version> <react-version>   e.g. 5.12.2 18.2.0
set -u
MUI="${1:?mui version}"; REACT="${2:?react version}"
RMAJOR="${REACT%%.*}"
fail() { echo "MATRIX FAILED ($MUI / $REACT): $1"; npm ci --silent > /dev/null 2>&1; exit 1; }
# --legacy-peer-deps stops npm from re-resolving the tree, but then it also drops auto-installed
# peers (@testing-library/dom), so the test toolchain is pinned in the same command.
npm install --no-save --legacy-peer-deps "@mui/material@$MUI" "react@$REACT" "react-dom@$REACT" \
  "@types/react@$RMAJOR" "@types/react-dom@$RMAJOR" @testing-library/react@16 @testing-library/dom@10 > /dev/null 2>&1 || fail install
node -e "
const v = p => require('./node_modules/' + p + '/package.json').version
if (v('@mui/material') !== '$MUI' || v('react') !== '$REACT') { console.error('installed', v('@mui/material'), v('react')); process.exit(1) }
console.log('matrix: @mui/material', v('@mui/material'), 'react', v('react'), '@testing-library/react', v('@testing-library/react'))" || fail versions
npx tsc --noEmit || fail typecheck
npx vitest run > /tmp/mjgrid-matrix.log 2>&1; code=$?
grep -E "Test Files|Tests |×" /tmp/mjgrid-matrix.log
[ $code -eq 0 ] || fail tests
npm ci --silent > /dev/null 2>&1
echo "MATRIX PASSED ($MUI / $REACT)"
