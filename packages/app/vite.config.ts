import process from 'node:process'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const config = loadEnv(mode, process.cwd(), 'VITE_')
  const apiOrigin = config.VITE_API_BASE_URL || 'https://api.locusify.cn'
  return {
    build: {
      manifest: true,
    },
    /**
     * Vercel 在构建环境注入 VERCEL=1；默认的 VITE_ 前缀不会暴露它，
     * 而 render-app 需要用它在非 Vercel 环境下跳过 <SpeedInsights />。
     */
    envPrefix: ['VITE_', 'VERCEL'],
    resolve: {
      tsconfigPaths: true,
      dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
    },
    plugins: [
      react(),

      /**
       * @see {@link https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react#react-compiler}
       */
      babel({
        presets: [reactCompilerPreset()],
      }),

      tailwindcss(),
    ],
    server: {
      port: 1046,
      host: true,
      proxy: {
        '/api': {
          target: apiOrigin,
          changeOrigin: true,
        },
      },
    },
    /**
     * `vite preview` 默认不继承 server.proxy，导致本地验收生产构建时
     * /api 请求打到不存在的 origin；而远端也不返回 Access-Control-Allow-Origin，
     * 无法靠跨域直连绕开。这里复用同一份代理，让「生产构建 + 真实后端」可被验收。
     */
    preview: {
      port: 4173,
      proxy: {
        '/api': {
          target: apiOrigin,
          changeOrigin: true,
        },
      },
    },
  }
})
