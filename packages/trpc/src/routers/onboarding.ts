import { z } from 'zod'
import { eq } from 'drizzle-orm'
import { businesses, users, knowledgeBase } from '@bizbot/database'
import { createTRPCRouter, protectedProcedure, businessProcedure } from '../trpc'
import { TRPCError } from '@trpc/server'
import { randomBytes } from 'crypto'

function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') +
    '-' +
    randomBytes(3).toString('hex')
  )
}

export const onboardingRouter = createTRPCRouter({
  /**
   * Step 1: Create a new business and link it to the current user.
   * Uses protectedProcedure (not businessProcedure) because the user
   * doesn't have a business yet.
   */
  createBusiness: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        businessType: z.enum(['restaurant', 'clinic', 'salon', 'retail', 'other']),
        city: z.string().min(1).max(100),
        ownerName: z.string().min(1).max(255),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if user already has a business
      const existingUser = await ctx.db
        .select({ businessId: users.businessId })
        .from(users)
        .where(eq(users.id, ctx.session.user.id))
        .limit(1)

      if (existingUser[0]?.businessId) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'You already have a business. Go to settings to update it.',
        })
      }

      const slug = slugify(input.name)
      const email = ctx.session.user.email ?? ''

      // Create the business
      const [business] = await ctx.db
        .insert(businesses)
        .values({
          name: input.name,
          slug,
          ownerName: input.ownerName,
          ownerEmail: email,
          ownerPhone: '',
          businessType: input.businessType,
          city: input.city,
          plan: 'trial',
          monthlyMessageLimit: 200,
        })
        .returning({ id: businesses.id })

      if (!business) {
        throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Failed to create business' })
      }

      // Link business to user
      await ctx.db
        .update(users)
        .set({ businessId: business.id, updatedAt: new Date() })
        .where(eq(users.id, ctx.session.user.id))

      return { businessId: business.id }
    }),

  /**
   * Step 2: Save WhatsApp connection details.
   * Uses protectedProcedure and takes businessId as input since the
   * JWT may not have refreshed yet.
   */
  saveWhatsApp: protectedProcedure
    .input(
      z.object({
        businessId: z.string().uuid(),
        phoneNumber: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(businesses)
        .set({
          ownerPhone: input.phoneNumber,
          updatedAt: new Date(),
        })
        .where(eq(businesses.id, input.businessId))

      return { success: true }
    }),

  /**
   * Step 3: Save knowledge base articles from manual content or template.
   */
  saveKnowledge: protectedProcedure
    .input(
      z.object({
        businessId: z.string().uuid(),
        articles: z.array(
          z.object({
            title: z.string().min(1),
            content: z.string().min(1),
            contentType: z.string().default('custom'),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.articles.length === 0) return { count: 0 }

      await ctx.db.insert(knowledgeBase).values(
        input.articles.map((a) => ({
          businessId: input.businessId,
          title: a.title,
          content: a.content,
          contentType: a.contentType,
        }))
      )

      return { count: input.articles.length }
    }),

  /**
   * Step 4: Mark onboarding as complete.
   */
  complete: protectedProcedure
    .input(z.object({ businessId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(businesses)
        .set({ onboardingCompleted: true, updatedAt: new Date() })
        .where(eq(businesses.id, input.businessId))

      return { success: true }
    }),
})
