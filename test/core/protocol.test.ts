import { describe, expect, it } from 'vitest'
import { assertOk, buildServerSideRequest, MjApiError, mjUrls, MjUrlError, toWireColumn } from '../../src/core'
import type { MjGridConfig } from '../../src/core'

const config: MjGridConfig = {
  name: 'Product',
  resource: '/api/products',
  columns: [
    { field: 'code', headerName: 'Code', type: 'string', width: 150, excelExampleValue: 'P1',
      params: { valueCheck: async () => {}, mask: '000' } },
    { field: 'img', headerName: 'Image', type: 'image', hideOnExcel: true }
  ],
  defaultFilters: [{ columnName: 'type', columnValue: 'SALES', operator: 'equals', logic: 'or' }]
}

describe('buildServerSideRequest', () => {
  const state = { page: 2, pageSize: 12, sort: { field: 'seq', direction: 'asc' as const }, filters: [] }

  it('sends only wire-safe column facts, never callbacks or params', () => {
    const req = buildServerSideRequest(config, state)
    expect(req.gridSettings.columns).toEqual([
      { field: 'code', headerName: 'Code', width: 150, excelExampleValue: 'P1' },
      { field: 'img', headerName: 'Image', hideOnExcel: true }
    ])
    expect(JSON.stringify(req)).not.toContain('valueCheck')
    expect(JSON.stringify(req)).not.toContain('mask')
  })

  it('merges defaultFilters that are not already present', () => {
    const req = buildServerSideRequest(config, state)
    expect(req.filters).toEqual(config.defaultFilters)
    const overridden = buildServerSideRequest(config, { ...state, filters: [{ columnName: 'type', columnValue: 'X', operator: 'equals' }] })
    expect(overridden.filters).toHaveLength(1)
    expect(overridden.filters[0]!.columnValue).toBe('X')
  })

  it('excel export requests everything from page 0', () => {
    const req = buildServerSideRequest(config, state, { exportExcel: true })
    expect(req).toMatchObject({ pageNum: 0, pageSize: 1_000_000, exportExcel: true, exportExcelExample: false })
    const ex = buildServerSideRequest(config, state, { exportExcelExample: true })
    expect(ex.exportExcelExample).toBe(true)
  })

  it('paging and sort are passed through', () => {
    expect(buildServerSideRequest(config, state)).toMatchObject({ pageNum: 2, pageSize: 12, orderColumn: 'seq', orderSort: 'asc' })
  })
})

describe('mjUrls', () => {
  it('derives every endpoint from resource', () => {
    expect(mjUrls.fetch(config)).toBe('/api/products/serverSide')
    expect(mjUrls.insert(config)).toBe('/api/products')
    expect(mjUrls.insertBulk(config)).toBe('/api/products/bulk')
    expect(mjUrls.updateBulk(config)).toBe('/api/products/bulk')
    expect(mjUrls.update(config, 'abc')).toBe('/api/products/abc')
    expect(mjUrls.delete(config, 'a/b')).toBe('/api/products/a%2Fb')
  })
  it('refuses update/delete without an id instead of hitting the collection', () => {
    expect(() => mjUrls.update(config, undefined)).toThrow(MjUrlError)
    expect(() => mjUrls.delete(config, '')).toThrow(MjUrlError)
  })
  it('explicit urls override and a missing resource is an error', () => {
    expect(mjUrls.fetch({ ...config, urls: { fetch: '/custom' } })).toBe('/custom')
    expect(() => mjUrls.fetch({ name: 'x', columns: [] })).toThrow(MjUrlError)
  })
})

describe('assertOk', () => {
  it('returns data on 200 without error', () => {
    expect(assertOk({ status: 200, data: { a: 1 } }, '/u')).toEqual({ a: 1 })
  })
  it('throws on HTTP 200 + error body (the backend hides failures this way)', () => {
    expect(() => assertOk({ status: 200, error: 'FK violation' }, '/u')).toThrow(MjApiError)
    try { assertOk({ status: 200, error: 'FK violation' }, '/u') } catch (e) {
      expect((e as MjApiError).message).toBe('FK violation')
      expect((e as MjApiError).url).toBe('/u')
    }
  })
  it('throws on non-200', () => {
    expect(() => assertOk({ status: 401 }, '/u')).toThrow(/401/)
  })
})

describe('toWireColumn', () => {
  it('omits undefined width and false flags', () => {
    expect(toWireColumn({ field: 'a', headerName: 'A', type: 'string' })).toEqual({ field: 'a', headerName: 'A' })
  })
})
