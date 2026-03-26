import { eq, and, desc } from 'drizzle-orm'
import {
  db, businesses, customers, messages, knowledgeBase
} from '@bizbot/database'
import { getSystemPrompt } from '@bizbot/ai-prompts'

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

// Simple keyword search (we'll upgrade to vector search in Week 2)
async function searchKnowledgeBase(businessId: string, query: string) {
  const allDocs = await db
    .select({ content: knowledgeBase.content, title: knowledgeBase.title })
    .from(knowledgeBase)
    .where(and(eq(knowledgeBase.businessId, businessId), eq(knowledgeBase.isActive, true)))
    .limit(20)

  if (!allDocs.length) return []

  // Simple keyword matching until we set up pgvector embeddings
  const queryWords = query.toLowerCase().split(/\s+/)
  const scored = allDocs.map((doc) => {
    const text = (doc.title + ' ' + doc.content).toLowerCase()
    const score = queryWords.filter((w) => text.includes(w)).length
    return { ...doc, score }
  })

  return scored
    .filter((d) => d.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
}
