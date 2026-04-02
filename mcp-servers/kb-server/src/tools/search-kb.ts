import { db, knowledgeBase } from '@bizbot/database'
import { generateEmbedding } from '@bizbot/ai-prompts'
import { eq, and, desc, sql } from 'drizzle-orm'

interface SearchKbInput {
  businessId: string
  query: string
}

interface KbResult {
  title: string
  content: string
  similarity: number
}

export async function searchKnowledgeBase(
  input: SearchKbInput,
): Promise<{ results: KbResult[] }> {
  const { businessId, query } = input

  // --- attempt vector search ---
  let vectorResults: KbResult[] = []
  let vectorFailed = false

  try {
    const embedding = await generateEmbedding(query)
    const vectorStr = `[${embedding.join(',')}]`

    const rows = await db
      .select({
        title: knowledgeBase.title,
        content: knowledgeBase.content,
        similarity: sql<number>`1 - (${knowledgeBase.embedding} <=> ${vectorStr}::vector)`,
      })
      .from(knowledgeBase)
      .where(
        and(
          eq(knowledgeBase.businessId, businessId),
          eq(knowledgeBase.isActive, true),
        ),
      )
      .orderBy(desc(sql`1 - (${knowledgeBase.embedding} <=> ${vectorStr}::vector)`))
      .limit(5)

    vectorResults = rows
      .filter((r) => r.similarity > 0.3)
      .map((r) => ({
        title: r.title,
        content: r.content,
        similarity: r.similarity,
      }))
  } catch {
    vectorFailed = true
  }

  if (!vectorFailed && vectorResults.length > 0) {
    return { results: vectorResults }
  }

  // --- keyword fallback ---
  const allDocs = await db
    .select({
      title: knowledgeBase.title,
      content: knowledgeBase.content,
    })
    .from(knowledgeBase)
    .where(
      and(
        eq(knowledgeBase.businessId, businessId),
        eq(knowledgeBase.isActive, true),
      ),
    )

  const words = query
    .toLowerCase()
    .split(/\s+/)
    .filter((w) => w.length > 0)

  const scored = allDocs.map((doc) => {
    const haystack = `${doc.title} ${doc.content}`.toLowerCase()
    const score = words.reduce(
      (acc, word) => acc + (haystack.includes(word) ? 1 : 0),
      0,
    )
    return { title: doc.title, content: doc.content, similarity: score / Math.max(words.length, 1) }
  })

  const top3 = scored
    .filter((d) => d.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 3)

  return { results: top3 }
}
