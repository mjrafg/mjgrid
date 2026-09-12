module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react-hooks'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended', 'plugin:react-hooks/recommended'],
  rules: {
    // The legacy grid had 11 hook calls inside render callbacks. Make that a build error here.
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'error',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
    'no-debugger': 'error',
    'no-console': ['error', { allow: ['warn', 'error'] }]
  },
  env: { browser: true, es2020: true, node: true }
}
