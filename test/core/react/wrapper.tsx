import { QueryClient } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { MjProvider, type MjApiClient, type MjToast } from '../../../src/core'

export function makeWrapper(api: MjApiClient, toast?: MjToast) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MjProvider api={api} queryClient={qc} toast={toast}>{children}</MjProvider>
  }
}
