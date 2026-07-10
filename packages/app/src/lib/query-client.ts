import { QueryClient } from '@tanstack/react-query'

/**
 * React Query Client
 * @description Refetch on window focus is disabled
 */
export const reactQueryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /** Refetch on window focus */
      refetchOnWindowFocus: false,
      /** Retry delay */
      retryDelay: 1000,
    },
  },
})
