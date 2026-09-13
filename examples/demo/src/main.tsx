import { CssBaseline, FormControlLabel, Switch, Tab, Tabs, Box, Typography } from '@mui/material'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import toast, { Toaster } from 'react-hot-toast'
import { MjGrid, MjProvider, buildTemplateWorkbook, enLabels } from '@agent24/mjgrid'
import { apiLog, memoryApi, subscribeLog, type ApiLogEntry } from './memoryApi'
import { ErrorDemo, StaticPage, inventoryConfig, productsConfig, shiftsConfig } from './pages'

function ApiLog() {
  const [log, setLog] = useState<ApiLogEntry[]>(() => [...apiLog])
  useEffect(() => { setLog([...apiLog]); return subscribeLog(setLog) }, [])
  const counts = log.reduce<Record<string, number>>((m, e) => { const k = `${e.method} ${e.url.replace(/\?.*$/, '')}`; m[k] = (m[k] ?? 0) + 1; return m }, {})
  return (
    <Box sx={{ p: 1, borderLeft: '1px solid #ddd', minWidth: 300, fontSize: 12, fontFamily: 'monospace', overflow: 'auto' }} data-testid="api-log">
      <Typography variant="subtitle2">API calls ({log.length})</Typography>
      {Object.entries(counts).map(([k, n]) => <div key={k}>{n}× {k}</div>)}
    </Box>
  )
}

function App() {
  const [tab, setTab] = useState(0)
  const [en, setEn] = useState(false)
  return (
    <MjProvider api={memoryApi} toast={{ success: m => toast.success(m), error: m => toast.error(m) }} labels={en ? enLabels : undefined}>
      <CssBaseline /><Toaster position="top-right" />
      <Box sx={{ display: 'flex', height: '100vh' }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, borderBottom: '1px solid #ddd' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flex: 1 }}>
              <Tab label="제품 (dialog)" /><Tab label="재고 (inline)" /><Tab label="근무조 (all field types)" /><Tab label="정적 (client-side)" />
            </Tabs>
            <FormControlLabel control={<Switch checked={en} onChange={e => setEn(e.target.checked)} />} label="English labels" />
          </Box>
          <Box sx={{ flex: 1, p: 2, overflow: 'auto' }}>
            {tab === 0 && <><ErrorDemo /><Box sx={{ height: 'calc(100% - 24px)' }}><MjGrid config={productsConfig} title="제품정보" /></Box></>}
            {tab === 1 && <Box sx={{ height: '100%' }}><MjGrid config={inventoryConfig} /></Box>}
            {tab === 2 && <Box sx={{ height: '100%' }}><MjGrid config={shiftsConfig} /></Box>}
            {tab === 3 && <StaticPage />}
          </Box>
        </Box>
        <ApiLog />
      </Box>
    </MjProvider>
  )
}
// test hook: lets the browser harness build a real .xlsx from the product columns
;(window as unknown as { __mjTemplate: () => ArrayBuffer }).__mjTemplate = () => buildTemplateWorkbook(productsConfig.columns)
createRoot(document.getElementById('root')!).render(<App />)
