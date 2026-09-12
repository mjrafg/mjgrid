import { describe, expect, it } from 'vitest'
import { applyFilters, applySort, matchesFilter, pageOf } from '../../src/core'

const rows = [
  { id: '1', name: '김치 1호', qty: 5, vendor: { id: 'v1', name: '에이스' }, when: '2026-01-05', active: true },
  { id: '2', name: '육수 2호', qty: 15, vendor: { id: 'v2', name: '베타' }, when: '2026-02-10', active: false },
  { id: '3', name: '김치 3호', qty: null, vendor: null, when: '2026-03-15', active: true }
]

describe('local filters', () => {
  it('contains is case-insensitive and reads nested paths via columnProp', () => {
    expect(applyFilters(rows, [{ columnName: 'name', columnValue: '김치', operator: 'contains' }]).map(r => r.id)).toEqual(['1', '3'])
    expect(applyFilters(rows, [{ columnName: 'vendor', columnProp: 'name', columnValue: '베타', operator: 'contains' }]).map(r => r.id)).toEqual(['2'])
  })
  it('equals on object values compares id; is on booleans; between on dates', () => {
    expect(applyFilters(rows, [{ columnName: 'vendor', columnValue: 'v1', operator: 'equals' }]).map(r => r.id)).toEqual(['1'])
    expect(applyFilters(rows, [{ columnName: 'active', columnValue: false, operator: 'is' }]).map(r => r.id)).toEqual(['2'])
    expect(applyFilters(rows, [{ columnName: 'when', columnValue: '2026-02-01,2026-03-31', operator: 'between' }]).map(r => r.id)).toEqual(['2', '3'])
  })
  it('or filters are OR-ed together and AND-ed with the and filters (backend semantics)', () => {
    const f = [
      { columnName: 'active', columnValue: true, operator: 'is' as const },
      { columnName: 'name', columnValue: '육수', operator: 'contains' as const, logic: 'or' as const },
      { columnName: 'name', columnValue: '3호', operator: 'contains' as const, logic: 'or' as const }
    ]
    expect(applyFilters(rows, f).map(r => r.id)).toEqual(['3'])
  })
  it('numeric comparisons and empties', () => {
    expect(matchesFilter(rows[1]!, { columnName: 'qty', columnValue: 10, operator: '>' })).toBe(true)
    expect(applyFilters(rows, [{ columnName: 'qty', columnValue: null, operator: 'isEmpty' }]).map(r => r.id)).toEqual(['3'])
    expect(applyFilters(rows, [{ columnName: 'name', columnValue: '김치 1호,육수 2호', operator: 'isAnyOf' }]).map(r => r.id)).toEqual(['1', '2'])
  })
})

describe('local sort + page', () => {
  it('sorts numbers numerically, strings by locale, nulls last, desc reverses', () => {
    expect(applySort(rows, { field: 'qty', direction: 'asc' }).map(r => r.id)).toEqual(['1', '2', '3'])
    expect(applySort(rows, { field: 'qty', direction: 'desc' }).map(r => r.id)).toEqual(['2', '1', '3'])
    expect(applySort(rows, { field: 'vendor.name', direction: 'asc' }).map(r => r.id)).toEqual(['2', '1', '3'])
  })
  it('pageOf slices', () => {
    expect(pageOf(rows, 1, 2).map(r => r.id)).toEqual(['3'])
  })
})
