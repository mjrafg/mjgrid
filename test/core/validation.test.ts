import { describe, expect, it } from 'vitest'
import { applyMask, matchesMask, validateField, validateRows, fillUrlTemplate, enMessages } from '../../src/core'
import type { MjColumn, MjRow } from '../../src/core'

const col = (over: Partial<MjColumn> & Pick<MjColumn, 'type'>): MjColumn =>
  ({ field: 'f', headerName: 'Field', ...over }) as MjColumn

describe('validateField', () => {
  it('required: empty string, null, undefined, whitespace and [] all fail', async () => {
    const c = col({ type: 'string', rules: [{ required: true }] })
    for (const v of ['', null, undefined, '   ', []]) {
      expect(await validateField(c, { f: v }, { messages: enMessages })).toEqual(['Field is required.'])
    }
  })

  it('required: 0 and false are valid values, not missing', async () => {
    const c = col({ type: 'number', rules: [{ required: true }] })
    expect(await validateField(c, { f: 0 })).toBeNull()
    const b = col({ type: 'boolean', rules: [{ required: true }] })
    expect(await validateField(b, { f: false })).toBeNull()
  })

  it('required select bound to object with null valueField is missing', async () => {
    const c = col({ type: 'select', rules: [{ required: true }], params: { fetchUrl: '/x', valueField: 'id' } })
    expect(await validateField(c, { f: { id: null } }, { messages: enMessages })).toEqual(['Field is required.'])
    expect(await validateField(c, { f: { id: 'abc' } })).toBeNull()
  })

  it('min/max/size produce the right message and compare numerically (not as strings)', async () => {
    const c = col({ type: 'number', rules: [{ min: 5, max: 10 }] })
    expect(await validateField(c, { f: 3 }, { messages: enMessages })).toEqual(['Field must be between 5 and 10.'])
    expect(await validateField(c, { f: '9' })).toBeNull() // "9" < "10" as strings would be wrong
    expect(await validateField(c, { f: 7 })).toBeNull()
    const onlyMin = col({ type: 'number', rules: [{ min: 5 }] })
    expect(await validateField(onlyMin, { f: 1 }, { messages: enMessages })).toEqual(['Field must be greater than 5.'])
  })

  it('minLength/maxLength', async () => {
    const c = col({ type: 'string', rules: [{ minLength: 3, maxLength: 5 }] })
    expect(await validateField(c, { f: 'ab' }, { messages: enMessages })).toEqual(['Field must be 3-5 characters.'])
    expect(await validateField(c, { f: 'abcdef' })).not.toBeNull()
    expect(await validateField(c, { f: 'abcd' })).toBeNull()
  })

  it('email, password, passwordRepeat', async () => {
    expect(await validateField(col({ type: 'string', rules: [{ email: true }] }), { f: 'nope' })).not.toBeNull()
    expect(await validateField(col({ type: 'string', rules: [{ email: true }] }), { f: 'a@b.co' })).toBeNull()
    expect(await validateField(col({ type: 'string', rules: [{ password: true }] }), { f: 'abcdef' })).not.toBeNull()
    expect(await validateField(col({ type: 'string', rules: [{ password: true }] }), { f: 'abc123' })).toBeNull()
    const rep = col({ type: 'string', rules: [{ passwordRepeat: true }], params: { mainPasswordField: 'pw' } })
    expect(await validateField(rep, { f: 'x', pw: 'y' })).not.toBeNull()
    expect(await validateField(rep, { f: 'x', pw: 'x' })).toBeNull()
  })

  it('mask', async () => {
    const c = col({ type: 'string', rules: [{ mask: '000-0000' }] })
    expect(await validateField(c, { f: '123-4567' })).toBeNull()
    expect(await validateField(c, { f: '12a-4567' })).not.toBeNull()
  })

  it('rule.message overrides generated text', async () => {
    const c = col({ type: 'string', rules: [{ required: true, message: 'custom!' }] })
    expect(await validateField(c, { f: '' })).toEqual(['custom!'])
  })

  it('custom validate runs and a throwing validator REJECTS instead of hanging', async () => {
    const ok = col({ type: 'string', rules: [{ validate: async () => 'bad' }] })
    expect(await validateField(ok, { f: 'x' })).toEqual(['bad'])
    const boom = col({ type: 'string', rules: [{ validate: async () => { throw new Error('kaboom') } }] })
    await expect(validateField(boom, { f: 'x' })).rejects.toThrow('kaboom')
  })

  it('other rules are skipped when required fails, and skipped on empty optional values', async () => {
    const c = col({ type: 'string', rules: [{ required: true, minLength: 3 }] })
    expect(await validateField(c, { f: '' }, { messages: enMessages })).toEqual(['Field is required.'])
    const opt = col({ type: 'string', rules: [{ minLength: 3 }] })
    expect(await validateField(opt, { f: '' })).toBeNull()
  })
})

describe('validateRows', () => {
  const cols: MjColumn[] = [
    { field: 'name', headerName: 'Name', type: 'string', rules: [{ required: true }] },
    { field: 'vendor', headerName: 'Vendor', type: 'selectGrid', rules: [{ duplicate: false }], params: { grid: { name: 'v', columns: [] } } }
  ]
  it('skips none/delete rows and reports rowIndex + field', async () => {
    const rows: MjRow[] = [
      { id: 'a', name: '', __state: 'none' },
      { id: 'b', name: '', __state: 'update' },
      { id: 'c', name: '', __state: 'delete' }
    ]
    const errs = await validateRows(rows, cols, { messages: enMessages })
    expect(errs).toEqual([{ rowId: 'b', rowIndex: 1, field: 'name', message: 'Name is required.' }])
  })
  it('duplicate:false flags the same reference id used twice', async () => {
    const rows: MjRow[] = [
      { id: 'a', name: 'x', vendor: { id: 'V1', name: 'Acme' }, __state: 'insert' },
      { id: 'b', name: 'y', vendor: { id: 'V1', name: 'Acme' }, __state: 'insert' },
      { id: 'c', name: 'z', vendor: { id: 'V2', name: 'Other' }, __state: 'insert' }
    ]
    const errs = await validateRows(rows, cols, { messages: enMessages })
    expect(errs.map(e => e.rowId)).toEqual(['a', 'b'])
    expect(errs[0]!.message).toBe('Acme is a duplicate Vendor.')
  })
})

describe('masks', () => {
  it('applyMask types digits into slots and inserts literals', () => {
    expect(applyMask('000-0000', '1234567')).toBe('123-4567')
    expect(applyMask('000-0000', '123-4567')).toBe('123-4567')
    expect(applyMask('000-0000', '12')).toBe('12')
    expect(applyMask('000-0000', '12a')).toBe('12')
  })
  it('matchesMask', () => {
    expect(matchesMask('010-1234', '000-0000')).toBe(true)
    expect(matchesMask('0101234', '000-0000')).toBe(false)
  })
})

describe('fillUrlTemplate', () => {
  it('replaces tokens and URL-encodes', () => {
    expect(fillUrlTemplate('/api/p/check/{value}/{code}', { value: 'a b', code: 'X/1' })).toBe('/api/p/check/a%20b/X%2F1')
    expect(fillUrlTemplate('/x/{missing}', {})).toBe('/x/')
  })
})
