import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { MjGrid, MjForm } from '../../src/mui'
import type { MjGridConfig } from '../../src/core'
import { fakeApi } from '../core/react/fakeApi'
import { makeWrapper } from '../core/react/wrapper'

const vendors: MjGridConfig = {
  name: '거래처', resource: '/api/companies', showToolbarSearch: true,
  columns: [{ field: 'code', headerName: '코드', type: 'string' }, { field: 'name', headerName: '거래처명', type: 'string' }]
}
const config: MjGridConfig = {
  name: '재고', resource: '/api/inv', editMode: 'inline',
  columns: [
    { field: 'name', headerName: '품목', type: 'string' },
    { field: 'vendorCode', headerName: '거래처코드', type: 'string' },
    { field: 'vendor', headerName: '거래처', type: 'selectGrid', editable: true, params: { grid: vendors, patch: v => ({ vendorCode: v.code }) } }
  ]
}
const inv = { status: 200, data: { content: [{ id: 'i1', name: '설탕', vendorCode: '', vendor: null }], totalElements: 1 } }
const cos = { status: 200, data: { content: [{ id: 'V1', code: 'ACME', name: '에이스식품' }, { id: 'V2', code: 'BETA', name: '베타상사' }], totalElements: 2 } }

describe('selectGrid (inline)', () => {
  it('cell is read-only: typing changes nothing and the nested grid does not fetch until opened', async () => {
    const f = fakeApi(); f.on('POST', '/api/inv/serverSide', inv); f.on('POST', '/api/companies/serverSide', cos)
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('설탕')
    const cell = screen.getAllByRole('textbox').find(el => (el as HTMLInputElement).readOnly)!
    expect(cell).toHaveAttribute('readonly')
    await userEvent.type(cell, 'INVALID_VENDOR')
    expect(cell).toHaveValue('')
    expect(f.count('POST', '/api/companies/serverSide')).toBe(0)
  })

  it('picking a row sets the value, applies the sibling patch, and the save sends both', async () => {
    const f = fakeApi(); f.on('POST', '/api/inv/serverSide', inv); f.on('POST', '/api/companies/serverSide', cos); f.on('PUT', '/api/inv/bulk', { status: 200 })
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByText('설탕')
    fireEvent.click(screen.getByRole('button', { name: '선택' }))
    const dlg = await screen.findByRole('dialog')
    expect(within(dlg).getByText('거래처 선택')).toBeInTheDocument()
    fireEvent.click(await within(dlg).findByText('베타상사'))
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(screen.getByDisplayValue('베타상사')).toBeInTheDocument()
    fireEvent.click(screen.getByText('저장'))
    await waitFor(() => expect(f.count('PUT', '/api/inv/bulk')).toBe(1))
    const row = (f.calls.find(c => c.method === 'PUT')!.body as { rows: Record<string, unknown>[] }).rows[0]!
    expect(row).toMatchObject({ id: 'i1', vendorCode: 'BETA', vendor: { id: 'V2', code: 'BETA' } })
    expect(f.count('POST', '/api/companies/serverSide')).toBe(1)
  })

  it('clear button empties the value', async () => {
    const f = fakeApi(); f.on('POST', '/api/inv/serverSide', { status: 200, data: { content: [{ id: 'i1', name: 'x', vendor: { id: 'V1', name: '에이스식품' } }], totalElements: 1 } })
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api) })
    await screen.findByDisplayValue('에이스식품')
    fireEvent.click(screen.getByRole('button', { name: '지우기' }))
    expect(screen.queryByDisplayValue('에이스식품')).not.toBeInTheDocument()
  })
})

describe('selectGrid (dialog form)', () => {
  it('renders in the form (legacy form dropped this type) and picking fills sibling fields', async () => {
    const f = fakeApi(); f.on('POST', '/api/companies/serverSide', cos); f.on('POST', '/api/inv', { status: 200, data: {} })
    const cfg: MjGridConfig = { ...config, editMode: 'dialog', columns: config.columns.map(c => ({ ...c, editable: true })) }
    const closed: boolean[] = []
    render(<MjForm config={cfg} mode="insert" onClose={c => closed.push(c)} />, { wrapper: makeWrapper(f.api) })
    const field = screen.getByLabelText(/^거래처$/)
    expect(field).toHaveAttribute('readonly')
    fireEvent.click(field)
    fireEvent.click(await screen.findByText('에이스식품'))
    await waitFor(() => expect(screen.getByLabelText(/^거래처$/)).toHaveValue('에이스식품'))
    expect(screen.getByLabelText(/거래처코드/)).toHaveValue('ACME')
    fireEvent.click(screen.getByText('등록'))
    await waitFor(() => expect(closed).toEqual([true]))
    expect(f.calls.at(-1)!.body).toMatchObject({ vendorCode: 'ACME', vendor: { id: 'V1' } })
  })
})
