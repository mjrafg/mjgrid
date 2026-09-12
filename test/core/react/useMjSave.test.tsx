import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MjApiError, MjValidationError, toWireRow, useMjSave, type MjGridConfig, type MjRow } from '../../../src/core'
import { fakeApi } from './fakeApi'
import { makeWrapper } from './wrapper'

const config: MjGridConfig = {
  name: 'Inv', resource: '/api/inv', softDelete: true,
  columns: [
    { field: 'name', headerName: 'Name', type: 'string', rules: [{ required: true }] },
    { field: 'qty', headerName: 'Qty', type: 'number' },
    { field: 'when', headerName: 'When', type: 'date' }
  ]
}

describe('useMjSave.saveBatch', () => {
  it('routes inserts to POST /bulk, updates to PUT /bulk, deletes to DELETE /{id}; strips __state; encodes types', async () => {
    const f = fakeApi()
    f.on('POST', '/api/inv/bulk', { status: 200 }); f.on('PUT', '/api/inv/bulk', { status: 200 }); f.on('DELETE', '/api/inv/', { status: 200 })
    const { result } = renderHook(() => useMjSave(config), { wrapper: makeWrapper(f.api) })
    const rows: MjRow[] = [
      { id: 'n1', name: 'new', qty: '7', when: new Date('2026-03-04T10:00:00'), __state: 'insert' },
      { id: 'u1', name: 'upd', qty: 2, __state: 'update' },
      { id: 'd1', name: 'del', __state: 'delete' },
      { id: 'k1', name: 'keep', __state: 'none' }
    ]
    const r = await result.current.saveBatch(rows)
    expect(r.inserted).toEqual([{ id: 'n1', name: 'new', qty: 7, when: '2026-03-04' }])
    expect(r.updated).toEqual([{ id: 'u1', name: 'upd', qty: 2 }])
    expect(r.deleted).toEqual(['d1'])
    expect(f.calls.map(c => `${c.method} ${c.url}`)).toEqual(['POST /api/inv/bulk', 'PUT /api/inv/bulk', 'DELETE /api/inv/d1'])
    expect(JSON.stringify(f.calls[0]!.body)).not.toContain('__state')
    expect(f.calls[2]!.headers).toEqual({ softDelete: 'true' })
  })

  it('validation failure throws MjValidationError and makes NO requests', async () => {
    const f = fakeApi()
    const { result } = renderHook(() => useMjSave(config), { wrapper: makeWrapper(f.api) })
    await expect(result.current.saveBatch([{ id: 'x', name: '', __state: 'insert' }])).rejects.toBeInstanceOf(MjValidationError)
    expect(f.calls).toHaveLength(0)
  })

  it('HTTP-200-with-error from the server THROWS (legacy showed a success toast)', async () => {
    const f = fakeApi(); f.on('PUT', '/api/inv/bulk', { status: 200, error: 'FK violation' })
    const { result } = renderHook(() => useMjSave(config), { wrapper: makeWrapper(f.api) })
    await expect(result.current.saveBatch([{ id: 'u', name: 'n', __state: 'update' }])).rejects.toBeInstanceOf(MjApiError)
  })

  it('an all-clean batch makes no requests and resolves empty', async () => {
    const f = fakeApi()
    const { result } = renderHook(() => useMjSave(config), { wrapper: makeWrapper(f.api) })
    const r = await result.current.saveBatch([{ id: 'a', name: 'x', __state: 'none' }])
    expect(r).toEqual({ inserted: [], updated: [], deleted: [] })
    expect(f.calls).toHaveLength(0)
  })
})

describe('useMjSave.saveOne / deleteOne', () => {
  it('insert POSTs the resource, update PUTs /{id}, delete DELETEs /{id}', async () => {
    const f = fakeApi()
    f.on('POST', '/api/inv', { status: 200, data: { id: 'new1' } }); f.on('PUT', '/api/inv/', { status: 200, data: { id: 'u1' } }); f.on('DELETE', '/api/inv/', { status: 200 })
    const { result } = renderHook(() => useMjSave(config), { wrapper: makeWrapper(f.api) })
    await result.current.saveOne({ row: { name: 'n' }, mode: 'insert' })
    await result.current.saveOne({ row: { id: 'u1', name: 'n' }, mode: 'update' })
    await result.current.deleteOne('u1')
    expect(f.calls.map(c => `${c.method} ${c.url}`)).toEqual(['POST /api/inv', 'PUT /api/inv/u1', 'DELETE /api/inv/u1'])
  })
  it('update without an id throws before any request', async () => {
    const f = fakeApi()
    const { result } = renderHook(() => useMjSave(config), { wrapper: makeWrapper(f.api) })
    await expect(result.current.saveOne({ row: { name: 'n' }, mode: 'update' })).rejects.toThrow(/row id/)
    expect(f.calls).toHaveLength(0)
  })
})

describe('toWireRow', () => {
  it('leaves unknown fields alone and only encodes typed columns', () => {
    expect(toWireRow({ id: '1', qty: '3', extra: 'x', __state: 'insert' }, config.columns)).toEqual({ id: '1', qty: 3, extra: 'x' })
  })
})
