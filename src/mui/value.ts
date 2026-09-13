import dayjs from 'dayjs'
import type { MjColumn, MjLabels, MjRow } from '../core'

/** Resolve the raw cell value honouring parentPath and path (nested reads). */
export function readCell(column: MjColumn, row: MjRow): unknown {
  let v: unknown = column.parentPath ? (row[column.parentPath] as Record<string, unknown> | undefined)?.[column.field] : row[column.field]
  if (v === null || v === undefined) return v
  if (column.path && typeof v === 'object') v = (v as Record<string, unknown>)[column.path]
  return v
}

export function displayValue(column: MjColumn, value: unknown, row: MjRow, labels?: Pick<MjLabels, 'positive' | 'negative'>): string {
  if (value === null || value === undefined || value === '') return ''
  switch (column.type) {
    case 'string':
      return column.params?.format ? column.params.format(value, row) : String(value)
    case 'date': {
      const fmt = column.params?.format ?? (column.params?.selector === 'year' ? 'YYYY' : column.params?.selector === 'month' ? 'YYYY-MM' : 'YYYY-MM-DD')
      const d = dayjs(value as string | Date)
      return d.isValid() ? d.format(fmt) : String(value)
    }
    case 'boolean':
      return value ? column.params?.positiveText ?? labels?.positive ?? '사용' : column.params?.negativeText ?? labels?.negative ?? '미사용'
    case 'select': {
      const opts = column.params && 'options' in column.params ? column.params.options : undefined
      if (typeof value === 'object' && value !== null) {
        const tf = column.params && 'textField' in column.params ? column.params.textField ?? 'name' : 'name'
        return String((value as Record<string, unknown>)[tf] ?? (value as Record<string, unknown>).id ?? '')
      }
      return String(opts?.find(o => o.value === value)?.text ?? value)
    }
    case 'status':
      return String(column.params?.options.find(o => String(o.value) === String(value))?.text ?? value)
    case 'selectGrid':
    case 'autocomplete':
      if (column.type === 'selectGrid' && column.params?.displayValue) return column.params.displayValue(value, row)
      return typeof value === 'object' && value !== null ? String((value as { name?: unknown }).name ?? '') : String(value)
    case 'file':
    case 'image':
    case 'profile':
      return typeof value === 'object' && value !== null ? String((value as { originalName?: unknown }).originalName ?? '') : ''
    default:
      return typeof value === 'object' ? JSON.stringify(value) : String(value)
  }
}

/** Escape for the print window. The legacy printer wrote raw cell values into document.write (stored XSS). */
export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!)
}
