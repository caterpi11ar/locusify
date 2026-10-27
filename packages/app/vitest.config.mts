import { mergeConfig } from 'vite'
import { defineConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default defineConfig(config => mergeConfig(
  typeof viteConfig === 'function' ? viteConfig(config) : viteConfig,
  {

    test: {
      include: ['test/**/*.test.{ts,tsx}'],
      setupFiles: ['test/setup.ts'],
    },
  },
))
