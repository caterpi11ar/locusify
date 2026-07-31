import type { Root } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { SpeedInsights } from '@vercel/speed-insights/react'
import { reactQueryClient } from '@/lib/query-client'
import App from './App'

export function renderApp(root: Root) {
  root.render(
    <QueryClientProvider client={reactQueryClient}>
      <App />
      <SpeedInsights />
    </QueryClientProvider>,
  )
}
