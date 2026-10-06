import { QueryClient } from '@tanstack/react-query'
import { ApiError, SessionExpiredError } from '../api/errors'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 4xx and session errors are deterministic — retrying them only delays the error state.
      retry: (failureCount, error) =>
        !(error instanceof ApiError || error instanceof SessionExpiredError) && failureCount < 2,
      refetchOnWindowFocus: false,
      staleTime: 10_000,
    },
  },
})
