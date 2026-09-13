import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { KrdsTextField, KrdsTokens, MjBadge, MjButton, MjGrid, createKrdsTheme, krds, krdsTokensCss } from '../../src/mui'
import { MjProvider, type MjGridConfig } from '../../src/core'
import { fakeApi } from '../core/react/fakeApi'
import { makeWrapper } from '../core/react/wrapper'

// MUI < 5.14 exposes the Select trigger as role=button (aria-haspopup=listbox); 5.14+ as combobox
const selectTrigger = (root: HTMLElement) => root.querySelector('[role="combobox"], [role="button"][aria-haspopup="listbox"]') as HTMLElement

const wrap = () => { const f = fakeApi(); return function W({ children }: { children: React.ReactNode }) { return <MjProvider api={f.api}>{children}</MjProvider> } }

describe('KRDS tokens', () => {
  it('every token is a CSS variable with the official fallback; the sheet defines the same variables', () => {
    expect(krds.color.buttonPrimaryFill).toBe('var(--krds-color-button-primary-fill, #256EF4)')
    expect(krds.color.textBasic).toContain('#1E2124')
    expect(krds.radius.md).toBe('var(--krds-radius-md, 8px)')
    expect(krdsTokensCss).toContain('--krds-color-button-primary-fill:var(--krds-primary-50)')
    expect(krdsTokensCss).toContain('html.high-contrast{--krds-border-w:2px')
    expect(krdsTokensCss).toContain('html.font-size-5{--krds-scale:1.296}')
    const { container } = render(<KrdsTokens />)
    expect(container.querySelector('style[data-krds-tokens]')?.textContent).toContain('--krds-primary-50:#256EF4')
    expect(createKrdsTheme().palette.primary.main).toBe('#256EF4')
  })
})

describe('MjButton', () => {
  it('maps KRDS variants and sizes (heights 32/40/48/56, 44px minimum width)', () => {
    render(<><MjButton variant="primary" size="medium">저장</MjButton><MjButton variant="tertiary" size="small">취소</MjButton><MjButton variant="danger" size="large">삭제</MjButton><MjButton variant="text" size="xsmall">더보기</MjButton></>)
    const save = screen.getByRole('button', { name: '저장' })
    expect(save).toHaveAttribute('data-variant', 'primary')
    expect(save).toHaveAttribute('type', 'button')
    expect(getComputedStyle(save).minHeight).toBe('48px')
    expect(getComputedStyle(screen.getByRole('button', { name: '취소' })).minHeight).toBe('40px')
    expect(getComputedStyle(screen.getByRole('button', { name: '삭제' })).minHeight).toBe('56px')
    expect(getComputedStyle(screen.getByRole('button', { name: '더보기' })).minHeight).toBe('32px')
    expect(getComputedStyle(save).minWidth).toBe('44px')
  })
})

describe('KrdsTextField', () => {
  it('label above the field wired with for/aria-*, required marker hidden from AT, helper via aria-describedby', () => {
    render(<KrdsTextField label="측정 온도" required helperText="교정된 온도계를 사용하세요." value="" onChange={() => {}} />, { wrapper: wrap() })
    const input = screen.getByLabelText(/측정 온도/) as HTMLInputElement
    expect(input).toHaveAttribute('aria-required', 'true')
    expect(input.getAttribute('aria-describedby')).toBeTruthy()
    expect(document.getElementById(input.getAttribute('aria-describedby')!)).toHaveTextContent('교정된 온도계를 사용하세요.')
    expect(screen.getByText('*')).toHaveAttribute('aria-hidden', 'true')
  })
  it('error state: aria-invalid + message with icon; sizes 40/48/56', () => {
    render(<><KrdsTextField aria-label="a" size="small" error helperText="숫자 값을 입력하세요." value="" onChange={() => {}} /><KrdsTextField aria-label="b" size="large" value="" onChange={() => {}} /><KrdsTextField aria-label="c" value="" onChange={() => {}} /></>, { wrapper: wrap() })
    const a = screen.getByLabelText('a')
    expect(a).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByText('숫자 값을 입력하세요.')).toBeInTheDocument()
    const h = (el: HTMLElement) => getComputedStyle(el.closest('.MuiInputBase-root')!).height
    expect(h(a)).toBe('40px'); expect(h(screen.getByLabelText('b'))).toBe('56px'); expect(h(screen.getByLabelText('c'))).toBe('48px')
  })
  it('select renders a menu select with the same label wiring', () => {
    render(<KrdsTextField select label="단위" value="kg" onChange={() => {}}><option value="kg">kg</option></KrdsTextField>, { wrapper: wrap() })
    expect(screen.getByText('단위')).toBeInTheDocument()
    expect(selectTrigger(document.body)).toBeInTheDocument()
  })
})

describe('MjBadge', () => {
  it('always icon + text, semantic on the element', () => {
    render(<MjBadge semantic="danger">이탈</MjBadge>)
    const b = screen.getByTestId('mj-badge')
    expect(b).toHaveAttribute('data-semantic', 'danger')
    expect(within(b).getByText('✕')).toHaveAttribute('aria-hidden', 'true')
    expect(within(b).getByText('이탈')).toBeInTheDocument()
  })
})

const statusOptions = [
  { value: 'normal', text: '정상', semantic: 'success' as const },
  { value: 'warning', text: '주의', semantic: 'warning' as const },
  { value: 'deviation', text: '이탈', semantic: 'danger' as const }
]
const config: MjGridConfig = {
  name: 'CCP', resource: '/api/ccp', editMode: 'dialog', pageSize: 10, defaultSort: { field: 'name', direction: 'asc' },
  columns: [
    { field: 'name', headerName: '이름', type: 'string', editable: true, rules: [{ required: true }] },
    { field: 'status', headerName: '상태', type: 'status', editable: true, showOnFilterBar: true, params: { options: statusOptions } },
    { field: 'active', headerName: '사용여부', type: 'boolean', editable: true }
  ]
}
const page = (n: number) => ({ status: 200, data: { content: Array.from({ length: n }, (_, i) => ({ id: `r${i}`, name: `N${i}`, status: statusOptions[i % 3]!.value, active: i % 2 === 0 })), totalElements: 68 } })

describe('KRDS table', () => {
  it('has a caption, scope on header and first-column cells, aria-sort, status + boolean badges (icon + text)', async () => {
    const f = fakeApi(); f.on('POST', '/api/ccp/serverSide', page(3))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('N0')
    const table = screen.getByRole('table', { name: 'CCP' })
    expect(table.querySelector('caption')).toHaveTextContent('CCP')
    expect(screen.getAllByRole('columnheader').every(h => h.getAttribute('scope') === 'col')).toBe(true)
    expect(screen.getByRole('columnheader', { name: /이름/ })).toHaveAttribute('aria-sort', 'ascending')
    expect(screen.getAllByRole('rowheader')).toHaveLength(3)
    const badges = screen.getAllByTestId('mj-badge')
    expect(badges.map(b => b.getAttribute('data-semantic'))).toEqual(['success', 'success', 'warning', 'gray', 'danger', 'success'])
    expect(within(badges[0]!).getByText('정상')).toBeInTheDocument()
    expect(within(badges[3]!).getByText('미사용')).toBeInTheDocument()
  })

  it('page-size selector 10 / 20 / 50 changes pageSize and resets to the first page; result count is a live region', async () => {
    const f = fakeApi(); f.on('POST', '/api/ccp/serverSide', page(10))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('N0')
    expect(screen.getByRole('status')).toHaveTextContent('1–10 / 68')
    fireEvent.click(screen.getByRole('button', { name: 'Go to page 3' }))
    await waitFor(() => expect((f.calls.at(-1)!.body as { pageNum: number }).pageNum).toBe(2))
    fireEvent.change(screen.getByLabelText('페이지당'), { target: { value: '50' } })
    await waitFor(() => expect(f.calls.at(-1)!.body).toMatchObject({ pageNum: 0, pageSize: 50 }))
  })

  it('status filter applies an equals filter and shows a removable chip', async () => {
    const f = fakeApi(); f.on('POST', '/api/ccp/serverSide', page(2))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('N0')
    fireEvent.mouseDown(selectTrigger(screen.getByTestId('mj-filter-controls')))
    fireEvent.click(await screen.findByRole('option', { name: '이탈' }))
    await waitFor(() => expect((f.calls.at(-1)!.body as { filters: unknown[] }).filters).toEqual([{ columnName: 'status', columnValue: 'deviation', operator: 'equals', logic: 'and' }]))
    const chips = screen.getByTestId('mj-filter-chips')
    expect(within(chips).getByText('상태: 이탈')).toBeInTheDocument()
    fireEvent.click(within(chips).getByText('✕'))
    await waitFor(() => expect((f.calls.at(-1)!.body as { filters: unknown[] }).filters).toEqual([]))
    expect(screen.queryByTestId('mj-filter-chips')).not.toBeInTheDocument()
  })

  it('form: KRDS action bar (tertiary cancel, primary submit), error summary with role=alert and focus on the first invalid field', async () => {
    const f = fakeApi(); f.on('POST', '/api/ccp/serverSide', page(1))
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('N0')
    fireEvent.click(screen.getByRole('button', { name: 'CCP등록' }))
    const form = await screen.findByTestId('mj-form')
    expect(within(form).getByRole('button', { name: '취소' })).toHaveAttribute('data-variant', 'tertiary')
    expect(within(form).getByRole('button', { name: '등록' })).toHaveAttribute('data-variant', 'primary')
    fireEvent.click(within(form).getByRole('button', { name: '등록' }))
    const summary = await screen.findByTestId('mj-error-summary')
    expect(summary).toHaveAttribute('role', 'alert')
    expect(summary).toHaveTextContent('입력 오류 1건')
    await waitFor(() => expect(document.activeElement).toBe(within(form).getByLabelText(/이름/)))
    expect(within(form).getByLabelText(/이름/)).toHaveAttribute('aria-invalid', 'true')
  })

  it('status column exports/imports by label and the badge is the cell renderer on mobile cards too', async () => {
    const f = fakeApi(); f.on('POST', '/api/ccp/serverSide', page(1))
    render(<MjGrid config={{ ...config, mobile: { enabled: true } }} />, { wrapper: makeWrapper(f.api) })
    const card = await screen.findByTestId('mj-card')
    expect(card.querySelector('dl')).not.toBeNull()
    expect(within(card).getAllByRole('term').map(t => t.textContent)).toEqual(['상태', '사용여부'])
    expect(within(card).getAllByTestId('mj-badge').map(b => b.getAttribute('data-semantic'))).toEqual(['success', 'success'])
  })
})

describe('legacy button params map onto KRDS variants', () => {
  it('contained primary -> primary, outlined -> tertiary, error -> danger', async () => {
    const onClick = vi.fn(async () => {})
    const cfg: MjGridConfig = { name: 'B', rows: [{ id: '1' }], editMode: 'readonly', columns: [
      { field: 'a', headerName: 'A', type: 'button', params: { text: 'A', onClick } },
      { field: 'b', headerName: 'B', type: 'button', params: { text: 'B', variant: 'outlined', color: 'secondary', onClick } },
      { field: 'c', headerName: 'C', type: 'button', params: { text: 'C', color: 'error', onClick } }
    ] }
    render(<MjGrid config={cfg} />, { wrapper: makeWrapper(fakeApi().api) })
    expect((await screen.findByRole('button', { name: 'A' }))).toHaveAttribute('data-variant', 'primary')
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute('data-variant', 'tertiary')
    expect(screen.getByRole('button', { name: 'C' })).toHaveAttribute('data-variant', 'danger')
  })
})
