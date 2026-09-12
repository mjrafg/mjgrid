import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MjGrid } from '../../src/mui'
import type { MjGridConfig, MjToast } from '../../src/core'
import { fakeApi } from '../core/react/fakeApi'
import { makeWrapper } from '../core/react/wrapper'

const config: MjGridConfig = {
  name: '제품', resource: '/api/products', editMode: 'dialog', pageSize: 12, showToolbarSearch: true,
  defaultSort: { field: 'seq', direction: 'asc' },
  columns: [
    { field: 'code', headerName: '품목코드', type: 'string', editable: true, rules: [{ required: true }] },
    { field: 'name', headerName: '품목명', type: 'string', editable: true, showOnFilterBar: true },
    { field: 'qty', headerName: '수량', type: 'number', editable: true },
    { field: 'active', headerName: '사용여부', type: 'boolean', editable: true }
  ]
}
const page = (n: number, total = 68, offset = 0) => ({ status: 200, data: { content: Array.from({ length: n }, (_, i) => ({ id: `r${offset + i}`, code: `C${offset + i}`, name: `N${offset + i}`, qty: i, active: i % 2 === 0 })), totalElements: total } })
const toast = (): MjToast & { ok: string[]; bad: string[] } => { const t = { ok: [] as string[], bad: [] as string[], success: (m: string) => t.ok.push(m), error: (m: string) => t.bad.push(m) }; return t }

describe('MjGrid (dialog mode)', () => {
  it('renders one page of rows, a consistent pager, and the boolean labels', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(12))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('C0')
    expect(screen.getAllByRole('row')).toHaveLength(13) // header + 12
    expect(screen.getByText('1–12 / 68')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go to page 6' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Go to page 7' })).not.toBeInTheDocument()
    expect(screen.getAllByText('사용')).toHaveLength(6)
    expect(f.count('POST', '/api/products/serverSide')).toBe(1)
  })

  it('pager click requests pageNum with the same pageSize', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', c => page(12, 68, ((c.body as { pageNum: number }).pageNum) * 12))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('C0')
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 3' }))
    await screen.findByText('C24')
    expect(f.calls[1]!.body).toMatchObject({ pageNum: 2, pageSize: 12 })
    expect(screen.getByText('25–36 / 68')).toBeInTheDocument()
  })

  it('header click sorts server-side and toggles direction', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(3))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('C0')
    fireEvent.click(screen.getByRole('button', { name: '품목명' }))
    await waitFor(() => expect(f.calls).toHaveLength(2))
    expect(f.calls[1]!.body).toMatchObject({ orderColumn: 'name', orderSort: 'asc', pageNum: 0 })
    fireEvent.click(screen.getByRole('button', { name: '품목명' }))
    await waitFor(() => expect(f.calls).toHaveLength(3))
    expect(f.calls[2]!.body).toMatchObject({ orderColumn: 'name', orderSort: 'desc' })
  })

  it('toolbar search on Enter derives OR filters; filter bar text applies on Enter', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(3))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('C0')
    const search = screen.getByPlaceholderText('검색어 입력..')
    await userEvent.type(search, 'kim{Enter}')
    await waitFor(() => expect(f.calls).toHaveLength(2))
    const b = f.calls[1]!.body as { filters: { columnName: string; logic: string }[] }
    expect(b.filters.map(x => x.columnName)).toEqual(['code', 'name'])
    const bar = screen.getByLabelText('품목명')
    await userEvent.type(bar, 'x{Enter}')
    await waitFor(() => expect(f.calls).toHaveLength(3))
    expect((f.calls[2]!.body as { filters: unknown[] }).filters).toEqual([{ columnName: 'name', columnValue: 'x', operator: 'contains', logic: 'and' }])
  })

  it('row click opens the edit form prefilled; add opens an empty insert form', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(2))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    fireEvent.click(await screen.findByText('C1'))
    const dlg = await screen.findByRole('dialog')
    expect(within(dlg).getByText('제품 수정')).toBeInTheDocument()
    expect(within(dlg).getByLabelText(/품목코드/)).toHaveValue('C1')
    fireEvent.click(within(dlg).getByText('취소'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    fireEvent.click(screen.getByText('제품등록'))
    const dlg2 = await screen.findByRole('dialog')
    expect(within(dlg2).getByText('제품 등록')).toBeInTheDocument()
    expect(within(dlg2).getByLabelText(/품목코드/)).toHaveValue('')
  })

  it('a server error envelope is shown, not swallowed', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', { status: 200, error: '권한이 없습니다' })
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    expect(await screen.findByRole('alert')).toHaveTextContent('권한이 없습니다')
  })
})

describe('MjGrid (inline mode)', () => {
  const cfg: MjGridConfig = { ...config, editMode: 'inline', softDelete: true }

  it('cells are live editors; save PUTs only dirty rows with encoded values and toasts success', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(2)); f.on('PUT', '/api/products/bulk', { status: 200 })
    const t = toast()
    render(<MjGrid config={cfg} />, { wrapper: makeWrapper(f.api, t) })
    await screen.findByDisplayValue('C0')
    const qty = screen.getAllByRole('spinbutton')[0]!
    fireEvent.change(qty, { target: { value: '250' } })
    fireEvent.click(screen.getByText('저장'))
    await waitFor(() => expect(f.count('PUT', '/api/products/bulk')).toBe(1))
    const body = f.calls.find(c => c.method === 'PUT')!.body as { rows: Record<string, unknown>[] }
    expect(body.rows).toHaveLength(1)
    expect(body.rows[0]).toMatchObject({ id: 'r0', qty: 250 })
    expect(body.rows[0]).not.toHaveProperty('__state')
    expect(t.ok).toEqual(['저장 되었습니다.'])
  })

  it('a failed save toasts the server error and NEVER a success', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(1)); f.on('PUT', '/api/products/bulk', { status: 200, error: 'FK violation' })
    const t = toast()
    render(<MjGrid config={cfg} />, { wrapper: makeWrapper(f.api, t) })
    await screen.findByDisplayValue('C0')
    fireEvent.change(screen.getAllByRole('spinbutton')[0]!, { target: { value: '1' } })
    fireEvent.click(screen.getByText('저장'))
    await waitFor(() => expect(t.bad).toEqual(['FK violation']))
    expect(t.ok).toEqual([])
  })

  it('validation errors block the request and mark the row', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(1))
    const t = toast()
    render(<MjGrid config={cfg} />, { wrapper: makeWrapper(f.api, t) })
    await screen.findByDisplayValue('C0')
    fireEvent.change(screen.getByDisplayValue('C0'), { target: { value: '' } })
    fireEvent.click(screen.getByText('저장'))
    await waitFor(() => expect(t.bad.length).toBe(1))
    expect(t.bad[0]).toMatch(/NO1: 품목코드/)
    expect(f.count('PUT', '/api/products/bulk')).toBe(0)
  })

  it('refreshed server data replaces the editors (no stale local state)', async () => {
    let v = 'C0'
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', () => ({ status: 200, data: { content: [{ id: 'r0', code: v, name: 'n', qty: 0, active: true }], totalElements: 1 } }))
    f.on('PUT', '/api/products/bulk', { status: 200 })
    render(<MjGrid config={cfg} />, { wrapper: makeWrapper(f.api, toast()) })
    await screen.findByDisplayValue('C0')
    v = 'C0-updated'
    fireEvent.change(screen.getAllByRole('spinbutton')[0]!, { target: { value: '3' } })
    fireEvent.click(screen.getByText('저장'))
    await screen.findByDisplayValue('C0-updated')
  })

  it('select a row then delete calls DELETE with the softDelete header', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(2)); f.on('DELETE', '/api/products/', { status: 200 })
    const t = toast()
    render(<MjGrid config={cfg} />, { wrapper: makeWrapper(f.api, t) })
    await screen.findByDisplayValue('C1')
    fireEvent.click(screen.getByDisplayValue('C1').closest('tr')!)
    fireEvent.click(screen.getByText('삭제'))
    await waitFor(() => expect(f.count('DELETE', '/api/products/r1')).toBe(1))
    expect(f.calls.find(c => c.method === 'DELETE')!.headers).toEqual({ softDelete: 'true' })
    expect(t.ok).toEqual(['삭제 되었습니다.'])
  })
})

vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:x', revokeObjectURL: () => {} })
