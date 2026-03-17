import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import tsconfigPaths from 'vite-tsconfig-paths'

// https://vite.dev/config/
export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), tsconfigPaths()],
    server: {
      port: 1046,
      host: true,
      proxy: {
        '/api': {
          target: 'https://api.locusify.cn',
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            map: ['maplibre-gl', 'react-map-gl/maplibre'],
            motion: ['motion'],
            vendor: ['react', 'react-dom', 'react-router'],
          },
        },
      },
    },
  }
})
