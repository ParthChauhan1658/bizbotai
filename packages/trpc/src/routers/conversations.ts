import { z } from 'zod'
import { createTRPCRouter, businessProcedure } from '../trpc'
import { conversations, messages, customers, orders } from '@bizbot/database'
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm'

export const conversationsRouter = createTRPCRouter({
  /**
   * Paginated conversation list with optional status filter and search.
   * Search matches against customer name or phone number.
   * Uses cursor-based pagination on lastMessageAt.
   */
  list: businessProcedure
    .input(
      z.object({
        status: z
          .enum(['active', 'closed', 'handed_off'])
          .optional(),
        search: z.string().optional(),
        cursor: z.string().optional(), // ISO date string for cursor-based pagination
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId

      // Build conditions array
      const conditions = [eq(conversations.businessId, businessId)]

      if (input.status) {
        conditions.push(eq(conversations.status, input.status))
      }

      // If cursor provided, get conversations older than cursor
      if (input.cursor) {
        conditions.push(
          sql`${conversations.lastMessageAt} < ${new Date(input.cursor)}`
        )
      }

      // Base query with customer join
      let query = ctx.db
        .select({
          id: conversations.id,
          status: conversations.status,
          messageCount: conversations.messageCount,
          lastMessageAt: conversations.lastMessageAt,
          startedAt: conversations.startedAt,
          sentiment: conversations.sentiment,
          resolvedByAi: conversations.resolvedByAi,
          customerRating: conversations.customerRating,
          customerId: customers.id,
          customerName: customers.name,
          customerPhone: customers.phone,
          customerWaId: customers.waId,
        })
        .from(conversations)
        .innerJoin(customers, eq(conversations.customerId, customers.id))
        .where(and(...conditions))
        .orderBy(desc(conversations.lastMessageAt))
        .limit(input.limit + 1) // Fetch one extra to determine if there are more

      // Apply search filter on customer fields
      if (input.search) {
        const searchPattern = `%${input.search}%`
        query = ctx.db
          .select({
            id: conversations.id,
            status: conversations.status,
            messageCount: conversations.messageCount,
            lastMessageAt: conversations.lastMessageAt,
            startedAt: conversations.startedAt,
            sentiment: conversations.sentiment,
            resolvedByAi: conversations.resolvedByAi,
            customerRating: conversations.customerRating,
            customerId: customers.id,
            customerName: customers.name,
            customerPhone: customers.phone,
            customerWaId: customers.waId,
          })
          .from(conversations)
          .innerJoin(customers, eq(conversations.customerId, customers.id))
          .where(
            and(
              ...conditions,
              or(
                ilike(customers.name, searchPattern),
                ilike(customers.phone, searchPattern),
                ilike(customers.waId, searchPattern)
              )
            )
          )
          .orderBy(desc(conversations.lastMessageAt))
          .limit(input.limit + 1)
      }

      const rows = await query

      // Determine next cursor
      let nextCursor: string | null = null
      if (rows.length > input.limit) {
        rows.pop() // Remove the extra item
        const lastRow = rows[rows.length - 1]!
        nextCursor = lastRow.lastMessageAt.toISOString()
      }

      return {
        items: rows.map((row) => ({
          id: row.id,
          status: row.status,
          messageCount: row.messageCount,
          lastMessageAt: row.lastMessageAt,
          startedAt: row.startedAt,
          sentiment: row.sentiment,
          resolvedByAi: row.resolvedByAi,
          customerRating: row.customerRating,
          customer: {
            id: row.customerId,
            name: row.customerName ?? row.customerPhone ?? row.customerWaId,
            phone: row.customerPhone,
            waId: row.customerWaId,
          },
        })),
        nextCursor,
      }
    }),

  /**
   * All messages for a given conversation, ordered chronologically.
   * Validates that the conversation belongs to the current business.
   */
  getMessages: businessProcedure
    .input(z.object({ conversationId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId

      // Verify conversation belongs to this business
      const [conv] = await ctx.db
        .select({ id: conversations.id })
        .from(conversations)
        .where(
          and(
            eq(conversations.id, input.conversationId),
            eq(conversations.businessId, businessId)
          )
        )
        .limit(1)

      if (!conv) {
        return []
      }

      const rows = await ctx.db
        .select({
          id: messages.id,
          direction: messages.direction,
          messageType: messages.messageType,
          content: messages.content,
          mediaUrl: messages.mediaUrl,
          mediaMimeType: messages.mediaMimeType,
          mediaCaption: messages.mediaCaption,
          aiGenerated: messages.aiGenerated,
          aiModel: messages.aiModel,
          aiLatencyMs: messages.aiLatencyMs,
          waStatus: messages.waStatus,
          actionType: messages.actionType,
          actionData: messages.actionData,
          createdAt: messages.createdAt,
        })
        .from(messages)
        .where(eq(messages.conversationId, input.conversationId))
        .orderBy(messages.createdAt)

      return rows
    }),

  /**
   * Customer details with aggregated stats: total conversations,
   * total orders, total spent, and last activity.
   */
  getCustomerDetails: businessProcedure
    .input(z.object({ customerId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId

      // Fetch customer record scoped to this business
      const [customer] = await ctx.db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, input.customerId),
            eq(customers.businessId, businessId)
          )
        )
        .limit(1)

      if (!customer) {
        return null
      }

      // Fetch live stats in parallel
      const [conversationStats, orderStats] = await Promise.all([
        ctx.db
          .select({
            total: sql<number>`count(*)::int`,
            active: sql<number>`count(*) filter (where ${conversations.status} = 'active')::int`,
          })
          .from(conversations)
          .where(
            and(
              eq(conversations.customerId, input.customerId),
              eq(conversations.businessId, businessId)
            )
          ),
        ctx.db
          .select({
            total: sql<number>`count(*)::int`,
            totalSpent: sql<string>`coalesce(sum(${orders.total}::numeric), 0)::text`,
          })
          .from(orders)
          .where(
            and(
              eq(orders.customerId, input.customerId),
              eq(orders.businessId, businessId)
            )
          ),
      ])

      return {
        ...customer,
        stats: {
          totalConversations: conversationStats[0]?.total ?? 0,
          activeConversations: conversationStats[0]?.active ?? 0,
          totalOrders: orderStats[0]?.total ?? 0,
          totalSpent: orderStats[0]?.totalSpent ?? '0',
        },
      }
    }),
})
