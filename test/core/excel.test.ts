import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { buildTemplateWorkbook, parseExcelRows, matchHeader, type MjColumn } from '../../src/core'

const columns: MjColumn[] = [
  { field: 'code', headerName: '품목코드', type: 'string', editable: true, rules: [{ required: true }], excelExampleValue: 'P001' },
  { field: 'qty', headerName: '수량', type: 'number', editable: true },
  { field: 'active', headerName: '사용여부', type: 'boolean', editable: true },
  { field: 'when', headerName: '입고일자', type: 'date', editable: true },
  { field: 'unit', headerName: '단위', type: 'select', editable: true, params: { options: [{ value: 'KG', text: '킬로그램' }, { value: 'EA', text: '개' }] } },
  { field: 'vendor', headerName: '거래처', type: 'select', editable: true, params: { fetchUrl: '/api/companies', valueField: 'id', textField: 'name' } },
  { field: 'img', headerName: '사진', type: 'image', hideOnExcel: true },
  { field: 'act', headerName: '액션', type: 'button', params: { text: 'x', onClick: () => {} } }
]
const wb = (rows: unknown[][]) => { const w = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(w, XLSX.utils.aoa_to_sheet(rows), 'S'); return XLSX.write(w, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer }

describe('parseExcelRows', () => {
  it('maps headers (incl. the legacy (필수) suffix) and converts every type', () => {
    const buf = wb([
      ['품목코드(필수)', '수량', '사용여부', '입고일자', '단위', '거래처', '무시되는열'],
      ['P1', '1,250', '사용', new Date(2026, 2, 4), '킬로그램', '에이스식품', 'zzz'],
      ['P2', 7, '미사용', '2026-12-31', 'EA', 'nobody', '']
    ])
    const rows = parseExcelRows(buf, columns, { optionsByField: { vendor: [{ value: 'V1', text: '에이스식품', data: { id: 'V1', name: '에이스식품' } }] } })
    expect(rows).toEqual([
      { code: 'P1', qty: 1250, active: true, when: '2026-03-04', unit: 'KG', vendor: { id: 'V1', name: '에이스식품' } },
      { code: 'P2', qty: 7, active: false, when: '2026-12-31', unit: 'EA', vendor: null }
    ])
  })
  it('empty cells become null; unknown boolean text becomes null', () => {
    const rows = parseExcelRows(wb([['품목코드', '수량', '사용여부'], ['P1', '', 'maybe']]), columns)
    expect(rows).toEqual([{ code: 'P1', qty: null, active: null }])
  })
  it('matchHeader accepts variants', () => {
    expect(matchHeader('수량', columns)?.field).toBe('qty')
    expect(matchHeader('수량(필수)', columns)?.field).toBe('qty')
    expect(matchHeader('수량 *', columns)?.field).toBe('qty')
    expect(matchHeader('nope', columns)).toBeUndefined()
  })
  it('an empty workbook yields no rows', () => {
    expect(parseExcelRows(wb([]), columns)).toEqual([])
  })
})

describe('buildTemplateWorkbook', () => {
  it('writes editable columns only, marks required, includes example values, and round-trips through the parser', () => {
    const buf = buildTemplateWorkbook(columns)
    const w = XLSX.read(buf, { type: 'array' })
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(w.Sheets[w.SheetNames[0]!]!, { header: 1 })
    expect(aoa[0]).toEqual(['품목코드(필수)', '수량', '사용여부', '입고일자', '단위', '거래처'])
    expect(aoa[1]![0]).toBe('P001')
    expect(parseExcelRows(buf, columns)[0]).toMatchObject({ code: 'P001' })
  })
})
