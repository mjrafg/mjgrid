import * as XLSX from 'xlsx'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MjGrid } from '../../src/mui'
import type { MjGridConfig, MjToast } from '../../src/core'
import { fakeApi } from '../core/react/fakeApi'
import { makeWrapper } from '../core/react/wrapper'

const config: MjGridConfig = {
  name: '제품', resource: '/api/products', editMode: 'dialog', excelImport: true,
  columns: [
    { field: 'code', headerName: '품목코드', type: 'string', editable: true, rules: [{ required: true }] },
    { field: 'qty', headerName: '수량', type: 'number', editable: true },
    { field: 'unit', headerName: '단위', type: 'select', editable: true, params: { fetchUrl: '/api/product/unit', valueField: 'id', textField: 'name' } }
  ]
}
const xlsxFile = (rows: unknown[][]) => { const w = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(w, XLSX.utils.aoa_to_sheet(rows), 'S'); const out = XLSX.write(w, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer; return new File([out], 'import.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }) }
const toast = (): MjToast & { ok: string[]; bad: string[] } => { const t = { ok: [] as string[], bad: [] as string[], success: (m: string) => t.ok.push(m), error: (m: string) => t.bad.push(m) }; return t }

describe('Excel import', () => {
  it('parses, previews in an editable grid, resolves fetched select options, and POSTs /bulk', async () => {
    const f = fakeApi()
    f.on('POST', '/api/products/serverSide', { status: 200, data: { content: [], totalElements: 0 } })
    f.on('GET', '/api/product/unit', { status: 200, data: [{ id: 'u-kg', name: 'Kg' }] })
    f.on('POST', '/api/products/bulk', { status: 200 })
    const t = toast()
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api, t) })
    await screen.findByText('데이터가 없습니다.')
    const input = document.querySelector('input[type="file"][accept=".xlsx"]') as HTMLInputElement
    fireEvent.change(input, { target: { files: [xlsxFile([['품목코드', '수량', '단위'], ['A1', 3, 'Kg'], ['A2', '4', 'Kg']])] } })
    const dlg = await screen.findByRole('dialog')
    expect(await within(dlg).findByText(/2건/)).toBeInTheDocument()
    expect(await within(dlg).findByDisplayValue('A1')).toBeInTheDocument()
    // fix a value in the preview before importing
    fireEvent.change(within(dlg).getByDisplayValue('A2'), { target: { value: 'A2-fixed' } })
    fireEvent.click(within(dlg).getByText('등록'))
    await waitFor(() => expect(f.count('POST', '/api/products/bulk')).toBe(1))
    const body = f.calls.find(c => c.url === '/api/products/bulk')!.body as { rows: Record<string, unknown>[] }
    expect(body.rows).toEqual([{ code: 'A1', qty: 3, unit: { id: 'u-kg', name: 'Kg' } }, { code: 'A2-fixed', qty: 4, unit: { id: 'u-kg', name: 'Kg' } }])
    expect(t.ok).toEqual(['등록 되었습니다.'])
    expect(f.count('GET', '/api/product/unit')).toBe(1)
  })

  it('validation errors in the preview block the import', async () => {
    const f = fakeApi()
    f.on('POST', '/api/products/serverSide', { status: 200, data: { content: [], totalElements: 0 } })
    f.on('GET', '/api/product/unit', { status: 200, data: [] })
    const t = toast()
    render(<MjGrid config={config} />, { wrapper: makeWrapper(f.api, t) })
    await screen.findByText('데이터가 없습니다.')
    fireEvent.change(document.querySelector('input[type="file"][accept=".xlsx"]') as HTMLInputElement, { target: { files: [xlsxFile([['품목코드', '수량'], ['', 1]])] } })
    const dlg = await screen.findByRole('dialog')
    await within(dlg).findByText(/1건/)
    // the preview grid loads its editable copy in an effect; submit only once the row editor exists
    await waitFor(() => expect(within(dlg).getAllByRole('textbox').length).toBeGreaterThan(0))
    fireEvent.click(within(dlg).getByText('등록'))
    await waitFor(() => expect(t.bad).toHaveLength(1))
    expect(t.bad[0]).toMatch(/NO1: 품목코드/)
    expect(f.count('POST', '/api/products/bulk')).toBe(0)
  })
})
