import { MutationCache, QueryCache, QueryClient } from '@tanstack/vue-query'
import { emitBusinessError } from '@app/services/http/error-gateway'

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error) => {
      emitBusinessError(error)
    },
  }),
  mutationCache: new MutationCache({
    onError: (error) => {
      emitBusinessError(error)
    },
  }),
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})
