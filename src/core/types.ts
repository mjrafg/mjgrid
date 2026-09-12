/**
 * Core types. UI-agnostic: nothing in this file imports React or MUI.
 *
 * The legacy grid typed `typeParams` as a plain union of 11 shapes with no
 * discriminator, so TypeScript could not tell which params belonged to which
 * columnType. Here `MjColumn` is a discriminated union on `type`, so
 * `column.params` is precisely typed and unsupported combinations are compile errors.
 */

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

export interface MjRule {
  required?: boolean
  min?: number
  max?: number
  /** exclusive lower bound (value must be > minEqual) - kept for legacy parity */
  minEqual?: number
  /** exclusive upper bound (value must be < maxEqual) - kept for legacy parity */
  maxEqual?: number
  minLength?: number
  maxLength?: number
  email?: boolean
  password?: boolean
  /** field must equal the field named in params.mainPasswordField */
  passwordRepeat?: boolean
  /** '0' = digit, any other char = literal. e.g. '000-0000-0000' */
  mask?: string
  /** when false, the same reference (by .id) may not appear twice in a batch */
  duplicate?: boolean
  /** overrides every generated message for this rule */
  message?: string
  /** custom async validator; return a message to fail, null/undefined to pass */
  validate?: (row: Record<string, unknown>) => Promise<string | null | undefined> | string | null | undefined
}

// ---------------------------------------------------------------------------
// Select options
// ---------------------------------------------------------------------------

export interface MjOption<V = unknown> {
  value: V
  text: string
  color?: string
  defaultValue?: boolean
  /** arbitrary payload carried with the option (legacy: otherData) */
  data?: Record<string, unknown>
}

/** Where a select column gets its options. Exactly one of the two. */
export type MjOptionSource =
  | { options: MjOption[]; fetchUrl?: never }
  | { fetchUrl: string; valueField?: string; textField?: string; options?: never }

// ---------------------------------------------------------------------------
// Column params, one interface per column type
// ---------------------------------------------------------------------------

export type MjPredicate<T = unknown> = boolean | ((value: T, row: Record<string, unknown>) => boolean)

interface MjEditableParams {
  disabled?: MjPredicate
  editable?: MjPredicate
}

export interface MjStringParams extends MjEditableParams {
  inputType?: 'text' | 'password'
  multiline?: boolean
  rows?: number
  placeholder?: string
  autoComplete?: string
  mask?: string
  /** '/api/x/check/{value}/{code}' - tokens are replaced from the row */
  valueCheckUrl?: string
  valueCheckText?: string
  valueCheck?: (value: string, row: Record<string, unknown>) => Promise<void> | void
  /** for passwordRepeat rules: the field holding the primary password */
  mainPasswordField?: string
  /** read-only render override */
  format?: (value: unknown, row: Record<string, unknown>) => string
}

export interface MjNumberParams extends MjEditableParams {
  mask?: string
  /** field on the row whose `.unit.name` is shown as an adornment */
  unitField?: string
}

export type MjSelectParams = MjEditableParams &
  MjOptionSource & {
    placeholder?: string
    hideAllOption?: boolean
    onChange?: (value: unknown, row: Record<string, unknown>) => void
    /** remount sibling fields after change (legacy: rerenderColumnsWhenChanges) */
    refreshSiblings?: boolean
  }

export interface MjDateParams extends MjEditableParams {
  /** display format (dayjs) */
  format?: string
  /** which picker to show; storage is always YYYY-MM-DD */
  selector?: 'date' | 'month' | 'year'
  /** quick-range presets for the filter bar */
  ranges?: MjDateRange[]
  filterDefault?: [Date | null, Date | null]
}

export interface MjDateRange {
  name: string
  startDate: () => Date
  endDate: () => Date
  width?: number
}

export interface MjTimeParams extends MjEditableParams {
  /** minutes */
  step?: number
}

export interface MjBooleanParams extends MjEditableParams {
  positiveText?: string
  negativeText?: string
  /** colour the negative value red (default) or the positive one */
  colorPositive?: boolean
  onClick?: (value: boolean, row: Record<string, unknown>) => void
}

export interface MjFileParams extends MjEditableParams {
  /** server-side storage bucket: FILE | MES | SIGN | PROFILE | HACCP | USER | ANNO */
  storageType?: string
  maxSize?: number
  accept?: Record<string, string[]>
  placeholder?: string
}

export interface MjImageParams extends MjFileParams {
  squareImage?: boolean
  /** show the draw-signature tab beside the uploader */
  signFeature?: boolean
  selectButtonText?: string
  dialogTitle?: string
  onChange?: (change: MjImageChange) => void
}

export interface MjImageChange {
  type: 'insert' | 'delete' | 'draw'
  row: Record<string, unknown>
  file: MjFile
}

export interface MjProfileParams extends MjImageParams {
  /** row field holding the profile file entity */
  profileField: string
  profileRequired?: boolean
}

export interface MjButtonParams {
  text: string | ((value: unknown, row: Record<string, unknown>) => string)
  color?: MjButtonColor | ((value: unknown, row: Record<string, unknown>) => MjButtonColor)
  variant?: MjButtonVariant | ((value: unknown, row: Record<string, unknown>) => MjButtonVariant)
  visible?: MjPredicate
  icon?: string | ((value: unknown, row: Record<string, unknown>) => string)
  onClick: (value: unknown, row: Record<string, unknown>) => Promise<void> | void
}

export type MjButtonColor = 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning'
export type MjButtonVariant = 'contained' | 'outlined' | 'text'

export interface MjSelectGridParams extends MjEditableParams {
  /** the picker grid; opened in a dialog, its row click becomes this field's value */
  grid: MjGridConfig
  displayValue?: (value: unknown, row: Record<string, unknown>) => string
  dialogTitle?: string | ((value: unknown, row: Record<string, unknown>) => string)
  onChange?: (value: unknown, row: Record<string, unknown>) => void
  /** extra fields to write onto the row when a value is picked, e.g. { vendorCode: picked.code } */
  patch?: (picked: Record<string, unknown>) => Record<string, unknown>
}

export type MjAutocompleteParams = MjEditableParams &
  MjOptionSource & {
    textFormatter?: (text: string, option: unknown) => string
    onChange?: (value: unknown, row: Record<string, unknown>) => void
  }

export interface MjAddressParams extends MjEditableParams {
  /** defaults to window.daum.Postcode when present */
  provider?: 'daum'
}

export interface MjCustomParams {
  /** rendered inside the form; the adapter decides the wrapper */
  node: unknown
}

// ---------------------------------------------------------------------------
// Columns
// ---------------------------------------------------------------------------

/** 1..12 grid units in the form layout (legacy: controllerSpacePercent) */
export type MjSpan = 1 | 2 | 3 | 4 | 6 | 8 | 9 | 12

export interface MjColumnBase {
  field: string
  headerName: string
  width?: number
  editable?: boolean
  filterable?: boolean
  sortable?: boolean
  hide?: boolean
  rules?: MjRule[]
  defaultValue?: unknown
  /** shown in the form only, never in the grid (legacy: justUpdate) */
  formOnly?: boolean
  showOnFilterBar?: boolean
  filterBarIndex?: number
  hideOnExcel?: boolean
  hideOnView?: boolean
  hideOnPrint?: boolean
  /** nested property to read/filter/sort on, e.g. field 'material', path 'name' */
  path?: string
  /** read the field from a parent object on the row */
  parentPath?: string
  sortField?: string
  span?: MjSpan
  /** ordering inside the form (legacy: updateViewIndex) */
  formIndex?: number
  footerText?: string | ((rows: Record<string, unknown>[]) => string)
  footerAlign?: 'left' | 'center' | 'right'
  excelExampleValue?: string
  printFormat?: (value: unknown, row: Record<string, unknown>) => string
  printColor?: string | ((value: unknown, row: Record<string, unknown>) => string)
  /** custom filter derivation for the free-text search */
  getFilters?: (value: string) => MjFilter[]
  filterDefaultValue?: unknown
  onFilterChange?: (value: unknown) => void
  hideNativeFilter?: boolean
}

type Col<T extends string, P> = MjColumnBase & { type: T; params?: P }

export type MjColumn =
  | Col<'string', MjStringParams>
  | Col<'number', MjNumberParams>
  | Col<'select', MjSelectParams>
  | Col<'date', MjDateParams>
  | Col<'time', MjTimeParams>
  | Col<'timeRange', MjTimeParams>
  | Col<'weekDays', MjEditableParams>
  | Col<'boolean', MjBooleanParams>
  | Col<'image', MjImageParams>
  | Col<'file', MjFileParams>
  | Col<'address', MjAddressParams>
  | Col<'button', MjButtonParams>
  | Col<'selectGrid', MjSelectGridParams>
  | Col<'autocomplete', MjAutocompleteParams>
  | Col<'profile', MjProfileParams>
  | Col<'custom', MjCustomParams>

export type MjColumnType = MjColumn['type']

/** Narrow a column by type: `ColumnOf<'select'>` is the select column shape. */
export type ColumnOf<T extends MjColumnType> = Extract<MjColumn, { type: T }>

// ---------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------

export interface MjFile {
  id: string
  originalName: string
  savedName?: string
  type?: string
  size?: number
  thumbnailPath?: string
  downloadPath?: string
  isDraw?: boolean
  /** browser File before upload */
  file?: File
}

// ---------------------------------------------------------------------------
// Filters and sorting (wire format of the backend)
// ---------------------------------------------------------------------------

export type MjFilterOperator =
  | 'contains' | 'startsWith' | 'endsWith' | '=' | 'equals' | '>' | '<' | '>=' | '<=' | '!='
  | 'isEmpty' | 'isNotEmpty' | 'isAnyOf' | 'is' | 'isDate' | 'not' | 'after' | 'afterEqual'
  | 'before' | 'beforeEqual' | 'between'

export interface MjFilter {
  columnName: string
  columnValue: unknown
  columnProp?: string
  operator: MjFilterOperator
  logic?: 'and' | 'or'
}

export type MjSortDirection = 'asc' | 'desc'

export interface MjSort {
  field: string
  direction: MjSortDirection
}

// ---------------------------------------------------------------------------
// Grid config
// ---------------------------------------------------------------------------

export type MjEditMode = 'dialog' | 'inline' | 'readonly'

export interface MjGridConfig {
  /** display name used in titles and toasts, e.g. '제품' */
  name: string
  columns: MjColumn[]
  /** REST resource root, e.g. '/api/products'. All URLs derive from it unless overridden. */
  resource?: string
  urls?: Partial<{ fetch: string; insert: string; insertBulk: string; update: string; updateBulk: string; delete: string }>
  /** static rows for client-side grids */
  rows?: Record<string, unknown>[]
  editMode?: MjEditMode
  softDelete?: boolean
  pageSize?: number
  defaultSort?: MjSort
  defaultFilters?: MjFilter[]
  /** applied to the free-text search, with columnValue replaced by the search term */
  extraFilters?: MjFilter[] | ((term: string) => MjFilter[])
  extraFilterBarColumns?: MjColumn[]
  extraFormColumns?: MjColumn[]
  excelExport?: boolean
  excelImport?: boolean
  printable?: boolean
  addable?: boolean
  deletable?: boolean
  showToolbarSearch?: boolean
  hideToolbar?: boolean
  addButtonText?: string
  addButtonIcon?: string
  dialogSize?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  rowHeight?: number
  printColor?: string | ((row: Record<string, unknown>) => string)
  hooks?: MjGridHooks
}

export interface MjGridHooks {
  onSubmit?: (lastRow: Record<string, unknown>, newRow: Record<string, unknown>) => void
  onInserted?: (row: Record<string, unknown>) => void
  onBeforeSave?: (rows: Record<string, unknown>[], lastRows: Record<string, unknown>[]) => Promise<Record<string, unknown>[]>
  onBeforeSaveSingle?: (row: Record<string, unknown>) => Promise<Record<string, unknown>>
  onDataInserted?: (rows: Record<string, unknown>[], lastRows: Record<string, unknown>[]) => void
  onDataUpdated?: (rows: Record<string, unknown>[], lastRows: Record<string, unknown>[]) => void
  onDataDeleted?: (rows: Record<string, unknown>[], lastRows: Record<string, unknown>[]) => void
  onDeleteValidate?: (row: Record<string, unknown>) => Promise<string | null | undefined>
  onFilterChange?: (filters: MjFilter[]) => void
  afterFetch?: (rows: Record<string, unknown>[], total: number) => Promise<{ rows: Record<string, unknown>[]; total: number }>
  validate?: (unsaved: Record<string, unknown>[]) => Promise<boolean>
  onAddClick?: () => void
  onRowClick?: (row: Record<string, unknown>) => void
  onDialogClose?: () => void
}

// ---------------------------------------------------------------------------
// Row state
// ---------------------------------------------------------------------------

export type MjRowState = 'none' | 'insert' | 'update' | 'delete'

export interface MjRow extends Record<string, unknown> {
  id: string
  /** tracked client-side; never sent to the server */
  __state?: MjRowState
}

export interface MjRowError {
  rowId: string
  rowIndex: number
  field: string
  message: string
}
