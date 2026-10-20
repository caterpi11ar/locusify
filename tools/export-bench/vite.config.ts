import { defineConfig } from 'vite'

// Standalone harness: renders a Locusify-like replay scene at a fixed
// 1920x1080 and exports it through several candidate pipelines.
export default defineConfig({
  server: {
    port: 1060,
    host: '127.0.0.1',
    fs: {
      // Allow importing the app's real MapLibre style + e2e fixtures.
      allow: ['../..'],
    },
  },
  optimizeDeps: {
    // maplibre-gl v6 ships its worker as a sibling module; the optimizer breaks it.
    exclude: ['maplibre-gl'],
  },
  build: {
    target: 'chrome120',
  },
})
