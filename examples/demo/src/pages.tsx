import { Box, Button, Stack, Typography } from '@mui/material'
import { useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { MjGrid, type MjGridConfig, type MjGridHandle } from '@agent24/mjgrid'

const unitSelect = { fetchUrl: '/api/product/unit', valueField: 'id', textField: 'name' } as const

export const productsConfig: MjGridConfig = {
  name: '제품', resource: '/api/products', editMode: 'dialog', softDelete: true, excelExport: true, excelImport: true, printable: true, showToolbarSearch: true, dialogSize: 'md',
  defaultSort: { field: 'seq', direction: 'asc' },
  columns: [
    { field: 'code', headerName: '품목코드', type: 'string', width: 120, editable: true, filterable: true, rules: [{ required: true, minLength: 3, maxLength: 50 }],
      params: { valueCheckUrl: '/api/products/check/code/{value}/{code}', valueCheckText: '중복확인' }, excelExampleValue: 'EG01001', footerText: rows => `${rows.length}건` },
    { field: 'name', headerName: '품목명', type: 'string', width: 160, editable: true, filterable: true, showOnFilterBar: true, rules: [{ required: true }], excelExampleValue: '김치 1호' },
    { field: 'type', headerName: '품목유형', type: 'select', width: 120, editable: true, showOnFilterBar: true, params: { options: ['김치', '육수', '소스', '조림', '즉석조리식품'].map(t => ({ value: t, text: t })) } },
    { field: 'shelfLife', headerName: '소비기한(일)', type: 'number', width: 100, editable: true, rules: [{ min: 0, max: 3650 }], footerText: rows => String(rows.reduce((s, r) => s + Number(r.shelfLife ?? 0), 0)), footerAlign: 'right' },
    { field: 'unit', headerName: '사용단위', type: 'select', width: 90, editable: true, showOnFilterBar: true, path: 'name', params: unitSelect },
    { field: 'createdAt', headerName: '등록일', type: 'date', width: 110, showOnFilterBar: true, params: { format: 'YYYY-MM-DD' } },
    { field: 'active', headerName: '사용여부', type: 'boolean', width: 90, editable: true, showOnFilterBar: true, defaultValue: true },
    { field: 'photo', headerName: '사진', type: 'image', width: 80, editable: true, params: { signFeature: true, storageType: 'HACCP' } },
    { field: 'note', headerName: '비고', type: 'string', width: 160, editable: true, params: { multiline: true, rows: 2 } },
    { field: 'act', headerName: '액션', type: 'button', width: 110, params: { text: '상세', color: 'secondary', variant: 'outlined', onClick: async (_v, row) => { toast(`버튼 클릭: ${row.name}`) } } }
  ]
}

const companyPicker: MjGridConfig = {
  name: '거래처', resource: '/api/companies', showToolbarSearch: true,
  columns: [{ field: 'code', headerName: '코드', type: 'string', width: 100 }, { field: 'name', headerName: '거래처명', type: 'string', width: 200 }, { field: 'type', headerName: '유형', type: 'string', width: 140 }]
}
export const inventoryConfig: MjGridConfig = {
  name: '원료 기초재고', resource: '/api/inventory', editMode: 'inline', softDelete: true, rowActions: true, sequenceField: 'seq', keepOneRow: true, excelExport: true, pageSize: 20,
  defaultSort: { field: 'seq', direction: 'asc' },
  columns: [
    { field: 'seq', headerName: '순번', type: 'number', width: 70 },
    { field: 'material', headerName: '품목명', type: 'string', width: 140, path: 'name', showOnFilterBar: true },
    { field: 'vendorCode', headerName: '거래처코드', type: 'string', width: 110 },
    { field: 'vendor', headerName: '거래처', type: 'selectGrid', width: 180, editable: true, params: { grid: companyPicker, patch: v => ({ vendorCode: v.code }) } },
    { field: 'quantity', headerName: '재고량', type: 'number', width: 100, editable: true, rules: [{ required: true, min: 0 }] },
    { field: 'inputDate', headerName: '입고일자', type: 'date', width: 130, editable: true, rules: [{ required: true }], showOnFilterBar: true },
    { field: 'expiryDate', headerName: '소비기한', type: 'date', width: 130, editable: true }
  ]
}

export const shiftsConfig: MjGridConfig = {
  name: '근무조', resource: '/api/shifts', editMode: 'dialog', dialogSize: 'md',
  columns: [
    { field: 'title', headerName: '조 이름', type: 'string', width: 120, editable: true, rules: [{ required: true }] },
    { field: 'start', headerName: '시작시각', type: 'time', width: 100, editable: true },
    { field: 'hours', headerName: '근무시간', type: 'timeRange', width: 130, editable: true },
    { field: 'days', headerName: '근무요일', type: 'weekDays', width: 160, editable: true, span: 12, renderCell: ({ value }) => String(value ?? '').split(',').map((b, i) => (b === '1' ? '일월화수목금토'[i] : '')).join('') },
    { field: 'addr', headerName: '주소', type: 'address', width: 220, editable: true, span: 12 },
    { field: 'mgr', headerName: '담당자', type: 'autocomplete', width: 110, editable: true, path: 'name', params: { fetchUrl: '/api/users', valueField: 'id', textField: 'name' } },
    { field: 'owner', headerName: '책임자', type: 'profile', width: 140, editable: true, params: { profileField: 'ownerPhoto' } },
    { field: 'doc', headerName: '첨부', type: 'file', width: 160, editable: true, params: { accept: { 'application/pdf': ['.pdf'], 'text/plain': ['.txt'] }, maxSize: 2 * 1024 * 1024 } },
    { field: 'note', headerName: '메모', type: 'custom', width: 120, editable: true, span: 12, params: { node: (ctx: { value: unknown; onChange: (v: unknown) => void }) => <textarea aria-label="메모" rows={3} style={{ width: '100%' }} value={String(ctx.value ?? '')} onChange={e => ctx.onChange(e.target.value)} /> } }
  ]
}

export function StaticPage() {
  const ref = useRef<MjGridHandle>(null)
  const rows = Array.from({ length: 25 }, (_, i) => ({ id: `r${i}`, name: `정적 행 ${i + 1}`, score: (i * 37) % 100, done: i % 3 === 0 }))
  const cfg: MjGridConfig = {
    name: '정적 데이터', rows, editMode: 'readonly', pageSize: 10, addable: false,
    hooks: { onRowClick: r => toast(`클릭: ${r.name}`) },
    columns: [
      { field: 'name', headerName: '이름', type: 'string', width: 160 },
      { field: 'score', headerName: '점수', type: 'number', width: 100, renderCell: ({ value }) => <b style={{ color: Number(value) > 50 ? 'green' : 'crimson' }}>{String(value)}</b> },
      { field: 'done', headerName: '완료', type: 'boolean', width: 90 }
    ]
  }
  return (
    <Stack spacing={1} sx={{ height: '100%' }}>
      <Stack spacing={1} sx={{ px: { xs: 1.5, md: 0 }, pt: { xs: 1.5, md: 0 } }}>
        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Button size="small" variant="outlined" onClick={() => ref.current?.openView(rows[0]!)}>ref.openView(row 1)</Button>
          <Button size="small" variant="outlined" onClick={() => ref.current?.setSearch('정적 행 2')}>ref.setSearch</Button>
          <Button size="small" variant="outlined" onClick={() => ref.current?.setSearch('')}>ref.clear</Button>
        </Stack>
        <Typography variant="caption">client-side rows, no server; renderCell override; readonly + onRowClick</Typography>
      </Stack>
      <Box sx={{ flex: 1, minHeight: 0 }}><MjGrid ref={ref} config={cfg} /></Box>
    </Stack>
  )
}

export function ErrorDemo() {
  const [n, setN] = useState(0)
  return <Typography variant="caption" sx={{ px: { xs: 1.5, md: 0 }, pt: { xs: 1, md: 0 } }} onClick={() => setN(n + 1)}>Delete product <b>P-LOCKED</b> (row 4) to see a server error envelope surfaced instead of a success toast.</Typography>
}
