import type { QueryClient } from '@tanstack/react-query'
import { assertOk, type MjApiClient } from '../protocol'
import type { MjColumn, MjOption } from '../types'

/** Resolve select options for every select column, sharing useMjOptions' cache. */
export async function loadOptionsByField(api: MjApiClient, queryClient: QueryClient, columns: MjColumn[]): Promise<Record<string, MjOption[]>> {
  const out: Record<string, MjOption[]> = {}
  for (const c of columns) {
    if (c.type !== 'select' || !c.params) continue
    if ('options' in c.params && c.params.options) { out[c.field] = c.params.options; continue }
    if (!('fetchUrl' in c.params) || !c.params.fetchUrl) continue
    const { fetchUrl, valueField = 'id', textField = 'name' } = c.params
    out[c.field] = await queryClient.fetchQuery({
      queryKey: ['mjgrid-options', fetchUrl, valueField, textField],
      staleTime: 5 * 60_000,
      gcTime: 5 * 60_000, // survive aggressive clients so the preview grid's useMjOptions reuses it
      queryFn: async () => {
        const rows = assertOk(await api.get<unknown>(fetchUrl), fetchUrl)
        return Array.isArray(rows) ? rows.map(r => { const rec = r as Record<string, unknown>; return { value: rec[valueField], text: String(rec[textField] ?? rec[valueField] ?? ''), data: rec } }) : []
      }
    })
  }
  return out
}
