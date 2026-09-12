import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useMjRows, type MjColumn, type MjRow } from '../../../src/core'

const cols: MjColumn[] = [
  { field: 'name', headerName: 'N', type: 'string', defaultValue: 'new' },
  { field: 'qty', headerName: 'Q', type: 'number' }
]

describe('useMjRows', () => {
  it('setCell is immutable and marks update; insert rows stay insert', () => {
    const original: MjRow = { id: 'a', name: 'x', qty: 1 }
    const { result } = renderHook(() => useMjRows(cols, [original, { id: 'b', name: 'y', __state: 'insert' }]))
    act(() => result.current.setCell('a', 'qty', 5))
    expect(original.qty).toBe(1)                          // legacy mutated the source object
    expect(result.current.rows[0]).toMatchObject({ qty: 5, __state: 'update' })
    act(() => result.current.setCell('b', 'qty', 9))
    expect(result.current.rows[1]!.__state).toBe('insert')
  })

  it('setCell can patch sibling fields (picker fills code + name together)', () => {
    const { result } = renderHook(() => useMjRows(cols, [{ id: 'a', name: 'x' }]))
    act(() => result.current.setCell('a', 'vendor', { id: 'V1' }, { vendorCode: 'V1' }))
    expect(result.current.rows[0]).toMatchObject({ vendor: { id: 'V1' }, vendorCode: 'V1', __state: 'update' })
  })

  it('addRow applies column defaults; removeRow drops inserts and soft-marks others', () => {
    const { result } = renderHook(() => useMjRows(cols, [{ id: 'a', name: 'x' }]))
    let added!: MjRow
    act(() => { added = result.current.addRow({ qty: 3 }) })
    expect(added).toMatchObject({ name: 'new', qty: 3, __state: 'insert' })
    expect(result.current.visibleRows).toHaveLength(2)
    act(() => result.current.removeRow(added.id))
    expect(result.current.rows).toHaveLength(1)
    act(() => result.current.removeRow('a'))
    expect(result.current.rows[0]!.__state).toBe('delete')
    expect(result.current.visibleRows).toHaveLength(0)
    expect(result.current.dirtyRows.map(r => r.id)).toEqual(['a'])
  })

  it('errors: setErrors, errorFor, and editing a cell clears that cell error only', () => {
    const { result } = renderHook(() => useMjRows(cols, [{ id: 'a' }]))
    act(() => result.current.setErrors([
      { rowId: 'a', rowIndex: 0, field: 'name', message: 'req' },
      { rowId: 'a', rowIndex: 0, field: 'qty', message: 'req' }
    ]))
    expect(result.current.errorFor('a', 'name')?.message).toBe('req')
    act(() => result.current.setCell('a', 'name', 'ok'))
    expect(result.current.errorFor('a', 'name')).toBeUndefined()
    expect(result.current.errorFor('a', 'qty')).toBeDefined()
  })

  it('load resets state to none and clears errors', () => {
    const { result } = renderHook(() => useMjRows(cols))
    act(() => result.current.setErrors([{ rowId: 'z', rowIndex: 0, field: 'f', message: 'm' }]))
    act(() => result.current.load([{ id: 'q', __state: 'update' } as MjRow, { id: 'w' }]))
    expect(result.current.rows.map(r => r.__state)).toEqual(['update', 'none'])
    expect(result.current.errors).toEqual([])
  })
})
