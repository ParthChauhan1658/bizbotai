import { initTRPC, TRPCError } from '@trpc/server'
import type { Database } from '@bizbot/database'

/**
 * Session shape based on next-auth v5 JWT strategy.
 * Matches the extended Session type declared in apps/web/auth.ts.
 */
export interface Session {
  user: {
    id: string
    name?: string | null
    email?: string | null
    image?: string | null
    role: string
    businessId: string | null
  }
}

/**
 * Context available to every tRPC procedure.
 * Created per-request in the Next.js API handler.
 */
export interface TRPCContext {
  db: Database
  session: Session | null
}

const t = initTRPC.context<TRPCContext>().create()

/**
 * Router factory -- use this to define all routers.
 */
export const createTRPCRouter = t.router

/**
 * Public procedure -- no auth required.
 */
export const publicProcedure = t.procedure

/**
 * Protected procedure -- requires a valid session.
 * Throws UNAUTHORIZED if the user is not logged in.
 */
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource.',
    })
  }

  return next({
    ctx: {
      ...ctx,
      session: ctx.session,
    },
  })
})

/**
 * Business procedure -- requires a valid session AND an associated businessId.
 * Most dashboard/API routes use this to scope queries to the current business.
 */
export const businessProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in to access this resource.',
    })
  }

  if (!ctx.session.user.businessId) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'You must have a business associated with your account.',
    })
  }

  return next({
    ctx: {
      ...ctx,
      session: {
        ...ctx.session,
        user: {
          ...ctx.session.user,
          businessId: ctx.session.user.businessId,
        },
      },
    },
  })
})
