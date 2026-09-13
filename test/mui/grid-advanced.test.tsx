import { createRef } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import dayjs from 'dayjs'
import { MjGrid, type MjGridHandle } from '../../src/mui'
import type { MjGridConfig, MjToast } from '../../src/core'
import { fakeApi } from '../core/react/fakeApi'
import { makeWrapper } from '../core/react/wrapper'

const base: MjGridConfig = {
  name: 'BOM', resource: '/api/bom', editMode: 'inline', rowActions: true, sequenceField: 'seq', softDelete: true,
  columns: [
    { field: 'name', headerName: '이름', type: 'string', editable: true, rules: [{ required: true }], footerText: rows => `${rows.length}건` },
    { field: 'qty', headerName: '수량', type: 'number', editable: true, footerText: rows => String(rows.reduce((s, r) => s + Number(r.qty ?? 0), 0)), footerAlign: 'right' },
    { field: 'when', headerName: '일자', type: 'date', showOnFilterBar: true }
  ]
}
const page = { status: 200, data: { content: [{ id: 'a', name: 'A', qty: 2, seq: 0 }, { id: 'b', name: 'B', qty: 3, seq: 1 }], totalElements: 2 } }
const toast = (): MjToast & { ok: string[]; bad: string[] } => { const t = { ok: [] as string[], bad: [] as string[], success: (m: string) => t.ok.push(m), error: (m: string) => t.bad.push(m) }; return t }

describe('row actions + sequence', () => {
  it('+ inserts after the row, - drops a new row, footer aggregates live', async () => {
    const f = fakeApi(); f.on('POST', '/api/bom/serverSide', page)
    render(<MjGrid config={base} />, { wrapper: makeWrapper(f.api, toast()) })
    await screen.findByDisplayValue('A')
    expect(screen.getByText('2건')).toBeInTheDocument()
    expect(screen.getByText('5')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: '행 추가' })[0]!)
    const rowsNow = screen.getAllByRole('row').filter(r => within(r).queryAllByRole('textbox').length > 0)
    expect(rowsNow).toHaveLength(3)
    expect(within(rowsNow[1]!).getAllByRole('textbox')[0]).toHaveValue('') // inserted after A
    expect(screen.getByText('3건')).toBeInTheDocument()
    fireEvent.click(within(rowsNow[1]!).getByRole('button', { name: '행 삭제' }))
    expect(screen.getAllByRole('row').filter(r => within(r).queryAllByRole('textbox').length > 0)).toHaveLength(2)
  })

  it('save writes the visible order into sequenceField and DELETEs removed persisted rows', async () => {
    const f = fakeApi(); f.on('POST', '/api/bom/serverSide', page); f.on('PUT', '/api/bom/bulk', { status: 200 }); f.on('DELETE', '/api/bom/', { status: 200 }); f.on('POST', '/api/bom/bulk', { status: 200 })
    const t = toast()
    render(<MjGrid config={base} />, { wrapper: makeWrapper(f.api, t) })
    await screen.findByDisplayValue('A')
    // remove A (persisted -> delete); B moves to seq 0; add a new row at the end -> seq 1
    fireEvent.click(screen.getAllByRole('button', { name: '행 삭제' })[0]!)
    fireEvent.click(screen.getAllByRole('button', { name: '행 추가' })[0]!)
    const inputs = screen.getAllByRole('textbox')
    fireEvent.change(inputs[inputs.length - 1]!, { target: { value: 'C' } })
    fireEvent.click(screen.getByText('저장'))
    await waitFor(() => expect(t.ok).toEqual(['저장 되었습니다.']))
    const put = f.calls.find(c => c.method === 'PUT')!.body as { rows: Record<string, unknown>[] }
    expect(put.rows).toEqual([{ id: 'b', name: 'B', qty: 3, seq: 0 }])
    const post = f.calls.find(c => c.method === 'POST' && c.url.endsWith('/bulk'))!.body as { rows: Record<string, unknown>[] }
    expect(post.rows[0]).toMatchObject({ name: 'C', seq: 1 })
    expect(f.calls.some(c => c.method === 'DELETE' && c.url === '/api/bom/a')).toBe(true)
  })

  it('hooks.onSave replaces the REST batch entirely', async () => {
    const f = fakeApi(); f.on('POST', '/api/bom/serverSide', page)
    const got: unknown[] = []
    const cfg: MjGridConfig = { ...base, sequenceField: undefined, rowActions: false, hooks: { onSave: async (dirty, all) => { got.push(dirty.length, all.length) } } }
    render(<MjGrid config={cfg} />, { wrapper: makeWrapper(f.api, toast()) })
    await screen.findByDisplayValue('A')
    fireEvent.change(screen.getByDisplayValue('A'), { target: { value: 'A2' } })
    fireEvent.click(screen.getByText('저장'))
    await waitFor(() => expect(got).toEqual([1, 2]))
    expect(f.calls.filter(c => c.method !== 'POST' || !c.url.endsWith('serverSide'))).toHaveLength(0)
  })

  it('keepOneRow keeps an editable row when the grid is empty', async () => {
    const f = fakeApi(); f.on('POST', '/api/bom/serverSide', { status: 200, data: { content: [], totalElements: 0 } })
    render(<MjGrid config={{ ...base, keepOneRow: true }} />, { wrapper: makeWrapper(f.api, toast()) })
    await waitFor(() => expect(screen.getAllByRole('textbox').length).toBeGreaterThan(0))
  })
})

describe('imperative handle', () => {
  it('refresh, setSearch, addRow, getDirtyRows, openInsert/openView', async () => {
    const f = fakeApi(); f.on('POST', '/api/bom/serverSide', page)
    const ref = createRef<MjGridHandle>()
    render(<MjGrid ref={ref} config={{ ...base, editMode: 'inline', rowActions: false }} />, { wrapper: makeWrapper(f.api, toast()) })
    await screen.findByDisplayValue('A')
    expect(f.count('POST', '/api/bom/serverSide')).toBe(1)
    await act(async () => { await ref.current!.refresh() })
    await waitFor(() => expect(f.count('POST', '/api/bom/serverSide')).toBe(2))
    act(() => ref.current!.setSearch('zz'))
    await waitFor(() => expect(f.count('POST', '/api/bom/serverSide')).toBe(3))
    expect((f.calls.at(-1)!.body as { filters: unknown[] }).filters).toHaveLength(1)
    let added: unknown
    act(() => { added = ref.current!.addRow({ name: 'via-ref' }) })
    expect(added).toMatchObject({ name: 'via-ref', __state: 'insert' })
    expect(ref.current!.getDirtyRows()).toHaveLength(1)
    act(() => ref.current!.openView({ id: 'a', name: 'A', qty: 2 }))
    const dlg = await screen.findByRole('dialog')
    expect(within(dlg).getByText('BOM 조회')).toBeInTheDocument()
    expect(within(dlg).queryByText('수정')).not.toBeInTheDocument() // view mode: no submit
    expect(within(dlg).getByLabelText(/이름/)).toBeDisabled()
  })
})

describe('filter bar date presets', () => {
  it('오늘 applies a between filter for today; clicking again clears it', async () => {
    const f = fakeApi(); f.on('POST', '/api/bom/serverSide', page)
    render(<MjGrid config={{ ...base, editMode: 'readonly' }} />, { wrapper: makeWrapper(f.api, toast()) })
    await screen.findByText('A')
    fireEvent.click(screen.getByText('오늘'))
    await waitFor(() => expect(f.calls).toHaveLength(2))
    const today = dayjs().format('YYYY-MM-DD')
    expect((f.calls[1]!.body as { filters: unknown[] }).filters).toEqual([{ columnName: 'when', columnValue: `${today},${today}`, operator: 'between', logic: 'and' }])
    expect(screen.getByText('오늘').closest('button')).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByText('오늘'))
    // clearing returns to the initial query key, which TanStack Query serves from cache - no third request is expected
    await waitFor(() => expect(screen.getByText('오늘').closest('button')).not.toHaveClass('MuiButton-contained'))
  })
})
