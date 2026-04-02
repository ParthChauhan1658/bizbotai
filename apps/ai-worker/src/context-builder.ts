import { eq, and, desc, sql } from 'drizzle-orm'
import {
  db, businesses, customers, messages, knowledgeBase
} from '@bizbot/database'
import { getSystemPrompt, generateEmbedding } from '@bizbot/ai-prompts'

export interface AIContext {
  systemPrompt: string
  chatHistory: Array<{ role: 'user' | 'assistant'; content: string }>
  businessConfig: {
    id: string
    name: string
    type: string
    plan: string
    businessHours: unknown
    autoReplyOutsideHours: string | null
  }
  customer: {
    id: string
    name: string | null
    language: string
    totalMessages: number
    totalOrders: number
    totalAppointments: number
    tags: string[]
  }
  kbContext: string
}

export async function buildContext(
  businessId: string,
  customerId: string,
  conversationId: string,
  incomingMessage: string,
  language: string
): Promise<AIContext> {
  // Fetch in parallel for speed
  const [business, customer, history, kbResults] = await Promise.all([
    db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1),
    db.select().from(customers).where(eq(customers.id, customerId)).limit(1),
    db
      .select({ direction: messages.direction, content: messages.content, aiGenerated: messages.aiGenerated })
      .from(messages)
      .where(and(eq(messages.conversationId, conversationId), eq(messages.messageType, 'text')))
      .orderBy(desc(messages.createdAt))
      .limit(10),
    searchKnowledgeBase(businessId, incomingMessage),
  ])

  const biz = business[0]!
  const cust = customer[0]!

  // Build system prompt from template
  const systemPrompt = biz.systemPrompt ?? getSystemPrompt(biz.businessType, {
    businessName: biz.name,
    businessType: biz.businessType,
    ownerName: biz.ownerName,
    ...(biz.city ? { city: biz.city } : {}),
    language,
  })

  // Format chat history (reverse — oldest first)
  const chatHistory = history
    .reverse()
    .filter((m) => m.content)
    .map((m) => ({
      role: (m.direction === 'inbound' ? 'user' : 'assistant') as 'user' | 'assistant',
      content: m.content!,
    }))

  // Format KB context
  const kbContext = kbResults.length > 0
    ? `## Relevant Business Information\n${kbResults.map((r) => r.content).join('\n\n')}`
    : ''

  return {
    systemPrompt,
    chatHistory,
    businessConfig: {
      id: biz.id,
      name: biz.name,
      type: biz.businessType,
      plan: biz.plan,
      businessHours: biz.businessHours,
      autoReplyOutsideHours: biz.autoReplyOutsideHours,
    },
    customer: {
      id: cust.id,
      name: cust.name,
      language: cust.language,
      totalMessages: cust.totalMessages,
      totalOrders: cust.totalOrders,
      totalAppointments: cust.totalAppointments,
      tags: cust.tags,
    },
    kbContext,
  }
}

// Vector search using pgvector cosine similarity
async function searchKnowledgeBase(businessId: string, query: string) {
  if (!query.trim()) return []

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query)
    const vectorStr = `[${queryEmbedding.join(',')}]`

    // Cosine similarity search via pgvector — returns top 3 most relevant docs
    const results = await db
      .select({
        content: knowledgeBase.content,
        title: knowledgeBase.title,
        similarity: sql<number>`1 - (${knowledgeBase.embedding} <=> ${vectorStr}::vector)`,
      })
      .from(knowledgeBase)
      .where(and(eq(knowledgeBase.businessId, businessId), eq(knowledgeBase.isActive, true)))
      .orderBy(sql`${knowledgeBase.embedding} <=> ${vectorStr}::vector`)
      .limit(3)

    // Only return results with similarity above threshold (0.3 = relevant)
    return results.filter((r) => r.similarity > 0.3)
  } catch (err) {
    // If embedding fails, fall back to keyword search
    console.warn('Vector search failed, falling back to keyword search:', err)
    return keywordSearch(businessId, query)
  }
}

// Fallback keyword search
async function keywordSearch(businessId: string, query: string) {
  const allDocs = await db
    .select({ content: knowledgeBase.content, title: knowledgeBase.title })
    .from(knowledgeBase)
    .where(and(eq(knowledgeBase.businessId, businessId), eq(knowledgeBase.isActive, true)))
    .limit(20)

  if (!allDocs.length) return []

  const queryWords = query.toLowerCase().split(/\s+/)
  return allDocs
    .map((doc) => {
      const text = (doc.title + ' ' + doc.content).toLowerCase()
      const score = queryWords.filter((w) => text.includes(w)).length
      return { ...doc, score, similarity: score / queryWords.length }
    })
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}
