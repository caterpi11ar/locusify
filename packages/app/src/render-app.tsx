import type { Root } from 'react-dom/client'
import { QueryClientProvider } from '@tanstack/react-query'
import { reactQueryClient } from '@/lib/query-client'
import App from './App'

export function renderApp(root: Root) {
  root.render(
    <QueryClientProvider client={reactQueryClient}>
      <App />
    </QueryClientProvider>,
  )
}
