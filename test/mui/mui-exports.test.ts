import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import * as mui from '@mui/material'
import { describe, expect, it } from 'vitest'

/**
 * Production webpack treats a missing ESM export as a hard error ("Attempted
 * import error"), while dev mode and vitest let it pass. 1.5.0 read
 * `version` from @mui/material, which MUI 5.12 does not export, and broke
 * `next build` in a MUI 5 host. Under scripts/test-matrix.sh this test runs
 * against MUI 5.12, so every root import must exist there too.
 */
const files = (dir: string): string[] => readdirSync(dir).flatMap(f => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : /\.tsx?$/.test(p) ? [p] : [] })

describe('@mui/material imports', () => {
  const sources = files('src').map(f => ({ f, s: readFileSync(f, 'utf8') }))

  it('no namespace import (every name must be statically checkable)', () => {
    const bad = sources.filter(x => /import\s+\*\s+as\s+\w+\s+from\s+'@mui\/material'/.test(x.s)).map(x => x.f)
    expect(bad).toEqual([])
  })

  it('every value imported from @mui/material exists in the installed version', () => {
    const missing: string[] = []
    for (const { f, s } of sources) {
      for (const m of s.matchAll(/import\s*\{([^}]+)\}\s*from\s*'@mui\/material'/g)) {
        for (const raw of m[1]!.split(',')) {
          const name = raw.trim()
          if (!name || name.startsWith('type ')) continue
          const imported = name.split(/\s+as\s+/)[0]!.trim()
          if (!(imported in mui)) missing.push(`${f}: ${imported}`)
        }
      }
    }
    expect(missing).toEqual([])
  })
})
