import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMjQuery, type MjGridConfig } from '../../../src/core'
import { fakeApi } from './fakeApi'
import { makeWrapper } from './wrapper'

const config: MjGridConfig = {
  name: 'P', resource: '/api/products', softDelete: true, pageSize: 12,
  defaultSort: { field: 'seq', direction: 'asc' },
  columns: [
    { field: 'code', headerName: 'Code', type: 'string' },
    { field: 'name', headerName: 'Name', type: 'string' },
    { field: 'qty', headerName: 'Qty', type: 'number' },
    { field: 'active', headerName: 'Active', type: 'boolean' },
    { field: 'note', headerName: 'Note', type: 'string', formOnly: true }
  ]
}
const page = (n: number, total = 68) => ({ status: 200, data: { content: Array.from({ length: n }, (_, i) => ({ id: `r${i}` })), totalElements: total } })

describe('useMjQuery', () => {
  it('fetches with softDelete header, tags rows, and pageCount uses the SAME pageSize as the request', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(12))
    const { result } = renderHook(() => useMjQuery(config), { wrapper: makeWrapper(f.api) })
    await waitFor(() => expect(result.current.rows).toHaveLength(12))
    expect(result.current.rows[0]!.__state).toBe('none')
    expect(result.current.total).toBe(68)
    expect(result.current.pageCount).toBe(6)          // ceil(68/12) - legacy showed 10
    expect(f.calls[0]).toMatchObject({ method: 'POST', url: '/api/products/serverSide', headers: { softDelete: 'true' } })
    expect(f.calls[0]!.body).toMatchObject({ pageNum: 0, pageSize: 12, orderColumn: 'seq', orderSort: 'asc' })
    expect(f.count('POST', '/api/products')).toBe(1) // exactly one fetch on mount
  })

  it('setPage changes pageNum only; pageSize stays constant across navigation', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(12))
    const { result } = renderHook(() => useMjQuery(config), { wrapper: makeWrapper(f.api) })
    await waitFor(() => expect(result.current.rows).toHaveLength(12))
    act(() => result.current.setPage(5))
    await waitFor(() => expect(f.calls).toHaveLength(2))
    expect(f.calls[1]!.body).toMatchObject({ pageNum: 5, pageSize: 12 })
  })

  it('setSearch derives OR filters from searchable columns and skips number when non-numeric, boolean and formOnly', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(3))
    const { result } = renderHook(() => useMjQuery(config), { wrapper: makeWrapper(f.api) })
    await waitFor(() => expect(f.calls).toHaveLength(1))
    act(() => result.current.setSearch('kim'))
    await waitFor(() => expect(f.calls).toHaveLength(2))
    const body = f.calls[1]!.body as { pageNum: number; filters: { columnName: string; logic: string; operator: string }[] }
    expect(body.pageNum).toBe(0)
    expect(body.filters.map(x => x.columnName)).toEqual(['code', 'name'])
    expect(body.filters.every(x => x.logic === 'or' && x.operator === 'contains')).toBe(true)
    act(() => result.current.setSearch('42'))
    await waitFor(() => expect(f.calls).toHaveLength(3))
    const b2 = f.calls[2]!.body as { filters: { columnName: string; columnValue: unknown }[] }
    expect(b2.filters.find(x => x.columnName === 'qty')).toMatchObject({ columnValue: 42 })
  })

  it('setFilters resets to page 0 and fires onFilterChange', async () => {
    const seen: unknown[] = []
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(12))
    const cfg = { ...config, hooks: { onFilterChange: (x: unknown) => seen.push(x) } }
    const { result } = renderHook(() => useMjQuery(cfg), { wrapper: makeWrapper(f.api) })
    await waitFor(() => expect(f.calls).toHaveLength(1))
    act(() => result.current.setPage(3))
    await waitFor(() => expect(f.calls).toHaveLength(2))
    act(() => result.current.setFilters([{ columnName: 'name', columnValue: 'x', operator: 'contains' }]))
    await waitFor(() => expect(f.calls).toHaveLength(3))
    expect(f.calls[2]!.body).toMatchObject({ pageNum: 0 })
    expect(seen).toHaveLength(1)
  })

  it('surfaces HTTP-200-with-error as an error, not data', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', { status: 200, error: 'boom' })
    const { result } = renderHook(() => useMjQuery(config), { wrapper: makeWrapper(f.api) })
    await waitFor(() => expect(result.current.error).not.toBeNull())
    expect(result.current.error!.message).toBe('boom')
    expect(result.current.rows).toEqual([])
  })

  it('client-side mode pages static rows locally with no requests', async () => {
    const f = fakeApi()
    const rows = Array.from({ length: 30 }, (_, i) => ({ id: `c${i}` }))
    const { result } = renderHook(() => useMjQuery({ name: 'L', columns: config.columns, rows, pageSize: 10 }), { wrapper: makeWrapper(f.api) })
    expect(result.current.rows).toHaveLength(10)
    expect(result.current.pageCount).toBe(3)
    act(() => result.current.setPage(2))
    expect(result.current.rows.map(r => r.id)).toEqual(['c20','c21','c22','c23','c24','c25','c26','c27','c28','c29'])
    expect(f.calls).toHaveLength(0)
  })

  it('exportExcel posts the export flag and returns a Blob; refresh refetches', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(12))
    const { result } = renderHook(() => useMjQuery(config), { wrapper: makeWrapper(f.api) })
    await waitFor(() => expect(f.calls).toHaveLength(1))
    const blob = await result.current.exportExcel()
    expect(blob).toBeInstanceOf(Blob)
    expect(f.calls[1]).toMatchObject({ method: 'DOWNLOAD' })
    expect(f.calls[1]!.body).toMatchObject({ exportExcel: true, pageNum: 0 })
    await act(async () => { await result.current.refresh() })
    await waitFor(() => expect(f.count('POST', '/api/products')).toBe(2))
  })
})
