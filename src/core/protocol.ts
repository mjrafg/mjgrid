import type { MjColumn, MjFilter, MjGridConfig, MjSort } from './types'

/** Wire format of POST {resource}/serverSide. Mirrors the backend's ServerSideRequest. */
export interface MjServerSideRequest {
  pageNum: number
  pageSize: number
  orderColumn: string
  orderSort: 'asc' | 'desc'
  filters: MjFilter[]
  exportExcel: boolean
  exportExcelExample: boolean
  gridSettings: { columns: MjWireColumn[] }
}

/**
 * The only column facts the server needs (Excel headers + layout). The legacy
 * grid serialised the entire props object - every column definition, callbacks
 * included - on every fetch.
 */
export interface MjWireColumn {
  field: string
  headerName: string
  width?: number
  hideOnExcel?: boolean
  excelExampleValue?: string
}

export interface MjServerSidePage<T = Record<string, unknown>> {
  content: T[]
  totalElements: number
  totalPages?: number
  number?: number
  size?: number
}

/** Response envelope used by every endpoint: { data, status, error?, message? } */
export interface MjEnvelope<T> {
  data?: T
  status: number
  error?: string
  message?: string
}

export interface MjQueryState {
  page: number
  pageSize: number
  sort: MjSort
  filters: MjFilter[]
  search?: string
}

export const toWireColumn = (c: MjColumn): MjWireColumn => ({
  field: c.field,
  headerName: c.headerName,
  ...(c.width !== undefined && { width: c.width }),
  ...(c.hideOnExcel && { hideOnExcel: true }),
  ...(c.excelExampleValue !== undefined && { excelExampleValue: c.excelExampleValue })
})

/** Pure: no React, no IO. Merges defaultFilters that are not already present. */
export function buildServerSideRequest(
  config: MjGridConfig,
  state: MjQueryState,
  opts: { exportExcel?: boolean; exportExcelExample?: boolean; all?: boolean } = {}
): MjServerSideRequest {
  const present = new Set(state.filters.map(f => `${f.columnName}|${f.columnProp ?? ''}`))
  const defaults = (config.defaultFilters ?? []).filter(f => !present.has(`${f.columnName}|${f.columnProp ?? ''}`))
  const exporting = Boolean(opts.exportExcel || opts.exportExcelExample)

  return {
    pageNum: opts.all || exporting ? 0 : state.page,
    pageSize: opts.all || exporting ? 1_000_000 : state.pageSize,
    orderColumn: state.sort.field,
    orderSort: state.sort.direction,
    filters: [...state.filters, ...defaults],
    exportExcel: Boolean(opts.exportExcel),
    exportExcelExample: Boolean(opts.exportExcelExample),
    gridSettings: { columns: config.columns.map(toWireColumn) }
  }
}

/**
 * The host application supplies transport (auth headers, base URL, interceptors).
 * The grid never touches tokens - that is why it can be installed anywhere.
 */
export interface MjApiClient {
  get<T>(url: string, headers?: Record<string, string>): Promise<MjEnvelope<T>>
  post<T>(url: string, body: unknown, headers?: Record<string, string>): Promise<MjEnvelope<T>>
  put<T>(url: string, body?: unknown, headers?: Record<string, string>): Promise<MjEnvelope<T>>
  delete<T>(url: string, headers?: Record<string, string>): Promise<MjEnvelope<T>>
  /** POST that resolves to a Blob for Excel export */
  downloadPost(url: string, body: unknown, headers?: Record<string, string>): Promise<Blob>
  /** multipart upload */
  upload<T>(url: string, form: FormData): Promise<MjEnvelope<T>>
}

export const softDeleteHeader = (config: MjGridConfig) => ({ softDelete: String(Boolean(config.softDelete)) })

export class MjApiError extends Error {
  constructor(public readonly status: number, message: string, public readonly url: string) {
    super(message)
    this.name = 'MjApiError'
  }
}

/**
 * The backend returns HTTP 200 with `{ error: "..." }` in the body when a
 * write fails (e.g. FK violation on delete). Treat that as a failure here so
 * no caller can show a success toast over an error.
 */
export function assertOk<T>(env: MjEnvelope<T>, url: string): T {
  if (env.status !== 200 || env.error) {
    throw new MjApiError(env.status, env.error ?? env.message ?? `request failed (${env.status})`, url)
  }
  return env.data as T
}
