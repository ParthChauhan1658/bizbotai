import { z } from 'zod'
import { createTRPCRouter, businessProcedure } from '../trpc'
import { knowledgeBase } from '@bizbot/database'
import { generateEmbedding } from '@bizbot/ai-prompts'
import { eq, and, desc, sql, ilike, or } from 'drizzle-orm'
import { TRPCError } from '@trpc/server'

export const knowledgeBaseRouter = createTRPCRouter({
  /**
   * List all knowledge base articles for the current business.
   * Supports optional text search across title and content.
   */
  list: businessProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId

      const conditions = [eq(knowledgeBase.businessId, businessId)]

      if (input?.search) {
        const pattern = `%${input.search}%`
        conditions.push(
          or(
            ilike(knowledgeBase.title, pattern),
            ilike(knowledgeBase.content, pattern)
          )!
        )
      }

      const rows = await ctx.db
        .select({
          id: knowledgeBase.id,
          title: knowledgeBase.title,
          content: knowledgeBase.content,
          contentType: knowledgeBase.contentType,
          isActive: knowledgeBase.isActive,
          sourceUrl: knowledgeBase.sourceUrl,
          sourceFileName: knowledgeBase.sourceFileName,
          hasEmbedding: sql<boolean>`${knowledgeBase.embedding} is not null`,
          createdAt: knowledgeBase.createdAt,
          updatedAt: knowledgeBase.updatedAt,
        })
        .from(knowledgeBase)
        .where(and(...conditions))
        .orderBy(desc(knowledgeBase.updatedAt))

      return rows
    }),

  /**
   * Get a single KB article by ID. Validates business ownership.
   */
  getById: businessProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId

      const [article] = await ctx.db
        .select({
          id: knowledgeBase.id,
          title: knowledgeBase.title,
          content: knowledgeBase.content,
          contentType: knowledgeBase.contentType,
          isActive: knowledgeBase.isActive,
          sourceUrl: knowledgeBase.sourceUrl,
          sourceFileName: knowledgeBase.sourceFileName,
          hasEmbedding: sql<boolean>`${knowledgeBase.embedding} is not null`,
          sortOrder: knowledgeBase.sortOrder,
          createdAt: knowledgeBase.createdAt,
          updatedAt: knowledgeBase.updatedAt,
        })
        .from(knowledgeBase)
        .where(
          and(
            eq(knowledgeBase.id, input.id),
            eq(knowledgeBase.businessId, businessId)
          )
        )
        .limit(1)

      if (!article) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Knowledge base article not found.',
        })
      }

      return article
    }),

  /**
   * Create a new KB article. Embedding generation is handled
   * separately by the AI worker -- this only persists the text.
   */
  create: businessProcedure
    .input(
      z.object({
        title: z.string().min(1).max(255),
        content: z.string().min(1),
        contentType: z.enum([
          'faq',
          'menu',
          'catalog',
          'policy',
          'custom',
          'system',
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId
      const embeddingInput = `${input.title}\n${input.content}`
      const embedding = await generateEmbedding(embeddingInput)

      const [article] = await ctx.db
        .insert(knowledgeBase)
        .values({
          businessId,
          title: input.title,
          content: input.content,
          contentType: input.contentType,
          embedding,
        })
        .returning({
          id: knowledgeBase.id,
          title: knowledgeBase.title,
          contentType: knowledgeBase.contentType,
          createdAt: knowledgeBase.createdAt,
        })

      return article!
    }),

  /**
   * Update an existing KB article. Only provided fields are changed.
   */
  update: businessProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(255).optional(),
        content: z.string().min(1).optional(),
        contentType: z
          .enum(['faq', 'menu', 'catalog', 'policy', 'custom', 'system'])
          .optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId

      const [existing] = await ctx.db
        .select({
          id: knowledgeBase.id,
          title: knowledgeBase.title,
          content: knowledgeBase.content,
        })
        .from(knowledgeBase)
        .where(
          and(
            eq(knowledgeBase.id, input.id),
            eq(knowledgeBase.businessId, businessId)
          )
        )
        .limit(1)

      if (!existing) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Knowledge base article not found.',
        })
      }

      const nextTitle = input.title ?? existing.title
      const nextContent = input.content ?? existing.content
      const embeddingInput = `${nextTitle}\n${nextContent}`
      const embedding = await generateEmbedding(embeddingInput)

      // Build update payload from provided fields
      const updates: Record<string, unknown> = {
        updatedAt: new Date(),
        embedding,
      }
      if (input.title !== undefined) updates['title'] = input.title
      if (input.content !== undefined) updates['content'] = input.content
      if (input.contentType !== undefined)
        updates['contentType'] = input.contentType
      if (input.isActive !== undefined) updates['isActive'] = input.isActive

      const [updated] = await ctx.db
        .update(knowledgeBase)
        .set(updates)
        .where(
          and(
            eq(knowledgeBase.id, input.id),
            eq(knowledgeBase.businessId, businessId)
          )
        )
        .returning({
          id: knowledgeBase.id,
          title: knowledgeBase.title,
          contentType: knowledgeBase.contentType,
          isActive: knowledgeBase.isActive,
          updatedAt: knowledgeBase.updatedAt,
        })

      return updated
    }),

  /**
   * Soft-delete not needed -- hard delete the KB article.
   */
  delete: businessProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const businessId = ctx.session.user.businessId

      const [deleted] = await ctx.db
        .delete(knowledgeBase)
        .where(
          and(
            eq(knowledgeBase.id, input.id),
            eq(knowledgeBase.businessId, businessId)
          )
        )
        .returning({ id: knowledgeBase.id })

      if (!deleted) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Knowledge base article not found.',
        })
      }

      return { success: true, id: deleted.id }
    }),

  /**
   * Aggregate stats: total articles, when last updated,
   * and how many articles have embeddings generated.
   */
  getStats: businessProcedure.query(async ({ ctx }) => {
    const businessId = ctx.session.user.businessId

    const [stats] = await ctx.db
      .select({
        totalArticles: sql<number>`count(*)::int`,
        withEmbedding: sql<number>`count(*) filter (where ${knowledgeBase.embedding} is not null)::int`,
        lastUpdated: sql<Date | null>`max(${knowledgeBase.updatedAt})`,
      })
      .from(knowledgeBase)
      .where(eq(knowledgeBase.businessId, businessId))

    return {
      totalArticles: stats?.totalArticles ?? 0,
      withEmbedding: stats?.withEmbedding ?? 0,
      lastUpdated: stats?.lastUpdated ?? null,
    }
  }),
})
