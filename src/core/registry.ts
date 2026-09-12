import type { MjColumn, MjColumnType, MjFilter, MjFilterOperator } from './types'
import dayjs from 'dayjs'

/**
 * Single source of truth for what each column type can do. The legacy grid
 * had three independent `switch (columnType)` blocks (grid, inline, form)
 * that each covered a different subset of types, so e.g. a picker column
 * existed in the grid but silently vanished from the dialog form.
 *
 * Adapters register *renderers* against this registry; the capabilities
 * themselves live here, once.
 */
export interface MjTypeCapabilities {
  /** operator used when the free-text search or filter bar targets this column */
  filterOperator: MjFilterOperator | null
  /** can this type be searched by the toolbar free-text box */
  searchable: boolean
  /** default column width in px */
  width: number
  /** align cell content */
  align: 'left' | 'center' | 'right'
  /** serialise a UI value into the stored string/number */
  encode?: (value: unknown) => unknown
  /** parse the stored representation for the UI */
  decode?: (stored: unknown) => unknown
  /** show in the create/edit form at all */
  formCapable: boolean
  /** editable in inline mode at all */
  inlineCapable: boolean
}

const text: MjTypeCapabilities = { filterOperator: 'contains', searchable: true, width: 150, align: 'left', formCapable: true, inlineCapable: true }

export const columnTypeRegistry: Record<MjColumnType, MjTypeCapabilities> = {
  string: text,
  number: { filterOperator: '=', searchable: true, width: 110, align: 'right', formCapable: true, inlineCapable: true,
    encode: v => (v === '' || v === null || v === undefined ? null : Number(v)) },
  select: { filterOperator: 'equals', searchable: true, width: 130, align: 'left', formCapable: true, inlineCapable: true },
  date: { filterOperator: 'between', searchable: false, width: 130, align: 'center', formCapable: true, inlineCapable: true,
    encode: v => (v ? dayjs(v as string | Date).format('YYYY-MM-DD') : null) },
  time: { filterOperator: null, searchable: false, width: 100, align: 'center', formCapable: true, inlineCapable: false,
    encode: v => (v ? dayjs(v as Date).format('HH:mm:ss') : null) },
  timeRange: { filterOperator: null, searchable: false, width: 140, align: 'center', formCapable: true, inlineCapable: false,
    // stored as "HH:mm HH:mm"
    encode: v => { const r = v as { start?: Date | null; end?: Date | null } | null; return r ? `${r.start ? dayjs(r.start).format('HH:mm') : ''} ${r.end ? dayjs(r.end).format('HH:mm') : ''}` : null },
    decode: s => { const [a = '', b = ''] = String(s ?? '').split(' '); return { start: a ? dayjs(`1970-01-01T${a}`).toDate() : null, end: b ? dayjs(`1970-01-01T${b}`).toDate() : null } } },
  weekDays: { filterOperator: null, searchable: false, width: 180, align: 'left', formCapable: true, inlineCapable: false,
    // stored as "1,0,1,0,1,0,0" Sunday-first
    encode: v => (Array.isArray(v) ? v.map(b => (b ? '1' : '0')).join(',') : null),
    decode: s => String(s ?? '').split(',').map(x => x === '1') },
  boolean: { filterOperator: 'is', searchable: false, width: 90, align: 'center', formCapable: true, inlineCapable: true },
  image: { filterOperator: null, searchable: false, width: 120, align: 'center', formCapable: true, inlineCapable: false },
  file: { filterOperator: null, searchable: false, width: 160, align: 'center', formCapable: true, inlineCapable: false },
  address: { filterOperator: 'contains', searchable: true, width: 220, align: 'left', formCapable: true, inlineCapable: false },
  button: { filterOperator: null, searchable: false, width: 120, align: 'center', formCapable: true, inlineCapable: true },
  selectGrid: { filterOperator: null, searchable: false, width: 150, align: 'left', formCapable: true, inlineCapable: true },
  autocomplete: { filterOperator: null, searchable: false, width: 150, align: 'left', formCapable: true, inlineCapable: false },
  profile: { filterOperator: 'contains', searchable: true, width: 200, align: 'left', formCapable: true, inlineCapable: false },
  custom: { filterOperator: null, searchable: false, width: 150, align: 'left', formCapable: true, inlineCapable: false }
}

export const capabilitiesOf = (c: MjColumn) => columnTypeRegistry[c.type]

/**
 * Build a server filter for one column from a UI value. Returns null when the
 * value cannot be expressed for that column type (e.g. text in a number column).
 */
export function filterFor(column: MjColumn, value: unknown, logic: 'and' | 'or' = 'and'): MjFilter | null {
  if (value === undefined || value === null || value === '') return null
  const caps = capabilitiesOf(column)
  const base = { columnName: column.field, logic, ...(column.path ? { columnProp: column.path } : {}) }

  switch (column.type) {
    case 'number': {
      const n = Number(value)
      if (Number.isNaN(n)) return null
      return { ...base, operator: '=', columnValue: n }
    }
    case 'select': {
      const opts = column.params && 'options' in column.params ? column.params.options : undefined
      if (opts && typeof value === 'string') {
        const hit = opts.find(o => o.text.toLowerCase() === value.toLowerCase())
        if (hit) return { ...base, operator: 'equals', columnValue: hit.value }
      }
      return { ...base, operator: 'equals', columnValue: value }
    }
    case 'date': {
      const r = value as { startDate?: Date | null; endDate?: Date | null }
      if (!r.startDate || !r.endDate) return null
      return { ...base, operator: 'between', columnValue: `${dayjs(r.startDate).format('YYYY-MM-DD')},${dayjs(r.endDate).format('YYYY-MM-DD')}` }
    }
    case 'boolean':
      return { ...base, operator: 'is', columnValue: value === true || value === 'true' }
    default:
      if (!caps.filterOperator) return null
      return { ...base, operator: caps.filterOperator, columnValue: value }
  }
}
