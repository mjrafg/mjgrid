import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'examples/**', 'coverage/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx,js,mjs}'],
    plugins: { 'react-hooks': reactHooks },
    languageOptions: { globals: { window: 'readonly', document: 'readonly', console: 'readonly', process: 'readonly', HTMLElement: 'readonly', HTMLInputElement: 'readonly', HTMLDivElement: 'readonly', HTMLCanvasElement: 'readonly', File: 'readonly', Blob: 'readonly', FormData: 'readonly', URL: 'readonly', FileReader: 'readonly', Image: 'readonly', DataTransfer: 'readonly', Event: 'readonly', KeyboardEvent: 'readonly', setTimeout: 'readonly', clearTimeout: 'readonly', React: 'readonly' } },
    rules: {
      // The legacy grid had 11 hook calls inside render callbacks. Make that a build error here.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
      'no-debugger': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }]
    }
  }
)
