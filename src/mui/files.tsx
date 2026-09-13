import { Avatar, Box, FormControl, FormLabel, Tab, Tabs, Typography } from '@mui/material'
import { useEffect, useRef, useState, type DragEvent } from 'react'
import { formatBytes, isPendingFile, newRowId, useMj, type MjColumn, type MjColumnType, type MjFile } from '../core'
import type { CellProps, FieldProps, TypeRenderers } from './registry'
import { krds, MjButton } from './krds'

const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
const isImageName = (n: string) => IMAGE_EXT.includes(n.slice(n.lastIndexOf('.')).toLowerCase())

/** Object URL for a pending file; revoked on change/unmount. */
function useObjectUrl(file?: File): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!file) { setUrl(undefined); return }
    const u = URL.createObjectURL(file); setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [file])
  return url
}

export interface MjDropzoneProps {
  value: MjFile | null
  onChange: (v: MjFile | null) => void
  accept?: Record<string, string[]>
  maxSize?: number
  storageType?: string
  preview?: boolean
  square?: boolean
  disabled?: boolean
  error?: boolean
  inputLabel?: string
}

/**
 * Native drag-and-drop / click uploader with no third-party dependency.
 * Selecting a file only stages it (value.file); the form uploads on submit.
 */
export function MjDropzone({ value, onChange, accept, maxSize, storageType, preview, square, disabled, error, inputLabel }: MjDropzoneProps) {
  const { labels, files, toast } = useMj()
  const inputRef = useRef<HTMLInputElement>(null)
  const exts = Object.values(accept ?? {}).flat()
  const anyType = exts.length === 0 || exts.includes('*')
  const objectUrl = useObjectUrl(value?.file)
  const max = maxSize ?? 20 * 1024 * 1024

  const pick = (file: File | undefined) => {
    if (!file) return
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!anyType && !exts.map(e => e.toLowerCase()).includes(ext)) { toast.error(labels.uploadBadType); return }
    if (file.size > max) { toast.error(labels.uploadTooLarge(formatBytes(max))); return }
    onChange({ id: newRowId(), originalName: file.name, size: file.size, type: storageType ?? 'FILE', file })
  }
  const onDrop = (e: DragEvent) => { e.preventDefault(); if (!disabled) pick(e.dataTransfer.files[0]) }
  const showImage = preview && value && (value.file ? isImageName(value.originalName) : Boolean(value.thumbnailPath))
  const src = value?.file ? objectUrl : value?.thumbnailPath ? files.imageUrl(value.thumbnailPath) : undefined

  return (
    <Box>
      <Box role="button" tabIndex={disabled ? -1 : 0} aria-label={inputLabel ?? labels.uploadHint} onClick={() => !disabled && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()} onDrop={onDrop}
        sx={{ border: `${krds.borderWMd} dashed`, borderColor: error ? krds.color.borderDanger : krds.color.borderGray, borderRadius: krds.radius.md, p: '16px', textAlign: 'center', cursor: disabled ? 'default' : 'pointer', bgcolor: krds.color.surfaceGraySubtler,
          minHeight: showImage ? undefined : 96, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px', opacity: disabled ? 0.6 : 1, fontFamily: krds.font.family, '&:focus-visible': { outline: 'none', boxShadow: krds.focusRing } }}>
        <input ref={inputRef} type="file" hidden accept={anyType ? undefined : exts.join(',')} disabled={disabled} data-testid="mj-file-input"
          onChange={e => { pick(e.target.files?.[0]); e.target.value = '' }} />
        {showImage && src
          ? <img alt={value!.originalName} src={src} style={{ maxHeight: 180, maxWidth: '100%', objectFit: 'contain', ...(square ? { aspectRatio: '1 / 1', objectFit: 'cover', width: 180 } : {}) }} />
          : value
            ? <Typography variant="body2">{value.originalName} <Typography component="span" variant="caption" color="text.secondary">({formatBytes(value.size ?? 0)})</Typography></Typography>
            : <>
                <Typography variant="body2">{labels.uploadHint}</Typography>
                <Typography variant="caption" color="text.secondary">{labels.uploadAccept(anyType ? '*' : exts.join(' '))}</Typography>
              </>}
      </Box>
      {value && (
        <Box sx={{ display: 'flex', gap: 1, mt: 1, justifyContent: 'center' }}>
          {value.savedName && <MjButton variant="tertiary" size="small" component="a" href={files.downloadUrl(value)} download={value.originalName} onClick={e => e.stopPropagation()}>{labels.download}</MjButton>}
          {!disabled && <MjButton variant="danger" size="small" onClick={() => onChange(null)}>{labels.remove}</MjButton>}
        </Box>
      )}
    </Box>
  )
}

export interface SignaturePadProps { onChange: (v: MjFile | null) => void; storageType?: string; initial?: MjFile | null; disabled?: boolean }

/** Canvas signature. Produces a staged PNG (isDraw) on 등록. */
export function SignaturePad({ onChange, storageType, initial, disabled }: SignaturePadProps) {
  const { labels, files } = useMj()
  const ref = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  useEffect(() => {
    const c = ref.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    ctx.lineWidth = 3; ctx.lineCap = 'round'
    if (initial?.thumbnailPath) { const img = new Image(); img.crossOrigin = 'anonymous'; img.onload = () => ctx.drawImage(img, 0, 0, c.width, c.height); img.src = files.imageUrl(initial.thumbnailPath.replace('s_', '')) }
  }, [initial, files])
  // the canvas is 300x300 logical pixels but may be displayed narrower on a phone; map pointer to canvas space
  const pos = (e: React.PointerEvent) => { const c = ref.current!; const r = c.getBoundingClientRect(); return { x: (e.clientX - r.left) * (c.width / r.width), y: (e.clientY - r.top) * (c.height / r.height) } }
  const down = (e: React.PointerEvent) => { if (disabled) return; drawing.current = true; const ctx = ref.current!.getContext('2d')!; const p = pos(e); ctx.beginPath(); ctx.moveTo(p.x, p.y) }
  const move = (e: React.PointerEvent) => { if (!drawing.current) return; const ctx = ref.current!.getContext('2d')!; const p = pos(e); ctx.lineTo(p.x, p.y); ctx.stroke() }
  const up = () => { drawing.current = false }
  const clear = () => { const c = ref.current!; c.getContext('2d')?.clearRect(0, 0, c.width, c.height); onChange(null) }
  const commit = () => ref.current!.toBlob(blob => {
    if (!blob) return
    const name = `signature-${Date.now()}.png`
    onChange({ id: newRowId(), originalName: name, size: blob.size, type: storageType ?? 'SIGN', isDraw: true, file: new File([blob], name, { type: 'image/png' }) })
  }, 'image/png')
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      <canvas ref={ref} width={300} height={300} data-testid="mj-signature" style={{ border: '2px dashed #ccc', borderRadius: 4, touchAction: 'none', width: '100%', maxWidth: 300, aspectRatio: '1 / 1' }}
        onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} />
      <Box sx={{ display: 'flex', gap: 1 }}>
        <MjButton variant="tertiary" size="small" onClick={clear} disabled={disabled}>{labels.signClear}</MjButton>
        <MjButton variant="secondary" size="small" onClick={commit} disabled={disabled}>{labels.register}</MjButton>
      </Box>
      {initial?.file && initial.isDraw && <Typography variant="caption" color="success.main" role="status">{labels.signStaged}</Typography>}
    </Box>
  )
}

const req = (c: MjColumn) => c.rules?.some(r => r.required)
const Label = ({ column, error }: { column: MjColumn; error?: string }) => (
  <>
    <FormLabel sx={{ display: 'block', mb: '4px', fontFamily: krds.font.family, fontSize: krds.fs.bodyS, fontWeight: 700, color: `${krds.color.textBasic} !important` }} error={Boolean(error)}>
      {column.headerName}{req(column) ? <Box component="span" aria-hidden="true" sx={{ color: krds.color.textDanger, ml: '2px' }}>*</Box> : null}
    </FormLabel>
    {error && <Typography component="span" role="alert" sx={{ display: 'block', mb: '4px', fontSize: krds.fs.bodyS, color: krds.color.textDanger }}><Box component="span" aria-hidden="true" sx={{ mr: '4px' }}>✕</Box>{error}</Typography>}
  </>
)

export function FileField({ column, value, onChange, error, disabled }: FieldProps<'file'>) {
  const p = column.params
  return (
    <FormControl fullWidth>
      <Label column={column} error={error} />
      <MjDropzone value={(value as MjFile) ?? null} onChange={onChange} accept={p?.accept} maxSize={p?.maxSize} storageType={p?.storageType} disabled={disabled} error={Boolean(error)} inputLabel={column.headerName} />
    </FormControl>
  )
}

export function ImageField({ column, value, onChange, error, disabled }: FieldProps<'image'>) {
  const { labels } = useMj()
  const p = column.params
  const v = (value as MjFile) ?? null
  const [tab, setTab] = useState<'upload' | 'draw'>(v?.isDraw ? 'draw' : 'upload')
  const drop = <MjDropzone value={v} onChange={onChange} accept={p?.accept ?? { 'image/*': ['.png', '.jpg', '.jpeg'] }} maxSize={p?.maxSize} storageType={p?.storageType} preview square={p?.squareImage} disabled={disabled} error={Boolean(error)} inputLabel={column.headerName} />
  return (
    <FormControl fullWidth>
      <Label column={column} error={error} />
      {p?.signFeature
        ? <>
            <Tabs value={tab} onChange={(_, t) => setTab(t)} variant="fullWidth" sx={{ mb: 1 }}><Tab value="upload" label={labels.stamp} /><Tab value="draw" label={labels.signature} /></Tabs>
            {tab === 'upload' ? drop : <SignaturePad initial={v} onChange={onChange} storageType={p?.storageType ?? 'SIGN'} disabled={disabled} />}
          </>
        : drop}
    </FormControl>
  )
}

/** Avatar bound to params.profileField; the column's own field (e.g. the name) stays a plain value. */
export function ProfileField({ column, getValues, setValue, error, disabled }: FieldProps<'profile'>) {
  const p = column.params
  const key = p?.profileField ?? `${column.field}Profile`
  const [v, setV] = useState<MjFile | null>((getValues()[key] as MjFile) ?? null)
  const objectUrl = useObjectUrl(v?.file)
  const { files } = useMj()
  const src = v?.file ? objectUrl : v?.thumbnailPath ? files.imageUrl(v.thumbnailPath) : undefined
  return (
    <FormControl fullWidth>
      <Label column={column} error={error} />
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Avatar src={src} sx={{ width: 64, height: 64 }} />
        <Box sx={{ flex: 1 }}>
          <MjDropzone value={v} onChange={nv => { setV(nv); setValue(key, nv) }} accept={{ 'image/*': ['.png', '.jpg', '.jpeg'] }} maxSize={p?.maxSize} storageType={p?.storageType ?? 'PROFILE'} disabled={disabled} inputLabel={column.headerName} />
        </Box>
      </Box>
    </FormControl>
  )
}

export function FileCell({ value }: CellProps<'file'>) {
  const { files } = useMj()
  const f = value as MjFile | null
  if (!f?.originalName) return null
  return f.savedName
    ? <a href={files.downloadUrl(f)} download={f.originalName} onClick={e => e.stopPropagation()}>{f.originalName}</a>
    : <span>{f.originalName}</span>
}

export function ImageCell({ value }: CellProps<'image'>) {
  const { files } = useMj()
  const f = value as MjFile | null
  if (!f?.thumbnailPath) return null
  return <img alt={f.originalName} src={files.imageUrl(f.thumbnailPath)} style={{ maxHeight: 36, objectFit: 'contain' }} />
}

export function ProfileCell({ column, value, row }: CellProps<'profile'>) {
  const { files } = useMj()
  const f = row[column.params?.profileField ?? ''] as MjFile | undefined
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      <Avatar src={f?.thumbnailPath ? files.imageUrl(f.thumbnailPath) : undefined} sx={{ width: 28, height: 28 }} />
      <span>{String(value ?? '')}</span>
    </Box>
  )
}

/**
 * Upload every staged file in `data` and replace it with the stored MjFile.
 * Runs at submit time so cancelling the form never leaves orphan files.
 */
export async function resolvePendingUploads(
  columns: MjColumn[],
  data: Record<string, unknown>,
  upload: (file: File, opts: { storageType?: string; isDraw?: boolean; dateBase?: boolean }) => Promise<MjFile>
): Promise<Record<string, unknown>> {
  const out = { ...data }
  for (const c of columns) {
    if (c.type !== 'file' && c.type !== 'image' && c.type !== 'profile') continue
    const key = c.type === 'profile' ? c.params?.profileField ?? `${c.field}Profile` : c.field
    const v = out[key]
    if (isPendingFile(v)) {
      const p = c.params as { storageType?: string; dateBase?: boolean } | undefined
      out[key] = await upload(v.file, { storageType: v.type ?? p?.storageType, isDraw: v.isDraw, dateBase: p?.dateBase })
    }
  }
  return out
}

export const fileRenderers: Partial<Record<MjColumnType, Partial<TypeRenderers>>> = {
  file: { Cell: FileCell as never, Field: FileField as never },
  image: { Cell: ImageCell as never, Field: ImageField as never },
  profile: { Cell: ProfileCell as never, Field: ProfileField as never }
}
