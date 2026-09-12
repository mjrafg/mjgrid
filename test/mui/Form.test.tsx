import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MjForm } from '../../src/mui'
import type { MjGridConfig, MjToast } from '../../src/core'
import { fakeApi } from '../core/react/fakeApi'
import { makeWrapper } from '../core/react/wrapper'

const config: MjGridConfig = {
  name: '사용자', resource: '/api/users',
  columns: [
    { field: 'userName', headerName: '아이디', type: 'string', editable: true, rules: [{ required: true, minLength: 3 }],
      params: { valueCheckUrl: '/api/users/check/{value}/{userName}' } },
    { field: 'rPa', headerName: '비밀번호', type: 'string', editable: true, params: { inputType: 'password' } },
    { field: 'age', headerName: '나이', type: 'number', editable: true, rules: [{ min: 1, max: 120 }] },
    { field: 'role', headerName: '역할', type: 'select', editable: true, params: { options: [{ value: 'A', text: 'Admin' }, { value: 'U', text: 'User' }] } },
    { field: 'active', headerName: '사용여부', type: 'boolean', editable: true, defaultValue: true },
    { field: 'seq', headerName: 'Seq', type: 'number' } // not editable -> not in form
  ]
}
const toast = (): MjToast & { ok: string[]; bad: string[] } => { const t = { ok: [] as string[], bad: [] as string[], success: (m: string) => t.ok.push(m), error: (m: string) => t.bad.push(m) }; return t }

describe('MjForm', () => {
  it('renders only editable/formOnly columns and applies defaultValue', () => {
    const f = fakeApi()
    render(<MjForm config={config} mode="insert" onClose={() => {}} />, { wrapper: makeWrapper(f.api) })
    expect(screen.getByLabelText(/아이디/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Seq/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('사용')).toBeChecked()
  })

  it('blocks submit on validation errors, shows messages, makes no request', async () => {
    const f = fakeApi()
    render(<MjForm config={config} mode="insert" onClose={() => {}} />, { wrapper: makeWrapper(f.api) })
    fireEvent.change(screen.getByLabelText(/나이/), { target: { value: '500' } })
    fireEvent.click(screen.getByText('등록'))
    expect(await screen.findByText('아이디은(는) 필수입력 사항입니다.')).toBeInTheDocument()
    expect(screen.getByText('나이은(는) 1에서 120사이의 숫자를 입력해 주세요.')).toBeInTheDocument()
    expect(f.calls).toHaveLength(0)
  })

  it('valueCheckUrl: a duplicate blocks submit; then a clean value inserts and closes', async () => {
    const f = fakeApi()
    let taken = true
    f.on('GET', '/api/users/check/', () => ({ status: 200, data: taken }))
    f.on('POST', '/api/users', { status: 200, data: { id: 'new' } })
    const closed: boolean[] = []; const t = toast()
    render(<MjForm config={config} mode="insert" onClose={c => closed.push(c)} />, { wrapper: makeWrapper(f.api, t) })
    await userEvent.type(screen.getByLabelText(/아이디/), 'alice')
    fireEvent.click(screen.getByText('등록'))
    expect(await screen.findByText('alice은(는) 중복된 아이디입니다.')).toBeInTheDocument()
    expect(f.calls.map(c => c.method)).toEqual(['GET'])
    expect(f.calls[0]!.url).toBe('/api/users/check/alice/')
    taken = false
    fireEvent.click(screen.getByText('등록'))
    await waitFor(() => expect(closed).toEqual([true]))
    expect(f.calls.at(-1)).toMatchObject({ method: 'POST', url: '/api/users' })
    expect((f.calls.at(-1)!.body as Record<string, unknown>).userName).toBe('alice')
    expect(t.ok).toEqual(['등록 되었습니다.'])
  })

  it('update: password starts empty and is OMITTED unless typed (no magic sentinel)', async () => {
    const f = fakeApi(); f.on('GET', '/api/users/check/', { status: 200, data: false }); f.on('PUT', '/api/users/', { status: 200, data: {} })
    const row = { id: 'u1', userName: 'bob', age: 30, role: 'A', active: true, rPa: 'SHOULD-NOT-LEAK' }
    render(<MjForm config={config} mode="update" row={row} onClose={() => {}} />, { wrapper: makeWrapper(f.api, toast()) })
    expect(screen.getByLabelText(/비밀번호/)).toHaveValue('')
    fireEvent.click(screen.getByText('수정'))
    await waitFor(() => expect(f.calls.some(c => c.method === 'PUT')).toBe(true))
    const body = f.calls.find(c => c.method === 'PUT')!.body as Record<string, unknown>
    expect(body).not.toHaveProperty('rPa')
    expect(body).toMatchObject({ id: 'u1', userName: 'bob' })
    expect(JSON.stringify(body)).not.toContain('mjr@#$123')
    expect(f.calls[0]!.url).toBe('/api/users/check/bob/bob') // {value}=new, {userName}=original
  })

  it('a server error envelope keeps the dialog open and toasts the message', async () => {
    const f = fakeApi(); f.on('GET', '/api/users/check/', { status: 200, data: false }); f.on('PUT', '/api/users/', { status: 200, error: '현재 사용중인 정보입니다' })
    const closed: boolean[] = []; const t = toast()
    render(<MjForm config={config} mode="update" row={{ id: 'u1', userName: 'bob' }} onClose={c => closed.push(c)} />, { wrapper: makeWrapper(f.api, t) })
    fireEvent.click(screen.getByText('수정'))
    await waitFor(() => expect(t.bad).toEqual(['현재 사용중인 정보입니다']))
    expect(closed).toEqual([])
    expect(t.ok).toEqual([])
  })

  it('delete asks for confirmation then DELETEs /{id}', async () => {
    const f = fakeApi(); f.on('DELETE', '/api/users/', { status: 200 })
    const closed: boolean[] = []; const t = toast()
    render(<MjForm config={config} mode="update" row={{ id: 'u9', userName: 'x' }} onClose={c => closed.push(c)} />, { wrapper: makeWrapper(f.api, t) })
    fireEvent.click(screen.getByText('삭제'))
    fireEvent.click(await screen.findByText('확인'))
    await waitFor(() => expect(closed).toEqual([true]))
    expect(f.calls[0]).toMatchObject({ method: 'DELETE', url: '/api/users/u9' })
    expect(t.ok).toEqual(['삭제 되었습니다.'])
  })
})

describe('duplicate-check button', () => {
  it('shows the button for valueCheckUrl fields, reports taken / available inline, excludes the edited row', async () => {
    const f = fakeApi()
    f.on('GET', '/api/users/check/', c => ({ status: 200, data: c.url.includes('/check/taken/') }))
    render(<MjForm config={config} mode="update" row={{ id: 'u1', userName: 'bob' }} onClose={() => {}} />, { wrapper: makeWrapper(f.api) })
    const btn = screen.getByRole('button', { name: '중복확인' })
    fireEvent.change(screen.getByLabelText(/아이디/), { target: { value: 'taken' } })
    fireEvent.click(btn)
    expect(await screen.findByText('taken은(는) 중복된 아이디입니다.')).toBeInTheDocument()
    expect(f.calls.at(-1)!.url).toBe('/api/users/check/taken/bob')
    fireEvent.change(screen.getByLabelText(/아이디/), { target: { value: 'free' } })
    fireEvent.click(btn)
    expect(await screen.findByText('free은(는) 사용 가능한 아이디입니다.')).toBeInTheDocument()
  })
})
