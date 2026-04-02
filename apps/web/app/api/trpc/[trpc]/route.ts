import { fetchRequestHandler } from '@trpc/server/adapters/fetch'
import { appRouter } from '@bizbot/trpc'
import { db } from '@bizbot/database'
import { auth } from '@/auth'

const handler = async (req: Request) => {
  const session = await auth()
  return fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({ db, session }),
  })
}

export { handler as GET, handler as POST }
