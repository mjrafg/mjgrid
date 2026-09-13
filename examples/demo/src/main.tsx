import { CssBaseline, FormControlLabel, MenuItem, Select, Switch, Tab, Tabs, Box, ThemeProvider, Typography, useMediaQuery } from '@mui/material'
import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import toast, { Toaster } from 'react-hot-toast'
import { KrdsTokens, MjGrid, MjProvider, buildTemplateWorkbook, createKrdsTheme, enLabels } from '@agent24/mjgrid'
import { apiLog, memoryApi, subscribeLog, type ApiLogEntry } from './memoryApi'
import { ErrorDemo, StaticPage, inventoryConfig, productsConfig, shiftsConfig } from './pages'

function ApiLog() {
  const [log, setLog] = useState<ApiLogEntry[]>(() => [...apiLog])
  useEffect(() => { setLog([...apiLog]); return subscribeLog(setLog) }, [])
  const counts = log.reduce<Record<string, number>>((m, e) => { const k = `${e.method} ${e.url.replace(/\?.*$/, '')}`; m[k] = (m[k] ?? 0) + 1; return m }, {})
  return (
    <Box sx={{ p: 1, borderLeft: '1px solid #ddd', minWidth: 300, fontSize: 12, fontFamily: 'monospace', overflow: 'auto', display: { xs: 'none', md: 'block' } }} data-testid="api-log">
      <Typography variant="subtitle2">API calls ({log.length})</Typography>
      {Object.entries(counts).map(([k, n]) => <div key={k}>{n}× {k}</div>)}
    </Box>
  )
}

const theme = createKrdsTheme()

function App() {
  const [tab, setTab] = useState(0)
  const [en, setEn] = useState(false)
  // KRDS text/screen settings: 5 font-size levels + high-contrast mode, as classes on <html>
  const [fontLevel, setFontLevel] = useState(2)
  const [hc, setHc] = useState(false)
  useEffect(() => {
    const html = document.documentElement
    html.classList.remove('font-size-1', 'font-size-2', 'font-size-3', 'font-size-4', 'font-size-5')
    html.classList.add(`font-size-${fontLevel}`)
    html.classList.toggle('high-contrast', hc)
    html.lang = en ? 'en' : 'ko'
  }, [fontLevel, hc, en])
  const phone = useMediaQuery('(max-width:767px)')
  return (
    <ThemeProvider theme={theme}>
    <MjProvider api={memoryApi} toast={{ success: m => toast.success(m), error: m => toast.error(m) }} labels={en ? enLabels : undefined}>
      <KrdsTokens /><CssBaseline /><Toaster position="top-right" />
      <Box sx={{ display: 'flex', height: '100dvh' }}>
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', px: 2, borderBottom: '1px solid #ddd' }}>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ flex: 1, minWidth: 0 }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
              <Tab label="제품 (dialog)" /><Tab label="재고 (inline)" /><Tab label="근무조 (all field types)" /><Tab label="정적 (client-side)" />
            </Tabs>
            {!phone && <Select size="small" value={fontLevel} onChange={e => setFontLevel(Number(e.target.value))} aria-label="font size level" sx={{ mr: 1 }}>{[1, 2, 3, 4, 5].map(n => <MenuItem key={n} value={n}>{['작게', '보통', '조금 크게', '크게', '아주 크게'][n - 1]}</MenuItem>)}</Select>}
            {!phone && <FormControlLabel control={<Switch checked={hc} onChange={e => setHc(e.target.checked)} />} label="고대비" />}
            {!phone && <FormControlLabel control={<Switch checked={en} onChange={e => setEn(e.target.checked)} />} label="English" />}
          </Box>
          <Box sx={{ flex: 1, p: phone ? 0 : 2, overflow: 'auto', minHeight: 0 }}>
            {tab === 0 && <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}><ErrorDemo /><Box sx={{ flex: 1, minHeight: 0 }}><MjGrid config={productsConfig} title="제품정보" /></Box></Box>}
            {tab === 1 && <Box sx={{ height: '100%' }}><MjGrid config={inventoryConfig} /></Box>}
            {tab === 2 && <Box sx={{ height: '100%' }}><MjGrid config={shiftsConfig} /></Box>}
            {tab === 3 && <StaticPage />}
          </Box>
        </Box>
        <ApiLog />
      </Box>
    </MjProvider>
    </ThemeProvider>
  )
}
// test hook: lets the browser harness build a real .xlsx from the product columns
;(window as unknown as { __mjTemplate: () => ArrayBuffer }).__mjTemplate = () => buildTemplateWorkbook(productsConfig.columns)
createRoot(document.getElementById('root')!).render(<App />)
