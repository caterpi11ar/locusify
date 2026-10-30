import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default defineConfig(config => mergeConfig(
  typeof viteConfig === 'function' ? viteConfig(config) : viteConfig,
  {

    test: {
      include: ['test/**/*.test.{ts,tsx}', 'src/features/afilmory/**/*.test.ts'],
      setupFiles: ['test/setup.ts'],
    },
  },
))
