import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useMemo, useState } from 'react'
import { buildServerSideRequest, assertOk, softDeleteHeader, type MjQueryState, type MjServerSidePage } from '../protocol'
import { capabilitiesOf, filterFor } from '../registry'
import type { MjFilter, MjGridConfig, MjRow, MjSort } from '../types'
import { mjUrls } from '../url'
import { useMj } from './context'

export const DEFAULT_PAGE_SIZE = 12

export const mjQueryKey = (config: MjGridConfig) => ['mjgrid', config.resource ?? config.urls?.fetch ?? config.name] as const

export interface UseMjQueryOptions {
  enabled?: boolean
}

/**
 * Server state for one grid. Exactly one `pageSize` exists here; the legacy
 * grid computed one from window height and hard-coded another (12), so the
 * page count and the rows per page disagreed.
 */
export function useMjQuery(config: MjGridConfig, opts: UseMjQueryOptions = {}) {
  const { api } = useMj()
  const queryClient = useQueryClient()
  const isServer = Boolean(config.resource || config.urls?.fetch)

  const [page, setPageState] = useState(0)
  const [pageSize, setPageSizeState] = useState(config.pageSize ?? DEFAULT_PAGE_SIZE)
  const [sort, setSortState] = useState<MjSort>(config.defaultSort ?? { field: 'createdAt', direction: 'asc' })
  const [filters, setFiltersState] = useState<MjFilter[]>([])
  const [search, setSearchState] = useState('')

  const state: MjQueryState = useMemo(() => ({ page, pageSize, sort, filters, search }), [page, pageSize, sort, filters, search])
  const request = useMemo(() => (isServer ? buildServerSideRequest(config, state) : null), [config, state, isServer])

  const query = useQuery({
    queryKey: [...mjQueryKey(config), request],
    enabled: isServer && opts.enabled !== false,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const url = mjUrls.fetch(config)
      const env = await api.post<MjServerSidePage>(url, request, softDeleteHeader(config))
      let pageData = assertOk(env, url)
      if (config.hooks?.afterFetch) {
        const r = await config.hooks.afterFetch(pageData.content, pageData.totalElements)
        pageData = { ...pageData, content: r.rows, totalElements: r.total }
      }
      return pageData
    }
  })

  // client-side mode: page the static rows locally
  const clientPage = useMemo(() => {
    if (isServer) return null
    const all = (config.rows ?? []) as MjRow[]
    const start = page * pageSize
    return { content: all.slice(start, start + pageSize), totalElements: all.length }
  }, [isServer, config.rows, page, pageSize])

  const data = isServer ? query.data : clientPage
  const rows = useMemo<MjRow[]>(() => (data?.content ?? []).map(r => ({ ...(r as MjRow), __state: 'none' as const })), [data])
  const total = data?.totalElements ?? 0
  const pageCount = Math.max(1, Math.ceil(total / pageSize))

  const setPage = useCallback((p: number) => setPageState(Math.max(0, p)), [])
  const setPageSize = useCallback((s: number) => { setPageSizeState(Math.max(1, s)); setPageState(0) }, [])
  const setSort = useCallback((s: MjSort | null) => { setSortState(s ?? config.defaultSort ?? { field: 'createdAt', direction: 'asc' }); setPageState(0) }, [config.defaultSort])
  const setFilters = useCallback((f: MjFilter[]) => { setFiltersState(f); setPageState(0); config.hooks?.onFilterChange?.(f) }, [config.hooks])

  /** Free-text search across every searchable column, OR-ed, plus config.extraFilters. */
  const setSearch = useCallback((term: string) => {
    setSearchState(term)
    const derived: MjFilter[] = []
    if (term) {
      for (const c of config.columns) {
        if (c.formOnly || c.filterable === false || !capabilitiesOf(c).searchable) continue
        if (c.getFilters) { derived.push(...c.getFilters(term)); continue }
        const f = filterFor(c, term, 'or')
        if (f) derived.push(f)
      }
      const extra = typeof config.extraFilters === 'function' ? config.extraFilters(term) : config.extraFilters ?? []
      derived.push(...extra.map(f => ({ ...f, columnValue: term })))
    }
    setFilters(derived)
  }, [config, setFilters])

  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: mjQueryKey(config) }), [queryClient, config])

  /** All rows matching the current filters/sort, unpaged. */
  const fetchAll = useCallback(async (): Promise<MjRow[]> => {
    if (!isServer) return (config.rows ?? []) as MjRow[]
    const url = mjUrls.fetch(config)
    const env = await api.post<MjServerSidePage>(url, buildServerSideRequest(config, state, { all: true }), softDeleteHeader(config))
    return assertOk(env, url).content as MjRow[]
  }, [api, config, state, isServer])

  const exportExcel = useCallback(async (example = false): Promise<Blob> => {
    const url = mjUrls.fetch(config)
    const body = buildServerSideRequest(config, state, example ? { exportExcelExample: true } : { exportExcel: true })
    return api.downloadPost(url, body, softDeleteHeader(config))
  }, [api, config, state])

  return {
    rows, total, pageCount,
    isLoading: isServer ? query.isLoading : false,
    isFetching: isServer ? query.isFetching : false,
    error: isServer ? (query.error as Error | null) : null,
    page, setPage, pageSize, setPageSize, sort, setSort, filters, setFilters, search, setSearch,
    refresh, fetchAll, exportExcel, request
  }
}

export type MjQueryResult = ReturnType<typeof useMjQuery>
