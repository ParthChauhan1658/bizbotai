import { createTRPCRouter } from './trpc'
import { dashboardRouter } from './routers/dashboard'
import { conversationsRouter } from './routers/conversations'
import { knowledgeBaseRouter } from './routers/knowledgeBase'
import { analyticsRouter } from './routers/analytics'
import { settingsRouter } from './routers/settings'
import { onboardingRouter } from './routers/onboarding'

/**
 * Root tRPC router combining all domain routers.
 * This is the single entry point for the tRPC API.
 */
export const appRouter = createTRPCRouter({
  dashboard: dashboardRouter,
  conversations: conversationsRouter,
  knowledgeBase: knowledgeBaseRouter,
  analytics: analyticsRouter,
  settings: settingsRouter,
  onboarding: onboardingRouter,
})

/** Type-safe router type for client-side inference. */
export type AppRouter = typeof appRouter

// Re-export context and procedure utilities for use in Next.js API handler
export {
  createTRPCRouter,
  publicProcedure,
  protectedProcedure,
  businessProcedure,
} from './trpc'
export type { TRPCContext, Session } from './trpc'
