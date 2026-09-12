import * as XLSX from 'xlsx'
import dayjs from 'dayjs'
import type { MjColumn, MjOption } from './types'

export interface ParseExcelOptions {
  /** resolved options for select columns keyed by field (static ones are read from the column itself) */
  optionsByField?: Record<string, MjOption[]>
  positiveText?: string
  negativeText?: string
}

/** Header cell -> column. Accepts the exact headerName and the legacy "headerName(필수)" / "headerName*" variants. */
export function matchHeader(header: string, columns: MjColumn[]): MjColumn | undefined {
  const h = header.trim()
  return columns.find(c => h === c.headerName || h === `${c.headerName}(필수)` || h === `${c.headerName}*` || h === `${c.headerName} *`)
}

/**
 * Parses the first sheet of an .xlsx into grid rows using the column
 * definitions: header text maps to field, select text maps to value, boolean
 * text maps to true/false, dates become YYYY-MM-DD. Pure - no React, no IO.
 */
export function parseExcelRows(data: ArrayBuffer | Uint8Array, columns: MjColumn[], opts: ParseExcelOptions = {}): Record<string, unknown>[] {
  const wb = XLSX.read(data, { type: 'array', cellDates: true })
  const sheetName = wb.SheetNames[0]
  if (!sheetName) return []
  const sheet = wb.Sheets[sheetName]!
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: true })
  const importable = columns.filter(c => !c.hideOnExcel && c.type !== 'button' && c.type !== 'custom')
  const positive = opts.positiveText ?? '사용'
  const negative = opts.negativeText ?? '미사용'

  return raw.map(r => {
    const out: Record<string, unknown> = {}
    for (const [header, cell] of Object.entries(r)) {
      const c = matchHeader(header, importable)
      if (!c) continue
      out[c.field] = convertCell(c, cell, opts.optionsByField?.[c.field], positive, negative)
    }
    return out
  })
}

function convertCell(c: MjColumn, cell: unknown, options: MjOption[] | undefined, positive: string, negative: string): unknown {
  if (cell === null || cell === undefined || cell === '') return null
  switch (c.type) {
    case 'number': {
      const n = typeof cell === 'number' ? cell : Number(String(cell).replace(/,/g, ''))
      return Number.isNaN(n) ? null : n
    }
    case 'boolean': {
      const s = String(cell).trim().toLowerCase()
      if (s === positive.toLowerCase() || ['true', 'y', 'yes', '1', 'o'].includes(s)) return true
      if (s === negative.toLowerCase() || ['false', 'n', 'no', '0', 'x'].includes(s)) return false
      return null
    }
    case 'date': {
      const d = cell instanceof Date ? dayjs(cell) : dayjs(String(cell))
      return d.isValid() ? d.format('YYYY-MM-DD') : null
    }
    case 'select': {
      const opts = options ?? (c.params && 'options' in c.params ? c.params.options : undefined) ?? []
      const s = String(cell).trim()
      const hit = opts.find(o => o.text === s) ?? opts.find(o => o.text.toLowerCase() === s.toLowerCase()) ?? opts.find(o => String(o.value) === s)
      if (!hit) return null
      const vf = c.params && 'valueField' in c.params ? c.params.valueField : undefined
      return vf ? { ...(hit.data ?? {}), [vf]: hit.value } : hit.value
    }
    default:
      return cell instanceof Date ? dayjs(cell).format('YYYY-MM-DD') : cell
  }
}

/** Builds a template workbook (one header row, optional example row) - client-side alternative to the server template. */
export function buildTemplateWorkbook(columns: MjColumn[], withExample = true): ArrayBuffer {
  const cols = columns.filter(c => !c.hideOnExcel && c.type !== 'button' && c.type !== 'custom' && (c.editable || c.formOnly))
  const header = cols.map(c => (c.rules?.some(r => r.required) ? `${c.headerName}(필수)` : c.headerName))
  const rows: unknown[][] = [header]
  if (withExample) rows.push(cols.map(c => c.excelExampleValue ?? ''))
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = cols.map(c => ({ wch: Math.max(12, Math.round((c.width ?? 120) / 7)) }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}

/** Blob.arrayBuffer() with a FileReader fallback for older WebViews (and jsdom). */
export function readFileAsArrayBuffer(file: Blob): Promise<ArrayBuffer> {
  if (typeof (file as { arrayBuffer?: unknown }).arrayBuffer === 'function') return file.arrayBuffer()
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as ArrayBuffer)
    r.onerror = () => reject(r.error ?? new Error('read failed'))
    r.readAsArrayBuffer(file)
  })
}

/** Client-side export of already-loaded rows (hosts without a server-side Excel endpoint). */
export function exportRowsToXlsx(columns: MjColumn[], rows: Record<string, unknown>[], display?: (c: MjColumn, v: unknown, row: Record<string, unknown>) => string): ArrayBuffer {
  const cols = columns.filter(c => !c.hideOnExcel && c.type !== 'button' && c.type !== 'custom' && !c.formOnly)
  const aoa: unknown[][] = [['NO', ...cols.map(c => c.headerName)]]
  rows.forEach((r, i) => aoa.push([i + 1, ...cols.map(c => (display ? display(c, r[c.field], r) : r[c.field] ?? ''))]))
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 6 }, ...cols.map(c => ({ wch: Math.max(10, Math.round((c.width ?? 120) / 7)) }))]
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Sheet1')
  return XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer
}
