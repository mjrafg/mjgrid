import type { MjColumn, MjRow, MjRowError, MjRule } from './types'
import { interpolate, koMessages, type MjMessages } from './messages'

const isEmpty = (v: unknown): boolean =>
  v === undefined || v === null || v === '' || (typeof v === 'string' && v.trim() === '') || (Array.isArray(v) && v.length === 0)

/** '0' = digit, anything else = literal that must match exactly. */
export function matchesMask(input: string, mask: string): boolean {
  if (input.length !== mask.length) return false
  for (let i = 0; i < mask.length; i++) {
    const m = mask[i]
    const c = input[i] ?? ''
    if (m === '0' ? !/^\d$/.test(c) : m !== c) return false
  }
  return true
}

/** Progressive mask: types digits into '0' slots and inserts literals. Stops at the first non-digit. */
export function applyMask(mask: string, input: string): string {
  let out = ''
  let i = 0
  for (const m of mask) {
    if (i >= input.length) break
    if (m === '0') {
      if (!/^\d$/.test(input[i] ?? '')) break
      out += input[i]
      i++
    } else {
      out += m
      if (input[i] === m) i++
    }
  }
  return out
}

export const isValidPassword = (p: string) => /^(?=.*[^a-zA-Z])(?=.*[a-zA-Z]).{6,20}$/.test(p)
export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e.toLowerCase())

export interface ValidateOptions {
  messages?: MjMessages
}

/**
 * Validates one field of one row against the column's rules.
 * Returns null when valid, otherwise every failing message.
 *
 * Plain async function. The legacy version wrapped an async executor in
 * `new Promise(...)`, so a throwing custom validator left the promise pending
 * forever and froze the save button.
 */
export async function validateField(
  column: MjColumn,
  row: Record<string, unknown>,
  opts: ValidateOptions = {}
): Promise<string[] | null> {
  const msgs = opts.messages ?? koMessages
  const value = row[column.field]
  const base = { label: column.headerName, value }
  const out: string[] = []

  if (column.type === 'date' && typeof value === 'string' && value.toLowerCase() === 'invalid date') {
    out.push(interpolate(msgs.invalidDate, base))
    return out
  }

  for (const rule of column.rules ?? []) {
    const vars = { ...base, ...rule }
    const say = (key: keyof MjMessages) => out.push(rule.message ?? interpolate(msgs[key], vars))

    if (rule.required && isRequiredMissing(value, column)) {
      say('required')
      continue // the other checks presuppose a value
    }
    if (isEmpty(value)) continue

    const n = typeof value === 'number' ? value : Number(value)
    const numeric = typeof value === 'number' || (typeof value === 'string' && value !== '' && !Number.isNaN(n))

    if (numeric && ((rule.min !== undefined && n < rule.min) || (rule.max !== undefined && n > rule.max))) {
      say(rule.min !== undefined && rule.max !== undefined ? 'size' : rule.min !== undefined ? 'min' : 'max')
    }
    if (numeric && ((rule.minEqual !== undefined && n <= rule.minEqual) || (rule.maxEqual !== undefined && n >= rule.maxEqual))) {
      say(rule.minEqual !== undefined && rule.maxEqual !== undefined ? 'sizeEqual' : rule.minEqual !== undefined ? 'minEqual' : 'maxEqual')
    }
    if (typeof value === 'string' && ((rule.minLength !== undefined && value.length < rule.minLength) || (rule.maxLength !== undefined && value.length > rule.maxLength))) {
      say('length')
    }
    if (rule.password && typeof value === 'string' && !isValidPassword(value)) say('password')
    if (rule.email && typeof value === 'string' && !isValidEmail(value)) say('email')
    if (rule.passwordRepeat && column.type === 'string' && column.params?.mainPasswordField) {
      if (value !== row[column.params.mainPasswordField]) say('passwordRepeat')
    }
    if (rule.mask && typeof value === 'string' && !matchesMask(value, rule.mask)) say('mask')
    if (rule.validate) {
      const r = await rule.validate(row)
      if (r) out.push(r)
    }
  }

  return out.length ? out : null
}

function isRequiredMissing(value: unknown, column: MjColumn): boolean {
  if (isEmpty(value)) return true
  // a select bound to an object whose valueField is null counts as empty
  if (column.type === 'select' && typeof value === 'object' && value !== null && 'valueField' in (column.params ?? {})) {
    const vf = (column.params as { valueField?: string }).valueField
    if (vf) {
      const inner = (value as Record<string, unknown>)[vf]
      return inner === null || inner === undefined
    }
  }
  return false
}

export const duplicateMessage = (column: MjColumn, value: unknown, msgs: MjMessages = koMessages) =>
  interpolate(msgs.duplicate, { label: column.headerName, value })

export const availableMessage = (column: MjColumn, value: unknown, msgs: MjMessages = koMessages) =>
  interpolate(msgs.notDuplicate, { label: column.headerName, value })

/**
 * Validates a batch (inline / Excel import). Rows in state 'none' or 'delete'
 * are skipped. Also enforces `duplicate: false` across the batch.
 */
export async function validateRows(
  rows: MjRow[],
  columns: MjColumn[],
  opts: ValidateOptions = {}
): Promise<MjRowError[]> {
  const errors: MjRowError[] = []
  const msgs = opts.messages ?? koMessages
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]!
    if (row.__state === 'none' || row.__state === 'delete') continue
    for (const column of columns) {
      const msgsFor = await validateField(column, row, { messages: msgs })
      if (msgsFor) {
        for (const message of msgsFor) errors.push({ rowId: row.id, rowIndex, field: column.field, message })
        continue
      }
      const noDup = column.rules?.some(r => r.duplicate === false)
      if (noDup) {
        const v = row[column.field]
        const key = typeof v === 'object' && v !== null && 'id' in v ? (v as { id: unknown }).id : v
        if (key !== undefined && key !== null) {
          const clash = rows.some((o, i) => {
            if (i === rowIndex || o.__state === 'delete') return false
            const ov = o[column.field]
            const ok = typeof ov === 'object' && ov !== null && 'id' in ov ? (ov as { id: unknown }).id : ov
            return ok === key
          })
          if (clash) {
            const shown = typeof v === 'object' && v !== null && 'name' in v ? (v as { name: unknown }).name : v
            errors.push({ rowId: row.id, rowIndex, field: column.field, message: duplicateMessage(column, shown, msgs) })
          }
        }
      }
    }
  }
  return errors
}

/** Replace `{key}` tokens in a URL template from a row, URL-encoding each value. */
export function fillUrlTemplate(template: string, row: Record<string, unknown>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => encodeURIComponent(String(row[k] ?? '')))
}

export type { MjRule }
