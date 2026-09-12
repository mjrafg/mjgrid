import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createContext, useContext, useMemo, type ReactNode } from 'react'
import type { MjApiClient } from '../protocol'
import { koMessages, type MjMessages } from '../messages'

/** Host-supplied notifications. Keeps react-hot-toast (or any other) out of the core. */
export interface MjToast {
  success: (message: string) => void
  error: (message: string) => void
}

export interface MjContextValue {
  api: MjApiClient
  messages: MjMessages
  toast: MjToast
}

const MjContext = createContext<MjContextValue | null>(null)

const silentToast: MjToast = { success: () => {}, error: m => console.error(m) }

export interface MjProviderProps {
  api: MjApiClient
  messages?: MjMessages
  toast?: MjToast
  /** pass your app's QueryClient to share cache; one is created otherwise */
  queryClient?: QueryClient
  children: ReactNode
}

export function MjProvider({ api, messages, toast, queryClient, children }: MjProviderProps) {
  const client = useMemo(() => queryClient ?? new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } } }), [queryClient])
  const value = useMemo<MjContextValue>(() => ({ api, messages: messages ?? koMessages, toast: toast ?? silentToast }), [api, messages, toast])
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
