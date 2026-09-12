import { describe, expect, it } from 'vitest'
import { registerType, renderersFor, ensureDefaults } from '../../src/mui'
import { columnTypeRegistry } from '../../src/core'
import type { MjColumnType } from '../../src/core'

describe('renderer registry', () => {
  it('registration merges, so contributors can run in any order', () => {
    const A = () => null, B = () => null
    registerType('custom', { Editor: A })
    registerType('custom', { Cell: B })
    const r = renderersFor({ type: 'custom', field: 'x', headerName: 'x' })
    expect(r.Cell).toBe(B)
    expect(r.Editor).toBe(A)
  })
  it('ensureDefaults covers every capability the core declares', () => {
    ensureDefaults()
    for (const t of Object.keys(columnTypeRegistry) as MjColumnType[]) {
      const r = renderersFor({ type: t, field: 'f', headerName: 'F' } as never)
      expect(r.Cell, `${t} cell`).toBeDefined()
      if (columnTypeRegistry[t].inlineCapable && ['string','number','select','date','boolean','selectGrid'].includes(t)) expect(r.Editor, `${t} editor`).toBeDefined()
      if (columnTypeRegistry[t].formCapable && ['string','number','select','date','boolean','selectGrid'].includes(t)) expect(r.Field, `${t} field`).toBeDefined()
    }
  })
})
