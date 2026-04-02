import { createTRPCRouter, businessProcedure } from '../trpc'
import {
  conversations,
  messages,
  orders,
  customers,
  dailyAnalytics,
} from '@bizbot/database'
import { eq, and, sql, desc, gte } from 'drizzle-orm'

export const dashboardRouter = createTRPCRouter({
  /**
   * Core dashboard KPIs: total conversations, messages today,
   * orders count, and total revenue across all orders.
   */
  getStats: businessProcedure.query(async ({ ctx }) => {
    const businessId = ctx.session.user.businessId

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // Run all stat queries in parallel
    const [conversationStats, messagesTodayResult, orderStats] =
      await Promise.all([
        // Total conversations for this business
        ctx.db
          .select({ total: sql<number>`count(*)::int` })
          .from(conversations)
          .where(eq(conversations.businessId, businessId)),

        // Messages received today
        ctx.db
          .select({ total: sql<number>`count(*)::int` })
          .from(messages)
          .where(
            and(
              eq(messages.businessId, businessId),
              gte(messages.createdAt, todayStart)
            )
          ),

        // Orders count and total revenue
        ctx.db
          .select({
            count: sql<number>`count(*)::int`,
            revenue: sql<string>`coalesce(sum(${orders.total}::numeric), 0)::text`,
          })
          .from(orders)
          .where(eq(orders.businessId, businessId)),
      ])

    return {
      totalConversations: conversationStats[0]?.total ?? 0,
      messagesToday: messagesTodayResult[0]?.total ?? 0,
      ordersCount: orderStats[0]?.count ?? 0,
      revenueTotal: orderStats[0]?.revenue ?? '0',
    }
  }),

  /**
   * Message volume for the last 7 days.
   * Uses dailyAnalytics if data exists, otherwise falls back to raw messages.
   */
  getMessageVolume: businessProcedure.query(async ({ ctx }) => {
    const businessId = ctx.session.user.businessId

    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const dateStr = sevenDaysAgo.toISOString().split('T')[0]!

    // Try dailyAnalytics first (pre-aggregated)
    const analyticsRows = await ctx.db
      .select({
        date: dailyAnalytics.date,
        received: dailyAnalytics.messagesReceived,
        sent: dailyAnalytics.messagesSent,
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
      }))
    }

    // Fallback: aggregate from raw messages table
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
          gte(messages.createdAt, sevenDaysAgo)
        )
      )
      .groupBy(sql`date(${messages.createdAt})`)
      .orderBy(sql`date(${messages.createdAt})`)

    return rawRows.map((row) => ({
      date: row.date,
      received: row.received,
      sent: row.sent,
      total: row.total,
    }))
  }),

  /**
   * Last 10 conversations with customer name, last message content,
   * status, and timestamp.
   */
  getRecentConversations: businessProcedure.query(async ({ ctx }) => {
    const businessId = ctx.session.user.businessId

    const rows = await ctx.db
      .select({
        id: conversations.id,
        status: conversations.status,
        messageCount: conversations.messageCount,
        lastMessageAt: conversations.lastMessageAt,
        customerName: customers.name,
        customerPhone: customers.phone,
        customerId: customers.id,
      })
      .from(conversations)
      .innerJoin(customers, eq(conversations.customerId, customers.id))
      .where(eq(conversations.businessId, businessId))
      .orderBy(desc(conversations.lastMessageAt))
      .limit(10)

    // Fetch last message for each conversation
    const conversationIds = rows.map((r) => r.id)
    if (conversationIds.length === 0) {
      return []
    }

    const lastMessages = await ctx.db
      .select({
        conversationId: messages.conversationId,
        content: messages.content,
        direction: messages.direction,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        sql`${messages.conversationId} in ${conversationIds} and ${messages.id} = (
          select m2.id from messages m2
          where m2.conversation_id = ${messages.conversationId}
          order by m2.created_at desc
          limit 1
        )`
      )

    const lastMessageMap = new Map(
      lastMessages.map((m) => [m.conversationId, m])
    )

    return rows.map((row) => {
      const lastMsg = lastMessageMap.get(row.id)
      return {
        id: row.id,
        status: row.status,
        messageCount: row.messageCount,
        lastMessageAt: row.lastMessageAt,
        customerName: row.customerName ?? row.customerPhone ?? 'Unknown',
        customerId: row.customerId,
        lastMessage: lastMsg?.content ?? null,
        lastMessageDirection: lastMsg?.direction ?? null,
      }
    })
  }),

  /**
   * Breakdown of AI model usage from outbound AI-generated messages.
   * Groups by aiModel and returns counts.
   */
  getModelUsage: businessProcedure.query(async ({ ctx }) => {
    const businessId = ctx.session.user.businessId

    const rows = await ctx.db
      .select({
        model: messages.aiModel,
        count: sql<number>`count(*)::int`,
        totalTokens: sql<number>`coalesce(sum(${messages.aiTokensUsed}), 0)::int`,
        avgLatencyMs: sql<number>`coalesce(avg(${messages.aiLatencyMs}), 0)::int`,
      })
      .from(messages)
      .where(
        and(
          eq(messages.businessId, businessId),
          eq(messages.aiGenerated, true)
        )
      )
      .groupBy(messages.aiModel)
      .orderBy(sql`count(*) desc`)

    return rows.map((row) => ({
      model: row.model ?? 'unknown',
      count: row.count,
      totalTokens: row.totalTokens,
      avgLatencyMs: row.avgLatencyMs,
    }))
  }),
})
