import { describe, expect, it } from 'vitest'
import { columnTypeRegistry, filterFor } from '../../src/core'
import type { MjColumn, MjColumnType } from '../../src/core'

describe('columnTypeRegistry', () => {
  it('covers every column type exactly once', () => {
    const types: MjColumnType[] = ['string','number','select','date','time','timeRange','weekDays','boolean','image','file','address','button','selectGrid','autocomplete','profile','custom','status']
    for (const t of types) expect(columnTypeRegistry[t], t).toBeDefined()
    expect(Object.keys(columnTypeRegistry).sort()).toEqual([...types].sort())
  })
  it('selectGrid is form-capable (the legacy form silently dropped it)', () => {
    expect(columnTypeRegistry.selectGrid.formCapable).toBe(true)
  })
  it('timeRange and weekDays round-trip their storage strings', () => {
    const tr = columnTypeRegistry.timeRange
    const d = tr.decode!('09:30 17:45') as { start: Date; end: Date }
    expect(tr.encode!(d)).toBe('09:30 17:45')
    expect(tr.encode!({ start: d.start, end: null })).toBe('09:30 ')
    const wd = columnTypeRegistry.weekDays
    expect(wd.decode!('1,0,1,0,1,0,0')).toEqual([true,false,true,false,true,false,false])
    expect(wd.encode!([true,false,true,false,true,false,false])).toBe('1,0,1,0,1,0,0')
  })
  it('number encode turns empty into null and strings into numbers', () => {
    expect(columnTypeRegistry.number.encode!('')).toBeNull()
    expect(columnTypeRegistry.number.encode!('42')).toBe(42)
  })
})

describe('filterFor', () => {
  const str: MjColumn = { field: 'name', headerName: 'Name', type: 'string' }
  const num: MjColumn = { field: 'qty', headerName: 'Qty', type: 'number' }
  const sel: MjColumn = { field: 'status', headerName: 'Status', type: 'select', params: { options: [{ value: 'A', text: 'Active' }] } }
  const date: MjColumn = { field: 'createdAt', headerName: 'Created', type: 'date' }
  const bool: MjColumn = { field: 'active', headerName: 'Active', type: 'boolean' }
  const nested: MjColumn = { field: 'material', headerName: 'Material', type: 'string', path: 'name' }

  it('string -> contains; nested path -> columnProp', () => {
    expect(filterFor(str, 'kim')).toEqual({ columnName: 'name', operator: 'contains', columnValue: 'kim', logic: 'and' })
    expect(filterFor(nested, 'x', 'or')).toMatchObject({ columnProp: 'name', logic: 'or' })
  })
  it('number -> = with numeric value; non-numeric text yields null', () => {
    expect(filterFor(num, '12')).toMatchObject({ operator: '=', columnValue: 12 })
    expect(filterFor(num, 'abc')).toBeNull()
  })
  it('select maps option text to value, case-insensitively', () => {
    expect(filterFor(sel, 'active')).toMatchObject({ operator: 'equals', columnValue: 'A' })
    expect(filterFor(sel, 'A')).toMatchObject({ columnValue: 'A' })
  })
  it('date needs both ends and emits "start,end"', () => {
    expect(filterFor(date, { startDate: new Date('2026-01-01'), endDate: null })).toBeNull()
    expect(filterFor(date, { startDate: new Date('2026-01-01T00:00:00'), endDate: new Date('2026-01-31T00:00:00') }))
      .toMatchObject({ operator: 'between', columnValue: '2026-01-01,2026-01-31' })
  })
  it('boolean -> is with a real boolean', () => {
    expect(filterFor(bool, 'true')).toMatchObject({ operator: 'is', columnValue: true })
    expect(filterFor(bool, false)).toMatchObject({ columnValue: false })
  })
  it('empty values and non-filterable types yield null', () => {
    expect(filterFor(str, '')).toBeNull()
    expect(filterFor({ field: 'b', headerName: 'B', type: 'button', params: { text: 'x', onClick: () => {} } }, 'x')).toBeNull()
  })
})
