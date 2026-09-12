import { useCallback, useMemo, useReducer } from 'react'
import type { MjColumn, MjRow, MjRowError } from '../types'

export const newRowId = (): string =>
  typeof globalThis.crypto?.randomUUID === 'function' ? globalThis.crypto.randomUUID() : `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`

interface RowsState { rows: MjRow[]; errors: MjRowError[] }

type Action =
  | { type: 'load'; rows: MjRow[] }
  | { type: 'setCell'; rowId: string; field: string; value: unknown; patch?: Record<string, unknown> }
  | { type: 'addRow'; row: MjRow; index?: number }
  | { type: 'removeRow'; rowId: string }
  | { type: 'setErrors'; errors: MjRowError[] }
  | { type: 'clearErrors' }

/** Immutable. The legacy grid mutated row objects in place during render and inside shallow-copied arrays. */
function reducer(state: RowsState, a: Action): RowsState {
  switch (a.type) {
    case 'load':
      return { rows: a.rows.map(r => ({ ...r, __state: r.__state ?? 'none' })), errors: [] }
    case 'setCell':
      return {
        ...state,
        errors: state.errors.filter(e => !(e.rowId === a.rowId && e.field === a.field)),
        rows: state.rows.map(r => {
          if (r.id !== a.rowId) return r
          const next: MjRow = { ...r, ...a.patch, [a.field]: a.value }
          if (next.__state !== 'insert') next.__state = 'update'
          return next
        })
      }
    case 'addRow': {
      const rows = [...state.rows]
      rows.splice(a.index ?? rows.length, 0, { ...a.row, __state: 'insert' })
      return { ...state, rows }
    }
    case 'removeRow':
      return {
        ...state,
        errors: state.errors.filter(e => e.rowId !== a.rowId),
        rows: state.rows.flatMap(r => (r.id !== a.rowId ? [r] : r.__state === 'insert' ? [] : [{ ...r, __state: 'delete' as const }]))
      }
    case 'setErrors':
      return { ...state, errors: a.errors }
    case 'clearErrors':
      return { ...state, errors: [] }
  }
}

export function makeNewRow(columns: MjColumn[], defaults: Record<string, unknown> = {}): MjRow {
  const row: MjRow = { id: newRowId(), __state: 'insert', ...defaults }
  for (const c of columns) if (c.defaultValue !== undefined && row[c.field] === undefined) row[c.field] = c.defaultValue
  return row
}

/** Client-side editing state for inline mode and Excel import preview. */
export function useMjRows(columns: MjColumn[], initial: MjRow[] = []) {
  const [state, dispatch] = useReducer(reducer, { rows: initial.map(r => ({ ...r, __state: r.__state ?? 'none' as const })), errors: [] })

  const load = useCallback((rows: MjRow[]) => dispatch({ type: 'load', rows }), [])
  const setCell = useCallback((rowId: string, field: string, value: unknown, patch?: Record<string, unknown>) =>
    dispatch({ type: 'setCell', rowId, field, value, patch }), [])
  const addRow = useCallback((defaults?: Record<string, unknown>, index?: number) => {
    const row = makeNewRow(columns, defaults)
    dispatch({ type: 'addRow', row, index })
    return row
  }, [columns])
  const removeRow = useCallback((rowId: string) => dispatch({ type: 'removeRow', rowId }), [])
  const setErrors = useCallback((errors: MjRowError[]) => dispatch({ type: 'setErrors', errors }), [])
  const clearErrors = useCallback(() => dispatch({ type: 'clearErrors' }), [])

  const visibleRows = useMemo(() => state.rows.filter(r => r.__state !== 'delete'), [state.rows])
  const dirtyRows = useMemo(() => state.rows.filter(r => r.__state && r.__state !== 'none'), [state.rows])
  const errorFor = useCallback((rowId: string, field: string) => state.errors.find(e => e.rowId === rowId && e.field === field), [state.errors])

  return { rows: state.rows, visibleRows, dirtyRows, errors: state.errors, errorFor, load, setCell, addRow, removeRow, setErrors, clearErrors }
}

export type MjRowsResult = ReturnType<typeof useMjRows>
