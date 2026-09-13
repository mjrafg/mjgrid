// In-memory implementation of MjApiClient. This is the whole "backend" of the
// demo, which is the point: the grid only ever talks to this interface.
import { exportRowsToXlsx, type MjApiClient, type MjColumn, type MjEnvelope, type MjFile, type MjFilter, type MjServerSideRequest } from '@agent24/mjgrid'

type Row = Record<string, unknown> & { id: string }
const uid = () => Math.random().toString(36).slice(2, 10)
const ok = <T,>(data?: T): MjEnvelope<T> => ({ status: 200, data })
const err = (message: string): MjEnvelope<never> => ({ status: 200, error: message })

const units = [{ id: 'u-kg', name: 'Kg' }, { id: 'u-ea', name: 'EA' }, { id: 'u-l', name: 'ℓ' }]
const companies: Row[] = ['에이스식품', '베타상사', '감마유통', '델타농산', '엡실론물류'].map((name, i) => ({ id: `c${i + 1}`, code: `V${100 + i}`, name, type: i % 2 ? 'SALES' : 'PURCHASE_SALES', softDelete: false }))
const users: Row[] = [{ id: 'usr1', name: '김철수', role: 'admin' }, { id: 'usr2', name: '이영희', role: 'user' }, { id: 'usr3', name: '박민수', role: 'user' }]
const kinds = ['김치', '육수', '소스', '조림', '즉석조리식품']
const products: Row[] = Array.from({ length: 68 }, (_, i) => ({
  id: `p${i + 1}`, code: i === 3 ? 'P-LOCKED' : `EG${String(1000 + i).padStart(5, '0')}`, name: `${kinds[i % 5]} ${i + 1}호`, typeCode: `T${i % 5}`, type: kinds[i % 5],
  reportNumber: i % 3 ? `2019021${i}` : null, shelfLife: (i % 4) * 30, unit: units[i % 3], packageUnit: units[(i + 1) % 3], note: null, active: i % 7 !== 0,
  createdAt: new Date(2026, 0, 1 + (i % 28), 9, 0).toISOString(), photo: null, softDelete: false, seq: i
}))
const inventory: Row[] = [
  { id: 'i1', material: { name: '설탕', code: 'M001' }, vendor: companies[0], vendorCode: 'V100', quantity: 200, inputDate: '2026-02-25', expiryDate: '2026-08-24', seq: 0, softDelete: false },
  { id: 'i2', material: { name: '감자', code: 'M002' }, vendor: null, vendorCode: '', quantity: 100, inputDate: '2026-03-05', expiryDate: '2026-09-04', seq: 1, softDelete: false },
  { id: 'i3', material: { name: '고춧가루', code: 'M003' }, vendor: companies[2], vendorCode: 'V102', quantity: 35, inputDate: '2026-05-11', expiryDate: '2027-05-10', seq: 2, softDelete: false }
]
const shifts: Row[] = [
  { id: 's1', title: '주간조', start: '08:00:00', hours: '08:00 17:00', days: '0,1,1,1,1,1,0', addr: '서울시 강남구 테헤란로 1', mgr: users[0], note: '', owner: '김철수', ownerPhoto: null, doc: null, softDelete: false },
  { id: 's2', title: '야간조', start: '20:00:00', hours: '20:00 05:00', days: '1,0,0,0,0,0,1', addr: '부산시 해운대구', mgr: users[1], note: '주말', owner: '이영희', ownerPhoto: null, doc: null, softDelete: false }
]
const stores: Record<string, Row[]> = { '/api/products': products, '/api/companies': companies, '/api/inventory': inventory, '/api/shifts': shifts, '/api/users': users }

const get = (row: Row, path: string): unknown => path.split('.').reduce<unknown>((v, k) => (v && typeof v === 'object' ? (v as Record<string, unknown>)[k] : undefined), row)
const str = (v: unknown) => (v === null || v === undefined ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v))

function matches(row: Row, f: MjFilter): boolean {
  const v = get(row, f.columnProp ? `${f.columnName}.${f.columnProp}` : f.columnName)
  const cv = f.columnValue
  switch (f.operator) {
    case 'contains': return str(v).toLowerCase().includes(String(cv).toLowerCase())
    case 'startsWith': return str(v).toLowerCase().startsWith(String(cv).toLowerCase())
    case 'endsWith': return str(v).toLowerCase().endsWith(String(cv).toLowerCase())
    case '=': case 'equals': case 'is': return typeof v === 'object' && v !== null ? (v as { id?: unknown }).id === cv : v === cv || str(v) === str(cv)
    case '!=': case 'not': return str(v) !== str(cv)
    case '>': return Number(v) > Number(cv)
    case '<': return Number(v) < Number(cv)
    case '>=': case 'afterEqual': return str(v) >= str(cv)
    case '<=': case 'beforeEqual': return str(v) <= str(cv)
    case 'after': return str(v).slice(0, 10) > String(cv)
    case 'before': return str(v).slice(0, 10) < String(cv)
    case 'between': { const [a, b] = String(cv).split(','); const d = str(v).slice(0, 10); return d >= (a ?? '') && d <= (b ?? '') }
    case 'isEmpty': return v === null || v === undefined || v === ''
    case 'isNotEmpty': return !(v === null || v === undefined || v === '')
    case 'isAnyOf': return String(cv).split(',').map(x => x.trim()).includes(str(v))
    default: return true
  }
}

function serverSide(rows: Row[], req: MjServerSideRequest, softDeleteOnly: boolean) {
  let out = rows.filter(r => !softDeleteOnly || !r.softDelete)
  const ands = req.filters.filter(f => (f.logic ?? 'and') !== 'or')
  const ors = req.filters.filter(f => f.logic === 'or')
  out = out.filter(r => ands.every(f => matches(r, f)) && (ors.length === 0 || ors.some(f => matches(r, f))))
  const col = req.orderColumn || 'createdAt'
  out = [...out].sort((a, b) => { const x = str(get(a, col)), y = str(get(b, col)); const n = Number(x) - Number(y); const c = Number.isNaN(n) ? x.localeCompare(y) : n; return req.orderSort === 'desc' ? -c : c })
  const start = req.pageNum * req.pageSize
  return { content: out.slice(start, start + req.pageSize), totalElements: out.length, all: out }
}

export type ApiLogEntry = { method: string; url: string; at: number }
const listeners = new Set<(log: ApiLogEntry[]) => void>()
export const apiLog: ApiLogEntry[] = []
export const subscribeLog = (fn: (log: ApiLogEntry[]) => void) => { listeners.add(fn); return () => { listeners.delete(fn) } }
const log = (method: string, url: string) => { apiLog.push({ method, url, at: Date.now() }); listeners.forEach(fn => fn([...apiLog])) }
const delay = () => new Promise(r => setTimeout(r, 120))

function resourceOf(url: string): { store: Row[]; base: string; rest: string } | null {
  const base = Object.keys(stores).find(b => url === b || url.startsWith(b + '/') || url.startsWith(b + '?'))
  if (!base) return null
  return { store: stores[base]!, base, rest: url.slice(base.length) }
}

export const memoryApi: MjApiClient = {
  async get<T>(url: string): Promise<MjEnvelope<T>> {
    log('GET', url); await delay()
    if (url === '/api/product/unit') return ok(units as unknown as T)
    const m = url.match(/^\/api\/products\/check\/code\/([^/]*)\/([^/]*)$/)
    if (m) { const value = decodeURIComponent(m[1]!), original = decodeURIComponent(m[2]!); return ok((products.some(p => p.code === value && value !== original)) as unknown as T) }
    const r = resourceOf(url)
    if (r && r.rest === '') return ok(r.store.filter(x => !x.softDelete) as unknown as T)
    return { status: 404, error: `no route GET ${url}` }
  },
  async post<T>(url: string, body: unknown, headers?: Record<string, string>): Promise<MjEnvelope<T>> {
    log('POST', url); await delay()
    const r = resourceOf(url); if (!r) return { status: 404, error: `no route POST ${url}` }
    if (r.rest === '/serverSide') { const p = serverSide(r.store, body as MjServerSideRequest, headers?.softDelete === 'true'); return ok({ content: p.content, totalElements: p.totalElements } as unknown as T) }
    if (r.rest === '/bulk') { const rows = (body as { rows: Row[] }).rows.map(x => ({ ...x, id: uid(), softDelete: false, createdAt: new Date().toISOString() })); r.store.push(...rows); return ok(rows as unknown as T) }
    if (r.rest === '') { const row = { ...(body as Row), id: uid(), softDelete: false, createdAt: new Date().toISOString() }; r.store.push(row); return ok(row as unknown as T) }
    return { status: 404, error: `no route POST ${url}` }
  },
  async put<T>(url: string, body?: unknown): Promise<MjEnvelope<T>> {
    log('PUT', url); await delay()
    const r = resourceOf(url); if (!r) return { status: 404, error: `no route PUT ${url}` }
    if (r.rest === '/bulk') { for (const x of (body as { rows: Row[] }).rows) { const i = r.store.findIndex(y => y.id === x.id); if (i >= 0) r.store[i] = { ...r.store[i], ...x } } return ok() }
    const id = decodeURIComponent(r.rest.slice(1)); const i = r.store.findIndex(y => y.id === id)
    if (i < 0) return { status: 404, error: 'not found' }
    r.store[i] = { ...r.store[i]!, ...(body as Row), id }; return ok(r.store[i] as unknown as T)
  },
  async delete<T>(url: string, headers?: Record<string, string>): Promise<MjEnvelope<T>> {
    log('DELETE', url); await delay()
    const r = resourceOf(url); if (!r) return { status: 404, error: `no route DELETE ${url}` }
    const id = decodeURIComponent(r.rest.slice(1)); const i = r.store.findIndex(y => y.id === id)
    if (i < 0) return { status: 404, error: 'not found' }
    if (r.store[i]!.code === 'P-LOCKED') return err('현재 시스템내에서 사용중인 정보로 삭제가 불가능합니다. (demo: FK violation, returned as HTTP 200 + error)')
    if (headers?.softDelete === 'true') r.store[i] = { ...r.store[i]!, softDelete: true }; else r.store.splice(i, 1)
    return ok()
  },
  async downloadPost(url: string, body: unknown): Promise<Blob> {
    log('DOWNLOAD', url); await delay()
    const r = resourceOf(url); const req = body as MjServerSideRequest
    const cols = req.gridSettings.columns.map(c => ({ field: c.field, headerName: c.headerName, type: 'string', width: c.width } as MjColumn))
    const rows = r && !req.exportExcelExample ? serverSide(r.store, req, true).all : []
    const buf = exportRowsToXlsx(cols, rows, (_c, v) => (typeof v === 'object' && v !== null ? String((v as { name?: unknown }).name ?? '') : v === null || v === undefined ? '' : String(v)))
    return new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  },
  async upload<T>(url: string, form: FormData): Promise<MjEnvelope<T>> {
    log('UPLOAD', url); await delay()
    const file = form.get('file') as File
    const isImage = /^image\//.test(file.type)
    const thumbnailPath = isImage ? await new Promise<string>(res => { const fr = new FileReader(); fr.onload = () => res(String(fr.result)); fr.readAsDataURL(file) }) : undefined
    const stored: MjFile = { id: uid(), originalName: file.name, savedName: `${uid()}_${file.name}`, size: file.size, type: String(form.get('type') ?? 'FILE'), isDraw: form.get('isDraw') === 'true', thumbnailPath }
    return ok(stored as unknown as T)
  }
}
