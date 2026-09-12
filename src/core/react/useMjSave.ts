import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import { assertOk, softDeleteHeader } from '../protocol'
import { capabilitiesOf } from '../registry'
import type { MjColumn, MjGridConfig, MjRow } from '../types'
import { mjUrls } from '../url'
import { validateRows } from '../validation'
import { useMj } from './context'
import { mjQueryKey } from './useMjQuery'

/** Apply registry encoders and drop client-only fields before sending. */
export function toWireRow(row: MjRow, columns: MjColumn[]): Record<string, unknown> {
  const { __state: _s, ...rest } = row
  const out: Record<string, unknown> = { ...rest }
  for (const c of columns) {
    const enc = capabilitiesOf(c).encode
    if (enc && c.field in out) out[c.field] = enc(out[c.field])
  }
  return out
}

export interface SaveBatchResult {
  inserted: Record<string, unknown>[]
  updated: Record<string, unknown>[]
  deleted: string[]
}

export class MjValidationError extends Error {
  constructor(public readonly errors: import('../types').MjRowError[]) {
    super(`${errors.length} validation error(s)`)
    this.name = 'MjValidationError'
  }
}

/**
 * Writes. Every call either resolves with what was written or throws
 * (MjValidationError | MjApiError). The legacy inline save assigned the
 * response to an unused variable and showed a success toast unconditionally.
 */
export function useMjSave(config: MjGridConfig) {
  const { api, messages } = useMj()
  const queryClient = useQueryClient()
  const invalidate = useCallback(() => queryClient.invalidateQueries({ queryKey: mjQueryKey(config) }), [queryClient, config])

  const batch = useMutation({
    mutationFn: async (rows: MjRow[]): Promise<SaveBatchResult> => {
      const errors = await validateRows(rows, config.columns, { messages })
      if (errors.length) throw new MjValidationError(errors)

      let live = rows.filter(r => r.__state && r.__state !== 'none')
      if (config.hooks?.onBeforeSave) live = (await config.hooks.onBeforeSave(live, rows)) as MjRow[]

      const inserts = live.filter(r => r.__state === 'insert').map(r => toWireRow(r, config.columns))
      const updates = live.filter(r => r.__state === 'update').map(r => toWireRow(r, config.columns))
      const deletes = live.filter(r => r.__state === 'delete').map(r => r.id)
      const result: SaveBatchResult = { inserted: [], updated: [], deleted: [] }

      if (inserts.length) {
        const url = mjUrls.insertBulk(config)
        assertOk(await api.post(url, { rows: inserts }), url)
        result.inserted = inserts
      }
      if (updates.length) {
        const url = mjUrls.updateBulk(config)
        assertOk(await api.put(url, { rows: updates }), url)
        result.updated = updates
      }
      if (deletes.length) {
        await Promise.all(deletes.map(async id => {
          const url = mjUrls.delete(config, id)
          assertOk(await api.delete(url, softDeleteHeader(config)), url)
        }))
        result.deleted = deletes
      }
      return result
    },
    onSuccess: (r, rows) => {
      if (r.inserted.length) config.hooks?.onDataInserted?.(r.inserted, rows)
      if (r.updated.length) config.hooks?.onDataUpdated?.(r.updated, rows)
      if (r.deleted.length) config.hooks?.onDataDeleted?.(rows.filter(x => r.deleted.includes(x.id)), rows)
      void invalidate()
    }
  })

  const one = useMutation({
    mutationFn: async ({ row, mode }: { row: Record<string, unknown>; mode: 'insert' | 'update' }) => {
      let data = toWireRow(row as MjRow, config.columns)
      if (config.hooks?.onBeforeSaveSingle) data = await config.hooks.onBeforeSaveSingle(data)
      const url = mode === 'insert' ? mjUrls.insert(config) : mjUrls.update(config, row.id)
      const env = mode === 'insert' ? await api.post<Record<string, unknown>>(url, data) : await api.put<Record<string, unknown>>(url, data)
      return { mode, saved: assertOk(env, url) }
    },
    onSuccess: ({ mode, saved }) => { if (mode === 'insert') config.hooks?.onInserted?.(saved); void invalidate() }
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const url = mjUrls.delete(config, id)
      assertOk(await api.delete(url, softDeleteHeader(config)), url)
      return id
    },
    onSuccess: () => void invalidate()
  })

  return {
    saveBatch: batch.mutateAsync,
    saveOne: one.mutateAsync,
    deleteOne: remove.mutateAsync,
    isSaving: batch.isPending || one.isPending || remove.isPending
  }
}
