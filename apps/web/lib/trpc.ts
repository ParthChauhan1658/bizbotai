import { createTRPCReact } from '@trpc/react-query'
import type { AppRouter } from '@bizbot/trpc'

export const trpc = createTRPCReact<AppRouter>()
