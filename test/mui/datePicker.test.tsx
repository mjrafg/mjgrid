import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import dayjs from 'dayjs'
import { MjDatePicker, MjGrid } from '../../src/mui'
import { MjProvider, enLabels, type MjGridConfig } from '../../src/core'
import { fakeApi } from '../core/react/fakeApi'
import { makeWrapper } from '../core/react/wrapper'

const wrap = (en = false) => {
  const f = fakeApi()
  return function W({ children }: { children: React.ReactNode }) { return <MjProvider api={f.api} labels={en ? enLabels : undefined}>{children}</MjProvider> }
}

describe('MjDatePicker', () => {
  it('opens a Korean calendar: 년/월 header, 일..토 weekdays; picking a day returns YYYY-MM-DD and closes', async () => {
    const onChange = vi.fn()
    render(<MjDatePicker label="입고일자" value="2026-09-13" onChange={onChange} />, { wrapper: wrap() })
    expect(screen.getByLabelText(/입고일자/)).toHaveValue('2026-09-13')
    fireEvent.click(screen.getByRole('button', { name: '달력 열기' }))
    const cal = await screen.findByTestId('mj-calendar')
    expect(within(cal).getByLabelText('YYYY')).toHaveValue('2026')
    expect(within(cal).getByLabelText('YYYY-MM')).toHaveValue('8') // 0-based month index -> 9월
    expect(within(cal).getByLabelText('YYYY-MM')).toHaveDisplayValue('9월')
    expect(within(cal).getAllByRole('columnheader').map(h => h.textContent)).toEqual(['일', '월', '화', '수', '목', '금', '토'])
    expect(within(cal).getByRole('gridcell', { name: '2026-09-13' })).toHaveAttribute('aria-selected', 'true')
    fireEvent.click(within(cal).getByRole('gridcell', { name: '2026-09-20' }))
    expect(onChange).toHaveBeenCalledWith('2026-09-20')
    await waitFor(() => expect(screen.queryByTestId('mj-calendar')).not.toBeInTheDocument())
  })

  it('month arrows and the month/year selects move the view', async () => {
    render(<MjDatePicker value="2026-01-15" onChange={() => {}} />, { wrapper: wrap() })
    fireEvent.click(screen.getByRole('button', { name: '달력 열기' }))
    const cal = await screen.findByTestId('mj-calendar')
    fireEvent.click(within(cal).getByRole('button', { name: '이전 달' }))
    expect(within(cal).getByLabelText('YYYY')).toHaveValue('2025')
    expect(within(cal).getByLabelText('YYYY-MM')).toHaveDisplayValue('12월')
    fireEvent.change(within(cal).getByLabelText('YYYY-MM'), { target: { value: '2' } })
    fireEvent.change(within(cal).getByLabelText('YYYY'), { target: { value: '2030' } })
    expect(within(cal).getByRole('gridcell', { name: '2030-03-01' })).toBeInTheDocument()
  })

  it('typed input in the display format commits on blur; garbage reverts; clearing sends null', () => {
    const onChange = vi.fn()
    render(<MjDatePicker aria-label="d" value="2026-09-13" onChange={onChange} />, { wrapper: wrap() })
    const input = screen.getByLabelText('d')
    fireEvent.change(input, { target: { value: '2026-01-05' } }); fireEvent.blur(input)
    expect(onChange).toHaveBeenLastCalledWith('2026-01-05')
    fireEvent.change(input, { target: { value: 'nope' } }); fireEvent.blur(input)
    expect(input).toHaveValue('2026-09-13')
    fireEvent.change(input, { target: { value: '' } }); fireEvent.blur(input)
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('month selector shows a 12-month grid and stores the first day; year selector stores Jan 1', async () => {
    const onChange = vi.fn()
    const { unmount } = render(<MjDatePicker aria-label="m" selector="month" value="2026-09-01" onChange={onChange} />, { wrapper: wrap() })
    expect(screen.getByLabelText('m')).toHaveValue('2026-09')
    fireEvent.click(screen.getByRole('button', { name: '달력 열기' }))
    fireEvent.click(within(await screen.findByTestId('mj-calendar')).getByRole('gridcell', { name: '3월' }))
    expect(onChange).toHaveBeenCalledWith('2026-03-01')
    unmount()
    render(<MjDatePicker aria-label="y" selector="year" value="2026-01-01" onChange={onChange} />, { wrapper: wrap() })
    expect(screen.getByLabelText('y')).toHaveValue('2026')
    fireEvent.click(screen.getByRole('button', { name: '달력 열기' }))
    fireEvent.click(within(await screen.findByTestId('mj-calendar')).getByRole('gridcell', { name: '2028' }))
    expect(onChange).toHaveBeenLastCalledWith('2028-01-01')
  })

  it('오늘 / 지우기 footer', async () => {
    const onChange = vi.fn()
    render(<MjDatePicker value={null} onChange={onChange} />, { wrapper: wrap() })
    fireEvent.click(screen.getByRole('button', { name: '달력 열기' }))
    const cal = await screen.findByTestId('mj-calendar')
    fireEvent.click(within(cal).getByRole('button', { name: '오늘' }))
    expect(onChange).toHaveBeenLastCalledWith(dayjs().format('YYYY-MM-DD'))
    fireEvent.click(screen.getByRole('button', { name: '달력 열기' }))
    fireEvent.click(within(await screen.findByTestId('mj-calendar')).getByRole('button', { name: '지우기' }))
    expect(onChange).toHaveBeenLastCalledWith(null)
  })

  it('English labels switch the whole calendar', async () => {
    render(<MjDatePicker value="2026-09-13" onChange={() => {}} />, { wrapper: wrap(true) })
    fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }))
    const cal = await screen.findByTestId('mj-calendar')
    expect(within(cal).getByLabelText('YYYY-MM')).toHaveDisplayValue('September')
    expect(within(cal).getAllByRole('columnheader')[0]).toHaveTextContent('Su')
    expect(within(cal).getByRole('button', { name: 'Today' })).toBeInTheDocument()
  })

  it('on mobile the calendar opens as a sheet with a history entry', async () => {
    const f = fakeApi(); f.on('POST', '/api/x/serverSide', { status: 200, data: { content: [{ id: 'r1', when: '2026-09-13' }], totalElements: 1 } })
    const cfg: MjGridConfig = { name: 'X', resource: '/api/x', editMode: 'inline', mobile: { enabled: true }, columns: [{ field: 'when', headerName: '일자', type: 'date', editable: true }] }
    render(<MjGrid config={cfg} />, { wrapper: makeWrapper(f.api) })
    const card = await screen.findByTestId('mj-card')
    window.history.replaceState({ page: 'list' }, '')
    fireEvent.click(within(card).getByRole('button', { name: '달력 열기' }))
    await screen.findByTestId('mj-date-sheet')
    expect(window.history.state).toMatchObject({ page: 'list', __mjOverlay: expect.any(String) })
    fireEvent.click(within(screen.getByTestId('mj-calendar')).getByRole('gridcell', { name: '2026-09-01' }))
    await waitFor(() => expect(screen.queryByTestId('mj-calendar')).not.toBeInTheDocument())
    expect(within(card).getByRole('textbox', { name: '일자' })).toHaveValue('2026-09-01')
  })
})
