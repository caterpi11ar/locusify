import type { Root } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { reactQueryClient } from '@/lib/query-client'
import App from './App'

export function renderApp(root: Root) {
  root.render(
    <QueryClientProvider client={reactQueryClient}>
      <App />
      {/*
       * Speed Insights 的脚本由 Vercel 注入（/_vercel/speed-insights/script.js）。
       * 本地、自托管或任何非 Vercel 环境都拿不到它，会稳定产生一条 404 +
       * 一条 ERR_ABORTED，污染控制台。只在真的跑在 Vercel 上时才挂载。
       */}
      {import.meta.env.VERCEL && <SpeedInsights />}
    </QueryClientProvider>,
  )
}
