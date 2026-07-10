import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [tsconfigPaths({ projects: ['tsconfig.app.json'], loose: true })],
  test: {
    setupFiles: ['test/setup.ts'],
  },
})
