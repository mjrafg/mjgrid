import type { MjGridConfig } from './types'

/**
 * Derives every endpoint from `resource`. The legacy helper silently returned
 * the collection URL when a row had no id, turning "update this row" into
 * "PUT the whole collection". Here that is an error.
 */
export class MjUrlError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MjUrlError'
  }
}

const trim = (u: string) => u.replace(/\/+$/, '')

export function requireResource(config: Pick<MjGridConfig, 'resource' | 'urls'>, op: keyof NonNullable<MjGridConfig['urls']>): string {
  const explicit = config.urls?.[op]
  if (explicit) return explicit
  if (!config.resource) throw new MjUrlError(`grid has no "resource" and no urls.${op}`)
  return trim(config.resource)
}

export const mjUrls = {
  fetch: (c: MjGridConfig) => (c.urls?.fetch ? c.urls.fetch : `${requireResource(c, 'fetch')}/serverSide`),
  insert: (c: MjGridConfig) => requireResource(c, 'insert'),
  insertBulk: (c: MjGridConfig) => (c.urls?.insertBulk ? c.urls.insertBulk : `${requireResource(c, 'insertBulk')}/bulk`),
  updateBulk: (c: MjGridConfig) => (c.urls?.updateBulk ? c.urls.updateBulk : `${requireResource(c, 'updateBulk')}/bulk`),
  update: (c: MjGridConfig, id: unknown) => {
    if (id === undefined || id === null || id === '') throw new MjUrlError('update requires a row id')
    return c.urls?.update ? c.urls.update : `${requireResource(c, 'update')}/${encodeURIComponent(String(id))}`
  },
  delete: (c: MjGridConfig, id: unknown) => {
    if (id === undefined || id === null || id === '') throw new MjUrlError('delete requires a row id')
    return c.urls?.delete ? c.urls.delete : `${requireResource(c, 'delete')}/${encodeURIComponent(String(id))}`
  }
}
