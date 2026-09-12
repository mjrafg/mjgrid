import type { MjApiClient, MjEnvelope } from '../../../src/core'

export interface Call { method: string; url: string; body?: unknown; headers?: Record<string, string> }

/** Deterministic in-memory API: script responses per (method, url prefix), record every call. */
export function fakeApi() {
  const calls: Call[] = []
  const scripts: { method: string; match: (u: string) => boolean; reply: (c: Call) => MjEnvelope<unknown> }[] = []
  const on = (method: string, urlOrPrefix: string | RegExp, reply: MjEnvelope<unknown> | ((c: Call) => MjEnvelope<unknown>)) => {
    const match = (u: string) => (urlOrPrefix instanceof RegExp ? urlOrPrefix.test(u) : u.startsWith(urlOrPrefix))
    scripts.push({ method, match, reply: typeof reply === 'function' ? reply : () => reply })
  }
  const run = (c: Call) => {
    calls.push(c)
    const s = scripts.find(x => x.method === c.method && x.match(c.url))
    if (!s) return { status: 404, error: `no script for ${c.method} ${c.url}` }
    return s.reply(c)
  }
  const api: MjApiClient = {
    get: async <T,>(url: string, headers?: Record<string, string>) => run({ method: 'GET', url, headers }) as MjEnvelope<T>,
    post: async <T,>(url: string, body: unknown, headers?: Record<string, string>) => run({ method: 'POST', url, body, headers }) as MjEnvelope<T>,
    put: async <T,>(url: string, body?: unknown, headers?: Record<string, string>) => run({ method: 'PUT', url, body, headers }) as MjEnvelope<T>,
    delete: async <T,>(url: string, headers?: Record<string, string>) => run({ method: 'DELETE', url, headers }) as MjEnvelope<T>,
    downloadPost: async (url: string, body: unknown, headers?: Record<string, string>) => { calls.push({ method: 'DOWNLOAD', url, body, headers }); return new Blob(['xlsx']) },
    upload: async <T,>(url: string, _form: FormData) => run({ method: 'UPLOAD', url }) as MjEnvelope<T>
  }
  return { api, calls, on, count: (method: string, prefix: string) => calls.filter(c => c.method === method && c.url.startsWith(prefix)).length }
}
