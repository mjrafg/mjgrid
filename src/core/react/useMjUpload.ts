import { useCallback } from 'react'
import { assertOk } from '../protocol'
import type { MjFile } from '../types'
import { useMj } from './context'

export interface UploadOptions {
  storageType?: string
  isDraw?: boolean
  dateBase?: boolean
}

/** Uploads one file with the legacy multipart contract (file, type, dateBase, isDraw). */
export function useMjUpload() {
  const { api, files } = useMj()
  const upload = useCallback(async (file: File, opts: UploadOptions = {}): Promise<MjFile> => {
    const form = new FormData()
    form.append('file', file)
    form.append('type', opts.storageType ?? 'FILE')
    form.append('dateBase', String(Boolean(opts.dateBase)))
    form.append('isDraw', String(Boolean(opts.isDraw)))
    return assertOk(await api.upload<MjFile>(files.uploadUrl, form), files.uploadUrl)
  }, [api, files.uploadUrl])
  return { upload }
}

/** A value produced by a file field before submit: the browser File plus metadata. */
export const isPendingFile = (v: unknown): v is MjFile & { file: File } =>
  typeof v === 'object' && v !== null && 'file' in v && (v as { file?: unknown }).file instanceof File

export const formatBytes = (n: number): string => {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 ** 2).toFixed(1)} MB`
}
