import { Box, Button, Grid, Typography } from '@mui/material'
import { useId, useState } from 'react'
import { createPortal } from 'react-dom'
import { Controller, useForm } from 'react-hook-form'
import { fillUrlTemplate, MjApiError, MjValidationError, useMj, useMjSave, useMjUpload, validateField, duplicateMessage, type MjColumn, type MjGridConfig, type MjRow } from '../core'
import { resolvePendingUploads } from './files'
import { ensureDefaults } from './bootstrap'
import { renderersFor } from './registry'
import { MjSheet, type MjMobileState } from './mobile'

export type MjFormMode = 'insert' | 'update' | 'view'

export interface MjFormProps {
  config: MjGridConfig
  mode: MjFormMode
  row?: Partial<MjRow>
  onClose: (changed: boolean) => void
  mobile?: MjMobileState
  /** mobile: render the action buttons into this element (the sheet's fixed footer) instead of inline; the submit button targets the form by id */
  actionsContainer?: HTMLElement | null
}

export function formColumns(config: MjGridConfig, mode: MjFormMode): MjColumn[] {
  const all = [...config.columns, ...(config.extraFormColumns ?? [])]
  const picked = mode === 'view' ? all.filter(c => !c.hideOnView) : all.filter(c => c.editable || c.formOnly)
  const idx = picked.filter(c => c.formIndex !== undefined).sort((a, b) => a.formIndex! - b.formIndex!)
  return [...idx, ...picked.filter(c => c.formIndex === undefined)]
}

const spanOf = (c: MjColumn, config: MjGridConfig) => c.span ?? (config.dialogSize === 'xs' ? 12 : 6)
const desktopMobile: MjMobileState = { active: false, layout: 'cards', cardFields: 3, sheet: 'sheet', history: false }

/**
 * Create / edit / view form. One Controller per column; the field component
 * comes from the registry so every form-capable type renders here.
 *
 * Passwords: no magic sentinel. In update mode a password field starts empty
 * and is omitted from the payload unless the user typed a new value.
 */
ensureDefaults()

export function MjForm({ config, mode, row, onClose, mobile = desktopMobile, actionsContainer }: MjFormProps) {
  const { api, toast, labels: L } = useMj()
  const formId = useId()
  const { saveOne, deleteOne, isSaving } = useMjSave(config)
  const { upload } = useMjUpload()
  const columns = formColumns(config, mode)
  const passwordFields = columns.filter(c => c.type === 'string' && c.params?.inputType === 'password').map(c => c.field)
  const defaults: Record<string, unknown> = { ...(row ?? {}) }
  for (const f of passwordFields) defaults[f] = ''
  for (const c of columns) if (defaults[c.field] === undefined && c.defaultValue !== undefined) defaults[c.field] = c.defaultValue

  const { control, handleSubmit, setError, clearErrors, getValues: rhfGetValues, setValue, formState: { errors } } = useForm({ defaultValues: defaults })
  // fields receive the original row under __original so duplicate checks can exclude the row being edited
  const getValues = () => ({ ...rhfGetValues(), __original: row ?? {} })
  const [confirmDelete, setConfirmDelete] = useState(false)

  const validateAll = async (data: Record<string, unknown>): Promise<boolean> => {
    clearErrors()
    let ok = true
    for (const c of columns) {
      const msgs = await validateField(c, data)
      if (msgs) { setError(c.field, { type: 'value', message: msgs.join('\n') }); ok = false; continue }
      if (c.type === 'string' && c.params?.valueCheck && data[c.field] !== undefined && data[c.field] !== '') {
        await c.params.valueCheck(String(data[c.field]), data)
      }
      if (c.type === 'string' && c.params?.valueCheckUrl && data[c.field] !== undefined && data[c.field] !== '') {
        // legacy contract: URL tokens come from the row with `value` = new value and the field itself = original value
        const url = fillUrlTemplate(c.params.valueCheckUrl, { ...data, value: data[c.field], [c.field]: row?.[c.field] ?? '' })
        const env = await api.get<unknown>(url)
        if (env.status === 200 && env.data) { setError(c.field, { type: 'value', message: duplicateMessage(c, data[c.field]) }); ok = false }
      }
    }
    return ok
  }

  const submit = handleSubmit(async data => {
    if (mode === 'view') return
    if (!(await validateAll(data))) return
    let payload: Record<string, unknown> = { ...(row ?? {}), ...data }
    for (const f of passwordFields) if (!payload[f]) delete payload[f]
    try { payload = await resolvePendingUploads(columns, payload, upload) } catch (e) { if (e instanceof MjApiError) { toast.error(e.message); return } throw e }
    if (config.hooks?.onSubmit) { config.hooks.onSubmit((row ?? {}) as Record<string, unknown>, payload); onClose(true); return }
    try {
      await saveOne({ row: payload, mode: mode === 'insert' ? 'insert' : 'update' })
      toast.success(mode === 'insert' ? L.inserted : L.updated)
      onClose(true)
    } catch (e) {
      if (e instanceof MjApiError) toast.error(e.message)
      else if (e instanceof MjValidationError) toast.error(e.errors.map(x => x.message).join('\n'))
      else throw e
    }
  })

  const doDelete = async () => {
    setConfirmDelete(false)
    try {
      await deleteOne(String(row?.id))
      toast.success(L.deleted)
      onClose(true)
    } catch (e) {
      if (e instanceof MjApiError) toast.error(e.message); else throw e
    }
  }

  const buttons = (
    <>
      <Button variant="contained" color="error" onClick={() => onClose(false)}>{L.cancel}</Button>
      {mode === 'update' && (config.deletable ?? true) && <Button variant="outlined" color="error" onClick={() => setConfirmDelete(true)} disabled={isSaving}>{L.delete}</Button>}
      {mode !== 'view' && <Button type="submit" form={formId} variant="contained" disabled={isSaving}>{mode === 'insert' ? config.addButtonText ?? L.register : L.update}</Button>}
    </>
  )

  return (
    <form id={formId} noValidate onSubmit={submit} data-testid="mj-form">
      <Grid container spacing={2}>
        {columns.map(c => {
          const { Field } = renderersFor(c)
          if (!Field) return null
          return (
            <Grid item xs={12} sm={mobile.active ? 12 : spanOf(c, config)} key={c.field}>
              <Controller name={c.field} control={control} render={({ field }) => (
                <Field column={c} value={field.value} onChange={field.onChange} error={errors[c.field]?.message as string | undefined}
                  disabled={mode === 'view'} getValues={getValues} setValue={setValue} viewMode={mode === 'view'} />
              )} />
            </Grid>
          )
        })}
        {actionsContainer
          ? createPortal(buttons, actionsContainer)
          : <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, '& .MuiButton-root': mobile.active ? { flex: 1 } : undefined }}>{buttons}</Grid>}
      </Grid>
      <MjSheet open={confirmDelete} onClose={() => setConfirmDelete(false)} title={L.confirmDeleteTitle} mobile={mobile} size="xs" data-testid="mj-confirm-delete"
        actions={
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', '& .MuiButton-root': mobile.active ? { flex: 1 } : undefined }}>
            <Button onClick={() => setConfirmDelete(false)}>{L.cancel}</Button>
            <Button color="error" variant="contained" onClick={doDelete}>{L.confirm}</Button>
          </Box>
        }>
        <Typography>{L.confirmDeleteBody}</Typography>
      </MjSheet>
    </form>
  )
}
