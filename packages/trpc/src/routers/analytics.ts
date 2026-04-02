import { z } from 'zod'
import { createTRPCRouter, businessProcedure } from '../trpc'
import {
  conversations,
  messages,
  customers,
  dailyAnalytics,
} from '@bizbot/database'
import { eq, and, sql, desc, gte } from 'drizzle-orm'

export const analyticsRouter = createTRPCRouter({
  /**
   * Key performance indicators:
   * - totalMessages: all-time message count
   * - aiResolutionRate: percentage of conversations resolved by AI
   * - avgResponseTime: average AI latency in milliseconds
   * - customerSatisfaction: average customer rating (1-5)
   */
  getKPIs: businessProcedure.query(async ({ ctx }) => {
    const businessId = ctx.session.user.businessId

    const [msgStats, convStats, latencyStats, ratingStats] =
      await Promise.all([
        // Total messages
        ctx.db
          .select({ total: sql<number>`count(*)::int` })
          .from(messages)
          .where(eq(messages.businessId, businessId)),

        // AI resolution rate
        ctx.db
          .select({
            total: sql<number>`count(*)::int`,
            resolvedByAi: sql<number>`count(*) filter (where ${conversations.resolvedByAi} = true)::int`,
          })
          .from(conversations)
          .where(eq(conversations.businessId, businessId)),

        // Average AI response latency (only for AI-generated messages)
        ctx.db
          .select({
            avgMs: sql<number>`coalesce(avg(${messages.aiLatencyMs}), 0)::int`,
          })
          .from(messages)
          .where(
            and(
              eq(messages.businessId, businessId),
              eq(messages.aiGenerated, true)
            )
          ),

        // Average customer satisfaction rating
        ctx.db
          .select({
            avg: sql<number>`coalesce(avg(${conversations.customerRating}), 0)::numeric(3,1)`,
            rated: sql<number>`count(${conversations.customerRating})::int`,
          })
          .from(conversations)
          .where(
            and(
              eq(conversations.businessId, businessId),
              sql`${conversations.customerRating} is not null`
            )
          ),
      ])

    const totalConversations = convStats[0]?.total ?? 0
    const resolvedByAi = convStats[0]?.resolvedByAi ?? 0

    return {
      totalMessages: msgStats[0]?.total ?? 0,
      aiResolutionRate:
        totalConversations > 0
          ? Math.round((resolvedByAi / totalConversations) * 100)
          : 0,
      avgResponseTimeMs: latencyStats[0]?.avgMs ?? 0,
      customerSatisfaction: Number(ratingStats[0]?.avg ?? 0),
      totalRatings: ratingStats[0]?.rated ?? 0,
    }
  }),

  /**
   * Daily message volume breakdown from the dailyAnalytics table.
   * Supports 7, 30, or 90 day lookback windows.
   */
  getMessageVolume: businessProcedure
    .input(z.object({ days: z.union([z.literal(7), z.literal(30), z.literal(90)]) }))
    .query(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId

      const startDate = new Date()
      startDate.setDate(startDate.getDate() - input.days)
      const dateStr = startDate.toISOString().split('T')[0]!

      // Try pre-aggregated dailyAnalytics
      const analyticsRows = await ctx.db
        .select({
          date: dailyAnalytics.date,
          received: dailyAnalytics.messagesReceived,
          sent: dailyAnalytics.messagesSent,
          uniqueCustomers: dailyAnalytics.uniqueCustomers,
          newCustomers: dailyAnalytics.newCustomers,
        })
        .from(dailyAnalytics)
        .where(
          and(
            eq(dailyAnalytics.businessId, businessId),
            gte(dailyAnalytics.date, dateStr)
          )
        )
        .orderBy(dailyAnalytics.date)

      if (analyticsRows.length > 0) {
        return analyticsRows.map((row) => ({
          date: row.date,
          received: row.received,
          sent: row.sent,
          total: row.received + row.sent,
          uniqueCustomers: row.uniqueCustomers,
          newCustomers: row.newCustomers,
        }))
      }

      // Fallback: aggregate from raw messages
      const rawRows = await ctx.db
        .select({
          date: sql<string>`date(${messages.createdAt})::text`,
          total: sql<number>`count(*)::int`,
          received: sql<number>`count(*) filter (where ${messages.direction} = 'inbound')::int`,
          sent: sql<number>`count(*) filter (where ${messages.direction} = 'outbound')::int`,
        })
        .from(messages)
        .where(
          and(
            eq(messages.businessId, businessId),
            gte(messages.createdAt, startDate)
          )
        )
        .groupBy(sql`date(${messages.createdAt})`)
        .orderBy(sql`date(${messages.createdAt})`)

      return rawRows.map((row) => ({
        date: row.date,
        received: row.received,
        sent: row.sent,
        total: row.total,
        uniqueCustomers: 0,
        newCustomers: 0,
      }))
    }),

  /**
   * Top 5 most frequently asked questions / topics.
   * Groups inbound message content and counts occurrences.
   * Uses a simplified approach: counts exact content matches.
   */
  getTopQuestions: businessProcedure.query(async ({ ctx }) => {
    const businessId = ctx.session.user.businessId

    const rows = await ctx.db
      .select({
        content: messages.content,
        count: sql<number>`count(*)::int`,
      })
      .from(messages)
      .where(
        and(
          eq(messages.businessId, businessId),
          eq(messages.direction, 'inbound'),
          eq(messages.messageType, 'text'),
          sql`${messages.content} is not null`,
          sql`length(${messages.content}) > 0`
        )
      )
      .groupBy(messages.content)
      .orderBy(sql`count(*) desc`)
      .limit(5)

    return rows.map((row) => ({
      question: row.content,
      count: row.count,
    }))
  }),

  /**
   * Conversation outcome breakdown:
   * - resolvedByAi: conversations the AI handled end-to-end
   * - escalated: conversations handed off to a human agent
   * - abandoned: closed conversations not resolved by AI and not handed off
   */
  getOutcomes: businessProcedure.query(async ({ ctx }) => {
    const businessId = ctx.session.user.businessId

    const [stats] = await ctx.db
      .select({
        total: sql<number>`count(*)::int`,
        resolvedByAi: sql<number>`count(*) filter (where ${conversations.resolvedByAi} = true)::int`,
        escalated: sql<number>`count(*) filter (where ${conversations.status} = 'handed_off')::int`,
        closed: sql<number>`count(*) filter (where ${conversations.status} = 'closed')::int`,
      })
      .from(conversations)
      .where(eq(conversations.businessId, businessId))

    const total = stats?.total ?? 0
    const resolvedByAi = stats?.resolvedByAi ?? 0
    const escalated = stats?.escalated ?? 0
    const closed = stats?.closed ?? 0

    // Abandoned = closed but not resolved by AI (and not currently handed off)
    const abandoned = Math.max(0, closed - resolvedByAi)

    return {
      total,
      resolvedByAi,
      escalated,
      abandoned,
    }
  }),

  /**
   * Top 10 customers ranked by total message count,
   * with their conversation and spending stats.
   */
  getTopCustomers: businessProcedure.query(async ({ ctx }) => {
    const businessId = ctx.session.user.businessId

    const rows = await ctx.db
      .select({
        id: customers.id,
        name: customers.name,
        phone: customers.phone,
        waId: customers.waId,
        totalMessages: customers.totalMessages,
        totalOrders: customers.totalOrders,
        totalSpent: customers.totalSpent,
        firstMessageAt: customers.firstMessageAt,
        lastMessageAt: customers.lastMessageAt,
      })
      .from(customers)
      .where(eq(customers.businessId, businessId))
      .orderBy(desc(customers.totalMessages))
      .limit(10)

    return rows.map((row) => ({
      id: row.id,
      name: row.name ?? row.phone ?? row.waId,
      phone: row.phone,
      totalMessages: row.totalMessages,
      totalOrders: row.totalOrders,
      totalSpent: row.totalSpent,
      firstMessageAt: row.firstMessageAt,
      lastMessageAt: row.lastMessageAt,
    }))
  }),
})
