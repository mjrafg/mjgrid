import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { MjApiClient } from '../protocol'
import type { MjMobileOptions } from '../types'
import { koMessages, type MjMessages } from '../messages'
import { koLabels, type MjLabels } from '../labels'

/** Host-supplied notifications. Keeps react-hot-toast (or any other) out of the core. */
export interface MjToast {
  success: (message: string) => void
  error: (message: string) => void
}

/** Where files go. Defaults match the HACCP backend; override per project. */
export interface MjFileEndpoints {
  uploadUrl: string
  /** build a download URL for a stored file */
  downloadUrl: (file: { type?: string; savedName?: string }) => string
  /** absolute/relative URL for an image thumbnail path returned by the server */
  imageUrl: (path: string) => string
}

export const defaultFileEndpoints: MjFileEndpoints = {
  uploadUrl: '/api/file/upload',
  downloadUrl: f => `/api/file/download?type=${encodeURIComponent(f.type ?? 'FILE')}&fileName=${encodeURIComponent(f.savedName ?? '')}`,
  imageUrl: p => p
}

export interface MjContextValue {
  api: MjApiClient
  messages: MjMessages
  labels: MjLabels
  toast: MjToast
  files: MjFileEndpoints
  /** defaults for every grid's `mobile` option */
  mobile: MjMobileOptions
}

const MjContext = createContext<MjContextValue | null>(null)

const silentToast: MjToast = { success: () => {}, error: m => console.error(m) }

export interface MjProviderProps {
  api: MjApiClient
  messages?: MjMessages
  labels?: Partial<MjLabels>
  files?: Partial<MjFileEndpoints>
  toast?: MjToast
  mobile?: MjMobileOptions
  /** pass your app's QueryClient to share cache; one is created otherwise */
  queryClient?: QueryClient
  children: ReactNode
}

export function MjProvider({ api, messages, labels, files, toast, mobile, queryClient, children }: MjProviderProps) {
  const client = useMemo(() => queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }), [queryClient])
  const value = useMemo<MjContextValue>(() => ({ api, messages: messages ?? koMessages, labels: { ...koLabels, ...labels }, files: { ...defaultFileEndpoints, ...files }, toast: toast ?? silentToast, mobile: mobile ?? {} }), [api, messages, labels, files, toast, mobile])
  return (
    <QueryClientProvider client={client}>
      <MjContext.Provider value={value}>{children}</MjContext.Provider>
    </QueryClientProvider>
  )
}

export function useMj(): MjContextValue {
  const ctx = useContext(MjContext)
  if (!ctx) throw new Error('useMj must be used inside <MjProvider>')
  return ctx
}
