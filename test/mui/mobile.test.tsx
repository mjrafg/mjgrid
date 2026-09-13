import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { MjGrid, cardLayout, hasPendingHistoryBack } from '../../src/mui'
import type { MjColumn, MjGridConfig } from '../../src/core'
import { fakeApi } from '../core/react/fakeApi'
import { makeWrapper } from '../core/react/wrapper'

const columns: MjColumn[] = [
  { field: 'code', headerName: '품목코드', type: 'string', editable: true, rules: [{ required: true }] },
  { field: 'name', headerName: '품목명', type: 'string', editable: true, showOnFilterBar: true },
  { field: 'qty', headerName: '수량', type: 'number', editable: true },
  { field: 'active', headerName: '사용여부', type: 'boolean', editable: true },
  { field: 'note', headerName: '비고', type: 'string', editable: true },
  { field: 'act', headerName: '액션', type: 'button', params: { text: '상세', onClick: async () => {} } }
]
const config: MjGridConfig = {
  name: '제품', resource: '/api/products', editMode: 'dialog', pageSize: 12, showToolbarSearch: true, excelExport: true, printable: true,
  defaultSort: { field: 'code', direction: 'asc' }, mobile: { enabled: true }, columns
}
const page = (n: number) => ({ status: 200, data: { content: Array.from({ length: n }, (_, i) => ({ id: `r${i}`, code: `C${i}`, name: `N${i}`, qty: i, active: true, note: `memo${i}` })), totalElements: n } })

describe('cardLayout', () => {
  it('title is the first non-button/file column; buttons split out; the rest collapse after cardFields', () => {
    const l = cardLayout(columns, 2)
    expect(l.title?.field).toBe('code')
    expect(l.head.map(c => c.field)).toEqual(['name', 'qty'])
    expect(l.tail.map(c => c.field)).toEqual(['active', 'note'])
    expect(l.buttons.map(c => c.field)).toEqual(['act'])
  })
  it('honours mobileRole and hideOnMobile', () => {
    const l = cardLayout([{ ...columns[0]!, hideOnMobile: true }, { ...columns[1]! }, { ...columns[4]!, mobileRole: 'always' }, { ...columns[2]!, mobileRole: 'title' }], 1)
    expect(l.title?.field).toBe('qty')
    expect(l.head.map(c => c.field)).toEqual(['note'])
    expect(l.tail.map(c => c.field)).toEqual(['name'])
  })
})

describe('MjGrid mobile layout', () => {
  // jsdom traverses history asynchronously like a real browser; let a previous test's back land first
  beforeEach(async () => { await waitFor(() => expect(hasPendingHistoryBack()).toBe(false)) })

  it('renders cards instead of a table, with a sort control and a compact pager', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(3))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('C0')
    expect(screen.getByTestId('mj-grid')).toHaveAttribute('data-mobile', 'true')
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
    expect(screen.getAllByTestId('mj-card')).toHaveLength(3)
    expect(screen.getByTestId('mj-toolbar-mobile')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '메뉴' })).toBeInTheDocument()
    expect(screen.getByLabelText('정렬')).toHaveValue('code')
  })

  it('a collapsed card hides fields past cardFields behind "더보기" and shows them on tap', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(1))
    render(<MjGrid config={{ ...config, mobile: { enabled: true, cardFields: 2 } }} />, { wrapper: makeWrapper(f.api) })
    const card = await screen.findByTestId('mj-card')
    expect(within(card).queryByText('memo0')).not.toBeInTheDocument()
    fireEvent.click(within(card).getByRole('button', { name: '더보기 (2)' }))
    expect(within(card).getByText('memo0')).toBeInTheDocument()
    expect(within(card).getByText('상세')).toBeInTheDocument() // button column lives in the card footer
  })

  it('sort control changes the request', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(1))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('C0')
    fireEvent.change(screen.getByLabelText('정렬'), { target: { value: 'qty' } })
    await waitFor(() => expect((f.calls.at(-1)!.body as { orderColumn: string }).orderColumn).toBe('qty'))
    fireEvent.click(screen.getByRole('button', { name: '오름차순' }))
    await waitFor(() => expect((f.calls.at(-1)!.body as { orderSort: string }).orderSort).toBe('desc'))
  })

  it('secondary actions live in the ⋮ menu; primary add button stays visible', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(1))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('C0')
    expect(screen.getByRole('button', { name: '제품등록' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '엑셀다운로드' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '메뉴' }))
    expect(await screen.findByRole('menuitem', { name: '엑셀다운로드' })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: '인쇄' })).toBeInTheDocument()
  })

  it('filter bar becomes a badge button opening a sheet; apply fires one request', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(1))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('C0')
    expect(screen.queryByTestId('mj-filter-controls')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '필터' }))
    const sheet = await screen.findByTestId('mj-filter-sheet')
    fireEvent.change(within(sheet).getByLabelText('품목명'), { target: { value: '김치' } })
    expect(f.count('POST', '/api/products/serverSide')).toBe(1) // typing never fires
    fireEvent.click(within(sheet).getByRole('button', { name: '적용' }))
    await waitFor(() => expect(f.count('POST', '/api/products/serverSide')).toBe(2))
    expect((f.calls.at(-1)!.body as { filters: { columnValue: string }[] }).filters[0]!.columnValue).toBe('김치')
    await waitFor(() => expect(screen.queryByTestId('mj-filter-controls')).not.toBeInTheDocument(), { timeout: 3000 })
  })

  it('tapping a card opens the form as a bottom sheet with full-width fields', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(1))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    fireEvent.click(await screen.findByTestId('mj-card'))
    const form = await screen.findByTestId('mj-form')
    expect(within(form).getByLabelText(/품목코드/)).toHaveValue('C0')
    expect(screen.getByRole('button', { name: '닫기' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    await waitFor(() => expect(screen.queryByTestId('mj-form')).not.toBeInTheDocument())
  })

  it('browser back closes the open sheet and a UI close leaves no phantom history entry', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(1))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    window.history.replaceState({ page: 'list' }, '')
    fireEvent.click(await screen.findByTestId('mj-card'))
    await screen.findByTestId('mj-form')
    // the overlay entry is pushed on top of the host's own state, which stays intact
    expect(window.history.state).toMatchObject({ page: 'list', __mjOverlay: expect.stringMatching(/^mj\d+$/) })

    window.history.back()
    await waitFor(() => expect(screen.queryByTestId('mj-form')).not.toBeInTheDocument())
    await waitFor(() => expect(window.history.state).toEqual({ page: 'list' }))

    // close from the UI: the tagged entry is popped for us
    fireEvent.click(await screen.findByTestId('mj-card'))
    await screen.findByTestId('mj-form')
    fireEvent.click(screen.getByRole('button', { name: '닫기' }))
    await waitFor(() => expect(screen.queryByTestId('mj-form')).not.toBeInTheDocument())
    await waitFor(() => expect(window.history.state).toEqual({ page: 'list' }))
    expect(hasPendingHistoryBack()).toBe(false)
  })

  it('nested overlays: back closes the innermost first (form -> delete confirm)', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(1))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    fireEvent.click(await screen.findByTestId('mj-card'))
    const form = await screen.findByTestId('mj-form')
    // the buttons sit in the sheet's fixed footer, outside the <form> element, and still target it
    expect(within(form).queryByRole('button', { name: '삭제' })).not.toBeInTheDocument()
    const footer = screen.getByTestId('mj-form-actions')
    expect(within(footer).getByRole('button', { name: '수정' })).toHaveAttribute('form', form.id)
    fireEvent.click(within(footer).getByRole('button', { name: '삭제' }))
    await screen.findByTestId('mj-confirm-delete')
    window.history.back()
    await waitFor(() => expect(screen.queryByTestId('mj-confirm-delete')).not.toBeInTheDocument())
    expect(screen.getByTestId('mj-form')).toBeInTheDocument()
    window.history.back()
    await waitFor(() => expect(screen.queryByTestId('mj-form')).not.toBeInTheDocument())
  })

  it('desktop (mobile disabled) keeps the table, no history entries', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(2))
    render(<MjGrid config={{ ...config, mobile: { enabled: false } }} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('C0')
    expect(screen.getByRole('table')).toBeInTheDocument()
    window.history.replaceState({ page: 'list' }, '')
    fireEvent.click(screen.getByText('C0'))
    await screen.findByTestId('mj-form')
    expect(window.history.state).toEqual({ page: 'list' })
  })

  it('inline mode on mobile: editors render inside cards, row actions and save work', async () => {
    const f = fakeApi(); f.on('POST', '/api/inv/serverSide', page(2)); f.on('PUT', '/api/inv/bulk', { status: 200, data: null })
    const inline: MjGridConfig = { ...config, resource: '/api/inv', editMode: 'inline', rowActions: true, mobile: { enabled: true, cardFields: 1 } }
    render(<MjGrid config={inline} />, { wrapper: makeWrapper(f.api) })
    const cards = await screen.findAllByTestId('mj-card')
    expect(cards).toHaveLength(2)
    // editors are never collapsed behind "더보기"
    expect(within(cards[0]!).queryByRole('button', { name: /더보기/ })).not.toBeInTheDocument()
    const qty = within(within(cards[0]!).getByRole('group', { name: '수량' })).getByRole('spinbutton') as HTMLInputElement
    fireEvent.change(qty, { target: { value: '42' } })
    fireEvent.click(within(cards[0]!).getByRole('button', { name: '행 추가' }))
    expect(screen.getAllByTestId('mj-card')).toHaveLength(3)
    // the new (empty) row would fail `required`; remove it again from its own card
    fireEvent.click(within(screen.getAllByTestId('mj-card')[1]!).getByRole('button', { name: '행 삭제' }))
    expect(screen.getAllByTestId('mj-card')).toHaveLength(2)
    fireEvent.click(screen.getByRole('button', { name: '저장' }))
    await waitFor(() => expect(f.count('PUT', '/api/inv/bulk')).toBe(1))
    expect((f.calls.find(c => c.method === 'PUT')!.body as { rows: { qty: number }[] }).rows[0]!.qty).toBe(42)
  })

  it('readonly grids (the selectGrid picker) show no add button', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(1))
    render(<MjGrid config={{ ...config, editMode: 'readonly' }} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('C0')
    expect(screen.queryByRole('button', { name: '제품등록' })).not.toBeInTheDocument()
  })

  it('date filter in the sheet renders stacked dates + presets and applies a range', async () => {
    const f = fakeApi(); f.on('POST', '/api/products/serverSide', page(1))
    const cfg: MjGridConfig = { ...config, columns: [...columns, { field: 'createdAt', headerName: '등록일', type: 'date', showOnFilterBar: true }] }
    render(<MjGrid config={cfg} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('C0')
    fireEvent.click(screen.getByRole('button', { name: '필터' }))
    const sheet = await screen.findByTestId('mj-filter-sheet')
    fireEvent.click(within(sheet).getByRole('button', { name: '오늘' }))
    expect(f.count('POST', '/api/products/serverSide')).toBe(1) // presets never apply directly on mobile
    fireEvent.click(within(sheet).getByRole('button', { name: '적용' }))
    await waitFor(() => expect(f.count('POST', '/api/products/serverSide')).toBe(2))
    const filters = (f.calls.at(-1)!.body as { filters: { columnName: string; operator: string }[] }).filters
    expect(filters.some(x => x.columnName === 'createdAt')).toBe(true)
  })
})
