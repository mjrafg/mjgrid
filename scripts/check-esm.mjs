// Loads the built bundles under Node's *native* ESM loader, the way Next.js SSR
// does. Bundlers tolerate things Node does not (directory imports, missing
// extensions, bare deep paths without exports). Fails the publish if any slip in.
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
const require = createRequire(import.meta.url)
const fromCwd = p => pathToFileURL(resolve(process.cwd(), p)).href
for (const entry of ['./dist/index.js', './dist/core/index.js', './dist/mui/index.js']) {
  const m = await import(fromCwd(entry))
  if (!m || Object.keys(m).length === 0) throw new Error(`${entry}: no exports`)
  console.log(`esm ok  ${entry}  (${Object.keys(m).length} exports)`)
}
for (const entry of ['./dist/index.cjs', './dist/core/index.cjs', './dist/mui/index.cjs']) {
  const m = require(resolve(process.cwd(), entry))
  console.log(`cjs ok  ${entry}  (${Object.keys(m).length} exports)`)
}
