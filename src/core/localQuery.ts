import type { MjFilter, MjRow, MjSort } from './types'

/** Read a possibly nested value ('vendor' + 'name', or 'vendor.name'). */
export const readPath = (row: Record<string, unknown>, path: string): unknown =>
  path.split('.').reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined), row)

const str = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'object' ? String((v as { name?: unknown; id?: unknown }).name ?? (v as { id?: unknown }).id ?? '') : String(v))
const num = (v: unknown) => (typeof v === 'number' ? v : Number(v))

/** Same operator semantics as the server-side FilterSpecification, applied in memory. */
export function matchesFilter(row: Record<string, unknown>, f: MjFilter): boolean {
  const v = readPath(row, f.columnProp ? `${f.columnName}.${f.columnProp}` : f.columnName)
  const cv = f.columnValue
  switch (f.operator) {
    case 'contains': return str(v).toLowerCase().includes(str(cv).toLowerCase())
    case 'startsWith': return str(v).toLowerCase().startsWith(str(cv).toLowerCase())
    case 'endsWith': return str(v).toLowerCase().endsWith(str(cv).toLowerCase())
    case '=': case 'equals': case 'is':
      return typeof v === 'object' && v !== null ? (v as { id?: unknown }).id === cv || str(v) === str(cv) : v === cv || str(v).toLowerCase() === str(cv).toLowerCase()
    case '!=': case 'not': return str(v) !== str(cv)
    case '>': return num(v) > num(cv)
    case '<': return num(v) < num(cv)
    case '>=': case 'afterEqual': return typeof v === 'number' ? v >= num(cv) : str(v) >= str(cv)
    case '<=': case 'beforeEqual': return typeof v === 'number' ? v <= num(cv) : str(v) <= str(cv)
    case 'after': return str(v).slice(0, 10) > str(cv)
    case 'before': return str(v).slice(0, 10) < str(cv)
    case 'between': { const [a = '', b = ''] = str(cv).split(','); const d = str(v).slice(0, 10); return d >= a && d <= b }
    case 'isEmpty': return v === null || v === undefined || v === ''
    case 'isNotEmpty': return !(v === null || v === undefined || v === '')
    case 'isAnyOf': return str(cv).split(',').map(x => x.trim()).includes(str(v))
    case 'isDate': return str(v).slice(0, 10) === str(cv)
    default: return true
  }
}

/** AND all 'and' filters, then require at least one 'or' filter to match (mirrors the backend). */
export function applyFilters<T extends Record<string, unknown>>(rows: T[], filters: MjFilter[]): T[] {
  const ands = filters.filter(f => (f.logic ?? 'and') !== 'or')
  const ors = filters.filter(f => f.logic === 'or')
  return rows.filter(r => ands.every(f => matchesFilter(r, f)) && (ors.length === 0 || ors.some(f => matchesFilter(r, f))))
}

export function applySort<T extends Record<string, unknown>>(rows: T[], sort: MjSort | null | undefined): T[] {
  if (!sort?.field) return rows
  const dir = sort.direction === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => {
    const x = readPath(a, sort.field), y = readPath(b, sort.field)
    if (x === y) return 0
    if (x === null || x === undefined) return 1
    if (y === null || y === undefined) return -1
    if (typeof x === 'number' && typeof y === 'number') return (x - y) * dir
    return str(x).localeCompare(str(y)) * dir
  })
}

export function pageOf<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = page * pageSize
  return rows.slice(start, start + pageSize)
}

export type { MjRow }
