import antfu from '@antfu/eslint-config'

export default antfu({
  ignores: [
    '**/node_modules/**',
    '**/dist/**',
    '**/.next/**',
    '**/out/**',
    '**/build/**',
    '**/*.md',
  ],
  rules: {
    'no-console': 'off',
    'eslint-comments/no-duplicate-disable': 'off',
    'antfu/no-top-level-await': 'off',
    'e18e/prefer-static-regex': 'off',
  },
})
