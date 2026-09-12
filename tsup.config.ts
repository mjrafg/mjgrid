import { defineConfig } from 'tsup'

export default defineConfig({
  entry: { index: 'src/index.ts', 'core/index': 'src/core/index.ts', 'mui/index': 'src/mui/index.ts' },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  external: ['react', 'react-dom', '@mui/material', '@emotion/react', '@emotion/styled']
})
