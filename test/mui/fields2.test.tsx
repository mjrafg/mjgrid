import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MjForm, MjGrid } from '../../src/mui'
import { enLabels, type MjGridConfig } from '../../src/core'
import { fakeApi } from '../core/react/fakeApi'
import { makeWrapper } from '../core/react/wrapper'
import { MjProvider } from '../../src/core'
import { QueryClient } from '@tanstack/react-query'

const config: MjGridConfig = {
  name: 'Shift', resource: '/api/shifts',
  columns: [
    { field: 'start', headerName: '시작', type: 'time', editable: true },
    { field: 'hours', headerName: '근무시간', type: 'timeRange', editable: true },
    { field: 'days', headerName: '근무요일', type: 'weekDays', editable: true },
    { field: 'addr', headerName: '주소', type: 'address', editable: true },
    { field: 'mgr', headerName: '담당자', type: 'autocomplete', editable: true, params: { fetchUrl: '/api/users', valueField: 'id', textField: 'name' } },
    { field: 'note', headerName: '메모', type: 'custom', editable: true, params: { node: (ctx: { value: unknown; onChange: (v: unknown) => void }) => <input aria-label="custom-note" value={String(ctx.value ?? '')} onChange={e => ctx.onChange(e.target.value)} /> } }
  ]
}

describe('extra field types', () => {
  it('time/timeRange/weekDays encode to the legacy storage strings on submit', async () => {
    const f = fakeApi(); f.on('GET', '/api/users', { status: 200, data: [{ id: 'u1', name: 'Kim' }] }); f.on('POST', '/api/shifts', { status: 200, data: {} })
    const closed: boolean[] = []
    render(<MjForm config={config} mode="insert" onClose={c => closed.push(c)} />, { wrapper: makeWrapper(f.api) })
    fireEvent.change(screen.getByLabelText(/^시작/), { target: { value: '09:30' } })
    fireEvent.change(screen.getByLabelText('근무시간 start'), { target: { value: '08:00' } })
    fireEvent.change(screen.getByLabelText('근무시간 end'), { target: { value: '17:30' } })
    fireEvent.click(screen.getByLabelText('월요일'))
    fireEvent.click(screen.getByLabelText('수요일'))
    fireEvent.change(screen.getByLabelText(/^주소/), { target: { value: '서울시 강남구' } })
    await userEvent.type(screen.getByLabelText('custom-note'), 'hi')
    fireEvent.click(screen.getByText('등록'))
    await waitFor(() => expect(closed).toEqual([true]))
    const body = f.calls.find(c => c.method === 'POST')!.body as Record<string, unknown>
    expect(body).toMatchObject({ start: '09:30:00', hours: '08:00 17:30', days: '0,1,0,1,0,0,0', addr: '서울시 강남구', note: 'hi' })
  })

  it('weekDays/timeRange decode existing values into the controls', () => {
    const f = fakeApi(); f.on('GET', '/api/users', { status: 200, data: [] })
    render(<MjForm config={config} mode="update" row={{ id: 's1', days: '1,0,0,0,0,0,1', hours: '10:00 12:00', start: '07:15:00' }} onClose={() => {}} />, { wrapper: makeWrapper(f.api) })
    expect(screen.getByLabelText('일요일')).toBeChecked()
    expect(screen.getByLabelText('토요일')).toBeChecked()
    expect(screen.getByLabelText('월요일')).not.toBeChecked()
    expect(screen.getByLabelText('근무시간 start')).toHaveValue('10:00')
    expect(screen.getByLabelText(/^시작/)).toHaveValue('07:15')
  })

  it('address uses Daum postcode when the host loaded it', async () => {
    const f = fakeApi(); f.on('GET', '/api/users', { status: 200, data: [] }); f.on('POST', '/api/shifts', { status: 200, data: {} })
    const open = vi.fn()
    let complete: ((d: { roadAddress: string }) => void) | null = null
    ;(window as unknown as { daum: unknown }).daum = { Postcode: class { constructor(o: { oncomplete: (d: { roadAddress: string }) => void }) { complete = o.oncomplete } open = open } }
    try {
      render(<MjForm config={config} mode="insert" onClose={() => {}} />, { wrapper: makeWrapper(f.api) })
      expect(screen.getByLabelText(/^주소/)).toHaveAttribute('readonly')
      fireEvent.click(screen.getByText('주소검색'))
      expect(open).toHaveBeenCalled()
      complete!({ roadAddress: '테헤란로 1' })
      await waitFor(() => expect(screen.getByLabelText(/^주소/)).toHaveValue('테헤란로 1'))
    } finally { delete (window as unknown as { daum?: unknown }).daum }
  })

  it('autocomplete resolves options once and stores the option data object', async () => {
    const f = fakeApi(); f.on('GET', '/api/users', { status: 200, data: [{ id: 'u1', name: 'Kim' }, { id: 'u2', name: 'Lee' }] }); f.on('POST', '/api/shifts', { status: 200, data: {} })
    const closed: boolean[] = []
    render(<MjForm config={config} mode="insert" onClose={c => closed.push(c)} />, { wrapper: makeWrapper(f.api) })
    const ac = screen.getByLabelText(/^담당자/)
    await waitFor(() => expect(f.count('GET', '/api/users')).toBe(1))
    await userEvent.click(ac)
    await userEvent.type(ac, 'Le')
    fireEvent.click(await screen.findByText('Lee'))
    fireEvent.click(screen.getByText('등록'))
    await waitFor(() => expect(closed).toEqual([true]))
    expect((f.calls.find(c => c.method === 'POST')!.body as Record<string, unknown>).mgr).toEqual({ id: 'u2', name: 'Lee' })
    expect(f.count('GET', '/api/users')).toBe(1)
  })
})

describe('labels', () => {
  it('MjProvider labels switch every UI string (toolbar, empty state, boolean cell)', async () => {
    const f = fakeApi(); f.on('POST', '/api/x/serverSide', { status: 200, data: { content: [{ id: '1', ok: false }], totalElements: 1 } })
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <MjProvider api={f.api} queryClient={qc} labels={enLabels}>
        <MjGrid config={{ name: 'Thing', resource: '/api/x', editMode: 'inline', excelExport: true, columns: [{ field: 'ok', headerName: 'OK', type: 'boolean' }] }} />
      </MjProvider>
    )
    expect(await screen.findByText('No')).toBeInTheDocument()
    expect(screen.getByText('Export Excel')).toBeInTheDocument()
    expect(screen.getByText('Save')).toBeInTheDocument()
    expect(screen.getByText('Add Thing')).toBeInTheDocument()
  })
})
