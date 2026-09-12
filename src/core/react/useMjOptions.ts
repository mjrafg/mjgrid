import { useQuery } from '@tanstack/react-query'
import { assertOk } from '../protocol'
import type { MjOption, MjOptionSource } from '../types'
import { useMj } from './context'

const EMPTY: MjOption[] = []

type FetchedSource = Extract<MjOptionSource, { fetchUrl: string }>

export interface MjOptionsResult {
  options: MjOption[]
  isLoading: boolean
}

/**
 * Select options. One fetch per URL shared by every consumer (grid cells,
 * filter bar, dialog form ...). The legacy grid fetched per component
 * instance - six requests for one lookup table on one page.
 */
export function useMjOptions(source: MjOptionSource | undefined): MjOptionsResult {
  const { api } = useMj()
  const fetched: FetchedSource | undefined = source && 'fetchUrl' in source && source.fetchUrl ? (source as FetchedSource) : undefined
  const fetchUrl = fetched?.fetchUrl
  const valueField = fetched?.valueField ?? 'id'
  const textField = fetched?.textField ?? 'name'

  const q = useQuery({
    queryKey: ['mjgrid-options', fetchUrl, valueField, textField],
    enabled: Boolean(fetchUrl),
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<MjOption[]> => {
      const url = fetchUrl as string
      const rows = assertOk(await api.get<unknown>(url), url)
      if (!Array.isArray(rows)) return EMPTY
      return rows.map(r => {
        const rec = r as Record<string, unknown>
        return { value: rec[valueField], text: String(rec[textField] ?? rec[valueField] ?? ''), data: rec }
      })
    }
  })

  if (source && 'options' in source && source.options) return { options: source.options, isLoading: false }
  return { options: q.data ?? EMPTY, isLoading: Boolean(fetchUrl) && q.isLoading }
}
