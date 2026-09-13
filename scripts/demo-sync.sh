#!/bin/sh
# Dev loop: rebuild dist, copy it into the demo's installed package, restart Vite on 5181.
set -e
cd "$(dirname "$0")/.."
npx tsup > /dev/null 2>&1
rm -rf examples/demo/node_modules/@agent24/mjgrid/dist
cp -R dist examples/demo/node_modules/@agent24/mjgrid/dist
rm -rf examples/demo/node_modules/.vite
pkill -f "vite --port 5181" 2>/dev/null || true
sleep 1
cd examples/demo && (npx vite --port 5181 --strictPort > /tmp/mjgrid-demo.log 2>&1 &)
sleep 4
curl -s -o /dev/null -w "demo http=%{http_code}\n" http://localhost:5181/
