import { z } from 'zod'
import { createTRPCRouter, businessProcedure } from '../trpc'
import { businesses, messages } from '@bizbot/database'
import { eq, desc } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

export const settingsRouter = createTRPCRouter({
  /**
   * Get the full business record for the current user's business.
   */
  getBusiness: businessProcedure.query(async ({ ctx }) => {
    const businessId = ctx.session.user.businessId

    const [business] = await ctx.db
      .select({
        id: businesses.id,
        name: businesses.name,
        slug: businesses.slug,
        ownerName: businesses.ownerName,
        ownerEmail: businesses.ownerEmail,
        ownerPhone: businesses.ownerPhone,
        businessType: businesses.businessType,
        businessHours: businesses.businessHours,
        autoReplyOutsideHours: businesses.autoReplyOutsideHours,
        defaultLanguage: businesses.defaultLanguage,
        supportedLanguages: businesses.supportedLanguages,
        address: businesses.address,
        city: businesses.city,
        state: businesses.state,
        aiModel: businesses.aiModel,
        aiTemperature: businesses.aiTemperature,
        maxTokensPerReply: businesses.maxTokensPerReply,
        systemPrompt: businesses.systemPrompt,
        plan: businesses.plan,
        planExpiresAt: businesses.planExpiresAt,
        monthlyMessageLimit: businesses.monthlyMessageLimit,
        messagesUsedThisMonth: businesses.messagesUsedThisMonth,
        waConnected: businesses.waConnected,
        onboardingCompleted: businesses.onboardingCompleted,
        createdAt: businesses.createdAt,
        updatedAt: businesses.updatedAt,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1)

    if (!business) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Business not found.',
      })
    }

    return business
  }),

  /**
   * Update business settings. Only provided fields are changed.
   * Sensitive fields like WhatsApp tokens are not exposed here.
   */
  updateBusiness: businessProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255).optional(),
        ownerName: z.string().min(1).max(255).optional(),
        city: z.string().max(100).optional(),
        businessType: z
          .enum(['restaurant', 'clinic', 'salon', 'ecommerce', 'other'])
          .optional(),
        businessHours: z.record(z.string(), z.unknown()).optional(),
        autoReplyOutsideHours: z.string().optional(),
        defaultLanguage: z.string().max(10).optional(),
        aiModel: z.string().max(50).optional(),
        aiTemperature: z.string().max(4).optional(),
        maxTokensPerReply: z.number().int().min(50).max(4096).optional(),
        systemPrompt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId

      // Build update payload from provided fields
      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
      }

      if (input.name !== undefined) updates['name'] = input.name
      if (input.ownerName !== undefined) updates['ownerName'] = input.ownerName
      if (input.city !== undefined) updates['city'] = input.city
      if (input.businessType !== undefined)
        updates['businessType'] = input.businessType
      if (input.businessHours !== undefined)
        updates['businessHours'] = input.businessHours
      if (input.autoReplyOutsideHours !== undefined)
        updates['autoReplyOutsideHours'] = input.autoReplyOutsideHours
      if (input.defaultLanguage !== undefined)
        updates['defaultLanguage'] = input.defaultLanguage
      if (input.aiModel !== undefined) updates['aiModel'] = input.aiModel
      if (input.aiTemperature !== undefined)
        updates['aiTemperature'] = input.aiTemperature
      if (input.maxTokensPerReply !== undefined)
        updates['maxTokensPerReply'] = input.maxTokensPerReply
      if (input.systemPrompt !== undefined)
        updates['systemPrompt'] = input.systemPrompt

      const [updated] = await ctx.db
        .update(businesses)
        .set(updates)
        .where(eq(businesses.id, businessId))
        .returning({
          id: businesses.id,
          name: businesses.name,
          updatedAt: businesses.updatedAt,
        })

      if (!updated) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Business not found.',
        })
      }

      return updated
    }),

  /**
   * WhatsApp connection status: whether connected, masked phone number ID,
   * and the timestamp of the last message processed.
   */
  getWhatsAppStatus: businessProcedure.query(async ({ ctx }) => {
    const businessId = ctx.session.user.businessId

    const [business] = await ctx.db
      .select({
        waConnected: businesses.waConnected,
        waPhoneNumberId: businesses.waPhoneNumberId,
      })
      .from(businesses)
      .where(eq(businesses.id, businessId))
      .limit(1)

    if (!business) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: 'Business not found.',
      })
    }

    // Get the most recent message timestamp
    const [lastMsg] = await ctx.db
      .select({ createdAt: messages.createdAt })
      .from(messages)
      .where(eq(messages.businessId, businessId))
      .orderBy(desc(messages.createdAt))
      .limit(1)

    // Mask the phone number ID for security (show last 4 digits)
    let maskedPhoneNumberId: string | null = null
    if (business.waPhoneNumberId) {
      const id = business.waPhoneNumberId
      maskedPhoneNumberId =
        id.length > 4
          ? '****' + id.slice(-4)
          : id
    }

    return {
      waConnected: business.waConnected,
      waPhoneNumberId: maskedPhoneNumberId,
      lastMessageAt: lastMsg?.createdAt ?? null,
    }
  }),
})
